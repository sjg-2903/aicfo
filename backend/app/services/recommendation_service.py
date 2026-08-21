"""Recommendation service — AI-assisted generation and lifecycle actions.

The model never receives a vague request by itself.  We send the user's prompt,
a calculated analysis spanning every finance section, and the exact schema used
by the Recommendations screen.  Model output is validated and normalised before
it is persisted.  The trusted deterministic engine remains the fallback when a
provider is unavailable or returns unusable JSON.
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
        text = await llm.complete(
            system, user, max_tokens=4096, temperature=0.1
        )
        parsed = _extract_json_payload(text or "")
        generated = _normalise_ai_recommendations(parsed, business_id, now)
        if generated:
            return generated, llm.active_provider()
        logger.warning("Recommendation model returned no valid display-schema rows")
    except Exception as exc:  # model failures must not break Generate
        logger.warning("AI recommendation generation failed; using trusted fallback: %s", exc)
    return deterministic_recommendations, None


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
    result.  When ``prompt`` is supplied, an available LLM receives that
    instruction plus the complete calculated finance analysis and exact display
    schema. Invalid or unavailable model output automatically falls back to the
    deterministic candidates.
    """
    now = now or utcnow()
    deterministic_recs = await generate_recommendations(db, business_id, now=now)
    recs = deterministic_recs
    ai_engine: Optional[str] = None
    if prompt and prompt.strip():
        recs, ai_engine = await _generate_with_ai(
            db, business_id, prompt.strip(), deterministic_recs, now
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
    stats = {
        "created": len(items),
        "updated": 0,
        "revived": 0,
        "removed": removed_result.deleted_count,
        "total": len(items),
        "engine": ai_engine or "deterministic",
        "prompt_applied": bool(prompt and prompt.strip()),
        "generation_id": generation_id,
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
