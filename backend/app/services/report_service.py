"""Reporting service — structured JSON reports over computed analytics."""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import compute_daily_cashflow, compute_financial_metrics
from app.ml.loan_readiness import compute_loan_readiness
from app.ml.risk import analyze_risk
from app.utils.dates import utcnow


async def financial_summary(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    metrics = await compute_financial_metrics(db, business_id, now)
    health = await compute_health_score(db, business_id, now)
    readiness = await compute_loan_readiness(db, business_id, now)
    return {
        "report_type": "financial_summary",
        "generated_at": now,
        "metrics": metrics,
        "financial_health": health,
        "loan_readiness": readiness,
    }


async def cashflow_report(
    db: AsyncIOMotorDatabase, business_id: Any, days: int = 30,
    now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    daily = await compute_daily_cashflow(db, business_id, days=days, now=now)
    return {
        "report_type": "cashflow",
        "generated_at": now,
        "days": days,
        "daily": daily,
        "totals": {
            "inflow": round(sum(d["inflow"] for d in daily), 2),
            "outflow": round(sum(d["outflow"] for d in daily), 2),
            "net_cash_flow": round(sum(d["net_flow"] for d in daily), 2),
        },
    }


async def risk_report(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    risk = await analyze_risk(db, business_id, now=now)
    return {"report_type": "risk", "generated_at": now, **risk}
