"""Invoice CRUD + overdue listing with multi-tenant isolation."""

from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import ConflictError, NotFoundError
from app.schemas.finance import InvoiceCreate, InvoiceUpdate, MarkPaidRequest
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs

_ALLOWED_SORTS = {"invoice_date", "due_date", "total_amount", "invoice_number", "created_at"}


async def create(
    db: AsyncIOMotorDatabase, business_id: Any, user_id: Any, data: InvoiceCreate,
) -> dict:
    now = utcnow()
    doc = {
        "business_id": business_id,
        "invoice_number": data.invoice_number,
        "customer_name": data.customer_name,
        "customer_email": data.customer_email or "",
        "invoice_date": data.invoice_date,
        "due_date": data.due_date,
        "total_amount": data.total_amount,
        "paid_amount": data.paid_amount,
        "outstanding_amount": max(0.0, data.total_amount - data.paid_amount),
        "status": data.status,
        "items": [i.model_dump() for i in data.items],
        "notes": data.notes or "",
        "created_at": now,
        "updated_at": now,
    }
    # Prevent duplicate invoice numbers within a business.
    exists = await db[COLLECTIONS["invoices"]].find_one(
        {"business_id": business_id, "invoice_number": data.invoice_number}
    )
    if exists:
        raise ConflictError("Invoice number already exists", "INVOICE_NUMBER_EXISTS")
    result = await db[COLLECTIONS["invoices"]].insert_one(doc)
    doc["_id"] = result.inserted_id
    return serialize_doc(doc)


async def list_invoices(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    status: Optional[str] = None,
    start_date=None,
    end_date=None,
    sort_by: str = "invoice_date",
    sort_order: str = "desc",
    overdue_only: bool = False,
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if status:
        q["status"] = status
    if overdue_only:
        q["status"] = "overdue"
    if start_date or end_date:
        q["invoice_date"] = {}
        if start_date:
            q["invoice_date"]["$gte"] = start_date
        if end_date:
            q["invoice_date"]["$lte"] = end_date
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"customer_name": rx}, {"invoice_number": rx}]

    collection = db[COLLECTIONS["invoices"]]
    total = await collection.count_documents(q)
    sort_key = sort_by if sort_by in _ALLOWED_SORTS else "invoice_date"
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_key, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def list_overdue(db: AsyncIOMotorDatabase, business_id: Any, now=None) -> list[dict]:
    now = now or utcnow()
    docs = await db[COLLECTIONS["invoices"]].find(
        {"business_id": business_id, "status": "overdue"}
    ).to_list(length=None)
    return serialize_docs(docs)


async def get(db: AsyncIOMotorDatabase, business_id: Any, invoice_id: str) -> dict:
    doc = await db[COLLECTIONS["invoices"]].find_one(
        {"_id": ObjectId(invoice_id), "business_id": business_id}
    )
    if not doc:
        raise NotFoundError("Invoice not found", "INVOICE_NOT_FOUND")
    return serialize_doc(doc)


async def update(
    db: AsyncIOMotorDatabase, business_id: Any, invoice_id: str, data: InvoiceUpdate,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if "items" in updates:
        updates["items"] = [i.model_dump() for i in (updates["items"] or [])]
    if updates:
        updates["updated_at"] = utcnow()
        doc = await db[COLLECTIONS["invoices"]].find_one_and_update(
            {"_id": ObjectId(invoice_id), "business_id": business_id},
            {"$set": updates},
            return_document=True,
        )
        if not doc:
            raise NotFoundError("Invoice not found", "INVOICE_NOT_FOUND")
        # Recompute outstanding if totals changed.
        if "total_amount" in updates or "paid_amount" in updates:
            doc = await db[COLLECTIONS["invoices"]].find_one_and_update(
                {"_id": doc["_id"]},
                {"$set": {"outstanding_amount": max(0.0, doc["total_amount"] - doc["paid_amount"])}},
                return_document=True,
            )
        return serialize_doc(doc)
    return await get(db, business_id, invoice_id)


async def mark_paid(
    db: AsyncIOMotorDatabase, business_id: Any, invoice_id: str, data: MarkPaidRequest,
) -> dict:
    doc = await db[COLLECTIONS["invoices"]].find_one_and_update(
        {"_id": ObjectId(invoice_id), "business_id": business_id},
        {
            "$set": {
                "paid_amount": data.paid_amount,
                "outstanding_amount": None,  # computed below
                "updated_at": utcnow(),
            }
        },
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Invoice not found", "INVOICE_NOT_FOUND")
    total = doc.get("total_amount", 0)
    paid = data.paid_amount
    status = "paid" if paid >= total else doc.get("status", "sent")
    if paid > 0 and paid < total:
        status = doc.get("status", "sent") if doc.get("status") != "overdue" else "overdue"
    doc = await db[COLLECTIONS["invoices"]].find_one_and_update(
        {"_id": doc["_id"]},
        {"$set": {"outstanding_amount": max(0.0, total - paid), "status": status}},
        return_document=True,
    )
    return serialize_doc(doc)


async def send(db: AsyncIOMotorDatabase, business_id: Any, invoice_id: str) -> dict:
    doc = await db[COLLECTIONS["invoices"]].find_one_and_update(
        {"_id": ObjectId(invoice_id), "business_id": business_id},
        {"$set": {"status": "sent", "updated_at": utcnow()}},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Invoice not found", "INVOICE_NOT_FOUND")
    return serialize_doc(doc)


async def delete(db: AsyncIOMotorDatabase, business_id: Any, invoice_id: str) -> None:
    result = await db[COLLECTIONS["invoices"]].delete_one(
        {"_id": ObjectId(invoice_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Invoice not found", "INVOICE_NOT_FOUND")
