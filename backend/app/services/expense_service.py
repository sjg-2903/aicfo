"""Expense CRUD + list/filter/search/sort with multi-tenant isolation."""

from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.schemas.finance import ExpenseCreate, ExpenseUpdate
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

_ALLOWED_SORTS = {"date", "amount", "description", "category", "vendor", "created_at"}


async def create(
    db: AsyncIOMotorDatabase, business_id: Any, user_id: Any, data: ExpenseCreate,
) -> dict:
    now = utcnow()
    doc = {
        "business_id": business_id,
        "date": data.date,
        "description": data.description,
        "category": data.category or "General",
        "vendor": data.vendor,
        "amount": data.amount,
        "payment_method": data.payment_method,
        "recurring": data.recurring,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["expenses"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def list_expenses(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    category: Optional[str] = None,
    vendor: Optional[str] = None,
    start_date=None,
    end_date=None,
    sort_by: str = "date",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if category:
        q["category"] = category
    if vendor:
        q["vendor"] = vendor
    if start_date or end_date:
        q["date"] = {}
        if start_date:
            q["date"]["$gte"] = start_date
        if end_date:
            q["date"]["$lte"] = end_date
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"description": rx}, {"vendor": rx}, {"category": rx}]

    collection = db[COLLECTIONS["expenses"]]
    total = await collection.count_documents(q)
    sort_key = sort_by if sort_by in _ALLOWED_SORTS else "date"
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_key, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def list_categories(db: AsyncIOMotorDatabase, business_id: Any) -> list[str]:
    docs = await db[COLLECTIONS["expenses"]].find(
        {"business_id": business_id}, {"category": 1}
    ).to_list(length=None)
    categories = sorted({d.get("category", "") for d in docs if d.get("category")})
    return categories


async def get(db: AsyncIOMotorDatabase, business_id: Any, expense_id: str) -> dict:
    doc = await db[COLLECTIONS["expenses"]].find_one(
        {"_id": ObjectId(expense_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Expense not found", "EXPENSE_NOT_FOUND")
    return serialize_doc(doc)


async def update(
    db: AsyncIOMotorDatabase, business_id: Any, expense_id: str, data: ExpenseUpdate,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return await get(db, business_id, expense_id)
    updates["updated_at"] = utcnow()
    doc = await db[COLLECTIONS["expenses"]].find_one_and_update(
        {"_id": ObjectId(expense_id), "business_id": business_id},
        {"$set": updates},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Expense not found", "EXPENSE_NOT_FOUND")
    return serialize_doc(doc)


async def delete(db: AsyncIOMotorDatabase, business_id: Any, expense_id: str) -> None:
    result = await db[COLLECTIONS["expenses"]].delete_one(
        {"_id": ObjectId(expense_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Expense not found", "EXPENSE_NOT_FOUND")
