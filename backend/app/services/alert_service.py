"""Alert service — rule-based alert generation, listing and read state."""

from datetime import datetime, timedelta
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import compute_financial_metrics, compute_monthly_series
from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.ml.forecast import generate_forecast
from app.utils.dates import utcnow
from app.utils.serialize import serialize_doc, serialize_docs


async def generate(db: AsyncIOMotorDatabase, business_id: Any, now: Optional[datetime] = None) -> list[dict]:
    now = now or utcnow()
    metrics = await compute_financial_metrics(db, business_id, now)
    monthly = await compute_monthly_series(db, business_id, months=6, now=now)
    health = await compute_health_score(db, business_id, now)

    candidates: list[dict] = []

    # 1. Cash shortage (from forecast).
    try:
        forecast = await generate_forecast(db, business_id, days=30, now=now)
        min_net = forecast["summary"]["min_daily_net"]
        if min_net < 0:
            candidates.append(
                {
                    "type": "cash_flow",
                    "severity": "high" if min_net < -50000 else "medium",
                    "title": "Potential cash shortage detected",
                    "description": f"Forecast minimum daily net cash flow is {min_net:,.2f}.",
                    "action_url": "/cash-flow",
                }
            )
    except Exception:
        pass

    # 2. Overdue invoices.
    if metrics["receivables"]["overdue"] > 0:
        amount = metrics["receivables"]["overdue"]
        candidates.append(
            {
                "type": "receivables",
                "severity": "high" if amount >= 500_000 else "medium",
                "title": "Overdue invoices",
                "description": f"Invoices totaling {amount:,.2f} are overdue.",
                "action_url": "/invoices",
            }
        )

    # 3. High expenses.
    exp_series = monthly["expenses"]
    if len(exp_series) >= 3:
        recent = exp_series[-1]
        baseline = sum(exp_series[-4:-1]) / 3 if len(exp_series) >= 4 else sum(exp_series[:-1]) / (len(exp_series) - 1)
        if baseline > 0 and recent > baseline * 1.3:
            pct = (recent - baseline) / baseline * 100
            candidates.append(
                {
                    "type": "expense",
                    "severity": "high" if pct >= 60 else "low",
                    "title": "Expenses above recent average",
                    "description": f"Monthly expenses are {pct:.0f}% above the recent average.",
                    "action_url": "/expenses",
                }
            )

    # 4. GST deadlines & overdue obligations.
    gst_docs = await db[COLLECTIONS["gst_records"]].find({"business_id": business_id}).to_list(length=None)
    for g in gst_docs:
        due = g.get("due_date")
        status = g.get("status")
        if status in ("paid", "filed"):
            continue
        if due and due < now and status != "paid":
            candidates.append(
                {
                    "type": "gst",
                    "severity": "critical",
                    "title": "GST payment overdue",
                    "description": f"GST period {g.get('period')} is overdue.",
                    "action_url": "/gst",
                }
            )
        elif due and now <= due <= now + timedelta(days=7):
            candidates.append(
                {
                    "type": "gst",
                    "severity": "medium",
                    "title": "GST due soon",
                    "description": f"GST period {g.get('period')} is due on {due.date().isoformat()}.",
                    "action_url": "/gst",
                }
            )

    # 5. Upcoming loan EMIs.
    loan_docs = await db[COLLECTIONS["loans"]].find(
        {"business_id": business_id, "status": "active"}
    ).to_list(length=None)
    for loan in loan_docs:
        ned = loan.get("next_emi_date")
        if ned and now <= ned <= now + timedelta(days=3):
            candidates.append(
                {
                    "type": "emi",
                    "severity": "medium",
                    "title": "Loan EMI due",
                    "description": f"EMI of {float(loan.get('emi_amount') or 0):,.2f} due on {ned.date().isoformat()}.",
                    "action_url": "/loans",
                }
            )

    # 6. Debt pressure.
    annualized = metrics["revenue"]["current"] * 12 or metrics["revenue"]["all_time"]
    if annualized and metrics["debt"]["outstanding"] / annualized > 2.0:
        candidates.append(
            {
                "type": "debt",
                "severity": "high",
                "title": "High debt pressure",
                "description": "Outstanding debt exceeds 2x annualized revenue.",
                "action_url": "/loans",
            }
        )

    # 7. Financial-health deterioration.
    if health["status"] in ("at_risk", "critical"):
        candidates.append(
            {
                "type": "health",
                "severity": "high",
                "title": "Financial health deteriorating",
                "description": f"Financial-health score is {health['score']}/100 ({health['label']}).",
                "action_url": "/financial-health",
            }
        )

    inserted = []
    for c in candidates:
        exists = await db[COLLECTIONS["alerts"]].find_one(
            {
                "business_id": business_id,
                "type": c["type"],
                "title": c["title"],
                "created_at": {"$gte": now - timedelta(hours=24)},
            }
        )
        if exists:
            continue
        doc = {
            "business_id": business_id,
            "is_read": False,
            "created_at": now,
            **c,
        }
        result = await db[COLLECTIONS["alerts"]].insert_one(doc)
        doc["_id"] = result.inserted_id
        inserted.append(serialize_doc(doc))
    return inserted


async def list_alerts(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    severity: Optional[str] = None,
    type_: Optional[str] = None,
    is_read: Optional[bool] = None,
) -> tuple[list[dict], int]:
    q: dict = {"business_id": business_id}
    if severity:
        q["severity"] = severity
    if type_:
        q["type"] = type_
    if is_read is not None:
        q["is_read"] = is_read
    collection = db[COLLECTIONS["alerts"]]
    total = await collection.count_documents(q)
    cursor = collection.find(q).sort("created_at", -1).skip((page - 1) * limit).limit(limit)
    items = await cursor.to_list(length=limit)
    return serialize_docs(items), total


async def mark_read(db: AsyncIOMotorDatabase, business_id: Any, alert_id: str, read: bool = True) -> dict:
    doc = await db[COLLECTIONS["alerts"]].find_one_and_update(
        {"_id": ObjectId(alert_id), "business_id": business_id},
        {"$set": {"is_read": read}},
        return_document=True,
    )
    if not doc:
        raise NotFoundError("Alert not found", "ALERT_NOT_FOUND")
    return serialize_doc(doc)
