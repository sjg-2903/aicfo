"""Risk analysis routes."""

from typing import Optional

from fastapi import APIRouter, Depends, Query
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.schemas.analytics import RiskAnalyzeRequest
from app.services import risk_service

router = APIRouter(prefix="/risk", tags=["risk"])


@router.get("")
async def get_risk(
    severity: Optional[str] = None,
    category: Optional[str] = None,
    status: Optional[str] = None,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    assessment = await risk_service.get_latest(db, business["_id"])
    if not assessment:
        assessment = await risk_service.analyze(db, business["_id"])

    risks = assessment.get("risks", [])
    if severity:
        risks = [r for r in risks if r.get("severity") == severity]
    if category:
        risks = [r for r in risks if r.get("type") == category]
    if status:
        risks = [r for r in risks if r.get("status", "active") == status]

    assessment["risks"] = risks
    return ok(assessment)


@router.post("/analyze", status_code=201)
async def analyze(
    payload: RiskAnalyzeRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    assessment = await risk_service.analyze(db, business["_id"])
    return ok(assessment, "Risk analysis complete")


@router.put("/{risk_id}/acknowledge")
async def acknowledge(
    risk_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await risk_service.set_risk_status(db, business["_id"], risk_id, "acknowledged"))


@router.put("/{risk_id}/resolve")
async def resolve(
    risk_id: str,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await risk_service.set_risk_status(db, business["_id"], risk_id, "resolved"))
