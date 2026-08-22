"""OpenAI and Google Gemini narrative client tests."""

import base64

import httpx
import pytest

from app.agents import llm
from app.core.config import settings


def _configure_openai(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "openai")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "test-openai-key")
    monkeypatch.setattr(settings, "OPENAI_MODEL", "gpt-test")


def _configure_gemini(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "test-gemini-key")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-test")


async def test_openai_chat_request_is_backend_only_and_grounded(monkeypatch):
    _configure_openai(monkeypatch)
    captured = []

    async def fake_request(provider, payload, timeout):
        captured.append((provider, payload, timeout))
        return {"choices": [{"message": {"content": "## Grounded answer\n**₹12,000**"}}]}

    monkeypatch.setattr(llm, "_request_json", fake_request)
    text = await llm.complete(
        "Trusted system context",
        "Trusted user context",
        max_tokens=321,
        temperature=0.1,
    )

    assert text == "## Grounded answer\n**₹12,000**"
    assert captured == [
        (
            "openai",
            {
                "model": "gpt-test",
                "messages": [
                    {"role": "system", "content": "Trusted system context"},
                    {"role": "user", "content": "Trusted user context"},
                ],
                "max_completion_tokens": 321,
                "temperature": 0.1,
            },
            settings.LLM_TIMEOUT_SECONDS,
        )
    ]


async def test_gemini_chat_request_and_response(monkeypatch):
    _configure_gemini(monkeypatch)
    captured = []

    async def fake_request(provider, payload, timeout):
        captured.append((provider, payload))
        return {
            "candidates": [
                {"content": {"parts": [{"text": "## Gemini answer"}, {"text": "Grounded result"}]}}
            ]
        }

    monkeypatch.setattr(llm, "_request_json", fake_request)
    text = await llm.complete("System", "User", max_tokens=400, temperature=0.2)

    assert text == "## Gemini answer\nGrounded result"
    assert captured == [
        (
            "gemini",
            {
                "systemInstruction": {"parts": [{"text": "System"}]},
                "contents": [{"role": "user", "parts": [{"text": "User"}]}],
                "generationConfig": {"maxOutputTokens": 400, "temperature": 0.2},
            },
        )
    ]


@pytest.mark.parametrize("provider", ["openai", "gemini"])
async def test_vision_encodes_image_without_exposing_raw_bytes(monkeypatch, provider):
    if provider == "openai":
        _configure_openai(monkeypatch)
        response = {"choices": [{"message": {"content": "Invoice total ₹4,500"}}]}
    else:
        _configure_gemini(monkeypatch)
        response = {"candidates": [{"content": {"parts": [{"text": "Invoice total ₹4,500"}]}}]}
    captured = []

    async def fake_request(selected_provider, payload, timeout):
        captured.append(payload)
        return response

    monkeypatch.setattr(llm, "_request_json", fake_request)
    text = await llm.complete_vision("System", "Read this invoice", b"fake-image-bytes", "image/jpg")

    assert text == "Invoice total ₹4,500"
    encoded = base64.b64encode(b"fake-image-bytes").decode("ascii")
    if provider == "openai":
        image_url = captured[0]["messages"][1]["content"][1]["image_url"]["url"]
        assert image_url == f"data:image/jpeg;base64,{encoded}"
    else:
        inline_data = captured[0]["contents"][0]["parts"][1]["inlineData"]
        assert inline_data == {"mimeType": "image/jpeg", "data": encoded}


async def test_provider_failure_returns_deterministic_fallback_signal(monkeypatch):
    _configure_openai(monkeypatch)
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 0)
    request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    response = httpx.Response(429, request=request)

    async def fail(*args, **kwargs):
        raise httpx.HTTPStatusError("rate limited", request=request, response=response)

    monkeypatch.setattr(llm, "_request_json", fail)
    assert await llm.complete("System", "User") is None


