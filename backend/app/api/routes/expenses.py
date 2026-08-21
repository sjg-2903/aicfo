"""Expense routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.finance import ExpenseCreate, ExpenseUpdate
from app.services import expense_service, history_service, import_service
from app.services.audit_service import record

router = APIRouter(prefix="/expenses", tags=["expenses"])


@router.get("/categories")
async def categories(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await expense_service.list_categories(db, business["_id"]))


@router.get("")
async def list_expenses(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    category: Optional[str] = None,
    vendor: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    sort_by: str = Query("date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await expense_service.list_expenses(
        db, business["_id"], page=page, limit=limit, search=search, category=category,
        vendor=vendor, start_date=start_date, end_date=end_date,
        sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.post("/import", status_code=201)
async def import_expenses(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await import_service.handle_upload(db, business["_id"], user["_id"], "expenses", file)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="import", entity="expense", meta=result)
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="import",
        entity="expenses",
        status="success" if result["failed_rows"] == 0 else "partial",
        message=f"Imported {result['successful_rows']} of {result['total_rows']} rows from {file.filename or 'file'}",
        details={"file_name": file.filename or "", **result},
    )
    return ok(result, "Import complete")


@router.post("", status_code=201)
async def create_expense(
    payload: ExpenseCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await expense_service.create(db, business["_id"], user["_id"], payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="create", entity="expense", entity_id=result["id"])
    return ok(result, "Expense created")


@router.put("/{expense_id}")
async def update_expense(
    expense_id: str,
    payload: ExpenseUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await expense_service.update(db, business["_id"], expense_id, payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="update", entity="expense", entity_id=expense_id)
    return ok(result, "Expense updated")


@router.delete("/{expense_id}")
async def delete_expense(
    expense_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    await expense_service.delete(db, business["_id"], expense_id)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="delete", entity="expense", entity_id=expense_id)
    return ok(message="Expense deleted")
