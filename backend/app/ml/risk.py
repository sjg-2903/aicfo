"""Risk Engine — rule-based detection over computed, trusted financial metrics."""

import hashlib
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import (
    compute_financial_metrics,
    compute_monthly_series,
    has_financial_data,
)
from app.core.constants import COLLECTIONS
from app.ml.forecast import generate_forecast
from app.utils.dates import utcnow

SEVERITY_PENALTY = {"low": 3, "medium": 8, "high": 15, "critical": 25}


def _risk_id(business_id: Any, rtype: str, title: str) -> str:
    digest = hashlib.sha1(f"{business_id}|{rtype}|{title}".encode()).hexdigest()[:16]
    return f"risk-{digest}"


def _level_for_score(score: float) -> str:
    if score >= 75:
        return "low"
    if score >= 50:
        return "medium"
    if score >= 25:
        return "high"
    return "critical"


async def analyze_risk(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()

    # A brand-new account has no financial data yet — report a neutral zero
    # state rather than a misleading "low risk" score of 100.
    if not await has_financial_data(db, business_id):
        return {
            "risk_score": 0.0,
            "risk_level": "no_data",
            "risks": [],
            "summary": {
                "active_risks": 0,
                "high_or_critical": 0,
                "health_score": 0,
            },
            "generated_at": now,
        }

    metrics = await compute_financial_metrics(db, business_id, now)
    monthly = await compute_monthly_series(db, business_id, months=6, now=now)
    health = await compute_health_score(db, business_id, now)

    risks: list[dict] = []

    # ── 1. Cash-flow risk (from the forecast) ───────────────────────────────
    try:
        forecast = await generate_forecast(db, business_id, days=30, now=now)
        min_net = forecast["summary"]["min_daily_net"]
        if min_net < 0:
            severity = "high" if min_net < -50000 else "medium"
            risks.append(
                {
                    "type": "cash_flow",
                    "severity": severity,
                    "title": "Projected cash-flow shortfall",
                    "evidence": (
                        f"Forecast minimum daily net cash flow is {min_net:,.2f} "
                        f"(model: {forecast['model']}, confidence: {forecast['confidence']})."
                    ),
                    "recommended_action": "Accelerate receivables collection or arrange a short-term credit line.",
                    "impact": round(abs(min_net), 2),
                }
            )
    except Exception:
        pass  # insufficient data — no cash-flow risk can be asserted

    # ── 2. Overdue receivable risk ─────────────────────────────────────────
    if metrics["receivables"]["overdue"] > 0:
        amount = metrics["receivables"]["overdue"]
        severity = "high" if amount >= 500_000 else "medium" if amount >= 100_000 else "low"
        risks.append(
            {
                "type": "receivables",
                "severity": severity,
                "title": "Overdue receivables",
                "evidence": f"Unpaid overdue invoices total {amount:,.2f}.",
                "recommended_action": "Send payment reminders and follow up with overdue customers.",
                "impact": round(amount, 2),
            }
        )

    # ── 3. Abnormal expense increase ────────────────────────────────────────
    rev_series = monthly["revenue"]
    exp_series = monthly["expenses"]
    if len(exp_series) >= 3:
        recent = exp_series[-1]
        baseline = sum(exp_series[-4:-1]) / 3 if len(exp_series) >= 4 else sum(exp_series[:-1]) / (len(exp_series) - 1)
        if baseline > 0 and recent > baseline * 1.3:
            pct = (recent - baseline) / baseline * 100
            severity = "high" if pct >= 60 else "medium" if pct >= 30 else "low"
            risks.append(
                {
                    "type": "expenses",
                    "severity": severity,
                    "title": "Abnormal expense increase",
                    "evidence": f"Monthly expenses rose {pct:.0f}% versus the recent average.",
                    "recommended_action": "Review discretionary spend and renegotiate supplier terms.",
                    "impact": round(recent - baseline, 2),
                }
            )

    # ── 4. Debt pressure ───────────────────────────────────────────────────
    debt_to_revenue = metrics["debt"]["outstanding"] / metrics["revenue"]["all_time"] if metrics["revenue"]["all_time"] else 0
    if metrics["debt"]["outstanding"] > 0 and (debt_to_revenue > 1.0 or metrics["debt"]["monthly_emi"] > 0):
        severity = "high" if debt_to_revenue > 2.0 else "medium" if debt_to_revenue > 1.0 else "low"
        risks.append(
            {
                "type": "debt",
                "severity": severity,
                "title": "Elevated debt pressure",
                "evidence": (
                    f"Outstanding debt is {metrics['debt']['outstanding']:,.2f} "
                    f"({debt_to_revenue:.2f}x cumulative revenue); monthly EMI {metrics['debt']['monthly_emi']:,.2f}."
                ),
                "recommended_action": "Consider refinancing high-interest loans to reduce EMI.",
                "impact": 0,
            }
        )

    # ── 5. GST obligation risk ─────────────────────────────────────────────
    gst_records = await db[COLLECTIONS["gst_records"]].find({"business_id": business_id}).to_list(length=None)
    for g in gst_records:
        if g.get("status") == "overdue":
            due = float(g.get("tax_amount") or 0) - float(g.get("paid_amount") or 0)
            risks.append(
                {
                    "type": "gst",
                    "severity": "high" if due >= 100_000 else "medium",
                    "title": "GST obligation overdue",
                    "evidence": f"GST period {g.get('period')} is overdue with {max(due, 0):,.2f} outstanding.",
                    "recommended_action": "File and pay overdue GST immediately to avoid penalties.",
                    "impact": round(max(due, 0), 2),
                }
            )

    # ── 6. Profitability decline ───────────────────────────────────────────
    margin = metrics["net_profit"]["current"] / metrics["revenue"]["current"] if metrics["revenue"]["current"] else 0
    if metrics["revenue"]["current"] > 0 and margin < 0:
        risks.append(
            {
                "type": "profitability",
                "severity": "high",
                "title": "Negative profitability",
                "evidence": f"Net margin is {margin:.1%} for the current period.",
                "recommended_action": "Investigate cost structure and pricing.",
                "impact": round(abs(metrics["net_profit"]["current"]), 2),
            }
        )

    # ── 7. Liquidity risk ───────────────────────────────────────────────────
    runway = health["metrics"]["runway_months"]
    if runway < 1.0:
        risks.append(
            {
                "type": "liquidity",
                "severity": "high",
                "title": "Low cash runway",
                "evidence": f"Cash reserves cover only {runway:.1f} months of expenses.",
                "recommended_action": "Build a cash buffer of at least 2 months of operating expenses.",
                "impact": 0,
            }
        )

    # ── Aggregate risk score ────────────────────────────────────────────────
    score = 100.0
    for r in risks:
        score -= SEVERITY_PENALTY.get(r["severity"], 5)
    score = max(0.0, min(100.0, score))
    level = _level_for_score(score)

    # Stable ids + status for acknowledgement/resolution tracking.
    for r in risks:
        r["id"] = _risk_id(business_id, r["type"], r["title"])
        r.setdefault("status", "active")

    return {
        "risk_score": round(score, 1),
        "risk_level": level,
        "risks": risks,
        "summary": {
            "active_risks": len(risks),
            "high_or_critical": sum(1 for r in risks if r["severity"] in ("high", "critical")),
            "health_score": health["score"],
        },
        "generated_at": now,
    }
