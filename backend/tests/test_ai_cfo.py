"""AI CFO endpoints (deterministic engine path)."""

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
