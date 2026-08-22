"""Deterministic document extraction (OCR) for images and PDFs.

Financial fields are extracted from uploaded invoices, statements and other
documents with local, review-first methods:

1. **PDF text layer** (``pypdf``) + deterministic heuristic parsers.
2. **Tesseract OCR** (optional system binary) + the same heuristics for images.
3. **Manual review** when no safe text can be recovered.

Bedrock is intentionally not used for imports: it is reserved for explanations,
summaries, insights, and AI CFO chat responses. Nothing is inserted into the
database here; the caller shows candidate rows in an editable review form and
only the explicit *confirm* endpoint stores anything.
"""

import logging
import re
from datetime import datetime
from typing import Any, Optional

from app.services import import_service

logger = logging.getLogger(__name__)

MAX_DOC_BYTES = 15 * 1024 * 1024  # 15 MB
MAX_EXTRACT_ROWS = 200

DOCUMENT_EXTENSIONS = {".pdf", ".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}

# ── Heuristic helpers ─────────────────────────────────────────────────────────

_AMOUNT_RE = re.compile(r"(?:₹|Rs\.?|INR)?\s*([0-9]{1,3}(?:,[0-9]{2,3})+(?:\.[0-9]{1,2})?|[0-9]+(?:\.[0-9]{1,2})?)")
_DATE_RE = re.compile(
    r"(\d{1,2}[/-]\d{1,2}[/-]\d{2,4}|\d{4}-\d{1,2}-\d{1,2}|"
    r"\d{1,2}\s(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?,?\s\d{2,4})",
    re.IGNORECASE,
)
# Require the explicit "no/number/#" marker to avoid matching the word "invoice" itself.
_INVOICE_NO_STRICT = re.compile(
    r"\b(?:invoice|inv|bill)\b[\s-]*(?:no\.?|number|#)\s*[:#-]?\s*([A-Za-z0-9][A-Za-z0-9/-]{2,})",
    re.IGNORECASE,
)
_INVOICE_NO_LOOSE = re.compile(
    r"\b(?:invoice|inv|bill)\b[\s-]+([A-Za-z0-9][A-Za-z0-9/-]{2,})", re.IGNORECASE
)
_GSTIN_RE = re.compile(r"\b[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][0-9A-Z]Z[0-9A-Z]\b")

_GENERIC_WORDS = {"invoice", "inv", "bill", "tax", "no", "number", "date", "total", "amount", "customer", "due"}


def _find_amounts(text: str) -> list[float]:
    """Extract monetary amounts, preferring currency/label-adjacent numbers
    so dates and invoice numbers are not mistaken for money."""
    values: list[float] = []
    for m in re.finditer(r"(?:₹|Rs\.?|INR)\s*([0-9][0-9,]*(\.[0-9]{1,2})?)", text, re.IGNORECASE):
        v = _parse_float(m.group(1))
        if v is not None:
            values.append(v)
    for m in re.finditer(
        r"(?:total|amount|paid|due|tax|emi|principal|outstanding|balance)\D{0,24}?([0-9][0-9,]*(\.[0-9]{1,2})?)",
        text,
        re.IGNORECASE,
    ):
        v = _parse_float(m.group(1))
        if v is not None and v not in values:
            values.append(v)
    if not values:
        for m in _AMOUNT_RE.finditer(text):
            v = _parse_float(m.group(1))
            if v is not None and v >= 100:
                values.append(v)
    return values


def _invoice_numbers(text: str) -> list[str]:
    numbers: list[str] = []
    for m in _INVOICE_NO_STRICT.finditer(text):
        candidate = m.group(1)
        if candidate.lower() not in _GENERIC_WORDS:
            numbers.append(candidate)
    if not numbers:
        for m in _INVOICE_NO_LOOSE.finditer(text):
            candidate = m.group(1)
            if candidate.lower() not in _GENERIC_WORDS and not candidate.isdigit():
                numbers.append(candidate)
    return numbers


def _parse_float(value: Any) -> Optional[float]:
    if value is None:
        return None
    if isinstance(value, (int, float)):
        return float(value)
    text = str(value).strip().replace(",", "").replace("₹", "").replace("Rs.", "").replace(" ", "")
    if not text:
        return None
    try:
        return float(text)
    except ValueError:
        return None


def _parse_date(value: Any) -> Optional[str]:
    if value is None:
        return None
    if isinstance(value, datetime):
        return value.date().isoformat()
    text = str(value).strip()
    if not text:
        return None
    for fmt in ("%Y-%m-%d", "%d/%m/%Y", "%d-%m-%Y", "%d/%m/%y", "%d-%m-%y", "%m/%d/%Y", "%d %b %Y", "%d %B %Y"):
        try:
            return datetime.strptime(text, fmt).date().isoformat()
        except ValueError:
            continue
    return None


def _clean_row(row: dict, import_type: str) -> dict:
    """Keep only allowed fields, as strings (numbers formatted for the form)."""
    allowed = import_service.allowed_fields(import_type)
    cleaned: dict = {}
    for key, value in row.items():
        key_s = str(key).strip().lower()
        if key_s not in allowed or value is None or value == "":
            continue
        if isinstance(value, bool):
            cleaned[key_s] = "true" if value else "false"
        elif isinstance(value, float) and value.is_integer():
            cleaned[key_s] = str(int(value))
        else:
            cleaned[key_s] = str(value).strip()
    return cleaned


def _heuristic_rows(text: str, import_type: str) -> list[dict]:
    """Best-effort deterministic extraction of entity rows from raw text."""
    lines = [ln.strip() for ln in text.splitlines() if ln.strip()]
    full_text = " ".join(lines)

    if import_type == "transactions":
        rows = []
        for line in lines[:100]:
            amounts = _AMOUNT_RE.findall(line)
            if not amounts:
                continue
            date_match = _DATE_RE.search(line)
            amount = _parse_float(amounts[0])
            if amount is None or amount <= 0 or len(line) < 12:
                continue
            amount_idx = line.find(amounts[0])
            description = line[:amount_idx].strip() or line
            description = _DATE_RE.sub("", description).strip(" -—:") or line
            rows.append({
                "date": _parse_date(date_match.group(0)) if date_match else "",
                "description": description[:120],
                "amount": amount,
                "type": "expense" if re.search(r"\b(paid|payment|debit|purchase|spent)\b", line, re.I) else "income",
            })
        return rows[:MAX_EXTRACT_ROWS]

    if import_type == "invoices":
        invoice_nos = _invoice_numbers(full_text)
        dates = [_parse_date(m) for m in _DATE_RE.findall(full_text)]
        dates = [d for d in dates if d]
        amounts = [a for a in _find_amounts(full_text) if a > 0]
        rows = []
        # Pair the largest "total" amount with the first invoice number/date.
        total_amount = amounts[0] if amounts else 0.0
        paid_match = re.search(r"(?:amount\s*paid|paid\s*amount)\D{0,16}?([0-9][0-9,]*(\.[0-9]{1,2})?)", full_text, re.I)
        paid_amount = _parse_float(paid_match.group(1)) if paid_match else 0.0
        for idx, inv_no in enumerate(invoice_nos[:10]):
            rows.append({
                "invoice_number": inv_no[:40],
                "customer_name": "",
                "invoice_date": dates[idx] if idx < len(dates) else (dates[0] if dates else ""),
                "due_date": dates[idx + 1] if idx + 1 < len(dates) else "",
                "total_amount": amounts[idx] if idx < len(amounts) else total_amount,
                "paid_amount": paid_amount,
                "status": "paid" if paid_amount >= total_amount > 0 else "sent",
            })
        if not rows and (dates or amounts):
            rows.append({
                "invoice_number": "",
                "customer_name": "",
                "invoice_date": dates[0] if dates else "",
                "due_date": dates[1] if len(dates) > 1 else "",
                "total_amount": total_amount,
                "paid_amount": paid_amount,
                "status": "sent",
            })
        return rows[:MAX_EXTRACT_ROWS]

    if import_type == "expenses":
        rows = []
        for line in lines[:100]:
            amounts = _AMOUNT_RE.findall(line)
            if not amounts:
                continue
            amount = _parse_float(amounts[0])
            if amount is None or amount <= 0 or len(line) < 10:
                continue
            date_match = _DATE_RE.search(line)
            amount_idx = line.find(amounts[0])
            description = _DATE_RE.sub("", line[:amount_idx]).strip(" -—:") or line
            vendor = ""
            vendor_match = re.search(r"(?:to|from|vendor|supplier)\s*[:]?\s*([A-Za-z0-9 .&'-]{2,})", line, re.I)
            if vendor_match:
                vendor = vendor_match.group(1).strip()[:60]
            rows.append({
                "date": _parse_date(date_match.group(0)) if date_match else "",
                "description": description[:120],
                "category": "",
                "vendor": vendor,
                "amount": amount,
            })
        return rows[:MAX_EXTRACT_ROWS]

    if import_type == "gst":
        rows = []
        period_match = re.search(r"(?:period|month)\s*[:]?\s*([A-Za-z]{3,9}[\s-]?\d{4})", full_text, re.I)
        period = period_match.group(1).strip() if period_match else ""
        dates = [_parse_date(m) for m in _DATE_RE.findall(full_text)]
        dates = [d for d in dates if d]
        amounts = _find_amounts(full_text)
        taxable = amounts[0] if amounts else 0.0
        tax = amounts[1] if len(amounts) > 1 else 0.0
        paid = 0.0
        if re.search(r"\b(paid|filed)\b", full_text, re.I):
            paid = tax
        rows.append({
            "period": period,
            "period_start": "",
            "period_end": "",
            "due_date": dates[1] if len(dates) > 1 else (dates[0] if dates else ""),
            "taxable_turnover": taxable,
            "tax_amount": tax,
            "paid_amount": paid,
            "status": "paid" if paid >= tax > 0 else ("filed" if re.search(r"\bfiled\b", full_text, re.I) else "pending"),
            "reference_number": "",
        })
        return rows[:MAX_EXTRACT_ROWS]

    # loans
    amounts = [a for a in _find_amounts(full_text) if a > 0]
    rows = []
    if amounts:
        rows.append({
            "lender": "",
            "loan_type": "Term Loan",
            "principal_amount": amounts[0],
            "outstanding_amount": amounts[1] if len(amounts) > 1 else amounts[0],
            "interest_rate": 0.0,
            "emi_amount": amounts[2] if len(amounts) > 2 else 0.0,
            "start_date": "",
            "end_date": "",
            "next_emi_date": "",
            "status": "active",
        })
    return rows[:MAX_EXTRACT_ROWS]


# ── Text extraction from files ───────────────────────────────────────────────

def _extract_pdf_text(content: bytes) -> str:
    try:
        from pypdf import PdfReader
    except ImportError:  # pragma: no cover - dependency guard
        return ""
    try:
        reader = PdfReader(io_bytes := __import__("io").BytesIO(content))
        pages = []
        for page in reader.pages[:20]:
            pages.append(page.extract_text() or "")
        return "\n".join(pages).strip()
    except Exception as exc:
        logger.warning("PDF text extraction failed: %s", exc)
        return ""


def _extract_image_text(content: bytes) -> str:
    """OCR an image via tesseract when the system binary is available."""
    try:
        import pytesseract
        from PIL import Image
    except ImportError:  # pragma: no cover - dependency guard
        return ""
    import io

    try:
        image = Image.open(io.BytesIO(content))
        image.thumbnail((2000, 2000))
        return (pytesseract.image_to_string(image) or "").strip()
    except Exception as exc:
        logger.warning("Tesseract OCR failed (binary missing or unreadable image): %s", exc)
        return ""



# ── Public API ────────────────────────────────────────────────────────────────

async def extract_document(
    import_type: str,
    content: bytes,
    filename: str,
) -> dict:
    """Extract candidate rows locally; nothing is saved until user confirmation."""
    if import_type not in import_service.IMPORT_TYPES:
        from app.core.errors import BadRequestError

        raise BadRequestError(
            f"Unsupported import type '{import_type}'", error_code="IMPORT_INVALID_TYPE"
        )
    ext = ("." + (filename or "").lower().rsplit(".", 1)[-1]) if "." in (filename or "") else ""
    if ext not in DOCUMENT_EXTENSIONS:
        from app.core.errors import BadRequestError

        raise BadRequestError(
            "Only PDF and image files (PNG, JPG, JPEG) are supported for document extraction",
            error_code="EXTRACT_INVALID_FILE",
        )
    if len(content) > MAX_DOC_BYTES:
        from app.core.errors import BadRequestError

        raise BadRequestError(
            "Document exceeds the 15 MB limit", error_code="PAYLOAD_TOO_LARGE", status_code=413
        )

    is_image = ext in {".png", ".jpg", ".jpeg", ".webp", ".tif", ".tiff"}
    text = "" if is_image else _extract_pdf_text(content)
    method = "heuristics"
    confidence = "low"

    # OCR is only needed for images. It runs locally when the optional
    # Tesseract binary is available, then feeds the same deterministic parser.
    if is_image:
        text = _extract_image_text(content)
        if text:
            method = "tesseract"
            confidence = "medium"

    rows: list[dict] = []
    if text:
        rows = [_clean_row(row, import_type) for row in _heuristic_rows(text, import_type)]
        rows = [row for row in rows if any(row.values())]

    if not rows:
        method = "manual" if is_image and not text else "heuristics"
        confidence = "low"

    return {
        "file_name": filename,
        "import_type": import_type,
        "method": method,
        "confidence": confidence,
        "rows": rows[:MAX_EXTRACT_ROWS],
        "raw_text": (text or "")[:4000],
        "row_count": len(rows[:MAX_EXTRACT_ROWS]),
        "note": _method_note(method, confidence),
    }

def _method_note(method: str, confidence: str) -> str:
    if method == "tesseract":
        return "Text was recognized from the image. Some fields may be inaccurate — please review carefully."
    if method == "manual":
        return (
            "No text could be recognized from this document automatically. You can enter the "
            "records manually in the review form below and confirm them — nothing is saved until you confirm."
        )
    if confidence == "medium":
        return "Fields were extracted from the document text. Please verify amounts and dates before confirming."
    if confidence == "low":
        return "A few fields were found in the document. Please complete and verify every row before confirming."
    return (
        "No text could be recognized from this document automatically. You can enter the "
        "records manually in the review form below and confirm them — nothing is saved until you confirm."
    )
