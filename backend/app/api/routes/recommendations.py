"""Recommendation routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.analytics import RecommendationGenerateRequest
from app.services import history_service, recommendation_service

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


@router.get("/summary")
async def summary_bullets(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    """Return the complete financial-summary recommendations section.

    Both the Recommendations page and Dashboard consume this same endpoint and
    rendering component. Deterministic recommendation rules remain the source
    of truth; the configured AI provider may only improve the natural-language summary when it is
    configured and returns a valid response.
    """
    result = await recommendation_service.generate_summary_bullets(db, business["_id"])
    return ok(result)


@router.post("/generate", status_code=201)
async def generate(
    payload: RecommendationGenerateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    # The Generate button deliberately sends an explicit natural-language
    # instruction. The service adds trusted finance analysis and the display
    # schema, then falls back to the deterministic engine if an AI provider is not
    # configured or returns malformed data.
    recs, stats = await recommendation_service.generate_with_stats(
        db, business["_id"], prompt=payload.prompt
    )
    generated = stats["created"]
    removed = stats.get("removed", 0)
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="recommendations",
        entity="recommendation",
        status="success",
        message=(
            f"Generated {generated} fresh recommendation(s) and removed "
            f"{removed} previous item(s)"
        ),
        details=stats,
    )
    return ok(
        {
            "recommendations": recs,
            "engine": stats.get("engine", "deterministic"),
            "summary_bullets": stats.get("summary_bullets", []),
            "summary_engine": stats.get("summary_engine", "deterministic"),
        },
        f"Generated {generated} fresh recommendation(s) from your finance analysis",
    )


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
