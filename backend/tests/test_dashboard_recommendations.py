"""Dashboard AI recommendations endpoint tests."""

from tests.helpers import auth, register, seed_business


async def test_dashboard_recommendations_empty_data(client):
    token = (await register(client))["access_token"]
    resp = await client.get("/api/recommendations/dashboard", headers=auth(token))
    assert resp.status_code == 200
    body = resp.json()["data"]
    assert body["recommendations"] == []
    assert body["engine"] in ("deterministic", "gemini", "openai")
    assert body["narrative"] is None


async def test_dashboard_recommendations_are_data_driven(client):
    token, _ = await seed_business(client)
    resp = await client.get("/api/recommendations/dashboard", headers=auth(token))
    assert resp.status_code == 200
    body = resp.json()["data"]
    recs = body["recommendations"]
    assert len(recs) >= 3

    # The seeded business has an overdue invoice → receivables recommendation.
    categories = {r["category"] for r in recs}
    assert "receivables" in categories

    # Priorities are valid and sorted by severity.
    order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
    assert all(r["priority"] in order for r in recs)
    priorities = [order[r["priority"]] for r in recs]
    assert priorities == sorted(priorities)

    # Every recommendation carries a concrete action.
    assert all(r["recommended_action"] for r in recs)

    # Limited by the query parameter.
    resp = await client.get("/api/recommendations/dashboard", params={"limit": 2}, headers=auth(token))
    assert len(resp.json()["data"]["recommendations"]) == 2


async def test_dashboard_recommendations_scoped_per_business(client):
    token_a, _ = await seed_business(client, email="a@corp.com")
    token_b = (await register(client, email="b@corp.com", business_name="Corp B"))["access_token"]

    resp_a = await client.get("/api/recommendations/dashboard", headers=auth(token_a))
    resp_b = await client.get("/api/recommendations/dashboard", headers=auth(token_b))
    assert resp_a.json()["data"]["recommendations"]
    assert resp_b.json()["data"]["recommendations"] == []
