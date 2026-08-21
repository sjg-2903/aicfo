"""Transaction routes."""

from datetime import datetime
from typing import Optional

from fastapi import APIRouter, Depends, File, Query, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok, ok_page
from app.schemas.finance import TransactionCreate, TransactionUpdate
from app.services import import_service, transaction_service
from app.services.audit_service import record

router = APIRouter(prefix="/transactions", tags=["transactions"])


@router.get("")
async def list_transactions(
    page: int = Query(1, ge=1),
    limit: int = Query(20, ge=1, le=500),
    search: Optional[str] = None,
    type: Optional[str] = None,
    category: Optional[str] = None,
    start_date: Optional[datetime] = None,
    end_date: Optional[datetime] = None,
    payment_method: Optional[str] = None,
    sort_by: str = Query("date"),
    sort_order: str = Query("desc", pattern="^(asc|desc)$"),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    items, total = await transaction_service.list_transactions(
        db, business["_id"], page=page, limit=limit, search=search, type_=type,
        category=category, start_date=start_date, end_date=end_date,
        payment_method=payment_method, sort_by=sort_by, sort_order=sort_order,
    )
    return ok_page(items, total, page, limit)


@router.post("", status_code=201)
async def create_transaction(
    payload: TransactionCreate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await transaction_service.create(db, business["_id"], user["_id"], payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="create", entity="transaction", entity_id=result["id"])
    return ok(result, "Transaction created")


@router.put("/{transaction_id}")
async def update_transaction(
    transaction_id: str,
    payload: TransactionUpdate,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    result = await transaction_service.update(db, business["_id"], transaction_id, payload)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="update", entity="transaction", entity_id=transaction_id)
    return ok(result, "Transaction updated")


@router.delete("/{transaction_id}")
async def delete_transaction(
    transaction_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    await transaction_service.delete(db, business["_id"], transaction_id)
    await record(db, business_id=business["_id"], user_id=user["_id"], action="delete", entity="transaction", entity_id=transaction_id)
    return ok(message="Transaction deleted")


@router.post("/import", status_code=201)
async def import_transactions(
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    content = await file.read()
    result = await import_service.import_csv(
        db, business["_id"], user["_id"], "transactions", content, file.filename or ""
    )
    await record(db, business_id=business["_id"], user_id=user["_id"], action="import", entity="transaction", meta=result)
    return ok(result, "Import complete")
