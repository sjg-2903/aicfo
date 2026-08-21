"""CSV import pipeline for transactions, invoices, expenses, GST and loans.

The pipeline: validate file type → validate headers → validate data types and
business rules → normalize → detect duplicates (in-file and in DB) → insert
valid records → return `total_rows`, `successful_rows`, `failed_rows`,
`duplicates` and `errors`.
"""

import csv
import hashlib
import io
from datetime import datetime
from typing import Any, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.constants import COLLECTIONS, EXPENSE, GST_STATUSES, INCOME, INVOICE_STATUSES, LOAN_STATUSES
from app.core.errors import BadRequestError, ValidationError
from app.utils.dates import parse_datetime, utcnow
from app.utils.serialize import serialize_docs

MAX_FILE_BYTES = 10 * 1024 * 1024  # 10 MB

_IMPORT_TYPES = {
    "transactions": {
        "collection": COLLECTIONS["transactions"],
        "required": ["date", "description", "amount", "type"],
        "optional": ["category", "payment_method", "reference_id", "notes"],
    },
    "invoices": {
        "collection": COLLECTIONS["invoices"],
        "required": ["invoice_number", "customer_name", "invoice_date", "due_date", "total_amount"],
        "optional": ["paid_amount", "status", "customer_email", "notes"],
    },
    "expenses": {
        "collection": COLLECTIONS["expenses"],
        "required": ["date", "description", "amount"],
        "optional": ["category", "vendor", "payment_method", "recurring", "notes"],
    },
    "gst": {
        "collection": COLLECTIONS["gst_records"],
        "required": ["period", "due_date", "tax_amount"],
        "optional": ["period_start", "period_end", "taxable_turnover", "paid_amount", "status", "reference_number", "notes"],
    },
    "loans": {
        "collection": COLLECTIONS["loans"],
        "required": ["lender", "principal_amount"],
        "optional": ["loan_type", "outstanding_amount", "interest_rate", "emi_amount", "start_date", "end_date", "next_emi_date", "status"],
    },
}


def _fp(*parts: Any) -> str:
    return hashlib.sha1("|".join(str(p) for p in parts).encode("utf-8")).hexdigest()


def _parse_bool(value: str) -> bool:
    return str(value).strip().lower() in {"1", "true", "yes", "y", "recurring"}


def _to_float(value: str, field: str, row_no: int) -> float:
    try:
        v = float(str(value).strip().replace(",", "").replace("₹", "").replace(" ", ""))
    except ValueError:
        raise ValueError(f"Row {row_no}: '{field}' must be a number (got '{value}')")
    return v


def _validate_headers(fieldnames: list[str], required: list[str]) -> None:
    present = {f.lower().strip() for f in fieldnames}
    missing = [r for r in required if r not in present]
    if missing:
        raise BadRequestError(
            f"CSV is missing required columns: {', '.join(missing)}",
            error_code="IMPORT_INVALID_HEADERS",
        )


