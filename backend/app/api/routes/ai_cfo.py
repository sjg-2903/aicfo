"""AI CFO routes (chat / analyze / recommend)."""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import ai_cfo
from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.schemas.analytics import ChatRequest

router = APIRouter(prefix="/ai-cfo", tags=["ai-cfo"])


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await ai_cfo.chat(db, business["_id"], payload.message, payload.session_id)
    return ok(result)


@router.post("/analyze")
async def analyze(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await ai_cfo.analyze(db, business["_id"])
    return ok(result, "Analysis complete")


@router.post("/recommend")
async def recommend(
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await ai_cfo.recommend(db, business["_id"])
    return ok(result, "Recommendations generated")
