"""Recommendation service — AI-first narratives with deterministic safety net.

Google Gemini is tried first, OpenAI second; generated output is validated and
normalised before persistence. The trusted deterministic engine is used only when
no provider is configured, every provider attempt fails, or the model returns
unusable JSON.
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
_MAX_SECTION_ROWS = 25

_RECOMMENDATION_DISPLAY_SCHEMA = {
    "recommendations": [
        {
            "category": "cash_flow | revenue | expenses | debt | gst | risk | growth | general",
            "title": "string — concise recommendation title",
            "description": "string — evidence with numbers from the supplied finance data",
            "reason": "string — why this recommendation matters",
            "priority": "critical | high | medium | low",
            "status": "new",
            "recommended_action": "string — concrete step-by-step next action",
            "expected_impact": "string — measurable or clearly stated benefit",
            "impact_value": "number — estimated INR benefit or 0",
            "source_agent": "string — e.g. Cash Flow Agent | Invoice Agent | Expense Agent | Loan Agent | GST Agent | Risk Agent | AI CFO",
            "rid": "server-generated stable recommendation identifier",
            "created_at": "server-generated ISO-8601 timestamp",
        }
    ]
}


async def _build_ai_analysis(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    deterministic_recommendations: list[dict],
) -> dict:
    """Build a rich, structured telemetry summary covering all financial dimensions.

    Calculates aggregate metrics, ratios, forecasts, top debtors, and spending
    distributions into a clean JSON structure that fits efficiently within LLM context
    windows without row-dump overhead.
    """
    from app.agents.ai_cfo import build_context

    calculated = await build_context(db, business_id)

    # Top overdue invoices
    overdue_invoices = await db[COLLECTIONS["invoices"]].find(
        {"business_id": business_id, "status": "overdue"}
    ).sort("due_date", 1).limit(5).to_list(length=5)
    top_overdue = [
        {
            "invoice_number": inv.get("invoice_number"),
            "customer_name": inv.get("customer_name"),
            "amount": inv.get("total_amount", 0),
            "due_date": str(inv.get("due_date", "")),
        }
        for inv in overdue_invoices
    ]

    # Top expense categories
    expenses = await db[COLLECTIONS["expenses"]].find({"business_id": business_id}).limit(100).to_list(length=100)
    category_totals: dict[str, float] = {}
    total_spend = 0.0
    for exp in expenses:
        amt = float(exp.get("amount") or 0)
        cat = str(exp.get("category") or "General").strip().title()
        category_totals[cat] = category_totals.get(cat, 0.0) + amt
        total_spend += amt
    top_expense_categories = [
        {
            "category": cat,
            "amount": amt,
            "share_percentage": round((amt / total_spend * 100) if total_spend > 0 else 0, 1),
        }
        for cat, amt in sorted(category_totals.items(), key=lambda x: x[1], reverse=True)[:5]
    ]

    # GST summary
    gst_records = await db[COLLECTIONS["gst_records"]].find({"business_id": business_id}).to_list(length=10)
    unpaid_gst = [g for g in gst_records if g.get("status") in ("pending", "overdue")]
    total_unpaid_gst = sum(
        float(g.get("tax_amount") or 0) - float(g.get("paid_amount") or 0) for g in unpaid_gst
    )

    # Active loans
    active_loans = await db[COLLECTIONS["loans"]].find(
        {"business_id": business_id, "status": "active"}
    ).to_list(length=10)
    loan_summary = [
        {
            "lender": l.get("lender"),
            "type": l.get("loan_type"),
            "outstanding": l.get("outstanding_amount", 0),
            "emi": l.get("emi_amount", 0),
            "interest_rate": l.get("interest_rate", 0),
            "next_emi_date": str(l.get("next_emi_date", "")),
        }
        for l in active_loans
    ]

    trusted_candidates = [
        {key: value for key, value in rec.items() if key in _CONTENT_FIELDS}
        for rec in deterministic_recommendations[:_MAX_AI_RECOMMENDATIONS]
    ]

    return {
        "financial_telemetry": {
            "metrics": calculated.get("metrics", {}),
            "financial_health": calculated.get("health", {}),
            "risk_analysis": calculated.get("risk", {}),
            "loan_readiness": calculated.get("loan_readiness", {}),
            "cash_flow_forecast": calculated.get("forecast"),
        },
        "key_breakdowns": {
            "top_overdue_invoices": top_overdue,
            "top_expense_categories": top_expense_categories,
            "unpaid_gst_liability": total_unpaid_gst,
            "active_loans": loan_summary,
        },
        "calculated_candidate_actions": trusted_candidates,
    }


def _extract_json_payload(text: str) -> Any:
    """Decode JSON even when a provider wraps it in markdown fences, backticks or commentary."""
    candidate = text.strip()
    if not candidate:
        return None

    # Strip code fences
    candidate = re.sub(r"^```(?:json)?\s*", "", candidate, flags=re.IGNORECASE)
    candidate = re.sub(r"\s*```$", "", candidate)
    candidate = candidate.strip()

    try:
        return json.loads(candidate)
    except (TypeError, ValueError):
        pass

    # Match outermost JSON object { ... }
    object_start = candidate.find("{")
    object_end = candidate.rfind("}")
    if object_start >= 0 and object_end > object_start:
        snippet = candidate[object_start : object_end + 1]
        try:
            return json.loads(snippet)
        except ValueError:
            # Try fixing trailing commas
            cleaned = re.sub(r",\s*([}\]])", r"\1", snippet)
            try:
                return json.loads(cleaned)
            except ValueError:
                pass

    # Match outermost JSON array [ ... ]
    array_start = candidate.find("[")
    array_end = candidate.rfind("]")
    if array_start >= 0 and array_end > array_start:
        snippet = candidate[array_start : array_end + 1]
        try:
            return json.loads(snippet)
        except ValueError:
            cleaned = re.sub(r",\s*([}\]])", r"\1", snippet)
            try:
                return json.loads(cleaned)
            except ValueError:
                pass

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
    """Ask Google Gemini (or OpenAI as failover) for display-ready recommendations JSON."""
    if not llm.is_available():
        return deterministic_recommendations, None

    try:
        analysis = await _build_ai_analysis(db, business_id, deterministic_recommendations)
        system = (
            "You are the Senior Chief Financial Officer (AI CFO) advising an Indian MSME. "
            "Your mandate is to deliver high-impact, practical, and highly prioritized financial recommendations "
            "covering 6 core pillars: (1) Cash Flow & Liquidity Optimization, (2) Revenue & Receivables Acceleration, "
            "(3) Expense & Cost Reduction, (4) Debt & Working Capital Optimization, (5) Tax & GST Compliance, "
            "and (6) Profit Margin Expansion.\n\n"
            "STRICT RULES:\n"
            "1. Return ONLY valid JSON matching the specified schema with a single root key 'recommendations'.\n"
            "2. Ground every recommendation in the provided financial telemetry; never invent figures or dates.\n"
            "3. Return 4 to 8 highly actionable, specific recommendations with clear step-by-step next actions.\n"
            "4. Include realistic estimated INR impact values when applicable.\n"
            "5. Do NOT include markdown text, notes, or commentary outside the JSON."
        )
        user = (
            f"User instruction:\n{prompt}\n\n"
            f"Recommendation display schema:\n{json.dumps(_RECOMMENDATION_DISPLAY_SCHEMA, indent=2)}\n\n"
            "Trusted business data analysis (covering invoices, cash flow, gst, loans, expenses, transactions):\n"
            f"{json.dumps(analysis, default=str)}"
        )
        text, engine = await llm.complete_engine(
            system, user, max_tokens=4096, temperature=0.15
        )
        parsed = _extract_json_payload(text or "")
        generated = _normalise_ai_recommendations(parsed, business_id, now)
        if generated:
            return generated, engine or llm.active_provider() or "gemini"
        logger.warning("Recommendation model returned no valid display-schema rows; using deterministic fallback")
    except Exception as exc:
        logger.warning("AI recommendation generation failed; using trusted fallback: %s", exc)
    return deterministic_recommendations, None


async def generate_summary_bullets(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    now: Optional[datetime] = None,
) -> dict:
    """Produce AI-generated bullet-point sentences summarising all finance data.

    Google Gemini (or OpenAI failover) produces natural-language strategic summary
    bullets covering capital allocation, revenue acceleration, and cost reduction.
    Falls back to the deterministic engine when no LLM is configured or available.
    """
    now = now or utcnow()
    deterministic_recs = await generate_recommendations(db, business_id, now=now)
    analysis = await _build_ai_analysis(db, business_id, deterministic_recs)

    engine = "deterministic"
    bullets: list[str] = []

    if llm.is_available():
        system = (
            "You are the Senior Chief Financial Officer (AI CFO) for an Indian MSME. "
            "Analyse the supplied financial data telemetry covering transactions, invoices, expenses, "
            "GST, loans, cash flow forecast, financial health, risk, and loan readiness.\n\n"
            "Return ONLY a JSON object with a single key 'bullets' containing an array of 6 to 10 "
            "concise, actionable strategic sentences. Cover:\n"
            "- Money Allocation (what to do with cash/surplus)\n"
            "- Revenue & Receivables Acceleration (how to collect faster and grow revenue)\n"
            "- Cost & Margin Optimization (cutting discretionary leakage)\n"
            "- Debt & Tax Strategy (EMI optimization and GST compliance)\n\n"
            "Every sentence must reference actual figures from the data. Never invent numbers."
        )
        user = (
            "Generate an executive financial summary as bullet-point strategic sentences "
            "covering every dimension of the business ledgers.\n\n"
            f"MSME Financial Telemetry:\n{json.dumps(analysis, default=str)}"
        )
        try:
            text, provider = await llm.complete_engine(
                system, user, max_tokens=2048, temperature=0.15
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
                engine = provider or "gemini"
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
    from app.utils.format import inr

    telemetry = analysis.get("financial_telemetry", {})
    metrics = telemetry.get("metrics") or {}
    health = telemetry.get("financial_health") or {}
    risk = telemetry.get("risk_analysis") or {}
    readiness = telemetry.get("loan_readiness") or {}
    forecast = telemetry.get("cash_flow_forecast")

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

    Runs Google Gemini (or OpenAI failover) with fallback to trusted deterministic rules.
    Inserts fresh rows and removes previous generations cleanly.
    """
    now = now or utcnow()
    deterministic_recs = await generate_recommendations(db, business_id, now=now)
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
        except Exception as cleanup_exc:
            logger.error(
                "Could not clean failed recommendation generation %s: %s",
                generation_id,
                cleanup_exc,
            )
        raise
    items.sort(key=lambda item: _PRIORITY_ORDER.get(str(item.get("priority")), 9))

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
    limit: int = 50,
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
        q["$or"] = [{"title": rx}, {"description": rx}, {"recommended_action": rx}]

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
    return await _set_status(db, business_id, rec_id, "completed")


async def dismiss(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    return await _set_status(db, business_id, rec_id, "dismissed")
