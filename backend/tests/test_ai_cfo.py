"""AI CFO endpoints (deterministic engine path)."""

from bson import ObjectId

from app.agents import llm
from app.core.constants import COLLECTIONS
from tests.helpers import auth, register, seed_business


async def test_chat(client):
    token, _ = await seed_business(client)
    resp = await client.post(
        "/api/ai-cfo/chat", json={"message": "How is my business doing?"}, headers=auth(token)
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["message"]["role"] == "assistant"
    assert data["message"]["content"]
    assert data["session_id"]


async def test_chat_continuity_with_session(client):
    token, _ = await seed_business(client)
    first = await client.post(
        "/api/ai-cfo/chat", json={"message": "How is my business doing?"}, headers=auth(token)
    )
    sid = first.json()["data"]["session_id"]
    second = await client.post(
        "/api/ai-cfo/chat", json={"message": "What are my risks?", "session_id": sid}, headers=auth(token)
    )
    assert second.json()["data"]["session_id"] == sid


async def test_chat_accepts_text_attachment_and_persists_only_metadata(client, db):
    token, _ = await seed_business(client)
    content = b"invoice,amount,status\nINV-1,25000,overdue\n"
    response = await client.post(
        "/api/ai-cfo/chat/file",
        data={"message": "Summarize this file"},
        files={"file": ("invoices.csv", content, "text/csv")},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["attachment"] == {
        "name": "invoices.csv",
        "size": len(content),
        "content_type": "text/csv",
        "kind": "document",
    }
    assert "INV-1" in data["message"]["content"]

    stored = await db[COLLECTIONS["chat_messages"]].find_one(
        {"session_id": ObjectId(data["session_id"]), "role": "user"}
    )
    assert stored["attachment"] == data["attachment"]
    assert "image_bytes" not in stored["attachment"]
    assert "context" not in stored["attachment"]


async def test_chat_accepts_unknown_binary_file(client):
    token, _ = await seed_business(client)
    content = b"\x00\xff\x01\x02custom-binary\x00" * 20
    response = await client.post(
        "/api/ai-cfo/chat/file",
        data={"message": "What can you tell me about this file?"},
        files={"file": ("ledger.custombin", content, "application/x-custom")},
        headers=auth(token),
    )
    assert response.status_code == 200, response.text
    data = response.json()["data"]
    assert data["attachment"]["name"] == "ledger.custombin"
    assert data["attachment"]["size"] == len(content)
    assert "binary attachment" in data["message"]["content"]


async def test_chat_rejects_file_over_15_mb(client):
    token = (await register(client))["access_token"]
    response = await client.post(
        "/api/ai-cfo/chat/file",
        data={"message": "Analyze this"},
        files={"file": ("too-large.bin", b"x" * (15 * 1024 * 1024 + 1), "application/octet-stream")},
        headers=auth(token),
    )
    assert response.status_code == 413
    assert response.json()["error_code"] == "PAYLOAD_TOO_LARGE"


async def test_image_generation_returns_provider_image(client, monkeypatch):
    token = (await register(client))["access_token"]
    requested = {}

    async def fake_generate_image(prompt, size):
        requested.update(prompt=prompt, size=size)
        return {
            "image_url": "data:image/png;base64,aW1hZ2U=",
            "mime_type": "image/png",
            "revised_prompt": prompt,
            "engine": "openai",
            "model": "test-image-model",
        }

    monkeypatch.setattr(llm, "generate_image", fake_generate_image)
    response = await client.post(
        "/api/ai-cfo/images/generate",
        json={"prompt": "A clean cash flow chart", "size": "1536x1024"},
        headers=auth(token),
    )
    assert response.status_code == 200
    assert requested == {"prompt": "A clean cash flow chart", "size": "1536x1024"}
    assert response.json()["data"]["image_url"].startswith("data:image/png;base64,")


async def test_image_generation_requires_configured_provider(client, monkeypatch):
    token = (await register(client))["access_token"]

    async def unavailable_image(*_args, **_kwargs):
        return None

    monkeypatch.setattr(llm, "generate_image", unavailable_image)
    monkeypatch.setattr(llm, "is_available", lambda: False)
    response = await client.post(
        "/api/ai-cfo/images/generate",
        json={"prompt": "A cash flow illustration"},
        headers=auth(token),
    )
    assert response.status_code == 503
    assert response.json()["error_code"] == "IMAGE_GENERATION_UNAVAILABLE"


async def test_analyze(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/ai-cfo/analyze", json={}, headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "metrics" in data
    assert "financial_health" in data
    assert data["financial_health"]["score"] >= 0


async def test_recommend(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/ai-cfo/recommend", json={}, headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "recommendations" in data
    assert "narrative" in data


async def test_chat_empty_message_rejected(client):
    token = (await register(client))["access_token"]
    resp = await client.post("/api/ai-cfo/chat", json={"message": ""}, headers=auth(token))
    assert resp.status_code == 422
