"""Business profile routes."""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.schemas.business import BusinessUpdateRequest
from app.services import business_service

router = APIRouter(prefix="/business", tags=["business"])


@router.get("")
async def get_business(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    return ok(await business_service.get_business(db, business["_id"]))


@router.put("")
async def update_business(
    payload: BusinessUpdateRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await business_service.update_business(db, business["_id"], payload)
    return ok(result, "Business updated")
