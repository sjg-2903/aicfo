"""Deterministic financial metrics computed from actual MongoDB data.

Revenue, expenses, profit, receivables, debt and cash flow are *always*
computed here in Python — never delegated to an LLM.
"""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS
from app.utils.dates import (
    end_of_day,
    months_back,
    start_of_day,
    start_of_month,
    utcnow,
)


async def _fetch(
    db: AsyncIOMotorDatabase,
    collection: str,
    business_id: Any,
    query: Optional[dict] = None,
) -> list[dict]:
    q = {"business_id": business_id}
    if query:
        q.update(query)
    return await db[collection].find(q).to_list(length=None)


async def fetch_transactions(
    db: AsyncIOMotorDatabase, business_id: Any, start: Optional[datetime] = None,
    end: Optional[datetime] = None,
) -> list[dict]:
    q: dict = {}
    if start or end:
        q["date"] = {}
        if start:
            q["date"]["$gte"] = start_of_day(start)
        if end:
            q["date"]["$lte"] = end_of_day(end)
    return await _fetch(db, COLLECTIONS["transactions"], business_id, q)


async def has_financial_data(db: AsyncIOMotorDatabase, business_id: Any) -> bool:
    """Return True if the business has any imported financial records.

    Used by the scoring engines so that a brand-new (empty) account reports a
    neutral zero state instead of a misleading default score.
    """
    for collection in ("transactions", "invoices", "expenses", "loans", "gst_records"):
        count = await db[COLLECTIONS[collection]].count_documents(
            {"business_id": business_id}
        )
        if count:
            return True
    return False