async def test_transient_failure_is_retried(monkeypatch):
    _configure_gemini(monkeypatch)
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 1)
    request = httpx.Request("POST", "https://generativelanguage.googleapis.com")
    response = httpx.Response(503, request=request)
    calls = 0

    async def request_then_succeed(*args, **kwargs):
        nonlocal calls
        calls += 1
        if calls == 1:
            raise httpx.HTTPStatusError("unavailable", request=request, response=response)
        return {"candidates": [{"content": {"parts": [{"text": "Recovered"}]}}]}

    async def no_sleep(_seconds):
        return None

    monkeypatch.setattr(llm, "_request_json", request_then_succeed)
    monkeypatch.setattr(llm.asyncio, "sleep", no_sleep)
    assert await llm.complete("System", "User") == "Recovered"
    assert calls == 2


def test_provider_is_unavailable_without_api_key(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)

    assert llm.active_provider() is None
    assert llm.is_available() is False


def test_auto_provider_prefers_openai_then_gemini(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "openai-key")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key")
    assert llm.active_provider() == "openai"

    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    assert llm.active_provider() == "gemini"


def test_explicit_provider_keeps_priority_with_configured_failover(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "gemini")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "openai-key")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key")
    assert llm.configured_providers() == ["gemini", "openai"]
    assert llm.active_provider() == "gemini"

    # When the preferred provider is not configured, the other one is used as
    # failover rather than going straight to deterministic output.
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    assert llm.configured_providers() == ["openai"]
    assert llm.active_provider() == "openai"


async def test_complete_fails_over_from_openai_to_gemini(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", "openai-key")
    monkeypatch.setattr(settings, "OPENAI_MODEL", "gpt-test")
    monkeypatch.setattr(settings, "GEMINI_API_KEY", "gemini-key")
    monkeypatch.setattr(settings, "GEMINI_MODEL", "gemini-test")
    monkeypatch.setattr(settings, "LLM_MAX_RETRIES", 0)
    request = httpx.Request("POST", "https://api.openai.com/v1/chat/completions")
    response = httpx.Response(401, request=request)
    calls = []

    async def openai_fails(*args, **kwargs):
        calls.append(("openai", args))
        raise httpx.HTTPStatusError("unauthorized", request=request, response=response)

    async def gemini_succeeds(provider, payload, timeout):
        calls.append(("gemini", (provider, payload, timeout)))
        return {"candidates": [{"content": {"parts": [{"text": "Gemini fallback answer"}]}}]}

    async def fake_request(provider, payload, timeout):
        if provider == "openai":
            return await openai_fails(provider, payload, timeout)
        return await gemini_succeeds(provider, payload, timeout)

    monkeypatch.setattr(llm, "_request_json", fake_request)
    text, provider = await llm.complete_engine("System", "User")
    assert text == "Gemini fallback answer"
    assert provider == "gemini"
    assert [name for name, _ in calls] == ["openai", "gemini"]


async def test_complete_does_not_fall_through_when_no_provider_configured(monkeypatch):
    monkeypatch.setattr(settings, "LLM_PROVIDER", "auto")
    monkeypatch.setattr(settings, "OPENAI_API_KEY", None)
    monkeypatch.setattr(settings, "GEMINI_API_KEY", None)
    text, provider = await llm.complete_engine("System", "User")
    assert text is None
    assert provider is None


def test_provider_keys_are_sent_in_headers_not_urls(monkeypatch):
    _configure_openai(monkeypatch)
    openai_url, openai_headers = llm._endpoint_and_headers("openai")
    assert "test-openai-key" not in openai_url
    assert openai_headers["Authorization"] == "Bearer test-openai-key"

    _configure_gemini(monkeypatch)
    gemini_url, gemini_headers = llm._endpoint_and_headers("gemini")
    assert "test-gemini-key" not in gemini_url
    assert gemini_headers["x-goog-api-key"] == "test-gemini-key"


def test_llm_client_exposes_no_image_generation_api():
    assert not hasattr(llm, "generate_image")


@pytest.mark.parametrize(
    ("mime", "expected"),
    [
        ("image/png", "png"),
        ("image/jpeg", "jpeg"),
        ("image/jpg", "jpeg"),
        ("image/webp", "webp"),
        ("image/gif", "gif"),
        ("application/octet-stream", "png"),
    ],
)
def test_image_format_normalisation(mime, expected):
    assert llm._image_format(mime) == expected
