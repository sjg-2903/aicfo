"""Recommendation Engine — practical actions derived from real financial state.

Recommendations are *always* computed deterministically from the business's
MongoDB data (metrics, health, risk, forecast, receivables, expenses, GST and
loans). The LLM (Gemini) may optionally enrich the dashboard narrative, but
never invents numbers.
"""

import hashlib
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import compute_financial_metrics
from app.core.constants import COLLECTIONS
from app.ml.forecast import generate_forecast
from app.ml.loan_readiness import compute_loan_readiness
from app.ml.risk import analyze_risk
from app.utils.dates import end_of_day, months_back, start_of_day, start_of_month, utcnow

_PRIORITY_ORDER = {"critical": 0, "high": 1, "medium": 2, "low": 3}

DISCRETIONARY_CATEGORIES = {"marketing", "travel", "entertainment", "subscriptions", "office supplies", "miscellaneous"}


def _rid(business_id: Any, category: str, title: str) -> str:
    digest = hashlib.sha1(f"{business_id}|{category}|{title}".encode()).hexdigest()[:16]
    return f"rec-{digest}"


async def _build_recommendations(
    db: AsyncIOMotorDatabase, business_id: Any, now: datetime,
) -> list[dict]:
    metrics = await compute_financial_metrics(db, business_id, now)
    health = await compute_health_score(db, business_id, now)
    risk = await analyze_risk(db, business_id, now)
    readiness = await compute_loan_readiness(db, business_id, now)

    recs: list[dict] = []

    # 1. From active risks (recommended actions).
    for r in risk["risks"]:
        priority = "critical" if r["severity"] == "critical" else (
            "high" if r["severity"] == "high" else "medium"
        )
        recs.append(
            {
                "category": r["type"],
                "title": r["title"],
                "description": r["evidence"],
                "reason": r["evidence"],
                "priority": priority,
                "status": "new",
                "recommended_action": r["recommended_action"],
                "expected_impact": f"Mitigate {r['type'].replace('_', ' ')} risk",
                "impact_value": r.get("impact") or 0,
                "source_agent": "Risk Agent",
            }
        )

    # 2. From weak loan-readiness factors (only when actual data exists).
    if metrics["transaction_count"] >= 2:
        for f in readiness["factors"]:
            if f["status"] == "weak":
                recs.append(
                    {
                        "category": "loan_readiness",
                        "title": f"Improve {f['name'].replace('_', ' ')}",
                        "description": f"Weak factor '{f['name']}' scored {f['score']}/100.",
                        "reason": "Improving this strengthens loan eligibility.",
                        "priority": "medium",
                        "status": "new",
                        "recommended_action": f["recommendation"],
                        "expected_impact": "Higher loan-readiness score",
                        "impact_value": 0,
                        "source_agent": "Loan Readiness Agent",
                    }
                )

        # 3. From weak financial-health factors.
        for f in health["factors"]:
            if f["score"] <= 40:
                recs.append(
                    {
                        "category": "health",
                        "title": f"Address weak '{f['name'].replace('_', ' ')}'",
                        "description": f"Health factor '{f['name']}' scored {f['score']}/100.",
                        "reason": "Improving this raises the financial-health score.",
                        "priority": "medium",
                        "status": "new",
                        "recommended_action": "Review the related financial processes.",
                        "expected_impact": "Higher financial-health score",
                        "impact_value": 0,
                        "source_agent": "Health Agent",
                    }
                )

    # 4. Overdue receivables follow-up (with customer detail).
    if metrics["receivables"]["overdue"] > 0:
        overdue_invoices = await db[COLLECTIONS["invoices"]].find(
            {"business_id": business_id, "status": "overdue"}
        ).sort("due_date", 1).limit(5).to_list(length=None)
        names = [i.get("customer_name") or "unknown customer" for i in overdue_invoices]
        customer_text = f" Top debtors: {', '.join(names[:3])}." if names else ""
        overdue = metrics["receivables"]["overdue"]
        recs.append(
            {
                "category": "receivables",
                "title": "Follow up on overdue receivables",
                "description": f"{len(overdue_invoices)} invoice(s) totalling {overdue:,.2f} are overdue.{customer_text}",
                "reason": "Recovering overdue amounts improves liquidity.",
                "priority": "high" if overdue >= 100_000 else "medium",
                "status": "new",
                "recommended_action": "Send payment reminders and schedule collection calls this week.",
                "expected_impact": f"Recover up to {overdue:,.2f}",
                "impact_value": round(overdue, 2),
                "source_agent": "Invoice Agent",
            }
        )

    # 5. Cash-flow warnings from the 30-day forecast.
    try:
        forecast = await generate_forecast(db, business_id, days=30, now=now)
        min_net = forecast["summary"]["min_daily_net"]
        predicted_net = forecast["summary"]["predicted_net_cash_flow"]
        if min_net < 0:
            recs.append(
                {
                    "category": "cash_flow",
                    "title": "Prepare for a projected cash shortfall",
                    "description": (
                        f"The 30-day forecast ({forecast['model']}, {forecast['confidence']} confidence) "
                        f"shows a minimum daily net flow of {min_net:,.2f}."
                    ),
                    "reason": "Days with negative net flow can cause missed payments.",
                    "priority": "high" if min_net < -50_000 else "medium",
                    "status": "new",
                    "recommended_action": "Accelerate collections, delay discretionary spends, or arrange an overdraft buffer.",
                    "expected_impact": "Avoid payment delays and penalties",
                    "impact_value": round(abs(min_net), 2),
                    "source_agent": "Cash Flow Agent",
                }
            )
        elif predicted_net > 0:
            recs.append(
                {
                    "category": "cash_flow",
                    "title": "Put surplus cash to work",
                    "description": (
                        f"The 30-day forecast projects a positive net cash flow of {predicted_net:,.2f} "
                        f"({forecast['model']}, {forecast['confidence']} confidence)."
                    ),
                    "reason": "Idle cash earns nothing.",
                    "priority": "low",
                    "status": "new",
                    "recommended_action": "Consider sweeping surplus into an interest-bearing account or prepaying high-interest debt.",
                    "expected_impact": "Higher returns on idle cash",
                    "impact_value": 0,
                    "source_agent": "Cash Flow Agent",
                }
            )
    except Exception:
        pass  # insufficient data — no cash-flow recommendation

    # 6. Spending trends — fastest growing expense category (month over month).
    expenses = await db[COLLECTIONS["expenses"]].find({"business_id": business_id}).to_list(length=None)
    if len(expenses) >= 2:
        this_month = start_of_month(now)
        prev_month = months_back(now, 1)
        prev_start = months_back(now, 2)
        cur_by_cat: dict[str, float] = {}
        prev_by_cat: dict[str, float] = {}
        for e in expenses:
            dt = e.get("date")
            cat = (e.get("category") or "General").strip() or "General"
            amount = float(e.get("amount") or 0)
            if dt and dt >= this_month:
                cur_by_cat[cat] = cur_by_cat.get(cat, 0.0) + amount
            elif dt and prev_start <= dt < prev_month:
                prev_by_cat[cat] = prev_by_cat.get(cat, 0.0) + amount
        growing = []
        for cat, cur in cur_by_cat.items():
            prev = prev_by_cat.get(cat, 0.0)
            if prev > 0 and cur > prev * 1.2:
                growing.append((cat, prev, cur, (cur - prev) / prev * 100))
        if growing:
            cat, prev, cur, growth = max(growing, key=lambda x: x[3])
            recs.append(
                {
                    "category": "spending",
                    "title": f"Spending on {cat} is rising",
                    "description": (
                        f"{cat} spend grew from {prev:,.2f} to {cur:,.2f} month over month "
                        f"(+{growth:.0f}%)."
                    ),
                    "reason": "Unchecked category growth erodes margins.",
                    "priority": "medium" if growth >= 40 else "low",
                    "status": "new",
                    "recommended_action": f"Review {cat} invoices, set a monthly budget and compare vendor quotes.",
                    "expected_impact": f"Reduce {cat} spend toward last month's level",
                    "impact_value": round(cur - prev, 2),
                    "source_agent": "Spending Agent",
                }
            )

    # 7. Cost-saving opportunities from discretionary categories.
    if expenses:
        total_expense_records = sum(float(e.get("amount") or 0) for e in expenses)
        disc_by_cat: dict[str, float] = {}
        for e in expenses:
            cat = (e.get("category") or "").strip().lower()
            if cat in DISCRETIONARY_CATEGORIES:
                disc_by_cat[cat.title()] = disc_by_cat.get(cat.title(), 0.0) + float(e.get("amount") or 0)
        if disc_by_cat and total_expense_records > 0:
            top_cat, top_amount = max(disc_by_cat.items(), key=lambda x: x[1])
            share = top_amount / total_expense_records * 100
            if share >= 3:
                recs.append(
                    {
                        "category": "cost_saving",
                        "title": f"Trim discretionary spend on {top_cat}",
                        "description": (
                            f"{top_cat} accounts for {top_amount:,.2f} — {share:.1f}% of recorded expenses."
                        ),
                        "reason": "Discretionary categories are the fastest cost-saving lever.",
                        "priority": "medium" if share >= 8 else "low",
                        "status": "new",
                        "recommended_action": f"Set a {top_cat} budget at 80% of current spend and renegotiate recurring contracts.",
                        "expected_impact": f"Save up to {round(top_amount * 0.2, 2):,.2f} per period",
                        "impact_value": round(top_amount * 0.2, 2),
                        "source_agent": "Cost Agent",
                    }
                )

    # 8. GST / tax observations.
    gst_records = await db[COLLECTIONS["gst_records"]].find({"business_id": business_id}).to_list(length=None)
    unpaid = [g for g in gst_records if g.get("status") in ("pending", "overdue")]
    if unpaid:
        due = sum(float(g.get("tax_amount") or 0) - float(g.get("paid_amount") or 0) for g in unpaid)
        overdue_gst = [g for g in unpaid if g.get("status") == "overdue"]
        if overdue_gst:
            periods = ", ".join(str(g.get("period")) for g in overdue_gst[:3])
            recs.append(
                {
                    "category": "gst",
                    "title": "Overdue GST filings need immediate attention",
                    "description": (
                        f"{len(overdue_gst)} GST period(s) ({periods}) are overdue with {due:,.2f} unpaid."
                    ),
                    "reason": "Late filing attracts interest at 18% p.a. plus late fees.",
                    "priority": "high" if due >= 50_000 else "medium",
                    "status": "new",
                    "recommended_action": "File GSTR-3B for the overdue periods and pay the outstanding liability now.",
                    "expected_impact": "Avoid interest and late-fee penalties",
                    "impact_value": round(due * 0.18, 2),
                    "source_agent": "GST Agent",
                }
            )
        else:
            periods = ", ".join(str(g.get("period")) for g in unpaid[:3])
            recs.append(
                {
                    "category": "gst",
                    "title": f"Plan for upcoming GST payments ({periods})",
                    "description": f"{due:,.2f} in GST liability is pending across {len(unpaid)} period(s).",
                    "reason": "Reserving funds ahead of the due date avoids late interest.",
                    "priority": "medium" if due >= 50_000 else "low",
                    "status": "new",
                    "recommended_action": "Earmark the liability amount and file returns before each due date.",
                    "expected_impact": "On-time, penalty-free GST compliance",
                    "impact_value": round(due * 0.18, 2),
                    "source_agent": "GST Agent",
                }
            )

    # 9. Loan-related suggestions.
    active_loans = [
        l for l in await db[COLLECTIONS["loans"]].find({"business_id": business_id}).to_list(length=None)
        if l.get("status") == "active"
    ]
    if active_loans:
        emi_total = sum(float(l.get("emi_amount") or 0) for l in active_loans)
        revenue = metrics["revenue"]["current"]
        next_emis = [l.get("next_emi_date") for l in active_loans if l.get("next_emi_date")]
        if revenue > 0 and emi_total / revenue > 0.35:
            ratio = emi_total / revenue * 100
            recs.append(
                {
                    "category": "loan",
                    "title": "EMI burden is high relative to revenue",
                    "description": (
                        f"Monthly EMIs total {emi_total:,.2f} — {ratio:.0f}% of this month's revenue."
                    ),
                    "reason": "A high EMI-to-revenue ratio squeezes working capital.",
                    "priority": "high" if ratio >= 50 else "medium",
                    "status": "new",
                    "recommended_action": "Talk to lenders about restructuring tenure or refinancing at a lower rate.",
                    "expected_impact": f"Free up to {round(emi_total * 0.2, 2):,.2f} monthly",
                    "impact_value": round(emi_total * 0.2, 2),
                    "source_agent": "Loan Agent",
                }
            )
        if next_emis and metrics["debt"]["monthly_emi"] > 0:
            nearest = min(next_emis)
            days_left = (nearest.date() - now.date()).days if hasattr(nearest, "date") else 0
            if 0 <= days_left <= 10:
                recs.append(
                    {
                        "category": "loan",
                        "title": f"EMI payment due in {days_left} day(s)",
                        "description": (
                            f"{len(active_loans)} active loan(s) with monthly EMIs totalling "
                            f"{metrics['debt']['monthly_emi']:,.2f}; the next EMI is due on {nearest:%d %b}."
                        ),
                        "reason": "Ensure funds are available to avoid EMI bounce charges.",
                        "priority": "medium",
                        "status": "new",
                        "recommended_action": "Confirm the EMI account has sufficient balance before the due date.",
                        "expected_impact": "Avoid bounce penalties and credit-score impact",
                        "impact_value": 0,
                        "source_agent": "Loan Agent",
                    }
                )

    # 10. Financial priorities summary (always include when data exists).
    if metrics["transaction_count"] >= 2:
        priority_actions = [
            r["title"] for r in sorted(recs, key=lambda r: _PRIORITY_ORDER.get(r["priority"], 9))
            if r["priority"] in ("critical", "high")
        ][:3]
        recs.append(
            {
                "category": "priorities",
                "title": "Your top financial priorities",
                "description": (
                    "Based on " + (" · ".join(priority_actions) if priority_actions else "current data, focus on stability.") + "."
                ),
                "reason": "A ranked view keeps the team focused on what matters most.",
                "priority": "medium" if priority_actions else "low",
                "status": "new",
                "recommended_action": "Start with the highest-severity item above and review progress weekly.",
                "expected_impact": "Focused execution on critical items",
                "impact_value": 0,
                "source_agent": "AI CFO",
            }
        )

    # Dedupe by title+category, then sort by priority.
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for r in recs:
        key = (r["category"], r["title"])
        if key in seen:
            continue
        seen.add(key)
        out.append(dict(r))
    out.sort(key=lambda r: _PRIORITY_ORDER.get(r["priority"], 9))
    return out


async def generate_recommendations(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> list[dict]:
    """Build recommendation documents (the persistable shape with ``_rid``)."""
    now = now or utcnow()
    recs = await _build_recommendations(db, business_id, now)
    out: list[dict] = []
    for r in recs:
        doc = dict(r)
        doc.update(
            {
                "business_id": business_id,
                "_rid": _rid(business_id, r["category"], r["title"]),
                "created_at": now,
            }
        )
        out.append(doc)
    return out


async def generate_dashboard_recommendations(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    limit: int = 6,
    now: Optional[datetime] = None,
) -> list[dict]:
    """Fresh, unpersisted recommendations for the dashboard AI section."""
    now = now or utcnow()
    recs = await _build_recommendations(db, business_id, now)
    out = []
    for r in recs[:limit]:
        doc = dict(r)
        doc["rid"] = _rid(business_id, r["category"], r["title"])
        doc["created_at"] = now
        out.append(doc)
    return out
