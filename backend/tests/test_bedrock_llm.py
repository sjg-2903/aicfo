"""AWS Bedrock narrative client tests."""

import boto3
import pytest
from botocore.exceptions import ClientError

from app.agents import llm
from app.core.config import settings


class _FakeBedrockClient:
    """Mimics the subset of ``bedrock-runtime`` used by the llm client."""

    def __init__(self, response=None, error=None):
        self.response = response
        self.error = error
        self.calls: list[dict] = []

    def converse(self, **payload):
        self.calls.append(payload)
        if self.error is not None:
            raise self.error
        return self.response


def _install(monkeypatch, client: _FakeBedrockClient):
    monkeypatch.setattr(
        llm,
        "_bedrock_client",
        lambda: client,
    )


async def test_bedrock_converse_request_is_private_and_grounded(monkeypatch):
    captured = _FakeBedrockClient(
        response={
            "output": {
                "message": {
                    "role": "assistant",
                    "content": [{"text": "## Grounded answer"}, {"text": "**₹12,000**"}],
                }
            },
            "usage": {"inputTokens": 10, "outputTokens": 5, "totalTokens": 15},
        }
    )
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "anthropic.claude-test-model")
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "test-secret-key")  # pragma: allowlist secret
    monkeypatch.setattr(llm, "_CLIENT_CACHE", {})
    _install(monkeypatch, captured)

    text = await llm.complete("Trusted system context", "Trusted user context", max_tokens=321, temperature=0.1)

    assert text == "## Grounded answer\n**₹12,000**"
    assert len(captured.calls) == 1
    assert captured.calls[0] == {
        "modelId": "anthropic.claude-test-model",
        "system": [{"text": "Trusted system context"}],
        "messages": [{"role": "user", "content": [{"text": "Trusted user context"}]}],
        "inferenceConfig": {"maxTokens": 321, "temperature": 0.1},
    }


async def test_bedrock_vision_sends_raw_image_bytes(monkeypatch):
    captured = _FakeBedrockClient(
        response={"output": {"message": {"role": "assistant", "content": [{"text": "Invoice total ₹4,500"}]}}}
    )
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "anthropic.claude-test-model")
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "test-secret-key")  # pragma: allowlist secret
    _install(monkeypatch, captured)

    text = await llm.complete_vision("System", "Read this invoice", b"fake-png-bytes", "image/jpg")

    assert text == "Invoice total ₹4,500"
    block = captured.calls[0]["messages"][0]["content"][1]
    assert block["image"]["format"] == "jpeg"  # normalised from image/jpg
    assert block["image"]["source"]["bytes"] == b"fake-png-bytes"  # raw bytes, no base64


async def test_bedrock_provider_failure_returns_deterministic_fallback_signal(monkeypatch):
    captured = _FakeBedrockClient(
        error=ClientError(
            {"Error": {"Code": "ThrottlingException", "Message": "Rate exceeded"}},
            "Converse",
        )
    )
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "anthropic.claude-test-model")
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "test-access-key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "test-secret-key")  # pragma: allowlist secret
    _install(monkeypatch, captured)

    assert await llm.complete("System", "User") is None
    assert len(captured.calls) == 1


async def test_bedrock_unavailable_without_credentials(monkeypatch):
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", None)
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", None)
    monkeypatch.setattr(settings, "AWS_SESSION_TOKEN", None)
    monkeypatch.setattr(settings, "AWS_PROFILE", None)
    monkeypatch.setattr(llm, "_CLIENT_CACHE", {})
    monkeypatch.setattr(
        llm, "_session", lambda: _NoCredentialSession()
    )

    assert llm.active_provider() is None
    assert llm.is_available() is False


class _NoCredentialSession:
    def get_credentials(self):
        return None


def test_bedrock_active_provider_with_static_keys(monkeypatch):
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "anthropic.claude-test-model")
    monkeypatch.setattr(settings, "AWS_ACCESS_KEY_ID", "key")
    monkeypatch.setattr(settings, "AWS_SECRET_ACCESS_KEY", "secret")
    monkeypatch.setattr(settings, "AWS_PROFILE", None)
    monkeypatch.setattr(llm, "_CLIENT_CACHE", {})
    # _session() is not stubbed here: boto3 resolves the explicit static keys
    # above without touching the network or the metadata service.
    assert llm.active_provider() == "bedrock"


def test_bedrock_client_exposes_no_image_generation_api():
    assert not hasattr(llm, "generate_image")


def test_bedrock_missing_model_disables_provider(monkeypatch):
    monkeypatch.setattr(settings, "BEDROCK_MODEL_ID", "  ")
    assert llm.active_provider() is None


@pytest.mark.parametrize(
    ("mime", "expected"),
    [
        ("image/png", "png"),
        ("image/jpeg", "jpeg"),
        ("image/jpg", "jpeg"),
        ("image/webp", "webp"),
        ("image/gif", "gif"),
        ("application/octet-stream", "png"),  # unknown falls back safely
    ],
)
def test_image_format_normalisation(mime, expected):
    assert llm._image_format(mime) == expected
