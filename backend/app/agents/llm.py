"""LLM client (Google Gemini) with graceful deterministic fallback.

The AI is used *only* to explain financial results that were already computed
by trusted Python services. It never performs financial calculations.
"""

import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def is_available() -> bool:
    return bool(settings.GEMINI_API_KEY)


async def complete(system: str, user: str) -> Optional[str]:
    """Return LLM text, or ``None`` when no LLM is configured / available."""
    if not settings.GEMINI_API_KEY:
        return None

    url = GEMINI_ENDPOINT.format(model=settings.GEMINI_MODEL)
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": 0.2, "maxOutputTokens": 1024},
    }
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return text or None
    except Exception as exc:  # never leak credentials / fail the request
        logger.warning("Gemini call failed; falling back to deterministic explanation: %s", exc)
        return None
