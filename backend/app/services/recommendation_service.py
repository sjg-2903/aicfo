"""Recommendation service — AI-first narratives with deterministic safety net.

The configured providers never receive a vague request by themselves. We send a user instruction, a
calculated analysis spanning every finance section, and the exact schema used by
the Recommendations screen. OpenAI is tried first, Gemini second; generated
output is validated and normalised before it can be persisted. The trusted
deterministic engine is used only when no provider is configured, every provider
attempt fails, or the model returns unusable JSON.
"""

import hashlib
import json
import logging
import re
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import llm
from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.ml.recommendation import generate_recommendations
from app.schemas.analytics import DEFAULT_RECOMMENDATION_PROMPT
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

logger = logging.getLogger(__name__)

_PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


_CONTENT_FIELDS = (
    "title",
    "description",
    "reason",
    "priority",
    "recommended_action",
    "expected_impact",
    "impact_value",
    "source_agent",
    "category",
)

_VALID_PRIORITIES = set(_PRIORITY_ORDER)
_MAX_AI_RECOMMENDATIONS = 10
_MAX_SECTION_ROWS = 75

# This is intentionally the same shape consumed by ``mapRecommendation`` and
# rendered by the Recommendations page.  Keeping it here makes the contract
# sent to the LLM explicit and testable.
_RECOMMENDATION_DISPLAY_SCHEMA = {
    "recommendations": [
        {
            "category": "lowercase snake_case string",
            "title": "string — concise recommendation title",
            "description": "string — evidence from the supplied finance data",
            "reason": "string — why this recommendation matters",
            "priority": "critical | high | medium | low",
            "status": "new",
            "recommended_action": "string — concrete next action",
            "expected_impact": "string — measurable or clearly stated benefit",
            "impact_value": "number — use 0 when no reliable amount is available",
            "source_agent": "string — e.g. Cash Flow Agent",
            "rid": "server-generated stable recommendation identifier",
            "created_at": "server-generated ISO-8601 timestamp",
        }
    ]
}

_SECTION_FIELDS: dict[str, tuple[str, ...]] = {
    "transactions": (
        "date", "description", "amount", "type", "category", "payment_method",
    ),
    "invoices": (
        "invoice_number", "customer_name", "invoice_date", "due_date",
        "total_amount", "paid_amount", "status",
    ),
    "expenses": (
        "date", "description", "category", "vendor", "amount",
        "payment_method", "recurring",
    ),
    "gst_records": (
        "period", "period_start", "period_end", "due_date", "taxable_turnover",
        "tax_amount", "paid_amount", "status",
    ),
    "loans": (
        "lender", "loan_type", "principal_amount", "outstanding_amount",
        "interest_rate", "emi_amount", "start_date", "end_date",
        "next_emi_date", "status",
    ),
}


def _public_section_rows(rows: list[dict], fields: tuple[str, ...]) -> list[dict]:
    """Project finance rows to recommendation-relevant, JSON-safe fields."""
    return [
        {field: row.get(field) for field in fields if row.get(field) is not None}
        for row in rows
    ]


async def _build_ai_analysis(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    deterministic_recommendations: list[dict],
) -> dict:
    """Build one trusted analysis object covering all five finance sections.

    Aggregate analytics are calculated over the complete business dataset.  A
    bounded recent-row sample is included for concrete evidence without sending
    an unbounded database dump to an external model; coverage counts make that
    distinction explicit to the model.
    """
    # Imported lazily to avoid a module cycle: ai_cfo imports this service only
    # inside its ``recommend`` function.
    from app.agents.ai_cfo import build_context

    calculated = await build_context(db, business_id)
    sections: dict[str, dict] = {}
    for section, fields in _SECTION_FIELDS.items():
        collection = db[COLLECTIONS[section]]
        total = await collection.count_documents({"business_id": business_id})
        sort_field = "date"
        if section == "invoices":
            sort_field = "invoice_date"
        elif section == "gst_records":
            sort_field = "due_date"
        elif section == "loans":
            sort_field = "next_emi_date"
        rows = await collection.find({"business_id": business_id}).sort(
            sort_field, -1
        ).limit(_MAX_SECTION_ROWS).to_list(length=_MAX_SECTION_ROWS)
        sections[section] = {
            "total_records_analyzed": total,
            "records_in_prompt": len(rows),
            "records": _public_section_rows(rows, fields),
        }

    trusted_candidates = [
        {key: value for key, value in rec.items() if key in _CONTENT_FIELDS}
        for rec in deterministic_recommendations[:_MAX_AI_RECOMMENDATIONS]
    ]
    return {
        "calculated_analysis": {
            "metrics": calculated["metrics"],
            "financial_health": calculated["health"],
            "risk_analysis": calculated["risk"],
            "loan_readiness": calculated["loan_readiness"],
            "cash_flow_forecast": calculated["forecast"],
        },
        "finance_sections": sections,
        "trusted_candidate_actions": trusted_candidates,
    }


