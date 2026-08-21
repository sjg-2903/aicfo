"""Alert routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok, ok_page
from app.schemas.analytics import AlertPatchRequest
from app.services import alert_service

router = APIRouter(prefix="/alerts", tags=["alerts"])


@router.get("")
async def list_alerts(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    severity: Optional[str] = None,
    type: Optional[str] = None,
    is_read: Optional[bool] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await alert_service.list_alerts(
        db, business["_id"], page=page, limit=limit, severity=severity,
        type_=type, is_read=is_read,
    )
    return ok_page(items, total, page, limit)


@router.patch("/{alert_id}/read")
async def mark_read(
    alert_id: str,
    payload: AlertPatchRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    read = True if payload.read is None else payload.read
    result = await alert_service.mark_read(db, business["_id"], alert_id, read=read)
    return ok(result, "Alert updated")
