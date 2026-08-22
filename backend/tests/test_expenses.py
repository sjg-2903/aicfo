"""Expense CRUD + categories."""

from tests.helpers import auth, create_expense, register


async def test_expense_crud_and_categories(client):
    token = (await register(client))["access_token"]
    await create_expense(client, token, category="Materials")
    await create_expense(client, token, category="Rent", description="Office rent")

    resp = await client.get("/api/expenses", headers=auth(token))
    assert resp.json()["total"] == 2

    resp = await client.get("/api/expenses/categories", headers=auth(token))
    assert set(resp.json()["data"]) == {"Materials", "Rent"}

    resp = await client.get("/api/expenses?category=Rent", headers=auth(token))
    assert resp.json()["total"] == 1


async def test_expense_negative_amount_rejected(client):
    token = (await register(client))["access_token"]
    resp = await client.post(
        "/api/expenses",
        json={"date": "2026-01-01T00:00:00Z", "description": "x", "amount": -10},
        headers=auth(token),
    )
    assert resp.status_code == 422