def _extract_json_payload(text: str) -> Any:
    """Decode JSON even when a provider wraps it in a Markdown code fence."""
    candidate = text.strip()
    candidate = re.sub(r"^```(?:json)?\s*", "", candidate, flags=re.IGNORECASE)
    candidate = re.sub(r"\s*```$", "", candidate)
    try:
        return json.loads(candidate)
    except (TypeError, ValueError):
        pass

    object_start, object_end = candidate.find("{"), candidate.rfind("}")
    array_start, array_end = candidate.find("["), candidate.rfind("]")
    spans = []
    if object_start >= 0 and object_end > object_start:
        spans.append(candidate[object_start : object_end + 1])
    if array_start >= 0 and array_end > array_start:
        spans.append(candidate[array_start : array_end + 1])
    for span in spans:
        try:
            return json.loads(span)
        except ValueError:
            continue
    return None


def _normalise_ai_recommendations(
    raw: Any, business_id: Any, now: datetime,
) -> list[dict]:
    if isinstance(raw, dict):
        raw = raw.get("recommendations")
    if not isinstance(raw, list):
        return []

    normalised: list[dict] = []
    seen: set[tuple[str, str]] = set()
    for item in raw[:_MAX_AI_RECOMMENDATIONS]:
        if not isinstance(item, dict):
            continue
        title = str(item.get("title") or "").strip()[:180]
        description = str(item.get("description") or "").strip()[:1200]
        action = str(item.get("recommended_action") or item.get("action") or "").strip()[:1200]
        if not title or not description or not action:
            continue

        category = re.sub(
            r"[^a-z0-9]+", "_", str(item.get("category") or "general").strip().lower()
        ).strip("_")[:60] or "general"
        key = (category, title.casefold())
        if key in seen:
            continue
        seen.add(key)

        priority = str(item.get("priority") or "medium").strip().lower()
        if priority not in _VALID_PRIORITIES:
            priority = "medium"
        impact_value = item.get("impact_value", 0)
        try:
            impact_value = float(impact_value or 0)
        except (TypeError, ValueError):
            impact_value = 0

        rid_digest = hashlib.sha1(
            f"{business_id}|{category}|{title}".encode("utf-8")
        ).hexdigest()[:16]
        normalised.append(
            {
                "business_id": business_id,
                "_rid": f"rec-{rid_digest}",
                "title": title,
                "description": description,
                "reason": str(item.get("reason") or description).strip()[:1200],
                "priority": priority,
                "status": "new",
                "recommended_action": action,
                "expected_impact": str(item.get("expected_impact") or "").strip()[:500],
                "impact_value": impact_value,
                "source_agent": str(item.get("source_agent") or "AI CFO").strip()[:80],
                "category": category,
                "created_at": now,
            }
        )
    normalised.sort(key=lambda rec: _PRIORITY_ORDER.get(rec["priority"], 9))
    return normalised


