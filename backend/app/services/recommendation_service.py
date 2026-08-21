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

_PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}


_CONTENT_FIELDS = (
    "title",
    "description",
    "reason",
    "priority",
    "recommended_action",
    "expected_impact",
    "impact_value",
    "source_agent",
    "category",
)


async def generate_with_stats(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> tuple[list[dict], dict]:
    """Run the recommendation engine and persist the result.

    Unlike a plain "insert new rows" pass, this *upserts*: recommendations that
    already exist are refreshed with the latest numbers, previously dismissed
    ones are revived (the user explicitly asked for a fresh analysis) and the
    full, current, non-dismissed set is returned. That guarantees the API never
    responds with an empty payload when the engine produced recommendations.
    """
    now = now or utcnow()
    recs = await generate_recommendations(db, business_id, now=now)
    collection = db[COLLECTIONS["recommendations"]]

    created = 0
    updated = 0
    revived = 0
    items: list[dict] = []

    for r in recs:
        rid = r["_rid"]
        payload = {k: v for k, v in r.items() if k in _CONTENT_FIELDS}
        existing = await collection.find_one({"business_id": business_id, "rid": rid})

        if existing is None:
            doc = {k: v for k, v in r.items() if k != "_rid"}
            doc["rid"] = rid
            doc["status"] = "new"
            doc["created_at"] = now
            doc["updated_at"] = now
            result = await collection.insert_one(doc)
            doc["_id"] = result.inserted_id
            items.append(serialize_doc(doc))
            created += 1
            continue

        update: dict = {**payload, "updated_at": now, "last_generated_at": now}
        if existing.get("status") == "dismissed":
            update["status"] = "new"
            update["created_at"] = now
            revived += 1
        else:
            updated += 1

        doc = await collection.find_one_and_update(
            {"_id": existing["_id"]}, {"$set": update}, return_document=True,
        )
        items.append(serialize_doc(doc))

    # Include any other still-active recommendations (e.g. ones the engine no
    # longer emits this run) so the client always receives the full picture.
    known_rids = {r["_rid"] for r in recs}
    cursor = collection.find(
        {"business_id": business_id, "status": {"$ne": "dismissed"}, "rid": {"$nin": list(known_rids)}}
    )
    others = await cursor.to_list(length=500)
    items.extend(serialize_docs(others))

    items.sort(key=lambda d: _PRIORITY_ORDER.get(str(d.get("priority")), 9))
    stats = {
        "created": created,
        "updated": updated,
        "revived": revived,
        "total": len(items),
    }
    return items, stats


async def generate(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> list[dict]:
    items, _ = await generate_with_stats(db, business_id, now=now)
    return items


async def delete(db: AsyncIOMotorDatabase, business_id: Any, rec_id: str) -> None:
    result = await db[COLLECTIONS["recommendations"]].delete_one(
        {"_id": ObjectId(rec_id), "business_id": business_id}
    )
    if result.deleted_count == 0:
        raise NotFoundError("Recommendation not found", "RECOMMENDATION_NOT_FOUND")


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
