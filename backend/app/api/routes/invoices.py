"""Invoice routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.finance import InvoiceCreate, InvoiceUpdate, MarkPaidRequest
from app.services import history_service, import_service, invoice_service
from app.services.audit_service import record

router = APIRouter(prefix="/invoices", tags=["invoices"])


@router.get("/overdue")
async def overdue(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await invoice_service.list_overdue(db, business["_id"]))


@router.get("")
async def list_invoices(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = Query("invoice_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await invoice_service.list_invoices(
        db, business["_id"], page=page, limit=limit, search=search, status=status,
        start_date=start_date, end_date=end_date, sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.post("/import", status_code=201)
async def import_invoices(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await import_service.handle_upload(db, business["_id"], user["_id"], "invoices", file)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="import", entity="invoice", meta=result)
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="import",
        entity="invoices",
        status="success" if result["failed_rows"] == 0 else "partial",
        message=f"Imported {result['successful_rows']} of {result['total_rows']} rows from {file.filename or 'file'}",
        details={"file_name": file.filename or "", **result},
    )
    return ok(result, "Import complete")


@router.post("", status_code=201)
async def create_invoice(
    payload: InvoiceCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await invoice_service.create(db, business["_id"], user["_id"], payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="create", entity="invoice", entity_id=result["id"])
    return ok(result, "Invoice created")


@router.put("/{invoice_id}")
async def update_invoice(
    invoice_id: str,
    payload: InvoiceUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await invoice_service.update(db, business["_id"], invoice_id, payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="update", entity="invoice", entity_id=invoice_id)
    return ok(result, "Invoice updated")


@router.put("/{invoice_id}/mark-paid")
async def mark_paid(
    invoice_id: str,
    payload: MarkPaidRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await invoice_service.mark_paid(db, business["_id"], invoice_id, payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="mark_paid", entity="invoice", entity_id=invoice_id)
    return ok(result, "Invoice marked as paid")


@router.put("/{invoice_id}/send")
async def send_invoice(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await invoice_service.send(db, business["_id"], invoice_id)
    return ok(result, "Invoice sent")


@router.delete("/{invoice_id}")
async def delete_invoice(
    invoice_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    await invoice_service.delete(db, business["_id"], invoice_id)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="delete", entity="invoice", entity_id=invoice_id)
    return ok(message="Invoice deleted")
