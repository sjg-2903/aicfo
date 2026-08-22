"""AWS Bedrock client used by the AI CFO narrative layer.

Bedrock receives only already-calculated financial context and is used to
explain, summarize, surface insights, and answer AI CFO chat questions. It
does not calculate financial metrics, forecasts, scores, or deterministic
recommendations. Every caller retains a deterministic fallback when Bedrock
is not configured or a request fails.

The client talks to the Bedrock **Converse API** through boto3 (wrapped in
``asyncio.to_thread`` so the async FastAPI event loop is never blocked).
Credentials are resolved through boto3's standard chain — explicit keys in
``.env`` / environment variables, a named ``AWS_PROFILE`` (``~/.aws/
credentials`` / SSO), or an attached IAM role on EC2 / ECS / EKS. AWS does
not use Bedrock prompts or completions to train foundation models, which
keeps potentially sensitive finance context private. The client
intentionally does not expose image generation.
"""

from __future__ import annotations

import asyncio
import logging
from typing import Any, Optional

import boto3
from botocore.config import Config
from botocore.exceptions import BotoCoreError, ClientError

from app.core.config import settings

logger = logging.getLogger(__name__)

# Converse API image formats: https://docs.aws.amazon.com/bedrock/latest/userguide/conversation-inference.html
_IMAGE_FORMATS = {"png", "jpeg", "gif", "webp"}

# One cached client per settings signature so tests that monkeypatch settings
# get a fresh client while normal runtime reuses a single connection config.
_CLIENT_CACHE: dict[tuple, Any] = {}


def _session() -> boto3.Session:
    """Build a boto3 session honouring explicit settings over the default chain."""
    kwargs: dict[str, Any] = {"region_name": (settings.AWS_REGION or "").strip() or None}
    profile = (settings.AWS_PROFILE or "").strip()
    if profile:
        kwargs["profile_name"] = profile
    access_key = (settings.AWS_ACCESS_KEY_ID or "").strip()
    secret_key = (settings.AWS_SECRET_ACCESS_KEY or "").strip()
    if access_key and secret_key:
        kwargs["aws_access_key_id"] = access_key
        kwargs["aws_secret_access_key"] = secret_key
        session_token = (settings.AWS_SESSION_TOKEN or "").strip()
        if session_token:
            kwargs["aws_session_token"] = session_token
    return boto3.Session(**kwargs)


def _bedrock_client() -> Any:
    """Return a (cached) synchronous ``bedrock-runtime`` client."""
    timeout = float(settings.BEDROCK_TIMEOUT_SECONDS)
    cache_key = (
        (settings.AWS_REGION or "").strip(),
        (settings.AWS_PROFILE or "").strip(),
        (settings.AWS_ACCESS_KEY_ID or "").strip(),
        (settings.AWS_SECRET_ACCESS_KEY or "").strip(),
        (settings.AWS_SESSION_TOKEN or "").strip(),
        int(settings.BEDROCK_MAX_RETRIES),
    )
    client = _CLIENT_CACHE.get(cache_key)
    if client is None:
        client = _session().client(
            "bedrock-runtime",
            config=Config(
                connect_timeout=min(int(timeout), 20),
                read_timeout=int(timeout),
                retries={
                    "max_attempts": int(settings.BEDROCK_MAX_RETRIES) + 1,
                    "mode": "standard",
                },
                user_agent_extra="aicfo-bedrock-client/1.0",
            ),
        )
        _CLIENT_CACHE[cache_key] = client
    return client


def active_provider() -> Optional[str]:
    """Return ``bedrock`` when credentials and a model are configured, else ``None``.

    Credentials are resolved with boto3's full chain, so an IAM role or an
    ``AWS_PROFILE`` works without any explicit keys in ``.env``.
    """
    if not (settings.BEDROCK_MODEL_ID or "").strip():
        return None
    try:
        if _session().get_credentials() is None:
            return None
    except Exception:  # pragma: no cover - defensive provider boundary
        return None
    return "bedrock"


def is_available() -> bool:
    """Whether the optional Bedrock narrative layer is configured."""
    return active_provider() is not None


