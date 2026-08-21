"""Risk analysis service — run the Risk Engine and persist assessments."""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.ml.risk import analyze_risk
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_value


async def analyze(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    result = await analyze_risk(db, business_id, now=now)
    doc = {"business_id": business_id, **result}
    await db[COLLECTIONS["risk_assessments"]].insert_one(doc)
    return serialize_doc(doc)


async def get_latest(db: AsyncIOMotorDatabase, business_id: Any) -> Optional[dict]:
    doc = await db[COLLECTIONS["risk_assessments"]].find_one(
        {"business_id": business_id}, sort=[("generated_at", -1)]
    )
    return serialize_doc(doc) if doc else None


async def list_assessments(db: AsyncIOMotorDatabase, business_id: Any, limit: int = 10) -> list[dict]:
    cursor = (
        db[COLLECTIONS["risk_assessments"]]
        .find({"business_id": business_id}, {"risks": 0})
        .sort("generated_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]


async def set_risk_status(
    db: AsyncIOMotorDatabase, business_id: Any, risk_id: str, status: str,
) -> dict:
    assessment = await db[COLLECTIONS["risk_assessments"]].find_one(
        {"business_id": business_id}, sort=[("generated_at", -1)]
    )
    if not assessment:
        return {}
    risks = assessment.get("risks", [])
    updated = None
    for r in risks:
        if r.get("id") == risk_id:
            r["status"] = status
            updated = r
            break
    if updated is None:
        return {}
    await db[COLLECTIONS["risk_assessments"]].update_one(
        {"_id": assessment["_id"]}, {"$set": {"risks": risks}}
    )
    return serialize_value(updated)
