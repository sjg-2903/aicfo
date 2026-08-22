"""Document upload / extraction routes.

``POST /uploads/extract``        — extract candidate rows from an image/PDF
                                  (nothing is stored; user reviews next).
``POST /uploads/extracted/confirm`` — insert user-confirmed rows into the
                                  target collection via the import pipeline.
"""

from typing import Any, Dict, List, Optional

from fastapi import APIRouter, Depends, File, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok
from app.services import extraction_service, history_service, import_service

router = APIRouter(prefix="/uploads", tags=["uploads"])


class ExtractedConfirmRequest(BaseModel):
    import_type: str = Field(..., description="One of: transactions, invoices, expenses, gst, loans")
    file_name: str = ""
    rows: List[Dict[str, Any]] = Field(..., description="User-confirmed rows (string-keyed field dicts)")

    model_config = {"extra": "ignore"}


@router.post("/extract")
async def extract_document(
    import_type: str,
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    content = await file.read()
    result = await extraction_service.extract_document(import_type, content, file.filename or "")
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="extraction",
        entity=import_type,
        status="success",
        message=f"Document processed — {file.filename or 'file'}",
        details={
            "file_name": file.filename or "",
            "method": result["method"],
            "confidence": result["confidence"],
            "rows_found": result["row_count"],
        },
    )
    return ok(result, "Document processed — review the extracted data before confirming")


@router.post("/extracted/confirm", status_code=201)
async def confirm_extracted(
    payload: ExtractedConfirmRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    if not payload.rows:
        from app.core.errors import BadRequestError

        raise BadRequestError("No rows to save", error_code="IMPORT_EMPTY_ROWS")

    # Sanitize: keep only recognized fields for the import type, drop empties.
    allowed = import_service.allowed_fields(payload.import_type)
    if not allowed:
        from app.core.errors import BadRequestError

        raise BadRequestError(
            f"Unsupported import type '{payload.import_type}'", error_code="IMPORT_INVALID_TYPE"
        )
    rows: list[dict] = []
    for raw in payload.rows:
        if not isinstance(raw, dict):
            continue
        cleaned = {
            str(k).strip().lower(): v
            for k, v in raw.items()
            if str(k).strip().lower() in allowed and v is not None and str(v).strip() != ""
        }
        if cleaned:
            rows.append(cleaned)

    result = await import_service.process_rows(
        db, business["_id"], payload.import_type, rows, start_row_no=1
    )
    status = "success" if result["failed_rows"] == 0 else "partial"
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="import",
        entity=payload.import_type,
        status=status,
        message=f"Saved {result['successful_rows']} record(s) from {payload.file_name or 'document'}",
        details={
            "file_name": payload.file_name or "extracted document",
            "source": "document_extraction",
            **result,
        },
    )
    return ok(result, "Confirmed records saved")
