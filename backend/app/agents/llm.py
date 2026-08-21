"""LLM client with pluggable providers (OpenAI-compatible + Google Gemini).

The AI is used *only* to explain financial results that were already computed
by trusted Python services. It never performs financial calculations.

Supported providers (configured via ``LLM_PROVIDER``):

- ``openai`` — any OpenAI-compatible Chat Completions endpoint. This covers
  OpenAI, DeepSeek, Groq, OpenRouter, Together AI, Mistral, xAI, Azure OpenAI
  and self-hosted servers (vLLM / Ollama's OpenAI endpoint) by changing
  ``OPENAI_BASE_URL`` and ``OPENAI_MODEL``.
- ``gemini`` — Google Gemini (retained for backwards compatibility).

When no provider is configured, callers fall back to deterministic
explanations built from the trusted backend calculations (no fake numbers).
"""

import base64
import logging
from typing import Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

GEMINI_ENDPOINT = "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent"


def active_provider() -> Optional[str]:
    """Return the name of the configured, usable provider (``openai`` | ``gemini`` | ``None``)."""
    provider = (settings.LLM_PROVIDER or "").strip().lower()
    if provider == "openai" and settings.OPENAI_API_KEY:
        return "openai"
    if provider == "gemini" and settings.GEMINI_API_KEY:
        return "gemini"
    # Legacy fallback: if only GEMINI_API_KEY is set, honour it.
    if not provider and settings.GEMINI_API_KEY:
        return "gemini"
    return None


def is_available() -> bool:
    return active_provider() is not None


# ── OpenAI-compatible Chat Completions ────────────────────────────────────────

def _openai_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.OPENAI_API_KEY}",
        "Content-Type": "application/json",
    }


async def _openai_complete(system: str, user: str, max_tokens: int, temperature: float) -> Optional[str]:
    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        "temperature": temperature,
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=_openai_headers())
            resp.raise_for_status()
            data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            return None
        text = (choices[0].get("message") or {}).get("content") or ""
        return text.strip() or None
    except Exception as exc:
        logger.warning("OpenAI-compatible call failed; falling back to deterministic explanation: %s", exc)
        return None


async def _openai_complete_vision(
    system: str, prompt: str, image_bytes: bytes, mime_type: str, max_tokens: int,
) -> Optional[str]:
    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/chat/completions"
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    payload = {
        "model": settings.OPENAI_MODEL,
        "messages": [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime_type};base64,{image_b64}"}},
                ],
            },
        ],
        "temperature": 0.1,
        "max_tokens": max_tokens,
    }
    try:
        async with httpx.AsyncClient(timeout=90.0) as client:
            resp = await client.post(url, json=payload, headers=_openai_headers())
            resp.raise_for_status()
            data = resp.json()
        choices = data.get("choices") or []
        if not choices:
            return None
        text = (choices[0].get("message") or {}).get("content") or ""
        return text.strip() or None
    except Exception as exc:
        logger.warning("OpenAI-compatible vision call failed; falling back to deterministic extraction: %s", exc)
        return None


# ── Google Gemini ─────────────────────────────────────────────────────────────

async def _gemini_complete(system: str, user: str, max_tokens: int, temperature: float) -> Optional[str]:
    url = GEMINI_ENDPOINT.format(model=settings.GEMINI_MODEL)
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": [{"text": user}]}],
        "generationConfig": {"temperature": temperature, "maxOutputTokens": max_tokens},
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


async def _gemini_complete_vision(
    system: str, prompt: str, image_bytes: bytes, mime_type: str, max_tokens: int,
) -> Optional[str]:
    url = GEMINI_ENDPOINT.format(model=settings.GEMINI_MODEL)
    payload = {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [
            {
                "role": "user",
                "parts": [
                    {"text": prompt},
                    {"inlineData": {"mimeType": mime_type, "data": base64.b64encode(image_bytes).decode("ascii")}},
                ],
            }
        ],
        "generationConfig": {"temperature": 0.1, "maxOutputTokens": max_tokens},
    }
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=60.0) as client:
            resp = await client.post(url, json=payload, headers=headers)
            resp.raise_for_status()
            data = resp.json()
        candidates = data.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        text = "".join(p.get("text", "") for p in parts).strip()
        return text or None
    except Exception as exc:
        logger.warning("Gemini vision call failed; falling back to deterministic extraction: %s", exc)
        return None


