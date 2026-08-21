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


async def test_generate_returns_full_payload_and_no_duplicates(client):
    token, _ = await seed_business(client)
    first = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    second = await client.post("/api/recommendations/generate", json={}, headers=auth(token))

    first_rows = first.json()["data"]
    second_rows = second.json()["data"]

    # The payload is never empty — a re-run refreshes and returns the live set.
    assert first_rows, "first generate should return recommendations"
    assert second_rows, "re-running generate must not return an empty payload"
    assert {r["id"] for r in first_rows} == {r["id"] for r in second_rows}

    # ...and no duplicate documents were inserted.
    listing = await client.get("/api/recommendations", headers=auth(token))
    assert listing.json()["total"] == len(first_rows)


async def test_generate_revives_dismissed_recommendations(client):
    token, _ = await seed_business(client)
    generated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    rec = generated.json()["data"][0]

    await client.put(f"/api/recommendations/{rec['id']}/dismiss", headers=auth(token))

    regenerated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    revived = [r for r in regenerated.json()["data"] if r["id"] == rec["id"]]
    assert revived and revived[0]["status"] == "new"


async def test_delete_recommendation(client):
    token, _ = await seed_business(client)
    generated = await client.post("/api/recommendations/generate", json={}, headers=auth(token))
    rows = generated.json()["data"]
    rec = rows[0]

    deleted = await client.delete(f"/api/recommendations/{rec['id']}", headers=auth(token))
    assert deleted.status_code == 200

    listing = await client.get("/api/recommendations", headers=auth(token))
    assert rec["id"] not in {r["id"] for r in listing.json()["data"]}

    missing = await client.delete(f"/api/recommendations/{rec['id']}", headers=auth(token))
    assert missing.status_code == 404
