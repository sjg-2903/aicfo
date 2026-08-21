"""Shared constants: roles, collection names and error codes."""

# ── Roles ────────────────────────────────────────────────────────────────────
ROLE_BUSINESS_OWNER = "BUSINESS_OWNER"
ROLE_ADMIN = "ADMIN"
ROLES = (ROLE_BUSINESS_OWNER, ROLE_ADMIN)

# ── MongoDB collections ──────────────────────────────────────────────────────
COLLECTIONS = {
    "users": "users",
    "businesses": "businesses",
    "transactions": "transactions",
    "invoices": "invoices",
    "expenses": "expenses",
    "gst_records": "gst_records",
    "loans": "loans",
    "forecasts": "forecasts",
    "risk_assessments": "risk_assessments",
    "recommendations": "recommendations",
    "alerts": "alerts",
    "chat_sessions": "chat_sessions",
    "chat_messages": "chat_messages",
    "audit_logs": "audit_logs",
}

# ── Error codes (stable machine-readable identifiers) ────────────────────────
ERR_INVALID_TOKEN = "INVALID_TOKEN"
ERR_TOKEN_EXPIRED = "TOKEN_EXPIRED"
ERR_TOKEN_REVOKED = "TOKEN_REVOKED"
ERR_UNAUTHORIZED = "UNAUTHORIZED"
ERR_FORBIDDEN = "FORBIDDEN"
ERR_NOT_FOUND = "NOT_FOUND"
ERR_CONFLICT = "CONFLICT"
ERR_VALIDATION = "VALIDATION_ERROR"
ERR_BUSINESS_REQUIRED = "BUSINESS_REQUIRED"
ERR_INTERNAL = "INTERNAL_ERROR"
ERR_SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
ERR_INSUFFICIENT_DATA = "INSUFFICIENT_DATA"
ERR_IMPORT_INVALID = "IMPORT_INVALID_FILE"
ERR_PAYLOAD_TOO_LARGE = "PAYLOAD_TOO_LARGE"

# ── Finance ──────────────────────────────────────────────────────────────────
INCOME = "income"
EXPENSE = "expense"

INVOICE_STATUSES = ("draft", "sent", "paid", "overdue", "cancelled")
GST_STATUSES = ("pending", "filed", "paid", "overdue")
LOAN_STATUSES = ("active", "closed", "defaulted")
RISK_LEVELS = ("low", "medium", "high", "critical")
RECOMMENDATION_PRIORITIES = ("low", "medium", "high", "critical")
RECOMMENDATION_STATUSES = ("new", "acknowledged", "in_progress", "completed", "dismissed")
