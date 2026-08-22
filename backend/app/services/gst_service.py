"""GST record CRUD + obligations with multi-tenant isolation."""

from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.schemas.finance import GSTCreate, GSTUpdate
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

_ALLOWED_SORTS = {"due_date", "period_end", "tax_amount", "created_at"}


def _outstanding(g: dict) -> float:
    return max(0.0, float(g.get("tax_amount") or 0) - float(g.get("paid_amount") or 0))


async def create(
    db: AsyncIOMotorDatabase, business_id: Any, user_id: Any, data: GSTCreate,
) -> dict:
    now = utcnow()
    doc = {
        "business_id": business_id,
        "period": data.period,
        "period_start": data.period_start,
        "period_end": data.period_end,
        "due_date": data.due_date,
        "taxable_turnover": data.taxable_turnover,
        "tax_amount": data.tax_amount,
        "paid_amount": data.paid_amount,
        "outstanding_amount": max(0.0, data.tax_amount - data.paid_amount),
        "status": data.status,
        "reference_number": data.reference_number,
        "notes": data.notes,
        "created_at": now,
        "updated_at": now,
    }
    result = await db[COLLECTIONS["gst_records"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def list_records(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    status: Optional[str] = None,
    sort_by: str = "due_date",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if status:
        q["status"] = status
    collection = db[COLLECTIONS["gst_records"]]
    total = await collection.count_documents(q)
    sort_key = sort_by if sort_by in _ALLOWED_SORTS else "due_date"
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_key, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def get(db: AsyncIOMotorDatabase, business_id: Any, gst_id: str) -> dict:
    doc = await db[COLLECTIONS["gst_records"]].find_one(
        {"_id": ObjectId(gst_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("GST record not found", "GST_NOT_FOUND")
    return serialize_doc(doc)


async def update(
    db: AsyncIOMotorDatabase, business_id: Any, gst_id: str, data: GSTUpdate,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow()
        doc = await db[COLLECTIONS["gst_records"]].find_one_and_update(
            {"_id": ObjectId(gst_id), "business_id": business_id},
            {"$set": updates},
            return_document=True,
        )
        if not doc:
            raise NotFoundError("GST record not found", "GST_NOT_FOUND")
        if "tax_amount" in updates or "paid_amount" in updates:
            doc = await db[COLLECTIONS["gst_records"]].find_one_and_update(
                {"_id": doc["_id"]},
                {"$set": {"outstanding_amount": _outstanding(doc)}},
                return_document=True,
            )
        return serialize_doc(doc)
    return await get(db, business_id, gst_id)


async def mark_filed(db: AsyncIOMotorDatabase, business_id: Any, gst_id: str) -> dict:
    doc = await db[COLLECTIONS["gst_records"]].find_one_and_update(
        {"_id": ObjectId(gst_id), "business_id": business_id},
        {"$set": {"status": "filed", "updated_at": utcnow()}},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("GST record not found", "GST_NOT_FOUND")
    return serialize_doc(doc)


async def delete(db: AsyncIOMotorDatabase, business_id: Any, gst_id: str) -> None:
    result = await db[COLLECTIONS["gst_records"]].delete_one(
        {"_id": ObjectId(gst_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("GST record not found", "GST_NOT_FOUND")


async def upcoming_obligations(db: AsyncIOMotorDatabase, business_id: Any, now=None) -> list[dict]:
    now = now or utcnow()
    docs = await db[COLLECTIONS["gst_records"]].find(
        {"business_id": business_id, "due_date": {"$gte": now}, "status": {"$nin": ["paid", "filed"]}}
    ).sort("due_date", 1).to_list(length=None)
    return serialize_docs(docs)


async def overdue_obligations(db: AsyncIOMotorDatabase, business_id: Any, now=None) -> list[dict]:
    now = now or utcnow()
    docs = await db[COLLECTIONS["gst_records"]].find(
        {"business_id": business_id, "due_date": {"$lt": now}, "status": {"$nin": ["paid", "filed"]}}
    ).sort("due_date", 1).to_list(length=None)
    return serialize_docs(docs)