async def compute_financial_metrics(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    this_month_start = start_of_month(now)
    prev_month_start = months_back(now, 1)
    prev_month_end = this_month_start

    transactions = await fetch_transactions(db, business_id)
    expenses = await _fetch(db, COLLECTIONS["expenses"], business_id)
    invoices = await _fetch(db, COLLECTIONS["invoices"], business_id)
    loans = await _fetch(db, COLLECTIONS["loans"], business_id)

    def _sum(_docs: list[dict], field: str, _type: Optional[str] = None) -> float:
        total = 0.0
        for d in _docs:
            if _type is not None and d.get("type") != _type:
                continue
            total += float(d.get(field) or 0)
        return total

    def _sum_between(_docs: list[dict], field: str, start, end, _type=None) -> float:
        total = 0.0
        for d in _docs:
            if _type is not None and d.get("type") != _type:
                continue
            dt = d.get("date")
            if dt is None or dt < start or dt >= end:
                continue
            total += float(d.get(field) or 0)
        return total

    revenue_all = _sum(transactions, "amount", "income")
    expense_all = _sum(transactions, "amount", "expense")

    revenue_cur = _sum_between(transactions, "amount", this_month_start, now, "income")
    revenue_prev = _sum_between(transactions, "amount", prev_month_start, prev_month_end, "income")
    expense_cur = _sum_between(transactions, "amount", this_month_start, now, "expense")
    expense_prev = _sum_between(transactions, "amount", prev_month_start, prev_month_end, "expense")

    profit_cur = revenue_cur - expense_cur
    profit_prev = revenue_prev - expense_prev

    def _pct(current: float, previous: float) -> Optional[float]:
        if previous == 0:
            return None
        return round((current - previous) / abs(previous) * 100, 2)

    # Receivables from actual unpaid invoice values.
    receivables_outstanding = 0.0
    receivables_overdue = 0.0
    for inv in invoices:
        status = inv.get("status")
        if status in ("draft", "cancelled"):
            continue
        outstanding = float(inv.get("total_amount") or 0) - float(inv.get("paid_amount") or 0)
        receivables_outstanding += max(0.0, outstanding)
        if status == "overdue":
            receivables_overdue += max(0.0, outstanding)

    # Debt from active loans.
    debt_outstanding = 0.0
    monthly_emi = 0.0
    next_emi_dates = []
    for loan in loans:
        if loan.get("status") != "active":
            continue
        debt_outstanding += float(loan.get("outstanding_amount") or 0)
        monthly_emi += float(loan.get("emi_amount") or 0)
        ned = loan.get("next_emi_date")
        if ned:
            next_emi_dates.append(ned)

    cash_balance = revenue_all - expense_all

    return {
        "revenue": {
            "current": round(revenue_cur, 2),
            "previous": round(revenue_prev, 2),
            "change_pct": _pct(revenue_cur, revenue_prev),
            "all_time": round(revenue_all, 2),
        },
        "expenses": {
            "current": round(expense_cur, 2),
            "previous": round(expense_prev, 2),
            "change_pct": _pct(expense_cur, expense_prev),
            "all_time": round(expense_all, 2),
        },
        "net_profit": {
            "current": round(profit_cur, 2),
            "previous": round(profit_prev, 2),
            "change_pct": _pct(profit_cur, profit_prev),
        },
        "cash_balance": {"current": round(cash_balance, 2)},
        "receivables": {
            "outstanding": round(receivables_outstanding, 2),
            "overdue": round(receivables_overdue, 2),
        },
        "debt": {
            "outstanding": round(debt_outstanding, 2),
            "monthly_emi": round(monthly_emi, 2),
            "next_emi_date": min(next_emi_dates) if next_emi_dates else None,
        },
        "expense_records_count": len(expenses),
        "transaction_count": len(transactions),
        "invoice_count": len(invoices),
        "active_loan_count": sum(1 for l in loans if l.get("status") == "active"),
        "period": {
            "start": this_month_start.isoformat(),
            "end": now.isoformat(),
        },
    }


async def compute_monthly_series(
    db: AsyncIOMotorDatabase, business_id: Any, months: int = 6,
    now: Optional[datetime] = None,
) -> dict:
    """Monthly revenue / expense / net cash-flow series for the last `months`."""
    now = now or utcnow()
    start = months_back(now, months - 1)
    transactions = await fetch_transactions(db, business_id, start, now)

    buckets: dict[str, dict] = {}
    for i in range(months):
        m = months_back(now, months - 1 - i)
        key = m.strftime("%Y-%m")
        buckets[key] = {"month": key, "revenue": 0.0, "expenses": 0.0}

    for t in transactions:
        dt = t.get("date")
        key = dt.strftime("%Y-%m")
        if key not in buckets:
            continue
        if t.get("type") == "income":
            buckets[key]["revenue"] += float(t.get("amount") or 0)
        elif t.get("type") == "expense":
            buckets[key]["expenses"] += float(t.get("amount") or 0)

    series = []
    for key in sorted(buckets):
        b = buckets[key]
        b["revenue"] = round(b["revenue"], 2)
        b["expenses"] = round(b["expenses"], 2)
        b["net_cash_flow"] = round(b["revenue"] - b["expenses"], 2)
        series.append(b)

    revenues = [b["revenue"] for b in series]
    expenses = [b["expenses"] for b in series]
    nets = [b["net_cash_flow"] for b in series]
    return {
        "series": series,
        "revenue": revenues,
        "expenses": expenses,
        "net_cash_flow": nets,
    }


async def compute_daily_cashflow(
    db: AsyncIOMotorDatabase, business_id: Any, days: int = 30,
    now: Optional[datetime] = None,
) -> list[dict]:
    """Daily inflow/outflow/net series for the last `days` days (pure Python)."""
    from datetime import timedelta

    now = now or utcnow()
    start = start_of_day(now) - timedelta(days=days - 1)
    transactions = await fetch_transactions(db, business_id, start, now)

    inflow: dict[str, float] = {}
    outflow: dict[str, float] = {}
    for t in transactions:
        dt = t.get("date")
        key = dt.strftime("%Y-%m-%d") if isinstance(dt, datetime) else str(dt)[:10]
        amount = float(t.get("amount") or 0)
        if t.get("type") == "income":
            inflow[key] = inflow.get(key, 0.0) + amount
        else:
            outflow[key] = outflow.get(key, 0.0) + amount

    rows = []
    for i in range(days):
        d = start + timedelta(days=i)
        key = d.strftime("%Y-%m-%d")
        inc = round(inflow.get(key, 0.0), 2)
        out = round(outflow.get(key, 0.0), 2)
        rows.append({"date": key, "inflow": inc, "outflow": out, "net_flow": round(inc - out, 2)})
    return rows
