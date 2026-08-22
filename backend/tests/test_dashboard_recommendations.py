"""Complete recommendations summary endpoint tests.

The Dashboard and Recommendations page share this one endpoint and frontend
component; there is no dashboard-only recommendation generator anymore.
"""

from tests.helpers import auth, register, seed_business


async def test_recommendation_summary_empty_data(client):
    token = (await register(client))["access_token"]
    response = await client.get("/api/recommendations/summary", headers=auth(token))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["engine"] in ("deterministic", "bedrock")
    assert isinstance(body["bullets"], list)


async def test_recommendation_summary_is_data_driven(client):
    token, _ = await seed_business(client)
    response = await client.get("/api/recommendations/summary", headers=auth(token))
    assert response.status_code == 200
    body = response.json()["data"]
    assert body["bullets"]
    combined = " ".join(body["bullets"]).lower()
    assert "revenue" in combined or "receivable" in combined


async def test_dashboard_only_recommendation_endpoint_is_removed(client):
    token = (await register(client))["access_token"]
    response = await client.get("/api/recommendations/dashboard", headers=auth(token))
    assert response.status_code == 405
