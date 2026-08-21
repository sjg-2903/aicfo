"""Dashboard service — aggregates KPIs, trends and distributions."""

from datetime import datetime, timedelta
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import (
    compute_daily_cashflow,
    compute_financial_metrics,
    fetch_transactions,
)
from app.core.constants import COLLECTIONS
from app.utils.dates import start_of_day, utcnow
from app.utils.serialize import serialize_docs


async def get_summary(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    metrics = await compute_financial_metrics(db, business_id, now)
    health = await compute_health_score(db, business_id, now)

    def trend(value: Optional[float]) -> Optional[float]:
        return value

    return {
        "revenue": {
            "current": metrics["revenue"]["current"],
            "trend": trend(metrics["revenue"]["change_pct"]),
            "comparison_period": "previous month",
        },
        "expenses": {
            "current": metrics["expenses"]["current"],
            "trend": trend(metrics["expenses"]["change_pct"]),
            "comparison_period": "previous month",
        },
        "net_profit": {
            "current": metrics["net_profit"]["current"],
            "trend": trend(metrics["net_profit"]["change_pct"]),
            "comparison_period": "previous month",
        },
        "cash_balance": {
            "current": metrics["cash_balance"]["current"],
            "trend": None,
            "comparison_period": None,
        },
        "outstanding_receivables": {
            "current": metrics["receivables"]["outstanding"],
            "trend": None,
            "overdue_amount": metrics["receivables"]["overdue"],
        },
        "outstanding_debt": {
            "current": metrics["debt"]["outstanding"],
            "upcoming_emi": metrics["debt"]["monthly_emi"],
            "next_emi_date": metrics["debt"]["next_emi_date"].isoformat()
            if metrics["debt"]["next_emi_date"]
            else None,
        },
        "health_score": {
            "score": health["score"],
            "status": health["status"],
            "label": health["label"],
        },
        "counts": {
            "transactions": metrics["transaction_count"],
            "invoices": metrics["invoice_count"],
            "expenses": metrics["expense_records_count"],
            "active_loans": metrics["active_loan_count"],
        },
        "period": metrics["period"],
    }


async def get_financial_health(db: AsyncIOMotorDatabase, business_id: Any, now=None) -> dict:
    return await compute_health_score(db, business_id, now)


async def monthly_series(
    db: AsyncIOMotorDatabase, business_id: Any, months: int = 6, now=None,
) -> list[dict]:
    """Monthly revenue / expenses / net cash-flow series (for charts)."""
    from app.analytics.metrics import compute_monthly_series

    result = await compute_monthly_series(db, business_id, months=months, now=now)
    return result["series"]


async def revenue_trend(db: AsyncIOMotorDatabase, business_id: Any, days: int = 30) -> list[dict]:
    now = utcnow()
    start = start_of_day(now) - timedelta(days=days - 1)
    transactions = await fetch_transactions(db, business_id, start, now)
    daily: dict[str, float] = {}
    for t in transactions:
        d = t["date"].date().isoformat()
        if t.get("type") == "income":
            daily[d] = daily.get(d, 0.0) + float(t.get("amount") or 0)
    rows = []
    for i in range(days):
        d = (start + timedelta(days=i)).date().isoformat()
        revenue = round(daily.get(d, 0.0), 2)
        rows.append({"date": d, "revenue": revenue, "target": round(revenue * 1.05, 2)})
    return rows


async def cash_flow_trend(db: AsyncIOMotorDatabase, business_id: Any, days: int = 30) -> list[dict]:
    return await compute_daily_cashflow(db, business_id, days=days)


async def expense_distribution(db: AsyncIOMotorDatabase, business_id: Any) -> list[dict]:
    docs = await db[COLLECTIONS["expenses"]].find({"business_id": business_id}).to_list(length=None)
    totals: dict[str, float] = {}
    for e in docs:
        cat = e.get("category") or "General"
        totals[cat] = totals.get(cat, 0.0) + float(e.get("amount") or 0)
    grand = sum(totals.values())
    out = [
        {"category": cat, "amount": round(amt, 2), "percentage": round(amt / grand * 100, 1) if grand else 0}
        for cat, amt in sorted(totals.items(), key=lambda kv: -kv[1])
    ]
    return out


async def receivables_aging(db: AsyncIOMotorDatabase, business_id: Any, now=None) -> list[dict]:
    now = now or utcnow()
    invoices = await db[COLLECTIONS["invoices"]].find(
        {"business_id": business_id, "status": {"$nin": ["draft", "cancelled"]}}
    ).to_list(length=None)

    brackets = [
        ("Not due", lambda d: d >= now, "#2563eb"),
        ("0-30 days", lambda d: now - timedelta(days=30) <= d < now, "#10b981"),
        ("31-60 days", lambda d: now - timedelta(days=60) <= d < now - timedelta(days=30), "#f59e0b"),
        ("61-90 days", lambda d: now - timedelta(days=90) <= d < now - timedelta(days=60), "#f97316"),
        ("90+ days", lambda d: d < now - timedelta(days=90), "#ef4444"),
    ]
    result = []
    for label, pred, color in brackets:
        amount = 0.0
        count = 0
        for inv in invoices:
            due = inv.get("due_date")
            outstanding = max(0.0, float(inv.get("total_amount") or 0) - float(inv.get("paid_amount") or 0))
            if outstanding <= 0:
                continue
            if pred(due):
                amount += outstanding
                count += 1
        result.append({"bracket": label, "amount": round(amount, 2), "count": count, "color": color})
    return result


async def loan_overview(db: AsyncIOMotorDatabase, business_id: Any) -> dict:
    loans = await db[COLLECTIONS["loans"]].find({"business_id": business_id}).to_list(length=None)
    active = [l for l in loans if l.get("status") == "active"]
    return {
        "total_loans": len(loans),
        "total_outstanding": round(sum(float(l.get("outstanding_amount") or 0) for l in active), 2),
        "total_emi_monthly": round(sum(float(l.get("emi_amount") or 0) for l in active), 2),
        "loans": [
            {
                "id": str(l["_id"]),
                "name": f"{l.get('loan_type','Loan')} — {l.get('lender','')}",
                "outstanding": float(l.get("outstanding_amount") or 0),
                "emi": float(l.get("emi_amount") or 0),
            }
            for l in active
        ],
    }
