"""Dashboard routes."""

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.services import dashboard_service, forecast_service

router = APIRouter(prefix="/dashboard", tags=["dashboard"])


@router.get("/summary")
async def summary(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.get_summary(db, business["_id"]))


@router.get("/financial-health")
async def financial_health(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.get_financial_health(db, business["_id"]))


@router.get("/monthly-series")
async def monthly_series(
    months: int = Query(6, ge=1, le=36),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.monthly_series(db, business["_id"], months))


@router.get("/revenue-trend")
async def revenue_trend(
    days: int = Query(30, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.revenue_trend(db, business["_id"], days))


@router.get("/cash-flow-trend")
async def cash_flow_trend(
    days: int = Query(30, ge=1, le=365),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.cash_flow_trend(db, business["_id"], days))


@router.get("/expense-distribution")
async def expense_distribution(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.expense_distribution(db, business["_id"]))


@router.get("/receivables-aging")
async def receivables_aging(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.receivables_aging(db, business["_id"]))


@router.get("/loan-overview")
async def loan_overview(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await dashboard_service.loan_overview(db, business["_id"]))


@router.get("/forecast-30day")
async def forecast_30day(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    forecast = await forecast_service.get_latest(db, business["_id"])
    if not forecast:
        forecast = await forecast_service.generate(db, business["_id"], days=30)
    return ok(forecast)
