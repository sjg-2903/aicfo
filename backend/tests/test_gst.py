"""GST record CRUD + obligations."""

from tests.helpers import auth, create_gst, register


async def test_gst_create_and_list(client):
    token = (await register(client))["access_token"]
    await create_gst(client, token)
    resp = await client.get("/api/gst", headers=auth(token))
    assert resp.json()["total"] == 1


async def test_overdue_obligations(client):
    token = (await register(client))["access_token"]
    await create_gst(client, token, status="overdue")
    await create_gst(client, token, period="Feb 2026", status="pending", due_date="2026-03-20T00:00:00Z")

    resp = await client.get("/api/gst/obligations/overdue", headers=auth(token))
    assert len(resp.json()["data"]) == 1


async def test_mark_filed(client):
    token = (await register(client))["access_token"]
    gst = await create_gst(client, token)
    resp = await client.put(f"/api/gst/{gst['id']}/mark-filed", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "filed"
