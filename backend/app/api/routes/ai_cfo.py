"""AI CFO routes (chat / analyze / recommend)."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import ai_cfo
from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.schemas.analytics import ChatRequest
from app.services.chat_attachment_service import MAX_CHAT_FILE_BYTES, prepare_attachment

router = APIRouter(prefix="/ai-cfo", tags=["ai-cfo"])


@router.post("/chat")
async def chat(
    payload: ChatRequest,
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    result = await ai_cfo.chat(db, business["_id"], payload.message, payload.session_id)
    return ok(result)


@router.post("/chat/file")
async def chat_with_file(
    message: str = Form(..., min_length=1, max_length=4000),
    session_id: Optional[str] = Form(None),
    file: UploadFile = File(...),
    db: AsyncIOMotorDatabase = Depends(get_db),
    business: dict = Depends(get_current_business),
):
    content = await file.read(MAX_CHAT_FILE_BYTES + 1)
    attachment = prepare_attachment(
        content,
        file.filename or "attachment",
        file.content_type or "application/octet-stream",
    )
    result = await ai_cfo.chat(
        db,
        business["_id"],
        message,
        session_id,
        attachment=attachment,
    )
    return ok(result, "File analyzed")


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
