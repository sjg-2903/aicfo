"""Unified activity history for a business.

Rich events (uploads, document extractions, report generations, recommendation
generations, confirmed imports) are written to ``history_events``. The entity
CRUD trail already recorded in ``audit_logs`` is merged in so the History page
shows one complete timeline. Legacy ``import`` audit entries are skipped
because modern imports write a richer history event.
"""

from datetime import datetime, timezone
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS, HISTORY_EVENT_TYPES
from app.utils.dates import utcnow

# Audit actions that map to the "record" event type (entity CRUD / workflows).
_AUDIT_ACTIONS = {
    "create": "created",
    "update": "updated",
    "delete": "deleted",
    "mark_paid": "marked paid",
    "send": "sent",
    "mark_filed": "marked filed",
    "mark_emi_paid": "recorded EMI payment",
}

_ENTITY_LABELS = {
    "transaction": "Transaction",
    "invoice": "Invoice",
    "expense": "Expense",
    "gst": "GST record",
    "loan": "Loan",
    "recommendation": "Recommendation",
    "report": "Report",
}


async def record_event(
    db: AsyncIOMotorDatabase,
    *,
    business_id: Any,
    user_id: Any,
    event_type: str,
    entity: Optional[str] = None,
    status: str = "success",
    message: Optional[str] = None,
    details: Optional[dict] = None,
    report_id: Optional[str] = None,
) -> None:
    """Append an event to the business history feed. Never raises."""
    if event_type not in HISTORY_EVENT_TYPES:
        event_type = "record"
    doc = {
        "business_id": business_id,
        "user_id": user_id,
        "event_type": event_type,
        "entity": entity,
        "status": status,
        "message": message,
        "details": details or {},
        "report_id": report_id,
        "created_at": utcnow(),
    }
    try:
        await db[COLLECTIONS["history_events"]].insert_one(doc)
    except Exception:
        # History must never break the primary operation.
        pass


def _normalize_event(doc: dict) -> dict:
    details = doc.get("details") or {}
    return {
        "id": str(doc.get("_id")),
        "event_type": doc.get("event_type", "record"),
        "entity": doc.get("entity"),
        "action": doc.get("action"),
        "status": doc.get("status", "success"),
        "message": doc.get("message"),
        "details": details if isinstance(details, dict) else {},
        "report_id": doc.get("report_id"),
        "created_at": doc.get("created_at"),
        "source": "history",
    }


def _normalize_audit(doc: dict) -> dict:
    action = doc.get("action") or ""
    if action == "import":
        return None  # modern imports write richer history events
    meta = doc.get("meta") or {}
    entity = doc.get("entity") or ""
    label = _ENTITY_LABELS.get(entity, entity.capitalize())
    verb = _AUDIT_ACTIONS.get(action, action.replace("_", " "))
    return {
        "id": str(doc.get("_id")),
        "event_type": "record",
        "entity": entity,
        "action": action,
        "status": "success",
        "message": f"{label} {verb}" + (f" — {meta.get('message', '')}" if meta.get("message") else ""),
        "details": meta if isinstance(meta, dict) else {},
        "report_id": None,
        "created_at": doc.get("created_at"),
        "source": "audit",
    }


async def list_history(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    *,
    page: int = 1,
    limit: int = 20,
    event_type: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
) -> tuple[list[dict], int]:
    """Merge ``history_events`` and ``audit_logs`` into one timeline."""
    q: dict = {"business_id": business_id}
    if event_type and event_type != "all":
        q["event_type"] = event_type
    if status and status != "all":
        q["status"] = status
    if search:
        rx = {"$regex": search, "$options": "i"}
        q["$or"] = [{"message": rx}, {"entity": rx}, {"details.file_name": rx}]

    history_docs = await (
        db[COLLECTIONS["history_events"]].find(q).sort("created_at", -1).limit(1000).to_list(length=None)
    )

    audit_q: dict = {"business_id": business_id, "action": {"$ne": "import"}}
    if event_type in (None, "all", "record"):
        if search:
            rx = {"$regex": search, "$options": "i"}
            audit_q["$or"] = [{"entity": rx}]
        audit_docs = await (
            db[COLLECTIONS["audit_logs"]].find(audit_q).sort("created_at", -1).limit(1000).to_list(length=None)
        )
    else:
        audit_docs = []

    events = [_normalize_event(d) for d in history_docs]
    events += [e for d in audit_docs if (e := _normalize_audit(d)) is not None]
    epoch = datetime(1970, 1, 1, tzinfo=timezone.utc)
    events.sort(key=lambda e: e["created_at"] or epoch, reverse=True)

    total = len(events)
    start = (page - 1) * limit
    return events[start : start + limit], total