def _image_format(mime_type: str) -> str:
    """Normalise a MIME type to a Converse API image format."""
    fmt = (mime_type or "").split(";")[0].strip().lower().rsplit("/", 1)[-1]
    if fmt == "jpg":
        fmt = "jpeg"
    return fmt if fmt in _IMAGE_FORMATS else "png"


def _response_text(body: dict[str, Any]) -> Optional[str]:
    """Extract assistant text from a Bedrock Converse response.

    The canonical shape is ``output.message.content[*].text``. The traversal is
    deliberately defensive so a shape change degrades to a deterministic
    fallback instead of an error.
    """
    output = body.get("output")
    if not isinstance(output, dict):
        return None
    message = output.get("message")
    if not isinstance(message, dict):
        return None
    text_parts: list[str] = []
    for block in message.get("content") or []:
        if isinstance(block, dict):
            text = block.get("text")
            if isinstance(text, str) and text.strip():
                text_parts.append(text.strip())
    return "\n".join(text_parts).strip() if text_parts else None


def _invoke_converse(payload: dict[str, Any]) -> dict[str, Any]:
    """Synchronous Converse call executed inside a worker thread."""
    return _bedrock_client().converse(**payload)


async def _post_response(
    payload: dict[str, Any], *, timeout_seconds: Optional[float] = None
) -> Optional[str]:
    """Send a single request to Bedrock and return text.

    boto3 already retries transient throttling / server errors (bounded by
    ``BEDROCK_MAX_RETRIES``). Remaining failures are logged without prompt,
    attachment, response body, or credentials and deliberately return
    ``None`` so callers can use trusted deterministic output instead of
    failing a finance workflow.
    """
    if not is_available():
        return None

    try:
        body = await asyncio.wait_for(
            asyncio.to_thread(_invoke_converse, payload),
            timeout=float(timeout_seconds or settings.BEDROCK_TIMEOUT_SECONDS) + 5.0,
        )
    except ClientError as exc:
        error = exc.response.get("Error", {}) if isinstance(exc.response, dict) else {}
        logger.warning(
            "Bedrock request failed (%s); using deterministic fallback",
            error.get("Code", exc.__class__.__name__),
        )
        return None
    except (BotoCoreError, asyncio.TimeoutError) as exc:
        logger.warning(
            "Bedrock request failed (%s); using deterministic fallback",
            exc.__class__.__name__,
        )
        return None
    except Exception as exc:  # pragma: no cover - defensive provider boundary
        logger.warning(
            "Bedrock request failed (%s); using deterministic fallback",
            exc.__class__.__name__,
        )
        return None

    if not isinstance(body, dict):
        logger.warning("Bedrock returned an unexpected response shape; using deterministic fallback")
        return None
    text = _response_text(body)
    if not text:
        logger.warning("Bedrock returned no output text; using deterministic fallback")
    return text


def _base_payload(messages: list[dict[str, Any]], system: str, max_tokens: int, temperature: float) -> dict[str, Any]:
    """Build a Bedrock Converse request."""
    return {
        "modelId": settings.BEDROCK_MODEL_ID.strip(),
        "system": [{"text": system}],
        "messages": messages,
        "inferenceConfig": {
            "maxTokens": max_tokens,
            "temperature": temperature,
        },
    }


async def complete(
    system: str,
    user: str,
    *,
    max_tokens: int = 1024,
    temperature: float = 0.2,
) -> Optional[str]:
    """Ask Bedrock for a text explanation, or return ``None`` on fallback."""
    payload = _base_payload(
        [{"role": "user", "content": [{"text": user}]}],
        system,
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
    """Answer a chat question about an attached image with Bedrock vision.

    This is image *understanding* for the existing chat attachment flow, not
    image generation. If the configured Bedrock model does not support vision,
    the caller falls back to its locally extracted attachment context.
    """
    payload = _base_payload(
        [
            {
                "role": "user",
                "content": [
                    {"text": prompt},
                    {
                        "image": {
                            "format": _image_format(mime_type),
                            "source": {"bytes": image_bytes},
                        }
                    },
                ],
            }
        ],
        system,
        max_tokens=2048,
        temperature=0.1,
    )
    return await _post_response(payload, timeout_seconds=max(settings.BEDROCK_TIMEOUT_SECONDS, 120.0))
