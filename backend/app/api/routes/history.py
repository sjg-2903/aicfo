"""Activity history routes — unified timeline of a business's operations."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok_page
from app.services import history_service

router = APIRouter(prefix="/history", tags=["history"])


@router.get("")
async def list_history(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=100),
    event_type: Optional[str] = Query(None, description="upload | extraction | import | report | recommendations | record"),
    status: Optional[str] = Query(None, description="success | partial | failed"),
    search: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await history_service.list_history(
        db,
        business["_id"],
        page=page,
        limit=limit,
        event_type=event_type,
        status=status,
        search=search,
    )
    return ok_page(items, total, page, limit)
