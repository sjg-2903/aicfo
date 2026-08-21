"""AI CFO routes (chat / analyze / recommend)."""

from typing import Optional

from fastapi import APIRouter, Depends, File, Form, UploadFile
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import ai_cfo, llm
from app.api.deps import get_current_business, get_db
from app.api.response import ok
from app.core.errors import ServiceUnavailableError
from app.schemas.analytics import ChatRequest, ImageGenerateRequest
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


@router.post("/images/generate")
async def generate_image(
    payload: ImageGenerateRequest,
    business: dict = Depends(get_current_business),
):
    # Authentication/business dependency intentionally scopes this capability to
    # signed-in users even though no ledger data is sent to the image model.
    _ = business
    image = await llm.generate_image(payload.prompt, payload.size)
    if not image:
        if not llm.is_available():
            message = (
                "Image generation is not configured. Add an OpenAI-compatible or "
                "Gemini API key to the backend environment."
            )
        else:
            message = (
                "The configured AI provider could not generate this image. Check that "
                "the configured image model supports image generation and try again."
            )
        raise ServiceUnavailableError(message, error_code="IMAGE_GENERATION_UNAVAILABLE")
    return ok(image, "Image generated")


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
