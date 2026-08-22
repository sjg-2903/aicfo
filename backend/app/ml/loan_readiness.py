"""Loan Readiness Engine — configurable 0–100 score from real financial data."""

from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.metrics import (
    compute_financial_metrics,
    compute_monthly_series,
    has_financial_data,
)
from app.analytics.scoring import (
    clamp,
    coefficient_of_variation,
    safe_div,
    score_higher_better,
    score_lower_better,
)
from app.core.constants import COLLECTIONS
from app.utils.dates import utcnow

# Configurable factor weights (must sum to 1.0).
LOAN_READINESS_WEIGHTS: list[tuple[str, float]] = [
    ("revenue_stability", 0.20),
    ("profitability", 0.20),
    ("debt_burden", 0.20),
    ("cash_flow_strength", 0.15),
    ("receivables_quality", 0.15),
    ("gst_compliance", 0.10),
]

FACTOR_RECOMMENDATIONS = {
    "revenue_stability": "Maintain consistent monthly revenue for at least 6 months.",
    "profitability": "Improve net margins by controlling costs or raising prices.",
    "debt_burden": "Reduce outstanding debt before applying for new financing.",
    "cash_flow_strength": "Build a cash reserve covering at least 2 months of expenses.",
    "receivables_quality": "Reduce days-sales-outstanding by collecting overdue invoices.",
    "gst_compliance": "Clear overdue GST obligations and file returns on time.",
}


def _factor_status(score: float) -> str:
    if score >= 70:
        return "strong"
    if score >= 45:
        return "moderate"
    return "weak"


async def compute_loan_readiness(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()

    # A brand-new account has no financial data yet — report a neutral zero
    # state rather than a misleading default readiness score.
    if not await has_financial_data(db, business_id):
        return {
            "readiness_score": 0.0,
            "status": "no_data",
            "label": "No Data",
            "factors": [
                {
                    "name": name,
                    "score": 0.0,
                    "weight": weight,
                    "contribution": 0.0,
                    "status": "no_data",
                    "recommendation": FACTOR_RECOMMENDATIONS[name],
                }
                for name, weight in LOAN_READINESS_WEIGHTS
            ],
            "overall_recommendation": (
                "No financial data is available yet. Upload your bank statements "
                "or ledgers to receive a loan readiness assessment."
            ),
            "improvement_suggestions": [
                "Upload your bank statements and ledgers to begin the assessment."
            ],
            "generated_at": now,
        }

    metrics = await compute_financial_metrics(db, business_id, now)
    monthly = await compute_monthly_series(db, business_id, months=6, now=now)
    gst_records = await db[COLLECTIONS["gst_records"]].find(
        {"business_id": business_id}
    ).to_list(length=None)

    revenue_cur = metrics["revenue"]["current"]
    annualized_revenue = revenue_cur * 12 or metrics["revenue"]["all_time"]
    margin = safe_div(metrics["net_profit"]["current"], revenue_cur)
    cash_balance = metrics["cash_balance"]["current"]
    monthly_expense = metrics["expenses"]["current"] or metrics["expenses"]["all_time"]

    cv_revenue = coefficient_of_variation([v for v in monthly["revenue"] if v > 0])
    revenue_stability = 50.0 if cv_revenue is None else score_lower_better(cv_revenue, 0.1, 0.6)

    profitability = score_higher_better(margin, 0.0, 0.25)

    debt_to_revenue = safe_div(metrics["debt"]["outstanding"], annualized_revenue)
    debt_burden = 100.0 if metrics["debt"]["outstanding"] <= 0 else score_lower_better(debt_to_revenue, 0.0, 2.0)

    runway = safe_div(cash_balance, monthly_expense) if monthly_expense else 100.0
    cash_flow_strength = score_higher_better(runway, 0.0, 6.0)

    overdue_ratio = safe_div(metrics["receivables"]["overdue"], metrics["receivables"]["outstanding"])
    receivables_quality = 100.0 if metrics["receivables"]["outstanding"] <= 0 else score_lower_better(overdue_ratio, 0.0, 0.5)

    total_tax = sum(float(g.get("tax_amount") or 0) for g in gst_records)
    total_paid = sum(float(g.get("paid_amount") or 0) for g in gst_records)
    gst_compliance = 50.0 if total_tax <= 0 else score_higher_better(safe_div(total_paid, total_tax), 0.5, 1.0)

    factor_values = {
        "revenue_stability": revenue_stability,
        "profitability": profitability,
        "debt_burden": debt_burden,
        "cash_flow_strength": cash_flow_strength,
        "receivables_quality": receivables_quality,
        "gst_compliance": gst_compliance,
    }

    factors: list[dict] = []
    total = 0.0
    for name, weight in LOAN_READINESS_WEIGHTS:
        s = clamp(factor_values[name])
        total += s * weight
        factors.append(
            {
                "name": name,
                "score": round(s, 1),
                "weight": weight,
                "contribution": round(s * weight, 2),
                "status": _factor_status(s),
                "recommendation": FACTOR_RECOMMENDATIONS[name],
            }
        )

    score = round(total, 1)
    if score >= 75:
        status, label = "ready", "Ready"
    elif score >= 55:
        status, label = "moderate", "Moderate"
    else:
        status, label = "not_ready", "Not Ready"

    weak = [f["name"].replace("_", " ").title() for f in factors if f["status"] == "weak"]
    suggestions = [FACTOR_RECOMMENDATIONS[f["name"]] for f in factors if f["status"] == "weak"]
    if not suggestions:
        suggestions = ["Maintain current financial performance before applying."]

    return {
        "readiness_score": score,
        "status": status,
        "label": label,
        "factors": factors,
        "overall_recommendation": (
            f"Loan readiness is '{label}' ({score}/100). "
            + (f"Key areas to improve: {', '.join(weak)}." if weak else "No major gaps detected.")
        ),
        "improvement_suggestions": suggestions,
        "generated_at": now,
    }