# ── Image generation ─────────────────────────────────────────────────────────

async def _openai_generate_image(prompt: str, size: str) -> Optional[dict]:
    url = f"{settings.OPENAI_BASE_URL.rstrip('/')}/images/generations"
    payload = {
        "model": settings.OPENAI_IMAGE_MODEL,
        "prompt": prompt,
        "size": size,
        "n": 1,
    }
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=payload, headers=_openai_headers())
            response.raise_for_status()
            body = response.json()
        images = body.get("data") or []
        if not images:
            return None
        image = images[0]
        image_url = image.get("url")
        mime_type = "image/png"
        if not image_url and image.get("b64_json"):
            image_url = f"data:{mime_type};base64,{image['b64_json']}"
        if not image_url:
            return None
        return {
            "image_url": image_url,
            "mime_type": mime_type,
            "revised_prompt": image.get("revised_prompt") or prompt,
            "engine": "openai",
            "model": settings.OPENAI_IMAGE_MODEL,
        }
    except Exception as exc:
        logger.warning("OpenAI-compatible image generation failed: %s", exc)
        return None


async def _gemini_generate_image(prompt: str, size: str) -> Optional[dict]:
    # Gemini chooses aspect ratio through prompt/model capabilities.  Include
    # the requested canvas as guidance while requesting both text and image.
    url = GEMINI_ENDPOINT.format(model=settings.GEMINI_IMAGE_MODEL)
    payload = {
        "contents": [
            {
                "role": "user",
                "parts": [{"text": f"Create this image at {size}: {prompt}"}],
            }
        ],
        "generationConfig": {"responseModalities": ["TEXT", "IMAGE"]},
    }
    headers = {"x-goog-api-key": settings.GEMINI_API_KEY}
    try:
        async with httpx.AsyncClient(timeout=180.0) as client:
            response = await client.post(url, json=payload, headers=headers)
            response.raise_for_status()
            body = response.json()
        candidates = body.get("candidates") or []
        if not candidates:
            return None
        parts = candidates[0].get("content", {}).get("parts", [])
        revised_prompt_parts = []
        for part in parts:
            if part.get("text"):
                revised_prompt_parts.append(part["text"])
            inline = part.get("inlineData") or part.get("inline_data") or {}
            data = inline.get("data")
            if data:
                mime_type = inline.get("mimeType") or inline.get("mime_type") or "image/png"
                return {
                    "image_url": f"data:{mime_type};base64,{data}",
                    "mime_type": mime_type,
                    "revised_prompt": " ".join(revised_prompt_parts).strip() or prompt,
                    "engine": "gemini",
                    "model": settings.GEMINI_IMAGE_MODEL,
                }
        return None
    except Exception as exc:
        logger.warning("Gemini image generation failed: %s", exc)
        return None


# ── Public API ────────────────────────────────────────────────────────────────

async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> Optional[str]:
    """Return LLM text, or ``None`` when no provider is configured / available.

    Keyword-only generation controls let structured callers request enough room
    for JSON while preserving the original two-argument API used by chat.
    """
    provider = active_provider()
    if provider == "openai":
        return await _openai_complete(system, user, max_tokens=max_tokens, temperature=temperature)
    if provider == "gemini":
        return await _gemini_complete(system, user, max_tokens=max_tokens, temperature=temperature)
    return None


async def complete_vision(
    system: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> Optional[str]:
    """Send an image + text prompt to the active provider (used for document OCR)."""
    provider = active_provider()
    if provider == "openai":
        return await _openai_complete_vision(system, prompt, image_bytes, mime_type, max_tokens=2048)
    if provider == "gemini":
        return await _gemini_complete_vision(system, prompt, image_bytes, mime_type, max_tokens=2048)
    return None


async def generate_image(prompt: str, size: str = "1024x1024") -> Optional[dict]:
    """Generate an image with the active provider, returning a browser-safe URL."""
    provider = active_provider()
    if provider == "openai":
        return await _openai_generate_image(prompt, size)
    if provider == "gemini":
        return await _gemini_generate_image(prompt, size)
    return None
