"""Recommendation Engine tests."""

from tests.helpers import auth, register, seed_business


async def test_generate_and_list_recommendations(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    assert resp.status_code == 201
    generated = resp.json()["data"]
    assert isinstance(generated, list)

    resp = await client.get("/api/recommendations", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


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


async def test_generate_is_idempotent(client):
    token, _ = await seed_business(client)
    first = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    second = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    # Second run should not insert duplicates.
    assert second.json()["data"] == []