async def _generate_with_ai(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    prompt: str,
    deterministic_recommendations: list[dict],
    now: datetime,
) -> tuple[list[dict], Optional[str]]:
    """Ask the configured model for display-ready JSON, with safe fallback."""
    if not llm.is_available():
        return deterministic_recommendations, None

    try:
        analysis = await _build_ai_analysis(db, business_id, deterministic_recommendations)
        system = (
            "You are an AI CFO for an Indian MSME. Return ONLY valid JSON matching "
            "the supplied recommendation display schema. Base every recommendation "
            "on the supplied calculated analysis and finance sections. Never invent "
            "a number, customer, deadline or financial fact. Prioritise the most "
            "material and actionable findings, avoid duplicates, and return 3 to 8 "
            "recommendations when the data supports them."
        )
        user = (
            f"User instruction:\n{prompt}\n\n"
            f"Recommendation display schema:\n{json.dumps(_RECOMMENDATION_DISPLAY_SCHEMA)}\n\n"
            "Trusted business data analysis (JSON):\n"
            f"{json.dumps(analysis, default=str)}"
        )
        text, engine = await llm.complete_engine(
            system, user, max_tokens=4096, temperature=0.1
        )
        parsed = _extract_json_payload(text or "")
        generated = _normalise_ai_recommendations(parsed, business_id, now)
        if generated:
            return generated, engine or llm.active_provider() or "ai"
        logger.warning("Recommendation model returned no valid display-schema rows")
    except Exception as exc:  # model failures must not break Generate
        logger.warning("AI recommendation generation failed; using trusted fallback: %s", exc)
    return deterministic_recommendations, None


async def generate_summary_bullets(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    now: Optional[datetime] = None,
) -> dict:
    """Produce AI-generated bullet-point sentences summarising all finance data.

    The LLM receives the complete calculated analysis (metrics, health, risk,
    loan-readiness, forecast) and every finance section (transactions, invoices,
    expenses, GST, loans), then returns a list of natural-language sentences.
    Falls back to deterministic bullets when no LLM is configured.
    """
    now = now or utcnow()
    deterministic_recs = await generate_recommendations(db, business_id, now=now)
    analysis = await _build_ai_analysis(db, business_id, deterministic_recs)

    engine = "deterministic"
    bullets: list[str] = []

    if llm.is_available():
        system = (
            "You are an AI CFO for an Indian MSME. Analyse the supplied financial "
            "data covering ALL sections — transactions, invoices, expenses, GST, "
            "loans, cash flow, financial health, risk and loan readiness. "
            "Return ONLY a JSON object with a single key \"bullets\" whose value is "
            "an array of 6 to 12 concise, actionable sentences. Each sentence must "
            "stand on its own, reference real numbers from the data, and cover a "
            "different aspect of the business finances. Never invent figures. "
            "Prioritise the most material findings first."
        )
        user = (
            "Generate a comprehensive financial summary as bullet-point sentences "
            "covering every finance section (invoices, cash flow, GST, loans, "
            "expenses and transactions).\n\n"
            f"Trusted business data analysis (JSON):\n{json.dumps(analysis, default=str)}"
        )
        try:
            text, provider = await llm.complete_engine(
                system, user, max_tokens=2048, temperature=0.2
            )
            parsed = _extract_json_payload(text or "")
            if isinstance(parsed, dict):
                raw_bullets = parsed.get("bullets") or []
            elif isinstance(parsed, list):
                raw_bullets = parsed
            else:
                raw_bullets = []
            for b in raw_bullets:
                s = str(b).strip()
                if s and len(s) >= 10:
                    bullets.append(s[:500])
            if bullets:
                engine = provider or "ai"
        except Exception as exc:
            logger.warning("AI summary bullet generation failed; using deterministic fallback: %s", exc)

    if not bullets:
        bullets = _deterministic_summary_bullets(analysis, deterministic_recs)

    return {
        "generated_at": now,
        "engine": engine,
        "bullets": bullets,
    }


