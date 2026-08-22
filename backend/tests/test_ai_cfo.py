"""AI CFO endpoints (deterministic engine path)."""

from bson import ObjectId

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


async def test_chat_reports_ai_engine_that_produced_the_answer(client, monkeypatch):
    token, _ = await seed_business(client)

    async def fake_complete_engine(system, user, **options):
        return "AI CFO answer from Gemini", "gemini"

    monkeypatch.setattr("app.agents.ai_cfo.llm.is_available", lambda: True)
    monkeypatch.setattr("app.agents.ai_cfo.llm.complete_engine", fake_complete_engine)

    resp = await client.post(
        "/api/ai-cfo/chat",
        json={"message": "Summarize my cash-flow risks"},
        headers=auth(token),
    )
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["engine"] == "gemini"
    assert data["message"]["content"] == "AI CFO answer from Gemini"


async def test_analyze_uses_ai_first_then_falls_back(client, monkeypatch):
    token, _ = await seed_business(client)

    async def fake_complete_engine(system, user, **options):
        return "AI executive narrative.", "openai"

    monkeypatch.setattr("app.agents.ai_cfo.llm.is_available", lambda: True)
    monkeypatch.setattr("app.agents.ai_cfo.llm.complete_engine", fake_complete_engine)

    resp = await client.post("/api/ai-cfo/analyze", json={}, headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert data["engine"] == "openai"
    assert data["narrative"] == "AI executive narrative."


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



async def test_image_generation_endpoint_is_removed(client):
    token = (await register(client))["access_token"]
    response = await client.post(
        "/api/ai-cfo/images/generate",
        json={"prompt": "A cash flow illustration"},
        headers=auth(token),
    )
    assert response.status_code == 404
    assert response.json()["error_code"] == "NOT_FOUND"


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
