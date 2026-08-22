"""Loan routes."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.finance import LoanCreate, LoanUpdate
from app.services import history_service, import_service, loan_service
from app.services.audit_service import record

router = APIRouter(prefix="/loans", tags=["loans"])


@router.get("")
async def list_loans(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    status: Optional[str] = None,
    lender: Optional[str] = None,
    sort_by: str = Query("start_date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await loan_service.list_loans(
        db, business["_id"], page=page, limit=limit, status=status,
        lender=lender, sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.post("/import", status_code=201)
async def import_loans(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await import_service.handle_upload(db, business["_id"], user["_id"], "loans", file)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="import", entity="loan", meta=result)
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="import",
        entity="loans",
        status="success" if result["failed_rows"] == 0 else "partial",
        message=f"Imported {result['successful_rows']} of {result['total_rows']} rows from {file.filename or 'file'}",
        details={"file_name": file.filename or "", **result},
    )
    return ok(result, "Import complete")


@router.post("", status_code=201)
async def create_loan(
    payload: LoanCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await loan_service.create(db, business["_id"], user["_id"], payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="create", entity="loan", entity_id=result["id"])
    return ok(result, "Loan created")


@router.get("/{loan_id}/emi-schedule")
async def emi_schedule(
    loan_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await loan_service.emi_schedule(db, business["_id"], loan_id))


@router.put("/{loan_id}/mark-emi-paid")
async def mark_emi_paid(
    loan_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await loan_service.mark_emi_paid(db, business["_id"], loan_id)
    return ok(result, "EMI marked as paid")


@router.put("/{loan_id}")
async def update_loan(
    loan_id: str,
    payload: LoanUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await loan_service.update(db, business["_id"], loan_id, payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="update", entity="loan", entity_id=loan_id)
    return ok(result, "Loan updated")


@router.delete("/{loan_id}")
async def delete_loan(
    loan_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    await loan_service.delete(db, business["_id"], loan_id)
    return ok(message="Loan deleted")
