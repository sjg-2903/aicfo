"""Financial Health Engine — transparent, deterministic 0–100 score.

The score is a weighted sum of factor sub-scores computed from actual data.
Weights are fixed and documented so the score is fully explainable.
"""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.metrics import compute_financial_metrics, compute_monthly_series
from app.analytics.scoring import (
    clamp,
    coefficient_of_variation,
    safe_div,
    score_higher_better,
    score_lower_better,
)
from app.core.constants import COLLECTIONS
from app.utils.dates import utcnow

# name, weight
FACTOR_WEIGHTS: list[tuple[str, float]] = [
    ("profitability", 0.20),
    ("revenue_stability", 0.15),
    ("expense_ratio", 0.15),
    ("cash_reserves", 0.10),
    ("receivable_health", 0.10),
    ("debt_pressure", 0.10),
    ("emi_burden", 0.10),
    ("gst_compliance", 0.05),
    ("cash_flow_stability", 0.05),
]


def status_for_score(score: float) -> tuple[str, str]:
    if score >= 75:
        return "good", "Good"
    if score >= 55:
        return "moderate", "Moderate"
    if score >= 35:
        return "at_risk", "At Risk"
    return "critical", "Critical"


async def compute_health_score(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    metrics = await compute_financial_metrics(db, business_id, now)
    monthly = await compute_monthly_series(db, business_id, months=6, now=now)
    gst_records = await db[COLLECTIONS["gst_records"]].find(
        {"business_id": business_id}
    ).to_list(length=None)

    revenue_cur = metrics["revenue"]["current"]
    revenue_prev = metrics["revenue"]["previous"]
    expense_cur = metrics["expenses"]["current"]
    net_profit_cur = metrics["net_profit"]["current"]
    cash_balance = metrics["cash_balance"]["current"]
    receivables = metrics["receivables"]
    debt = metrics["debt"]

    annualized_revenue = revenue_cur * 12
    if annualized_revenue <= 0:
        annualized_revenue = metrics["revenue"]["all_time"]

    factors: list[dict] = []
    warnings: list[str] = []

    # 1. Profitability — net margin over current month.
    margin = safe_div(net_profit_cur, revenue_cur)
    profitability = score_higher_better(margin, 0.0, 0.25)

    # 2. Revenue stability — coefficient of variation of monthly revenue.
    cv_revenue = coefficient_of_variation([v for v in monthly["revenue"] if v > 0])
    if cv_revenue is None:
        revenue_stability = 50.0
        warnings.append("Not enough revenue history to measure stability")
    else:
        revenue_stability = score_lower_better(cv_revenue, 0.1, 0.6)

    # 3. Expense ratio — expenses / revenue.
    expense_ratio = safe_div(expense_cur, revenue_cur)
    if revenue_cur <= 0 and expense_cur > 0:
        expense_ratio_score = 0.0
    elif revenue_cur <= 0:
        expense_ratio_score = 50.0
    else:
        expense_ratio_score = score_lower_better(expense_ratio, 0.3, 1.0)

    # 4. Cash reserves — months of runway at current expense level.
    monthly_expense = expense_cur if expense_cur > 0 else metrics["expenses"]["all_time"]
    runway_months = safe_div(cash_balance, monthly_expense) if monthly_expense else 100.0
    cash_reserves = score_higher_better(runway_months, 0.0, 6.0)

    # 5. Receivable health — overdue share of outstanding receivables.
    if receivables["outstanding"] <= 0:
        receivable_health = 100.0
    else:
        overdue_ratio = safe_div(receivables["overdue"], receivables["outstanding"])
        receivable_health = score_lower_better(overdue_ratio, 0.0, 0.5)

    # 6. Debt pressure — total debt vs annualized revenue.
    if annualized_revenue <= 0:
        debt_pressure = 50.0 if debt["outstanding"] <= 0 else 0.0
    else:
        debt_to_revenue = safe_div(debt["outstanding"], annualized_revenue)
        debt_pressure = score_lower_better(debt_to_revenue, 0.0, 2.0)

    # 7. EMI burden — monthly EMI vs monthly revenue.
    if revenue_cur <= 0:
        emi_burden = 0.0 if debt["monthly_emi"] > 0 else 50.0
    else:
        emi_ratio = safe_div(debt["monthly_emi"], revenue_cur)
        emi_burden = score_lower_better(emi_ratio, 0.0, 0.5)

    # 8. GST compliance — paid share of GST due.
    total_tax = sum(float(g.get("tax_amount") or 0) for g in gst_records)
    total_paid = sum(float(g.get("paid_amount") or 0) for g in gst_records)
    if total_tax <= 0:
        gst_compliance = 50.0
    else:
        gst_compliance = score_higher_better(safe_div(total_paid, total_tax), 0.5, 1.0)

    # 9. Cash-flow stability — coefficient of variation of monthly net cash flow.
    cv_net = coefficient_of_variation(monthly["net_cash_flow"])
    if cv_net is None:
        cash_flow_stability = 50.0
        warnings.append("Not enough history to measure cash-flow stability")
    else:
        cash_flow_stability = score_lower_better(cv_net, 0.2, 1.0)

    factor_values = {
        "profitability": profitability,
        "revenue_stability": revenue_stability,
        "expense_ratio": expense_ratio_score,
        "cash_reserves": cash_reserves,
        "receivable_health": receivable_health,
        "debt_pressure": debt_pressure,
        "emi_burden": emi_burden,
        "gst_compliance": gst_compliance,
        "cash_flow_stability": cash_flow_stability,
    }

    total = 0.0
    for name, weight in FACTOR_WEIGHTS:
        score = clamp(factor_values[name])
        total += score * weight
        factors.append(
            {
                "name": name,
                "score": round(score, 1),
                "weight": weight,
                "contribution": round(score * weight, 2),
            }
        )

    score = round(total, 1)
    status, label = status_for_score(score)

    # Human-readable interpretation derived from the factor scores.
    interpretations = []
    if profitability >= 70:
        interpretations.append("Strong profitability")
    elif profitability <= 30:
        interpretations.append("Weak or negative profitability")
    if receivable_health <= 30:
        interpretations.append("High share of overdue receivables")
    if debt_pressure <= 30:
        interpretations.append("Elevated debt relative to revenue")
    if emi_burden <= 30:
        interpretations.append("Heavy EMI burden relative to revenue")
    if gst_compliance <= 40:
        interpretations.append("GST obligations outstanding")

    return {
        "score": score,
        "status": status,
        "label": label,
        "factors": factors,
        "strengths": [
            f["name"].replace("_", " ").title()
            for f in factors
            if f["score"] >= 70
        ],
        "weaknesses": [
            f["name"].replace("_", " ").title()
            for f in factors
            if f["score"] <= 40
        ],
        "interpretation": (
            "Your business is in " + label.lower() + " financial health. "
            + (". ".join(interpretations) + "." if interpretations else "No major risks detected.")
        ),
        "warnings": warnings,
        "metrics": {
            "margin": round(margin, 4),
            "expense_ratio": round(expense_ratio, 4),
            "runway_months": round(runway_months, 2),
            "debt_to_revenue": round(safe_div(debt["outstanding"], annualized_revenue), 4),
            "emi_to_revenue": round(safe_div(debt["monthly_emi"], revenue_cur), 4),
        },
        "generated_at": now.isoformat(),
    }
