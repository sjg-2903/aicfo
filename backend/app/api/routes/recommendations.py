"""Recommendation routes."""

import json
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import llm
from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.ml.recommendation import generate_dashboard_recommendations
from app.services import history_service, recommendation_service
from app.utils.dates import utcnow

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/recommendations", tags=["recommendations"])


@router.get("")
async def list_recommendations(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    source_agent: Optional[str] = None,
    sort_by: str = Query("created_at"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await recommendation_service.list_recommendations(
        db, business["_id"], page=page, limit=limit, search=search, priority=priority,
        status=status, category=category, source_agent=source_agent,
        sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.get("/dashboard")
async def dashboard_recommendations(
    limit: int = Query(6, ge=1, le=10),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    """Fresh AI recommendations for the Dashboard (computed, not stored)."""
    recs = await generate_dashboard_recommendations(db, business["_id"], limit=limit)
    narrative = None
    engine = "deterministic"
    if llm.is_available():
        try:
            context = {
                "business": business.get("business_name"),
                "recommendations": [
                    {"title": r["title"], "priority": r["priority"], "description": r["description"],
                     "action": r["recommended_action"]}
                    for r in recs
                ],
            }
            narrative = await llm.complete(
                "You are the AI CFO assistant for an Indian MSME. Summarise the provided "
                "recommendations in 2-3 sentences using only the given data. Be concise.",
                f"Recommendations (JSON):\n{json.dumps(context, default=str)}",
            )
            if narrative:
                engine = llm.active_provider() or "gemini"
        except Exception as exc:  # pragma: no cover
            logger.warning("LLM narrative failed: %s", exc)
    if not narrative and recs:
        top = recs[0]
        narrative = (
            f"Top priority: {top['title'].lower()}. {len(recs)} data-driven "
            f"recommendation(s) are ready for review."
        )
    return ok(
        {
            "generated_at": utcnow(),
            "engine": engine,
            "recommendations": recs,
            "narrative": narrative,
        }
    )


@router.post("/generate", status_code=201)
async def generate(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    recs, stats = await recommendation_service.generate_with_stats(db, business["_id"])
    fresh = stats["created"] + stats["revived"]
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="recommendations",
        entity="recommendation",
        status="success",
        message=(
            f"Generated {fresh} new and refreshed {stats['updated']} AI recommendation(s)"
        ),
        details=stats,
    )
    message = (
        f"Generated {fresh} new recommendation(s)"
        if fresh
        else f"Refreshed {stats['total']} recommendation(s) — no new items found"
    )
    return ok(recs, message)


@router.put("/{recommendation_id}/acknowledge")
async def acknowledge(
    recommendation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await recommendation_service.acknowledge(db, business["_id"], recommendation_id))


@router.put("/{recommendation_id}/complete")
async def complete(
    recommendation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await recommendation_service.complete(db, business["_id"], recommendation_id))


@router.put("/{recommendation_id}/dismiss")
async def dismiss(
    recommendation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await recommendation_service.dismiss(db, business["_id"], recommendation_id))


@router.delete("/{recommendation_id}")
async def delete_recommendation(
    recommendation_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    await recommendation_service.delete(db, business["_id"], recommendation_id)
    return ok(message="Recommendation deleted")
