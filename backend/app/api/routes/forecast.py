"""Forecast routes."""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.schemas.analytics import ForecastGenerateRequest
from app.services import forecast_service

router = APIRouter(prefix="/forecast", tags=["forecast"])


@router.get("/cashflow")
async def get_cashflow_forecast(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    forecast = await forecast_service.get_latest(db, business["_id"])
    if not forecast:
        forecast = await forecast_service.generate(db, business["_id"], days=30)
    return ok(forecast)


@router.post("/generate", status_code=201)
async def generate_forecast(
    payload: ForecastGenerateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    forecast = await forecast_service.generate(db, business["_id"], days=payload.days)
    return ok(forecast, "Forecast generated")
