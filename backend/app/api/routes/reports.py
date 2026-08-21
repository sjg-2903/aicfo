"""Reporting routes."""

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.services import report_service

router = APIRouter(prefix="/reports", tags=["reports"])


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
