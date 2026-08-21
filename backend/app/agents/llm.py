"""xAI Grok client used by the AI CFO narrative layer.

Grok receives only already-calculated financial context and is used to explain,
summarize, surface insights, and answer AI CFO chat questions. It does not
calculate financial metrics, forecasts, scores, or deterministic
recommendations. Every caller retains a deterministic fallback when Grok is not
configured or a request fails.

The client uses xAI's Responses API with ``store: false`` because finance
context may be sensitive. It intentionally does not expose image generation.
"""

from __future__ import annotations

import asyncio
import base64
import logging
from typing import Any, Optional

import httpx

from app.core.config import settings

logger = logging.getLogger(__name__)

_RETRYABLE_STATUS_CODES = {408, 409, 425, 429, 500, 502, 503, 504}


def active_provider() -> Optional[str]:
    """Return ``grok`` when an xAI key is configured, otherwise ``None``."""
    return "grok" if settings.XAI_API_KEY and settings.XAI_API_KEY.strip() else None


def is_available() -> bool:
    """Whether the optional Grok narrative layer is configured."""
    return active_provider() is not None


def _headers() -> dict[str, str]:
    api_key = (settings.XAI_API_KEY or "").strip()
    return {
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
        "User-Agent": "aicfo-grok-client/1.0",
    }


def _response_text(body: dict[str, Any]) -> Optional[str]:
    """Extract text from the xAI Responses API shape.

    xAI returns output text in an ``output`` message item. Supporting the
    common alternate shapes keeps the integration resilient to SDK/API response
    representation changes without ever returning provider internals to users.
    """
    direct = body.get("output_text")
    if isinstance(direct, str) and direct.strip():
        return direct.strip()

    text_parts: list[str] = []
    for output in body.get("output") or []:
        if not isinstance(output, dict) or output.get("type") != "message":
            continue
        for content in output.get("content") or []:
            if isinstance(content, str):
                text_parts.append(content)
                continue
            if not isinstance(content, dict):
                continue
            text = content.get("text") or content.get("output_text")
            if isinstance(text, str) and text.strip():
                text_parts.append(text.strip())
    if text_parts:
        return "\n".join(text_parts).strip()

    # Defensive compatibility with a Chat Completions-shaped response. xAI's
    # public endpoint is Responses, but this avoids a brittle parser if a
    # compatible gateway is configured through XAI_BASE_URL.
    choices = body.get("choices") or []
    if choices and isinstance(choices[0], dict):
        message = choices[0].get("message") or {}
        content = message.get("content") if isinstance(message, dict) else None
        if isinstance(content, str) and content.strip():
            return content.strip()
    return None


def _retry_delay(response: Optional[httpx.Response], attempt: int) -> float:
    """Use a bounded Retry-After delay when available, otherwise back off."""
    if response is not None:
        try:
            retry_after = float(response.headers.get("Retry-After", ""))
            if retry_after >= 0:
                return min(retry_after, 8.0)
        except (TypeError, ValueError):
            pass
    return min(0.5 * (2**attempt), 8.0)


async def _post_response(payload: dict[str, Any], *, timeout_seconds: Optional[float] = None) -> Optional[str]:
    """Post a single privacy-preserving request to xAI and return text.

    Provider failures are logged without prompt, attachment, response body, or
    credentials and deliberately return ``None`` so callers can use trusted
    deterministic output instead of failing a finance workflow.
    """
    if not is_available():
        return None

    url = f"{settings.XAI_BASE_URL.rstrip('/')}/responses"
    timeout = float(timeout_seconds or settings.XAI_TIMEOUT_SECONDS)
    request_timeout = httpx.Timeout(timeout, connect=min(timeout, 20.0))
    attempts = int(settings.XAI_MAX_RETRIES) + 1

    for attempt in range(attempts):
        response: Optional[httpx.Response] = None
        try:
            async with httpx.AsyncClient(timeout=request_timeout) as client:
                response = await client.post(url, json=payload, headers=_headers())

            if response.status_code in _RETRYABLE_STATUS_CODES and attempt < attempts - 1:
                logger.warning(
                    "Grok request received retryable status %s; retrying (%s/%s)",
                    response.status_code,
                    attempt + 1,
                    attempts - 1,
                )
                await asyncio.sleep(_retry_delay(response, attempt))
                continue

            response.raise_for_status()
            try:
                body = response.json()
            except ValueError:
                logger.warning("Grok returned a non-JSON response; using deterministic fallback")
                return None
            if not isinstance(body, dict):
                logger.warning("Grok returned an unexpected response shape; using deterministic fallback")
                return None
            text = _response_text(body)
            if not text:
                logger.warning("Grok returned no output text; using deterministic fallback")
            return text
        except httpx.HTTPStatusError as exc:
            logger.warning(
                "Grok request failed with status %s; using deterministic fallback",
                exc.response.status_code,
            )
            return None
        except (httpx.TimeoutException, httpx.NetworkError) as exc:
            if attempt < attempts - 1:
                logger.warning(
                    "Grok network request failed (%s); retrying (%s/%s)",
                    exc.__class__.__name__,
                    attempt + 1,
                    attempts - 1,
                )
                await asyncio.sleep(_retry_delay(None, attempt))
                continue
            logger.warning("Grok network request failed; using deterministic fallback")
            return None
        except httpx.HTTPError as exc:
            logger.warning("Grok HTTP request failed (%s); using deterministic fallback", exc.__class__.__name__)
            return None
        except Exception as exc:  # pragma: no cover - defensive provider boundary
            logger.warning("Grok request failed (%s); using deterministic fallback", exc.__class__.__name__)
            return None

    return None


def _base_payload(input_items: list[dict[str, Any]], max_tokens: int, temperature: float) -> dict[str, Any]:
    """Build an xAI Responses request with local-only conversation storage."""
    return {
        "model": settings.XAI_MODEL,
        "input": input_items,
        "max_output_tokens": max_tokens,
        "temperature": temperature,
        # Do not retain potentially sensitive financial prompts/responses on
        # xAI's stateful Responses service.
        "store": False,
    }


async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> Optional[str]:
    """Ask Grok for a text explanation, or return ``None`` on fallback."""
    payload = _base_payload(
        [
            {"role": "system", "content": system},
            {"role": "user", "content": user},
        ],
        max_tokens=max_tokens,
        temperature=temperature,
    )
    return await _post_response(payload)


async def complete_vision(
    system: str,
    prompt: str,
    image_bytes: bytes,
    mime_type: str = "image/png",
) -> Optional[str]:
    """Answer a chat question about an attached image with Grok vision.

    This is image *understanding* for the existing chat attachment flow, not
    image generation. If the configured Grok model does not support vision, the
    caller falls back to its locally extracted attachment context.
    """
    if not is_available():
        return None
    image_b64 = base64.b64encode(image_bytes).decode("ascii")
    payload = _base_payload(
        [
            {"role": "system", "content": system},
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": prompt},
                    {
                        "type": "input_image",
                        "image_url": f"data:{mime_type};base64,{image_b64}",
                        "detail": "high",
                    },
                ],
            },
        ],
        max_tokens=2048,
        temperature=0.1,
    )
    return await _post_response(payload, timeout_seconds=max(settings.XAI_TIMEOUT_SECONDS, 120.0))
