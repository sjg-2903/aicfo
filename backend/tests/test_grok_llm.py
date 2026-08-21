"""xAI Grok narrative client tests."""

import httpx

from app.agents import llm
from app.core.config import settings


class _FakeAsyncClient:
    def __init__(self, response: httpx.Response, captured: dict, **_kwargs):
        self.response = response
        self.captured = captured

    async def __aenter__(self):
        return self

    async def __aexit__(self, *_args):
        return False

    async def post(self, url, *, json, headers):
        self.captured.update(url=url, payload=json, headers=headers)
        self.response.request = httpx.Request("POST", url)
        return self.response


async def test_grok_responses_request_is_private_and_grounded(monkeypatch):
    captured: dict = {}
    response = httpx.Response(
        200,
        json={
            "output": [
                {
                    "type": "message",
                    "content": [{"type": "output_text", "text": "## Grounded answer\n\n**₹12,000**"}],
                }
            ]
        },
    )
    monkeypatch.setattr(settings, "XAI_API_KEY", "test-xai-key")
    monkeypatch.setattr(settings, "XAI_BASE_URL", "https://api.x.ai/v1")
    monkeypatch.setattr(settings, "XAI_MODEL", "grok-test")
    monkeypatch.setattr(settings, "XAI_MAX_RETRIES", 0)
    monkeypatch.setattr(
        llm.httpx,
        "AsyncClient",
        lambda **kwargs: _FakeAsyncClient(response, captured, **kwargs),
    )

    text = await llm.complete("Trusted system context", "Trusted user context", max_tokens=321, temperature=0.1)

    assert text == "## Grounded answer\n\n**₹12,000**"
    assert captured["url"] == "https://api.x.ai/v1/responses"
    assert captured["headers"]["Authorization"] == "Bearer test-xai-key"
    assert captured["payload"] == {
        "model": "grok-test",
        "input": [
            {"role": "system", "content": "Trusted system context"},
            {"role": "user", "content": "Trusted user context"},
        ],
        "max_output_tokens": 321,
        "temperature": 0.1,
        "store": False,
    }


async def test_grok_provider_failure_returns_deterministic_fallback_signal(monkeypatch):
    captured: dict = {}
    response = httpx.Response(503, json={"error": "unavailable"})
    monkeypatch.setattr(settings, "XAI_API_KEY", "test-xai-key")
    monkeypatch.setattr(settings, "XAI_MAX_RETRIES", 0)
    monkeypatch.setattr(
        llm.httpx,
        "AsyncClient",
        lambda **kwargs: _FakeAsyncClient(response, captured, **kwargs),
    )

    assert await llm.complete("System", "User") is None
    assert captured["payload"]["store"] is False


def test_grok_client_exposes_no_image_generation_api():
    assert not hasattr(llm, "generate_image")
