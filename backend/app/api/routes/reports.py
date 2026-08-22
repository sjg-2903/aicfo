"""Reporting routes — structured JSON reports + generated PDF documents."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from fastapi.responses import Response
from motor.motor_asyncio import AsyncIOMotorDatabase
from pydantic import BaseModel, Field

from app.api.deps import get_current_business, get_current_user, get_db
from app.api.response import ok
from app.services import history_service, pdf_report_service, report_service

router = APIRouter(prefix="/reports", tags=["reports"])


class PdfReportRequest(BaseModel):
    report_type: str = Field(
        "comprehensive", description="comprehensive | financial_summary | cash_flow | risk"
    )

    model_config = {"extra": "ignore"}


@router.get("/financial-summary")
async def financial_summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await report_service.financial_summary(db, business["_id"]))


@router.get("/cashflow")
async def cashflow(
    days: int = Query(30, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await report_service.cashflow_report(db, business["_id"], days))


@router.get("/risk")
async def risk(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await report_service.risk_report(db, business["_id"]))


# ── PDF generation / storage / download ─────────────────────────────────────

@router.post("/pdf", status_code=201)
async def generate_pdf(
    payload: PdfReportRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
    user: dict = Depends(get_current_user),
):
    meta = await pdf_report_service.generate_and_store(db, business, user["_id"], payload.report_type)
    await history_service.record_event(
        db,
        business_id=business["_id"],
        user_id=user["_id"],
        event_type="report",
        entity="report",
        status="success",
        message=f"Generated {meta['title']}",
        details={
            "report_type": meta["report_type"],
            "filename": meta["filename"],
            "size_bytes": meta["size_bytes"],
        },
        report_id=meta["id"],
    )
    return ok(meta, "PDF report generated")


@router.get("/pdf")
async def list_pdfs(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await pdf_report_service.list_reports(db, business["_id"]))


@router.get("/pdf/{report_id}")
async def download_pdf(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    content, filename = await pdf_report_service.fetch_report(db, business["_id"], report_id)
    return Response(
        content=content,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.delete("/pdf/{report_id}")
async def delete_pdf(
    report_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    await pdf_report_service.delete_report(db, business["_id"], report_id)
    return ok(message="Report deleted")
