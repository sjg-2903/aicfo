"""Audit logging for important financial actions."""

from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.utils.dates import utcnow


async def record(
    db: AsyncIOMotorDatabase,
    *,
    business_id: Any,
    user_id: Any,
    action: str,
    entity: str,
    entity_id: Optional[Any] = None,
    meta: Optional[dict] = None,
) -> None:
    doc = {
        "business_id": business_id,
        "user_id": user_id,
        "action": action,
        "entity": entity,
        "entity_id": str(entity_id) if entity_id is not None else None,
        "meta": meta or {},
        "created_at": utcnow(),
    }
    try:
        await db[COLLECTIONS["audit_logs"]].insert_one(doc)
    except Exception:
        # Audit failure must never break the primary operation.
        pass
