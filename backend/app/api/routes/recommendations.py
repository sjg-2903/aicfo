"""Recommendation routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok, ok_page
from app.services import recommendation_service

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


@router.post("/generate", status_code=201)
async def generate(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    recs = await recommendation_service.generate(db, business["_id"])
    return ok(recs, f"Generated {len(recs)} recommendations")


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
