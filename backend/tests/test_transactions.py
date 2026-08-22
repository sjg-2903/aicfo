"""Transaction CRUD, filtering, search, sorting and validation."""

from tests.helpers import auth, create_transaction, register


async def test_create_and_list(client):
    token, _ = await _reg(client)
    await create_transaction(client, token, description="Alpha")
    await create_transaction(client, token, description="Beta", type="expense", amount=500)

    resp = await client.get("/api/transactions", headers=auth(token))
    body = resp.json()
    assert body["total"] == 2
    assert body["page"] == 1
    assert body["limit"] == 20
    assert body["pages"] == 1


async def test_pagination(client):
    token, _ = await _reg(client)
    for i in range(25):
        await create_transaction(client, token, description=f"txn-{i}", amount=100 + i)

    resp = await client.get("/api/transactions?page=2&limit=10", headers=auth(token))
    body = resp.json()
    assert body["page"] == 2
    assert body["limit"] == 10
    assert body["total"] == 25
    assert body["pages"] == 3
    assert len(body["data"]) == 10


async def test_filter_by_type_and_search(client):
    token, _ = await _reg(client)
    await create_transaction(client, token, description="Zebra income", type="income")
    await create_transaction(client, token, description="Zebra expense", type="expense")

    resp = await client.get("/api/transactions?type=expense", headers=auth(token))
    assert resp.json()["total"] == 1
    assert resp.json()["data"][0]["type"] == "expense"

    resp = await client.get("/api/transactions?search=Zebra", headers=auth(token))
    assert resp.json()["total"] == 2


async def test_update_and_delete(client):
    token, _ = await _reg(client)
    txn = await create_transaction(client, token, description="original")

    resp = await client.put(
        f"/api/transactions/{txn['id']}", json={"description": "updated", "amount": 999},
        headers=auth(token),
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["description"] == "updated"

    resp = await client.delete(f"/api/transactions/{txn['id']}", headers=auth(token))
    assert resp.status_code == 200

    resp = await client.get("/api/transactions", headers=auth(token))
    assert resp.json()["total"] == 0


async def test_invalid_amount_rejected(client):
    token, _ = await _reg(client)
    resp = await client.post(
        "/api/transactions",
        json={"date": "2026-01-01T10:00:00Z", "description": "x", "amount": -5, "type": "income"},
        headers=auth(token),
    )
    assert resp.status_code == 422


async def test_invalid_type_rejected(client):
    token, _ = await _reg(client)
    resp = await client.post(
        "/api/transactions",
        json={"date": "2026-01-01T10:00:00Z", "description": "x", "amount": 5, "type": "transfer"},
        headers=auth(token),
    )
    assert resp.status_code == 422


async def test_malformed_date_rejected(client):
    token, _ = await _reg(client)
    resp = await client.post(
        "/api/transactions",
        json={"date": "not-a-date", "description": "x", "amount": 5, "type": "income"},
        headers=auth(token),
    )
    assert resp.status_code == 422


async def _reg(client):
    data = await register(client)
    return data["access_token"], data
