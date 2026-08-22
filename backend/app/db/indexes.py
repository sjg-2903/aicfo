"""MongoDB index definitions for query performance and multi-tenant isolation.

Every business-scoped collection is indexed on ``business_id`` first so that
queries for a single tenant never scan unrelated documents. Each index has an
explicit, deterministic name.
"""

import logging

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS

logger = logging.getLogger(__name__)

# (name, keys, unique)
_INDEXES: dict[str, list] = {
    COLLECTIONS["users"]: [
        ("users_email_unique", [("email", 1)], True),
        ("users_business_id", [("business_id", 1)], False),
        ("users_role", [("role", 1)], False),
    ],
    COLLECTIONS["businesses"]: [
        ("businesses_owner_unique", [("owner_id", 1)], True),
        ("businesses_name", [("business_name", 1)], False),
    ],
    COLLECTIONS["transactions"]: [
        ("txn_business_date", [("business_id", 1), ("date", -1)], False),
        ("txn_business_type_date", [("business_id", 1), ("type", 1), ("date", -1)], False),
        ("txn_business_category", [("business_id", 1), ("category", 1)], False),
        ("txn_business_payment", [("business_id", 1), ("payment_method", 1)], False),
    ],
    COLLECTIONS["invoices"]: [
        ("inv_business_due", [("business_id", 1), ("due_date", 1)], False),
        ("inv_business_status", [("business_id", 1), ("status", 1)], False),
        ("inv_business_number", [("business_id", 1), ("invoice_number", 1)], False),
    ],
    COLLECTIONS["expenses"]: [
        ("exp_business_date", [("business_id", 1), ("date", -1)], False),
        ("exp_business_category", [("business_id", 1), ("category", 1)], False),
        ("exp_business_vendor", [("business_id", 1), ("vendor", 1)], False),
    ],
    COLLECTIONS["gst_records"]: [
        ("gst_business_due", [("business_id", 1), ("due_date", 1)], False),
        ("gst_business_status", [("business_id", 1), ("status", 1)], False),
    ],
    COLLECTIONS["loans"]: [
        ("loan_business_status", [("business_id", 1), ("status", 1)], False),
        ("loan_business_nextemi", [("business_id", 1), ("next_emi_date", 1)], False),
    ],
    COLLECTIONS["forecasts"]: [
        ("forecast_business_generated", [("business_id", 1), ("generated_at", -1)], False),
    ],
    COLLECTIONS["risk_assessments"]: [
        ("risk_business_generated", [("business_id", 1), ("generated_at", -1)], False),
    ],
    COLLECTIONS["recommendations"]: [
        ("rec_business_status_created", [("business_id", 1), ("status", 1), ("created_at", -1)], False),
        ("rec_business_priority", [("business_id", 1), ("priority", 1)], False),
        ("rec_business_category", [("business_id", 1), ("category", 1)], False),
    ],
    COLLECTIONS["alerts"]: [
        ("alert_business_read_created", [("business_id", 1), ("is_read", 1), ("created_at", -1)], False),
        ("alert_business_severity", [("business_id", 1), ("severity", 1)], False),
        ("alert_business_type_created", [("business_id", 1), ("type", 1), ("created_at", -1)], False),
    ],
    COLLECTIONS["chat_sessions"]: [
        ("chat_session_business_updated", [("business_id", 1), ("updated_at", -1)], False),
    ],
    COLLECTIONS["chat_messages"]: [
        ("chat_msg_session_created", [("session_id", 1), ("created_at", 1)], False),
        ("chat_msg_business_created", [("business_id", 1), ("created_at", -1)], False),
    ],
    COLLECTIONS["audit_logs"]: [
        ("audit_business_created", [("business_id", 1), ("created_at", -1)], False),
        ("audit_user", [("user_id", 1)], False),
    ],
    COLLECTIONS["history_events"]: [
        ("history_business_created", [("business_id", 1), ("created_at", -1)], False),
        ("history_business_type", [("business_id", 1), ("event_type", 1), ("created_at", -1)], False),
    ],
    COLLECTIONS["reports"]: [
        ("reports_business_created", [("business_id", 1), ("created_at", -1)], False),
        ("reports_business_type", [("business_id", 1), ("report_type", 1)], False),
    ],
}


async def create_indexes(db: AsyncIOMotorDatabase) -> None:
    """Idempotently create all indexes. Failures are logged, not fatal."""
    for collection_name, specs in _INDEXES.items():
        collection = db[collection_name]
        for name, keys, unique in specs:
            try:
                await collection.create_index(keys, unique=unique, name=name)
            except Exception as exc:  # pragma: no cover - depends on backend
                logger.warning(
                    "Could not create index %s on %s: %s", name, collection_name, exc
                )
