"""Business profile service (single business per owner)."""

from typing import Any

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.schemas.business import BusinessUpdateRequest
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc


async def get_business(db: AsyncIOMotorDatabase, business_id: Any) -> dict:
    doc = await db[COLLECTIONS["businesses"]].find_one({"_id": business_id})
    if not doc:
        raise NotFoundError("Business not found", "BUSINESS_NOT_FOUND")
    return serialize_doc(doc)


async def update_business(
    db: AsyncIOMotorDatabase, business_id: Any, data: BusinessUpdateRequest,
) -> dict:
    updates = {k: v for k, v in data.model_dump(exclude_unset=True).items() if v is not None}
    if updates:
        updates["updated_at"] = utcnow()
        result = await db[COLLECTIONS["businesses"]].find_one_and_update(
            {"_id": business_id},
            {"$set": updates},
            return_document=True,
        )
        if not result:
            raise NotFoundError("Business not found", "BUSINESS_NOT_FOUND")
        return serialize_doc(result)
    return await get_business(db, business_id)