def _normalize_row(row: dict, import_type: str, row_no: int) -> tuple[dict, list[str]]:
    """Normalize + validate a single row. Returns (document, errors)."""
    errors: list[str] = []
    now = utcnow()

    def req(name: str):
        return (row.get(name) or "").strip()

    def opt(name: str):
        return (row.get(name) or "").strip()

    if import_type == "transactions":
        ttype = req("type").lower()
        if ttype not in (INCOME, EXPENSE):
            errors.append(f"Row {row_no}: 'type' must be 'income' or 'expense' (got '{row.get('type')}')")
        try:
            amount = _to_float(req("amount"), "amount", row_no)
            if amount <= 0:
                errors.append(f"Row {row_no}: 'amount' must be positive")
        except ValueError as e:
            errors.append(str(e))
            amount = 0.0
        try:
            date = parse_datetime(req("date"), "date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
            date = None
        doc = {
            "date": date,
            "description": req("description"),
            "amount": amount,
            "type": ttype,
            "category": opt("category") or "General",
            "payment_method": opt("payment_method"),
            "reference_id": opt("reference_id") or None,
            "notes": opt("notes") or None,
        }
        fingerprint = _fp("txn", date, req("description").lower(), amount, ttype)
        dup_query = (
            {"date": date, "description": req("description"), "amount": amount, "type": ttype}
            if date else None
        )
        return doc, errors, fingerprint, dup_query

    if import_type == "invoices":
        try:
            invoice_date = parse_datetime(req("invoice_date"), "invoice_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
            invoice_date = None
        try:
            due_date = parse_datetime(req("due_date"), "due_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
            due_date = None
        try:
            total = _to_float(req("total_amount"), "total_amount", row_no)
            if total <= 0:
                errors.append(f"Row {row_no}: 'total_amount' must be positive")
        except ValueError as e:
            errors.append(str(e))
            total = 0.0
        paid_raw = opt("paid_amount")
        try:
            paid = _to_float(paid_raw, "paid_amount", row_no) if paid_raw else 0.0
            if paid < 0:
                errors.append(f"Row {row_no}: 'paid_amount' cannot be negative")
                paid = 0.0
        except ValueError as e:
            errors.append(str(e))
            paid = 0.0
        status = opt("status").lower() or "sent"
        if status not in INVOICE_STATUSES:
            errors.append(f"Row {row_no}: invalid status '{status}'")
            status = "sent"
        if invoice_date and due_date and due_date < invoice_date:
            errors.append(f"Row {row_no}: 'due_date' precedes 'invoice_date'")
        doc = {
            "invoice_number": req("invoice_number"),
            "customer_name": req("customer_name"),
            "customer_email": opt("customer_email"),
            "invoice_date": invoice_date,
            "due_date": due_date,
            "total_amount": total,
            "paid_amount": paid,
            "outstanding_amount": max(0.0, total - paid),
            "status": status,
            "items": [],
            "notes": opt("notes"),
        }
        fingerprint = _fp("inv", req("invoice_number").lower())
        dup_query = {"invoice_number": req("invoice_number")}
        return doc, errors, fingerprint, dup_query

    if import_type == "expenses":
        try:
            amount = _to_float(req("amount"), "amount", row_no)
            if amount <= 0:
                errors.append(f"Row {row_no}: 'amount' must be positive")
        except ValueError as e:
            errors.append(str(e))
            amount = 0.0
        try:
            date = parse_datetime(req("date"), "date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
            date = None
        doc = {
            "date": date,
            "description": req("description"),
            "category": opt("category") or "General",
            "vendor": opt("vendor"),
            "amount": amount,
            "payment_method": opt("payment_method"),
            "recurring": _parse_bool(opt("recurring")) if opt("recurring") else False,
            "notes": opt("notes") or None,
        }
        fingerprint = _fp("exp", date, req("description").lower(), amount, opt("category").lower())
        dup_query = (
            {"date": date, "description": req("description"), "amount": amount, "category": opt("category") or "General"}
            if date else None
        )
        return doc, errors, fingerprint, dup_query

    if import_type == "gst":
        try:
            tax = _to_float(req("tax_amount"), "tax_amount", row_no)
            if tax < 0:
                errors.append(f"Row {row_no}: 'tax_amount' cannot be negative")
        except ValueError as e:
            errors.append(str(e))
            tax = 0.0
        try:
            due_date = parse_datetime(req("due_date"), "due_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
            due_date = None
        period_start = period_end = None
        if opt("period_start"):
            try:
                period_start = parse_datetime(opt("period_start"), "period_start")
            except ValidationError as e:
                errors.append(f"Row {row_no}: {e.message}")
        if opt("period_end"):
            try:
                period_end = parse_datetime(opt("period_end"), "period_end")
            except ValidationError as e:
                errors.append(f"Row {row_no}: {e.message}")
        status = opt("status").lower() or "pending"
        if status not in GST_STATUSES:
            errors.append(f"Row {row_no}: invalid status '{status}'")
            status = "pending"
        paid_raw = opt("paid_amount")
        paid = 0.0
        if paid_raw:
            try:
                paid = _to_float(paid_raw, "paid_amount", row_no)
            except ValueError as e:
                errors.append(str(e))
        doc = {
            "period": req("period"),
            "period_start": period_start,
            "period_end": period_end,
            "due_date": due_date,
            "taxable_turnover": 0.0,
            "tax_amount": tax,
            "paid_amount": paid,
            "outstanding_amount": max(0.0, tax - paid),
            "status": status,
            "reference_number": opt("reference_number") or None,
            "notes": opt("notes") or None,
        }
        if opt("taxable_turnover"):
            try:
                doc["taxable_turnover"] = _to_float(opt("taxable_turnover"), "taxable_turnover", row_no)
            except ValueError as e:
                errors.append(str(e))
        fingerprint = _fp("gst", req("period").lower())
        dup_query = {"period": req("period")}
        return doc, errors, fingerprint, dup_query

    # loans
    try:
        principal = _to_float(req("principal_amount"), "principal_amount", row_no)
        if principal <= 0:
            errors.append(f"Row {row_no}: 'principal_amount' must be positive")
    except ValueError as e:
        errors.append(str(e))
        principal = 0.0
    outstanding = principal
    if opt("outstanding_amount"):
        try:
            outstanding = _to_float(opt("outstanding_amount"), "outstanding_amount", row_no)
        except ValueError as e:
            errors.append(str(e))
    rate = 0.0
    if opt("interest_rate"):
        try:
            rate = _to_float(opt("interest_rate"), "interest_rate", row_no)
            if not (0 <= rate <= 100):
                errors.append(f"Row {row_no}: 'interest_rate' must be 0-100")
        except ValueError as e:
            errors.append(str(e))
    emi = 0.0
    if opt("emi_amount"):
        try:
            emi = _to_float(opt("emi_amount"), "emi_amount", row_no)
        except ValueError as e:
            errors.append(str(e))
    start_date = end_date = next_emi = None
    if opt("start_date"):
        try:
            start_date = parse_datetime(opt("start_date"), "start_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
    if opt("end_date"):
        try:
            end_date = parse_datetime(opt("end_date"), "end_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
    if opt("next_emi_date"):
        try:
            next_emi = parse_datetime(opt("next_emi_date"), "next_emi_date")
        except ValidationError as e:
            errors.append(f"Row {row_no}: {e.message}")
    status = opt("status").lower() or "active"
    if status not in LOAN_STATUSES:
        errors.append(f"Row {row_no}: invalid status '{status}'")
        status = "active"
    doc = {
        "lender": req("lender"),
        "loan_type": opt("loan_type") or "Loan",
        "principal_amount": principal,
        "outstanding_amount": outstanding,
        "interest_rate": rate,
        "emi_amount": emi,
        "start_date": start_date,
        "end_date": end_date,
        "next_emi_date": next_emi,
        "status": status,
    }
    fingerprint = _fp("loan", req("lender").lower(), opt("loan_type").lower(), start_date)
    dup_query = {"lender": req("lender"), "loan_type": opt("loan_type") or "Loan", "start_date": start_date} if start_date else None
    return doc, errors, fingerprint, dup_query


async def import_csv(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    user_id: Any,
    import_type: str,
    content: bytes,
    filename: str,
) -> dict:
    config = _IMPORT_TYPES.get(import_type)
    if not config:
        raise BadRequestError(
            f"Unsupported import type '{import_type}'. Expected one of: {', '.join(_IMPORT_TYPES)}",
            error_code="IMPORT_INVALID_TYPE",
        )
    if not (filename or "").lower().endswith(".csv"):
        raise BadRequestError("Only CSV files are accepted", error_code="IMPORT_INVALID_FILE")
    if len(content) > MAX_FILE_BYTES:
        raise BadRequestError("File exceeds the 10 MB limit", error_code="PAYLOAD_TOO_LARGE", status_code=413)

    try:
        text = content.decode("utf-8-sig")
    except UnicodeDecodeError:
        try:
            text = content.decode("latin-1")
        except UnicodeDecodeError:
            raise BadRequestError("File is not valid UTF-8 text", error_code="IMPORT_INVALID_FILE")

    reader = csv.DictReader(io.StringIO(text))
    if not reader.fieldnames:
        raise BadRequestError("CSV appears to be empty", error_code="IMPORT_INVALID_FILE")
    _validate_headers(reader.fieldnames, config["required"])

    rows = list(reader)
    if len(rows) > settings.MAX_IMPORT_ROWS:
        raise BadRequestError(
            f"File has {len(rows)} rows; the maximum is {settings.MAX_IMPORT_ROWS}",
            error_code="PAYLOAD_TOO_LARGE",
            status_code=413,
        )

    collection = db[config["collection"]]
    total_rows = len(rows)
    successful = 0
    failed = 0
    duplicates = 0
    errors: list[dict] = []
    seen_fingerprints: set[str] = set()
    valid_docs: list[dict] = []

    for idx, raw_row in enumerate(rows, start=2):  # header is row 1
        row = {k.strip().lower(): (v or "") for k, v in raw_row.items()}
        doc, row_errors, fingerprint, dup_query = _normalize_row(row, import_type, idx)

        if row_errors:
            failed += 1
            errors.extend({"row": idx, "field": None, "message": m} for m in row_errors)
            continue

        if fingerprint in seen_fingerprints:
            duplicates += 1
            continue
        seen_fingerprints.add(fingerprint)

        # Duplicate check against existing records for this business.
        if dup_query:
            exists = await collection.find_one({"business_id": business_id, **dup_query})
            if exists:
                duplicates += 1
                continue

        doc["business_id"] = business_id
        doc["created_at"] = utcnow()
        doc["updated_at"] = utcnow()
        doc["_import_fingerprint"] = fingerprint
        valid_docs.append(doc)

    if valid_docs:
        try:
            result = await collection.insert_many(valid_docs, ordered=True)
            successful = len(result.inserted_ids)
        except Exception as exc:  # duplicate keys etc.
            # Fall back to per-document insertion to isolate failures.
            successful = 0
            for doc in valid_docs:
                try:
                    await collection.insert_one(doc)
                    successful += 1
                except Exception:
                    failed += 1
                    errors.append({"row": None, "field": None, "message": "Insert failed (duplicate key)"})

    return {
        "import_type": import_type,
        "total_rows": total_rows,
        "successful_rows": successful,
        "failed_rows": failed,
        "duplicates": duplicates,
        "errors": errors[:200],
    }


async def handle_upload(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    user_id: Any,
    import_type: str,
    file,
) -> dict:
    """Read an uploaded CSV file and run it through the import pipeline."""
    content = await file.read()
    return await import_csv(db, business_id, user_id, import_type, content, file.filename or "")
