"""Loan readiness routes."""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.services import loan_readiness_service

router = APIRouter(prefix="/loan-readiness", tags=["loan-readiness"])


@router.get("")
async def get_readiness(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await loan_readiness_service.get_latest(db, business["_id"])
    if not result:
        result = await loan_readiness_service.analyze(db, business["_id"])
    return ok(result)


@router.post("/analyze", status_code=201)
async def analyze(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await loan_readiness_service.analyze(db, business["_id"])
    return ok(result, "Loan readiness analysis complete")
