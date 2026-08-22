"""Loan CRUD + EMI schedule with multi-tenant isolation."""

import math
from datetime import timedelta
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.schemas.finance import LoanCreate, LoanUpdate
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

_ALLOWED_SORTS = {"start_date", "outstanding_amount", "emi_amount", "created_at"}


async def create(
    db: AsyncIOMotorDatabase, business_id: Any, user_id: Any, data: LoanCreate,
) -> dict:
    now = utcnow()
    doc = {
        "business_id": business_id,
        "lender": data.lender,
        "loan_type": data.loan_type,
        "principal_amount": data.principal_amount,
        "outstanding_amount": data.outstanding_amount,
        "interest_rate": data.interest_rate,
        "emi_amount": data.emi_amount,
        "start_date": data.start_date,
        "end_date": data.end_date,
        "next_emi_date": data.next_emi_date,
        "status": data.status,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["loans"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def list_loans(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    lender: Optional[str] = None,
    sort_by: str = "start_date",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if status:
        q["status"] = status
    if lender:
        q["lender"] = {"$regex": lender, "$options": "i"}
    collection = db[COLLECTIONS["loans"]]
    total = await collection.count_documents(q)
    sort_key = sort_by if sort_by in _ALLOWED_SORTS else "start_date"
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_key, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def get(db: AsyncIOMotorDatabase, business_id: Any, loan_id: str) -> dict:
    doc = await db[COLLECTIONS["loans"]].find_one(
        {"_id": ObjectId(loan_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Loan not found", "LOAN_NOT_FOUND")
    return serialize_doc(doc)


async def update(
    db: AsyncIOMotorDatabase, business_id: Any, loan_id: str, data: LoanUpdate,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return await get(db, business_id, loan_id)
    updates["updated_at"] = utcnow()
    doc = await db[COLLECTIONS["loans"]].find_one_and_update(
        {"_id": ObjectId(loan_id), "business_id": business_id},
        {"$set": updates},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Loan not found", "LOAN_NOT_FOUND")
    return serialize_doc(doc)


async def mark_emi_paid(db: AsyncIOMotorDatabase, business_id: Any, loan_id: str) -> dict:
    doc = await db[COLLECTIONS["loans"]].find_one(
        {"_id": ObjectId(loan_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Loan not found", "LOAN_NOT_FOUND")
    emi = float(doc.get("emi_amount") or 0)
    new_outstanding = max(0.0, float(doc.get("outstanding_amount") or 0) - emi)
    next_emi = doc.get("next_emi_date")
    if next_emi:
        next_emi = next_emi + timedelta(days=30)
    status = doc.get("status")
    if new_outstanding <= 0:
        status = "closed"
    updated = await db[COLLECTIONS["loans"]].find_one_and_update(
        {"_id": ObjectId(loan_id), "business_id": business_id},
        {"$set": {"outstanding_amount": new_outstanding, "next_emi_date": next_emi, "status": status, "updated_at": utcnow()}},
        return_document=True,
    )
    return serialize_doc(updated)


async def delete(db: AsyncIOMotorDatabase, business_id: Any, loan_id: str) -> None:
    result = await db[COLLECTIONS["loans"]].delete_one(
        {"_id": ObjectId(loan_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Loan not found", "LOAN_NOT_FOUND")


async def emi_schedule(db: AsyncIOMotorDatabase, business_id: Any, loan_id: str) -> list[dict]:
    """Compute a monthly reducing-balance EMI schedule for a loan."""
    doc = await db[COLLECTIONS["loans"]].find_one(
        {"_id": ObjectId(loan_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Loan not found", "LOAN_NOT_FOUND")

    principal = float(doc.get("outstanding_amount") or doc.get("principal_amount") or 0)
    annual_rate = float(doc.get("interest_rate") or 0)
    monthly_rate = annual_rate / 100 / 12
    emi = float(doc.get("emi_amount") or 0)

    # If no EMI configured, derive it from principal/rate/tenor.
    start = doc.get("start_date")
    end = doc.get("end_date")
    months = 12
    if start and end:
        months = max(1, math.ceil((end - start).days / 30.0))
    if emi <= 0 and monthly_rate > 0:
        emi = principal * monthly_rate * (1 + monthly_rate) ** months / ((1 + monthly_rate) ** months - 1)
    elif emi <= 0:
        emi = principal / months if months else 0

    schedule = []
    balance = principal
    month = start or utcnow()
    for i in range(1, months + 1):
        interest = balance * monthly_rate
        principal_part = min(emi - interest, balance) if emi > 0 else 0
        principal_part = max(0.0, principal_part)
        balance = max(0.0, balance - principal_part)
        due = month + timedelta(days=30 * (i - 1))
        schedule.append(
            {
                "emi_number": i,
                "due_date": due.isoformat(),
                "principal": round(principal_part, 2),
                "interest": round(interest, 2),
                "emi_amount": round(min(emi, principal_part + interest), 2),
                "outstanding_balance": round(balance, 2),
                "status": "paid" if balance <= 0 else "pending",
            }
        )
        if balance <= 0:
            break
    return schedule
