"""Transaction CRUD + list/filter/search/sort with multi-tenant isolation."""

from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError, ValidationError
from app.schemas.finance import TransactionCreate, TransactionUpdate
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

_ALLOWED_SORTS = {"date", "amount", "description", "category", "created_at"}


def _build_query(business_id, *, search=None, type_=None, category=None,
                 start_date=None, end_date=None, payment_method=None) -> dict:
    q: dict = {"business_id": business_id}
    if type_:
        q["type"] = type_
    if category:
        q["category"] = category
    if payment_method:
        q["payment_method"] = payment_method
    if start_date or end_date:
        q["date"] = {}
        if start_date:
            q["date"]["$gte"] = start_date
        if end_date:
            q["date"]["$lte"] = end_date
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"description": rx}, {"category": rx}]
    return q


async def create(
    db: AsyncIOMotorDatabase, business_id: Any, user_id: Any, data: TransactionCreate,
) -> dict:
    now = utcnow()
    doc = {
        "business_id": business_id,
        "date": data.date,
        "description": data.description,
        "amount": data.amount,
        "type": data.type,
        "category": data.category or "General",
        "payment_method": data.payment_method,
        "reference_id": data.reference_id,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["transactions"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def list_transactions(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    type_: Optional[str] = None,
    category: Optional[str] = None,
    start_date=None,
    end_date=None,
    payment_method: Optional[str] = None,
    sort_by: str = "date",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    query = _build_query(
        business_id, search=search, type_=type_, category=category,
        start_date=start_date, end_date=end_date, payment_method=payment_method,
    )
    collection = db[COLLECTIONS["transactions"]]
    total = await collection.count_documents(query)
    sort_key = sort_by if sort_by in _ALLOWED_SORTS else "date"
    direction = 1 if sort_order == "asc" else -1
    cursor = (
        collection.find(query)
        .sort(sort_key, direction)
        .skip((page - 1) * limit)
        .limit(limit)
    )
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def get(db: AsyncIOMotorDatabase, business_id: Any, transaction_id: str) -> dict:
    doc = await db[COLLECTIONS["transactions"]].find_one(
        {"_id": ObjectId(transaction_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Transaction not found", "TRANSACTION_NOT_FOUND")
    return serialize_doc(doc)


async def update(
    db: AsyncIOMotorDatabase, business_id: Any, transaction_id: str, data: TransactionUpdate,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if not updates:
        return await get(db, business_id, transaction_id)
    updates["updated_at"] = utcnow()
    doc = await db[COLLECTIONS["transactions"]].find_one_and_update(
        {"_id": ObjectId(transaction_id), "business_id": business_id},
        {"$set": updates},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Transaction not found", "TRANSACTION_NOT_FOUND")
    return serialize_doc(doc)


async def delete(db: AsyncIOMotorDatabase, business_id: Any, transaction_id: str) -> None:
    result = await db[COLLECTIONS["transactions"]].delete_one(
        {"_id": ObjectId(transaction_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Transaction not found", "TRANSACTION_NOT_FOUND")