def _deterministic_summary_bullets(analysis: dict, recs: list[dict]) -> list[str]:
    """Build actionable financial recommendations on capital deployment, revenue growth, and cost savings."""
    from app.utils.format import inr  # imported lazily to avoid cycle

    metrics = analysis.get("calculated_analysis", {}).get("metrics") or {}
    health = analysis.get("calculated_analysis", {}).get("financial_health") or {}
    risk = analysis.get("calculated_analysis", {}).get("risk_analysis") or {}
    readiness = analysis.get("calculated_analysis", {}).get("loan_readiness") or {}
    forecast = analysis.get("calculated_analysis", {}).get("cash_flow_forecast")
    sections = analysis.get("finance_sections") or {}

    bullets: list[str] = []

    rev = metrics.get("revenue", {})
    exp = metrics.get("expenses", {})
    net = metrics.get("net_profit", {})
    cb = metrics.get("cash_balance", {})
    recv = metrics.get("receivables", {})
    debt = metrics.get("debt", {})

    rev_val = float(rev.get("current") or 0)
    exp_val = float(exp.get("current") or 0)
    net_val = float(net.get("current") or 0)
    cash_val = float(cb.get("current") or 0)
    recv_val = float(recv.get("outstanding") or 0)
    overdue_val = float(recv.get("overdue") or 0)
    debt_val = float(debt.get("outstanding") or 0)
    emi_val = float(debt.get("monthly_emi") or 0)

    # 1. Capital Allocation: What to do with money
    op_reserve = round(exp_val * 2.0, 2)
    surplus = max(0.0, cash_val - op_reserve)
    if surplus > 0:
        bullets.append(
            f"Money Allocation: Maintain {inr(op_reserve)} (2 months OpEx) in an instant-access sweep account, and deploy the remaining {inr(surplus)} surplus into supplier early-payment discounts for a risk-free ~36% annualized return."
        )
    elif cash_val > 0:
        bullets.append(
            f"Money Allocation: Preserve current cash balance of {inr(cash_val)} as working capital reserve to maintain uninterrupted payroll and operations."
        )

    # 2. Revenue Growth: How to make more money
    if overdue_val > 0:
        bullets.append(
            f"Revenue Acceleration: Recover {inr(overdue_val)} in overdue customer invoices immediately by sending automated reminders with a 1.5% prompt-pay settlement discount."
        )
    elif recv_val > 0:
        bullets.append(
            f"Cash Acceleration: Collect {inr(recv_val)} in outstanding receivables on schedule by shortening standard credit terms from Net-30 to Net-15 for new orders."
        )

    # 3. Profit Maximization & Pricing Strategy
    if rev_val > 0:
        price_gain = round(rev_val * 0.04, 2)
        bullets.append(
            f"Profit Maximization: Implement a targeted 3%–5% price adjustment across top-selling products to add +{inr(price_gain)} in direct monthly net profit."
        )

    # 4. Cost Optimization & Margin Expansion
    if exp_val > 0:
        save_val = round(exp_val * 0.06, 2)
        bullets.append(
            f"Cost Optimization: Audit discretionary subscriptions and renegotiate raw material supplier rates to free up {inr(save_val)}/month in operational cash flow."
        )

    # 5. Debt Strategy
    if debt_val > 0 and emi_val > 0:
        bullets.append(
            f"Debt Strategy: Prepay high-interest loan tranches from operating profit to lower your {inr(emi_val)}/month EMI commitment and increase debt-service headroom."
        )

    # 6. Cash Flow & Runway
    if forecast:
        predicted_net = forecast.get("predicted_net_cash_flow")
        if predicted_net is None:
            predicted_net = (forecast.get("summary") or {}).get("predicted_net_cash_flow")
        if predicted_net is not None:
            bullets.append(
                f"Cash Flow Strategy: 30-day forecast projects {inr(predicted_net)} net flow; sync client payment milestones with vendor payment cycles to preserve positive float."
            )

    # 7. Action recommendations
    if recs:
        for r in recs[:2]:
            act = r.get("recommended_action")
            title = r.get("title")
            if act and title:
                bullets.append(f"Strategic Action: {title} — {act}")

    return bullets


