"""Recommendation service — generate, list, acknowledge, complete, dismiss."""

from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.ml.recommendation import generate_recommendations
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs


async def generate(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> list[dict]:
    now = now or utcnow()
    recs = await generate_recommendations(db, business_id, now=now)
    inserted = []
    for r in recs:
        existing = await db[COLLECTIONS["recommendations"]].find_one(
            {"business_id": business_id, "rid": r["_rid"], "status": {"$ne": "dismissed"}}
        )
        if existing:
            continue
        doc = {**r}
        doc.pop("_rid", None)
        doc["rid"] = r["_rid"]
        result = await db[COLLECTIONS["recommendations"]].insert_one(doc)
        doc["_id"] = result.inserted_id
        inserted.append(serialize_doc(doc))
    return inserted


async def list_recommendations(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    search: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    category: Optional[str] = None,
    source_agent: Optional[str] = None,
    sort_by: str = "created_at",
    sort_order: str = "desc",
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if priority:
        q["priority"] = priority
    if status:
        q["status"] = status
    if category:
        q["category"] = category
    if source_agent:
        q["source_agent"] = source_agent
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"title": rx}, {"description": rx}]

    collection = db[COLLECTIONS["recommendations"]]
    total = await collection.count_documents(q)
    direction = 1 if sort_order == "asc" else -1
    cursor = collection.find(q).sort(sort_by, direction).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def _set_status(
    db: AsyncIOMotorDatabase, business_id: Any, rec_id: str, status: str,
) -> dict:
    doc = await db[COLLECTIONS["recommendations"]].find_one_and_update(
        {"_id": ObjectId(rec_id), "business_id": business_id},
        {"$set": {"status": status, "updated_at": utcnow()}},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Recommendation not found", "RECOMMENDATION_NOT_FOUND")
    return serialize_doc(doc)


async def acknowledge(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    return await _set_status(db, business_id, rec_id, "acknowledged")


async def complete(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    doc = await _set_status(db, business_id, rec_id, "completed")
    return doc


async def dismiss(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> dict:
    return await _set_status(db, business_id, rec_id, "dismissed")
