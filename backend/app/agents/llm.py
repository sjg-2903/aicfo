"""OpenAI and Google Gemini clients for the AI CFO narrative layer.

The configured provider receives only already-calculated financial context and
is used to explain, summarize, surface insights, and answer AI CFO chat
questions. It does not calculate financial metrics, forecasts, scores, or
deterministic recommendations. Every caller retains a deterministic fallback
when no provider is configured or a request fails.

The integration uses the providers' HTTPS APIs through ``httpx``. API keys stay
on the backend and are never returned to the browser or written to logs. Image
support is limited to understanding an image attached to an existing chat; this
module intentionally does not expose image generation.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any, Optional
from urllib.parse import quote

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_IMAGE_FORMATS = {"png", "jpeg", "gif", "webp"}
_RETRYABLE_STATUS_CODES = {408, 409, 429}
_SUPPORTED_PROVIDERS = {"openai", "gemini"}


def active_provider() -> Optional[str]:
    """Return the configured provider when its API key and model are present.

    ``LLM_PROVIDER=auto`` selects OpenAI first when both keys are present, then
    Gemini. Set the variable explicitly to ``openai`` or ``gemini`` to require
    one provider.
    """
    requested = (settings.LLM_PROVIDER or "auto").strip().lower()
    candidates = ["openai", "gemini"] if requested in {"", "auto"} else [requested]

    for provider in candidates:
        if provider == "openai":
            if (settings.OPENAI_API_KEY or "").strip() and (settings.OPENAI_MODEL or "").strip():
                return provider
        elif provider == "gemini":
            if (settings.GEMINI_API_KEY or "").strip() and (settings.GEMINI_MODEL or "").strip():
                return provider
    return None


def is_available() -> bool:
    """Whether an OpenAI or Gemini narrative provider is configured."""
    return active_provider() is not None


def _image_format(mime_type: str) -> str:
    """Normalize an image MIME type to a provider-supported format."""
    fmt = (mime_type or "").split(";")[0].strip().lower().rsplit("/", 1)[-1]
    if fmt == "jpg":
        fmt = "jpeg"
    return fmt if fmt in _IMAGE_FORMATS else "png"


def _image_mime_type(mime_type: str) -> str:
    return f"image/{_image_format(mime_type)}"


def _endpoint_and_headers(provider: str) -> tuple[str, dict[str, str]]:
    """Build a provider endpoint without putting an API key in the URL."""
    if provider == "openai":
        base_url = (settings.OPENAI_BASE_URL or "https://api.openai.com/v1").strip().rstrip("/")
        return (
            f"{base_url}/chat/completions",
            {
                "Authorization": f"Bearer {(settings.OPENAI_API_KEY or '').strip()}",
                "Content-Type": "application/json",
            },
        )
    if provider == "gemini":
        base_url = (settings.GEMINI_BASE_URL or "https://generativelanguage.googleapis.com/v1beta").strip().rstrip("/")
        model = quote(settings.GEMINI_MODEL.strip(), safe="")
        return (
            f"{base_url}/models/{model}:generateContent",
            {
                "x-goog-api-key": (settings.GEMINI_API_KEY or "").strip(),
                "Content-Type": "application/json",
            },
        )
    raise ValueError(f"Unsupported LLM provider: {provider}")


async def _request_json(
    provider: str,
    payload: dict[str, Any],
    timeout_seconds: float,
) -> dict[str, Any]:
    """Make one provider request. Kept separate to allow isolated unit tests."""
    url, headers = _endpoint_and_headers(provider)
    timeout = httpx.Timeout(timeout_seconds, connect=min(timeout_seconds, 20.0))
    async with httpx.AsyncClient(timeout=timeout, follow_redirects=False) as client:
        response = await client.post(url, headers=headers, json=payload)
        response.raise_for_status()
        body = response.json()
    if not isinstance(body, dict):
        raise ValueError("Provider returned a non-object JSON response")
    return body


def _openai_payload(
    system: str,
    user: str,
    max_tokens: int,
    temperature: float,
    *,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    user_content: Any = user
    if image_bytes is not None:
        encoded = base64.b64encode(image_bytes).decode("ascii")
        user_content = [
            {"type": "text", "text": user},
            {
                "type": "image_url",
                "image_url": {"url": f"data:{_image_mime_type(mime_type)};base64,{encoded}"},
            },
        ]
    return {
        "model": settings.OPENAI_MODEL.strip(),
        "messages": [
            {"role": "system", "content": system},
            {"role": "user", "content": user_content},
        ],
        "max_completion_tokens": max_tokens,
        "temperature": temperature,
    }


def _gemini_payload(
    system: str,
    user: str,
    max_tokens: int,
    temperature: float,
    *,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    parts: list[dict[str, Any]] = [{"text": user}]
    if image_bytes is not None:
        parts.append(
            {
                "inlineData": {
                    "mimeType": _image_mime_type(mime_type),
                    "data": base64.b64encode(image_bytes).decode("ascii"),
                }
            }
        )
    return {
        "systemInstruction": {"parts": [{"text": system}]},
        "contents": [{"role": "user", "parts": parts}],
        "generationConfig": {
            "maxOutputTokens": max_tokens,
            "temperature": temperature,
        },
    }


def _build_payload(
    provider: str,
    system: str,
    user: str,
    max_tokens: int,
    temperature: float,
    *,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/png",
) -> dict[str, Any]:
    if provider == "openai":
        return _openai_payload(
            system,
            user,
            max_tokens,
            temperature,
            image_bytes=image_bytes,
            mime_type=mime_type,
        )
    if provider == "gemini":
        return _gemini_payload(
            system,
            user,
            max_tokens,
            temperature,
            image_bytes=image_bytes,
            mime_type=mime_type,
        )
    raise ValueError(f"Unsupported LLM provider: {provider}")


def _openai_response_text(body: dict[str, Any]) -> Optional[str]:
    choices = body.get("choices")
    if not isinstance(choices, list) or not choices:
        return None
    first = choices[0]
    if not isinstance(first, dict) or not isinstance(first.get("message"), dict):
        return None
    content = first["message"].get("content")
    if isinstance(content, str):
        return content.strip() or None
    if isinstance(content, list):
        parts = [
            block.get("text", "").strip()
            for block in content
            if isinstance(block, dict) and isinstance(block.get("text"), str) and block.get("text", "").strip()
        ]
        return "\n".join(parts) or None
    return None


def _gemini_response_text(body: dict[str, Any]) -> Optional[str]:
    candidates = body.get("candidates")
    if not isinstance(candidates, list) or not candidates:
        return None
    first = candidates[0]
    if not isinstance(first, dict) or not isinstance(first.get("content"), dict):
        return None
    parts = first["content"].get("parts")
    if not isinstance(parts, list):
        return None
    text_parts = [
        part.get("text", "").strip()
        for part in parts
        if isinstance(part, dict) and isinstance(part.get("text"), str) and part.get("text", "").strip()
    ]
    return "\n".join(text_parts) or None


def _response_text(provider: str, body: dict[str, Any]) -> Optional[str]:
    if provider == "openai":
        return _openai_response_text(body)
    if provider == "gemini":
        return _gemini_response_text(body)
    return None


def _is_retryable(exc: Exception) -> bool:
    if isinstance(exc, (httpx.TimeoutException, httpx.NetworkError, asyncio.TimeoutError)):
        return True
    if isinstance(exc, httpx.HTTPStatusError):
        status = exc.response.status_code
        return status in _RETRYABLE_STATUS_CODES or status >= 500
    return False


async def _post_response(
    payload: dict[str, Any],
    provider: str,
    *,
    timeout_seconds: Optional[float] = None,
) -> Optional[str]:
    """Send a provider request and signal deterministic fallback with ``None``."""
    timeout = float(timeout_seconds or settings.LLM_TIMEOUT_SECONDS)
    attempts = int(settings.LLM_MAX_RETRIES) + 1

    for attempt in range(attempts):
        try:
            body = await asyncio.wait_for(
                _request_json(provider, payload, timeout),
                timeout=timeout + 5.0,
            )
            text = _response_text(provider, body)
            if not text:
                logger.warning("%s returned no output text; using deterministic fallback", provider.title())
            return text
        except Exception as exc:  # provider failures must never break finance workflows
            retryable = _is_retryable(exc)
            if retryable and attempt + 1 < attempts:
                await asyncio.sleep(0.25 * (2**attempt))
                continue
            status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
            reason = f"HTTP {status}" if status else exc.__class__.__name__
            logger.warning(
                "%s request failed (%s); using deterministic fallback",
                provider.title(),
                reason,
            )
            return None
    return None


async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> Optional[str]:
    """Ask the configured provider for text, or return ``None`` on fallback."""
    provider = active_provider()
    if provider not in _SUPPORTED_PROVIDERS:
        return None
    payload = _build_payload(provider, system, user, max_tokens, temperature)
    return await _post_response(payload, provider)


async def complete_vision(
    system: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> Optional[str]:
    """Ask the configured provider to understand an attached image."""
    provider = active_provider()
    if provider not in _SUPPORTED_PROVIDERS:
        return None
    payload = _build_payload(
        provider,
        system,
        prompt,
        max_tokens=2048,
        temperature=0.1,
        image_bytes=image_bytes,
        mime_type=mime_type,
    )
    return await _post_response(
        payload,
        provider,
        timeout_seconds=max(float(settings.LLM_TIMEOUT_SECONDS), 120.0),
    )
