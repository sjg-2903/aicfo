"""Loan readiness service — compute, persist and retrieve assessments."""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.ml.loan_readiness import compute_loan_readiness
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc


async def analyze(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    result = await compute_loan_readiness(db, business_id, now=now)
    doc = {"business_id": business_id, **result}
    await db[COLLECTIONS["risk_assessments"]].insert_one(
        {"business_id": business_id, "kind": "loan_readiness", **result}
    )
    return serialize_doc(doc)


async def get_latest(db: AsyncIOMotorDatabase, business_id: Any) -> Optional[dict]:
    doc = await db[COLLECTIONS["risk_assessments"]].find_one(
        {"business_id": business_id, "kind": "loan_readiness"},
        sort=[("generated_at", -1)],
    )
    return serialize_doc(doc) if doc else None
