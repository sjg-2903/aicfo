"""Recommendation Engine — practical actions derived from real financial state."""

import hashlib
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import compute_financial_metrics
from app.ml.loan_readiness import compute_loan_readiness
from app.ml.risk import analyze_risk
from app.utils.dates import utcnow


def _rid(business_id: Any, category: str, title: str) -> str:
    digest = hashlib.sha1(f"{business_id}|{category}|{title}".encode()).hexdigest()[:16]
    return f"rec-{digest}"


async def generate_recommendations(
    db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None,
) -> list[dict]:
    now = now or utcnow()
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

    # 2. From weak loan-readiness factors.
    for f in readiness["factors"]:
        if f["status"] == "weak":
            recs.append(
                {
                    "category": "loan_readiness",
                    "title": f"Improve {f['name'].replace('_', ' ')}",
                    "description": f"Weak factor '{f['name']}' scored {f['score']}/100.",
                    "reason": f"Improving this strengthens loan eligibility.",
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

    # 4. Overdue receivables follow-up.
    if metrics["receivables"]["overdue"] > 0:
        recs.append(
            {
                "category": "receivables",
                "title": "Follow up on overdue receivables",
                "description": f"{metrics['receivables']['overdue']:,.2f} is overdue.",
                "reason": "Recovering overdue amounts improves liquidity.",
                "priority": "high",
                "status": "new",
                "recommended_action": "Send reminders and schedule collection calls.",
                "expected_impact": f"Recover up to {metrics['receivables']['overdue']:,.2f}",
                "impact_value": round(metrics["receivables"]["overdue"], 2),
                "source_agent": "Invoice Agent",
            }
        )

    # Build final documents (dedupe by title+category).
    seen: set[tuple[str, str]] = set()
    out: list[dict] = []
    for r in recs:
        key = (r["category"], r["title"])
        if key in seen:
            continue
        seen.add(key)
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
