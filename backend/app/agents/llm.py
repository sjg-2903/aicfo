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
# Fixed AI-first priority: OpenAI, then Gemini, then deterministic output.
_PROVIDER_PRIORITY = ("openai", "gemini")


def _provider_configured(provider: str) -> bool:
    """A provider is usable only when both its API key and model are present."""
    if provider == "openai":
        return bool((settings.OPENAI_API_KEY or "").strip() and (settings.OPENAI_MODEL or "").strip())
    if provider == "gemini":
        return bool((settings.GEMINI_API_KEY or "").strip() and (settings.GEMINI_MODEL or "").strip())
    return False


def configured_providers() -> list[str]:
    """Return every configured provider, in priority (failover) order.

    ``LLM_PROVIDER=auto`` (the default) tries OpenAI first, then Gemini.
    Setting it explicitly to ``openai`` or ``gemini`` moves that provider to
    the front, but the other configured provider is still tried as failover
    before the deterministic fallback. This keeps AI-first behaviour: both
    providers are attempted, and deterministic output is used only when every
    configured provider is unavailable or returns no usable text.
    """
    requested = (settings.LLM_PROVIDER or "auto").strip().lower()
    ordered = list(_PROVIDER_PRIORITY)
    if requested in _PROVIDER_PRIORITY:
        ordered = [requested] + [provider for provider in ordered if provider != requested]
    return [provider for provider in ordered if _provider_configured(provider)]


def active_provider() -> Optional[str]:
    """Return the preferred configured provider (first in failover order).

    With ``LLM_PROVIDER=auto`` this is OpenAI when its key is present, else
    Gemini. Explicit ``openai`` or ``gemini`` moves that provider first.
    """
    providers = configured_providers()
    return providers[0] if providers else None


def is_available() -> bool:
    """Whether at least one OpenAI or Gemini narrative provider is configured."""
    return bool(configured_providers())


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
    """Send one provider request; ``None`` signals fall-through to the next provider / deterministic output."""
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
                logger.warning("%s returned no output text; trying the next provider", provider.title())
            return text
        except Exception as exc:  # provider failures must never break finance workflows
            retryable = _is_retryable(exc)
            if retryable and attempt + 1 < attempts:
                await asyncio.sleep(0.25 * (2**attempt))
                continue
            status = exc.response.status_code if isinstance(exc, httpx.HTTPStatusError) else None
            reason = f"HTTP {status}" if status else exc.__class__.__name__
            logger.warning(
                "%s request failed (%s); trying the next provider or deterministic fallback",
                provider.title(),
                reason,
            )
            return None
    return None


async def _complete_with_failover(
    system: str,
    user: str,
    *,
    max_tokens: int,
    temperature: float,
    image_bytes: Optional[bytes] = None,
    mime_type: str = "image/png",
    timeout_seconds: Optional[float] = None,
) -> tuple[Optional[str], Optional[str]]:
    """Ask every configured provider in priority order; return ``(text, provider)``.

    OpenAI is attempted before Gemini (unless ``LLM_PROVIDER`` explicitly moves
    Gemini first). The first provider that returns usable text wins. When no
    provider is configured or every attempt fails, ``(None, None)`` is returned
    so callers can supply their deterministic fallback.
    """
    providers = configured_providers()
    if not providers:
        return None, None
    for provider in providers:
        payload = _build_payload(
            provider,
            system,
            user,
            max_tokens,
            temperature,
            image_bytes=image_bytes,
            mime_type=mime_type,
        )
        text = await _post_response(payload, provider, timeout_seconds=timeout_seconds)
        if text:
            logger.info("%s produced a grounded response", provider.title())
            return text, provider
        logger.warning("%s did not produce a usable response; trying the next provider", provider.title())
    return None, None


async def complete_engine(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> tuple[Optional[str], Optional[str]]:
    """Ask providers in priority order and return ``(text, provider)``."""
    return await _complete_with_failover(
        system, user, max_tokens=max_tokens, temperature=temperature
    )


async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> Optional[str]:
    """Ask the configured providers for text, or return ``None`` on fallback.

    Convenience wrapper around :func:`complete_engine` for callers that only
    need the text.
    """
    text, _ = await complete_engine(
        system, user, max_tokens=max_tokens, temperature=temperature
    )
    return text


async def complete_vision_engine(
    system: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> tuple[Optional[str], Optional[str]]:
    """Ask the configured providers to understand an image; return ``(text, provider)``."""
    return await _complete_with_failover(
        system,
        prompt,
        max_tokens=2048,
        temperature=0.1,
        image_bytes=image_bytes,
        mime_type=mime_type,
        timeout_seconds=max(float(settings.LLM_TIMEOUT_SECONDS), 120.0),
    )


async def complete_vision(
    system: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> Optional[str]:
    """Ask the configured providers to understand an image, or return ``None`` on fallback."""
    text, _ = await complete_vision_engine(
        system, prompt, image_bytes, mime_type=mime_type
    )
    return text
