"""Recommendation Engine tests."""

import json

from app.services import recommendation_service
from tests.helpers import auth, register, seed_business


async def test_generate_and_list_recommendations(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    assert resp.status_code == 201
    generated = resp.json()["data"]
    assert isinstance(generated["recommendations"], list)
    assert isinstance(generated["summary_bullets"], list)

    resp = await client.get("/api/recommendations", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_generate_sends_whole_finance_prompt_to_ai(client, monkeypatch):
    token, _ = await seed_business(client)
    captured = []

    async def fake_complete_engine(system, user, **options):
        captured.append({"system": system, "user": user, "options": options})
        return (
            json.dumps(
                {
                    "recommendations": [
                        {
                            "category": "cash_flow",
                            "title": "Protect the cash buffer",
                            "description": "The supplied finance analysis shows a working-capital risk.",
                            "reason": "A cash buffer reduces payment disruption.",
                            "priority": "high",
                            "status": "new",
                            "recommended_action": "Review collections and reserve upcoming obligations.",
                            "expected_impact": "More reliable liquidity",
                            "impact_value": 12500,
                            "source_agent": "Cash Flow Agent",
                        }
                    ]
                }
            ),
            "openai",
        )

    monkeypatch.setattr(recommendation_service.llm, "is_available", lambda: True)
    monkeypatch.setattr(recommendation_service.llm, "active_provider", lambda: "openai")
    monkeypatch.setattr(recommendation_service.llm, "complete_engine", fake_complete_engine)

    response = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    assert response.status_code == 201
    recommendation_call = next(call for call in captured if call["options"].get("max_tokens") == 4096)
    lowered_prompt = recommendation_call["user"].lower()
    for section in ("invoices", "cash flow", "gst", "loans", "expenses", "transactions"):
        assert section in lowered_prompt
    assert "recommendation display schema" in lowered_prompt
    assert recommendation_call["options"]["max_tokens"] == 4096

    body = response.json()["data"]
    assert body["engine"] == "openai"
    row = body["recommendations"][0]
    assert row["title"] == "Protect the cash buffer"
    assert row["impact_value"] == 12500
    assert row["rid"].startswith("rec-")


async def test_recommend_endpoint_uses_ai_first_with_default_prompt(client, monkeypatch):
    token, _ = await seed_business(client)
    captured = []

    async def fake_complete_engine(system, user, **options):
        captured.append(options)
        if options.get("max_tokens") == 4096:
            return (
                json.dumps(
                    {
                        "recommendations": [
                            {
                                "category": "gst",
                                "title": "File the pending GST return",
                                "description": "The analysis shows an outstanding GST liability.",
                                "reason": "Avoid late fees and interest.",
                                "priority": "high",
                                "status": "new",
                                "recommended_action": "File the pending return this week.",
                                "expected_impact": "Penalty-free compliance",
                                "impact_value": 0,
                                "source_agent": "GST Agent",
                            }
                        ]
                    }
                ),
                "gemini",
            )
        return (
            json.dumps({"bullets": ["AI summary bullet about the business finances."]}),
            "gemini",
        )

    monkeypatch.setattr(recommendation_service.llm, "is_available", lambda: True)
    monkeypatch.setattr(recommendation_service.llm, "complete_engine", fake_complete_engine)

    response = await client.post("/api/ai-cfo/recommend", json={}, headers=auth(token))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["engine"] == "gemini"
    assert body["summary_engine"] == "gemini"
    assert body["recommendations"][0]["title"] == "File the pending GST return"
    assert body["summary_bullets"] == ["AI summary bullet about the business finances."]
    assert any(call.get("max_tokens") == 4096 for call in captured)


async def test_recommendation_lifecycle(client):
    token, _ = await seed_business(client)
    await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    listing = await client.get("/api/recommendations", headers=auth(token))
    rec = listing.json()["data"][0]

    ack = await client.put(f"/api/recommendations/{rec['id']}/acknowledge", headers=auth(token))
    assert ack.json()["data"]["status"] == "acknowledged"

    done = await client.put(f"/api/recommendations/{rec['id']}/complete", headers=auth(token))
    assert done.json()["data"]["status"] == "completed"

    dism = await client.put(f"/api/recommendations/{rec['id']}/dismiss", headers=auth(token))
    assert dism.json()["data"]["status"] == "dismissed"


async def test_generate_replaces_old_set_and_returns_display_schema(client):
    token, _ = await seed_business(client)
    first = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    second = await client.post("/api/recommendations/generate", json={}, headers=auth(token))

    first_rows = first.json()["data"]["recommendations"]
    second_rows = second.json()["data"]["recommendations"]
    assert first_rows, "first generate should return recommendations"
    assert second_rows, "re-running generate must not return an empty payload"

    required = {
        "category", "title", "description", "reason", "priority", "status",
        "recommended_action", "expected_impact", "impact_value", "source_agent",
        "rid", "created_at",
    }
    assert all(required <= row.keys() for row in second_rows)
    assert all(row["status"] == "new" for row in second_rows)

    # A click creates new Mongo documents and removes every document returned by
    # the previous click, even if the underlying advice is still applicable.
    first_ids = {row["id"] for row in first_rows}
    second_ids = {row["id"] for row in second_rows}
    assert first_ids.isdisjoint(second_ids)

    listing = await client.get("/api/recommendations", headers=auth(token))
    listed_ids = {row["id"] for row in listing.json()["data"]}
    assert listing.json()["total"] == len(second_rows)
    assert listed_ids == second_ids


async def test_generate_replaces_dismissed_recommendations(client):
    token, _ = await seed_business(client)
    generated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    old_rec = generated.json()["data"]["recommendations"][0]

    await client.put(f"/api/recommendations/{old_rec['id']}/dismiss", headers=auth(token))
    regenerated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))

    new_rows = regenerated.json()["data"]["recommendations"]
    assert old_rec["id"] not in {row["id"] for row in new_rows}
    assert all(row["status"] == "new" for row in new_rows)


async def test_delete_recommendation(client):
    token, _ = await seed_business(client)
    generated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    rows = generated.json()["data"]["recommendations"]
    rec = rows[0]

    deleted = await client.delete(f"/api/recommendations/{rec['id']}", headers=auth(token))
    assert deleted.status_code == 200

    listing = await client.get("/api/recommendations", headers=auth(token))
    assert rec["id"] not in {r["id"] for r in listing.json()["data"]}

    missing = await client.delete(f"/api/recommendations/{rec['id']}", headers=auth(token))
    assert missing.status_code == 404
