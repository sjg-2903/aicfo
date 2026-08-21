"""Alert generation + list + mark-read."""

from bson import ObjectId

from app.services.alert_service import generate
from tests.helpers import auth, register, seed_business


async def test_alerts_generated_and_listed(client, db):
    token, auth_data = await seed_business(client)
    business_id = ObjectId(auth_data["user"]["business_id"])
    await generate(db, business_id)

    resp = await client.get("/api/alerts", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["total"] >= 1


async def test_mark_alert_read(client, db):
    token, auth_data = await seed_business(client)
    business_id = ObjectId(auth_data["user"]["business_id"])
    await generate(db, business_id)

    listing = await client.get("/api/alerts", headers=auth(token))
    alert = listing.json()["data"][0]

    resp = await client.patch(
        f"/api/alerts/{alert['id']}/read", json={"read": True}, headers=auth(token)
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["is_read"] is True

    # Only unread alerts now.
    unread = await client.get("/api/alerts?is_read=false", headers=auth(token))
    assert all(a["is_read"] is False for a in unread.json()["data"])


async def test_alert_generation_is_deduplicated(client, db):
    token, auth_data = await seed_business(client)
    business_id = ObjectId(auth_data["user"]["business_id"])
    await generate(db, business_id)
    first = await client.get("/api/alerts", headers=auth(token))
    await generate(db, business_id)
    second = await client.get("/api/alerts", headers=auth(token))
    assert first.json()["total"] == second.json()["total"]
