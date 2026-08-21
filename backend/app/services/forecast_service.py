"""Forecast service — generate and persist 30-day cash-flow forecasts."""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.ml.forecast import generate_forecast
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc


async def generate(
    db: AsyncIOMotorDatabase, business_id: Any, days: int = 30,
    now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    result = await generate_forecast(db, business_id, days=days, now=now)

    forecast = result["forecast"]
    doc = {
        "business_id": business_id,
        "days": result["days"],
        "model": result["model"],
        "confidence": result["confidence"],
        "historical_days": result["historical_days"],
        "note": result.get("note", ""),
        "predicted_inflow": [f["predicted_inflow"] for f in forecast],
        "predicted_outflow": [f["predicted_outflow"] for f in forecast],
        "predicted_net_cash_flow": [f["predicted_net_cash_flow"] for f in forecast],
        "lower_bound": [f["lower_bound"] for f in forecast],
        "upper_bound": [f["upper_bound"] for f in forecast],
        "summary": result["summary"],
        "generated_at": now,
    }
    await db[COLLECTIONS["forecasts"]].insert_one(doc)
    return serialize_doc(doc)


async def get_latest(db: AsyncIOMotorDatabase, business_id: Any) -> Optional[dict]:
    doc = await db[COLLECTIONS["forecasts"]].find_one(
        {"business_id": business_id}, sort=[("generated_at", -1)]
    )
    return serialize_doc(doc) if doc else None


async def history(db: AsyncIOMotorDatabase, business_id: Any, limit: int = 10) -> list[dict]:
    cursor = (
        db[COLLECTIONS["forecasts"]]
        .find({"business_id": business_id}, {"forecast": 0})
        .sort("generated_at", -1)
        .limit(limit)
    )
    docs = await cursor.to_list(length=limit)
    return [serialize_doc(d) for d in docs]
