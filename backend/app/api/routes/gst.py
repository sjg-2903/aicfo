"""GST & tax routes."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.finance import GSTCreate, GSTUpdate
from app.services import gst_service, import_service
from app.services.audit_service import record

router = APIRouter(prefix="/gst", tags=["gst"])


@router.get("/obligations/upcoming")
async def upcoming(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await gst_service.upcoming_obligations(db, business["_id"]))


@router.get("/obligations/overdue")
async def overdue(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await gst_service.overdue_obligations(db, business["_id"]))


@router.get("")
async def list_records(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    status: Optional[str] = None,
    sort_by: str = Query("due_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await gst_service.list_records(
        db, business["_id"], page=page, limit=limit, status=status,
        sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.post("/import", status_code=201)
async def import_gst(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await import_service.handle_upload(db, business["_id"], user["_id"], "gst", file)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="import", entity="gst", meta=result)
    return ok(result, "Import complete")


@router.post("", status_code=201)
async def create_record(
    payload: GSTCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await gst_service.create(db, business["_id"], user["_id"], payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="create", entity="gst", entity_id=result["id"])
    return ok(result, "GST record created")


@router.get("/{gst_id}")
async def get_record(
    gst_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await gst_service.get(db, business["_id"], gst_id))


@router.put("/{gst_id}/mark-filed")
async def mark_filed(
    gst_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await gst_service.mark_filed(db, business["_id"], gst_id)
    return ok(result, "GST marked as filed")


@router.put("/{gst_id}")
async def update_record(
    gst_id: str,
    payload: GSTUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await gst_service.update(db, business["_id"], gst_id, payload)
    return ok(result, "GST record updated")


@router.delete("/{gst_id}")
async def delete_record(
    gst_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    await gst_service.delete(db, business["_id"], gst_id)
    return ok(message="GST record deleted")