async def generate_with_stats(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    now: Optional[datetime] = None,
    prompt: Optional[str] = None,
) -> tuple[list[dict], dict]:
    """Generate a fresh recommendation set and replace the previous set.

    The candidates are fully produced and validated before MongoDB is touched.
    Fresh rows are then inserted under a generation id and every older row for
    the business is removed, so the page can only show the latest Generate
    result.  An available LLM always receives the instruction (the caller's
    ``prompt`` when supplied, otherwise the default instruction) plus the
    complete calculated finance analysis and exact display schema. Invalid or
    unavailable model output automatically falls back to the deterministic
    candidates.
    """
    now = now or utcnow()
    deterministic_recs = await generate_recommendations(db, business_id, now=now)
    recs = deterministic_recs
    ai_engine: Optional[str] = None
    effective_prompt = (prompt or "").strip()
    prompt_applied = bool(effective_prompt)
    if not prompt_applied:
        effective_prompt = DEFAULT_RECOMMENDATION_PROMPT
    recs, ai_engine = await _generate_with_ai(
        db, business_id, effective_prompt, deterministic_recs, now
    )
    collection = db[COLLECTIONS["recommendations"]]
    generation_id = str(ObjectId())
    items: list[dict] = []

    # Insert the complete new generation first. Only after every insert has
    # succeeded do we remove rows from previous generations. If any write fails,
    # remove this generation so a partial result can never leak into MongoDB.
    try:
        for recommendation in recs:
            rid = recommendation["_rid"]
            doc = {key: value for key, value in recommendation.items() if key != "_rid"}
            doc.update(
                {
                    "business_id": business_id,
                    "rid": rid,
                    "status": "new",
                    "created_at": now,
                    "updated_at": now,
                    "generation_id": generation_id,
                }
            )
            result = await collection.insert_one(doc)
            doc["_id"] = result.inserted_id
            items.append(serialize_doc(doc))

        removed_result = await collection.delete_many(
            {"business_id": business_id, "generation_id": {"$ne": generation_id}}
        )
    except Exception:
        try:
            await collection.delete_many(
                {"business_id": business_id, "generation_id": generation_id}
            )
        except Exception as cleanup_exc:  # pragma: no cover - database outage
            logger.error(
                "Could not clean failed recommendation generation %s: %s",
                generation_id,
                cleanup_exc,
            )
        raise
    items.sort(key=lambda item: _PRIORITY_ORDER.get(str(item.get("priority")), 9))

    # Generate AI summary bullets alongside the recommendations
    summary_bullets: list[str] = []
    summary_engine = "deterministic"
    try:
        summary_result = await generate_summary_bullets(db, business_id, now=now)
        summary_bullets = summary_result.get("bullets", [])
        summary_engine = summary_result.get("engine", "deterministic")
    except Exception as exc:
        logger.warning("Summary bullet generation failed: %s", exc)

    stats = {
        "created": len(items),
        "updated": 0,
        "revived": 0,
        "removed": removed_result.deleted_count,
        "total": len(items),
        "engine": ai_engine or "deterministic",
        "prompt_applied": prompt_applied,
        "generation_id": generation_id,
        "summary_bullets": summary_bullets,
        "summary_engine": summary_engine,
    }
    return items, stats


async def generate(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> list[dict]:
    items, _ = await generate_with_stats(db, business_id, now=now)
    return items


async def delete(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> None:
    result = await db[COLLECTIONS["recommendations"]].delete_one(
        {"_id": ObjectId(rec_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Recommendation not found", "RECOMMENDATION_NOT_FOUND")


async def list_recommendations(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    source_agent: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if priority:
        q["priority"] = priority
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    if source_agent:
        q["source_agent"] = source_agent
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"title": rx}, {"description": rx}]

    collection = db[COLLECTIONS["recommendations"]]
    total = await collection.count_documents(q)
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_by, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def _set_status(
    db: AsyncIOMotorDatabase, business_id: Any, rec_id: str, status: str,
) -> dict:
    doc = await db[COLLECTIONS["recommendations"]].find_one_and_update(
        {"_id": ObjectId(rec_id), "business_id": business_id},
        {"$set": {"status": status, "updated_at": utcnow()}},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Recommendation not found", "RECOMMENDATION_NOT_FOUND")
    return serialize_doc(doc)


async def acknowledge(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    return await _set_status(db, business_id, rec_id, "acknowledged")


async def complete(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    doc = await _set_status(db, business_id, rec_id, "completed")
    return doc


async def dismiss(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    return await _set_status(db, business_id, rec_id, "dismissed")
