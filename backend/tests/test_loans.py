"""Loan CRUD + EMI schedule."""

from tests.helpers import auth, create_loan, register


async def test_loan_crud(client):
    token = (await register(client))["access_token"]
    loan = await create_loan(client, token)
    resp = await client.get("/api/loans", headers=auth(token))
    assert resp.json()["total"] == 1

    resp = await client.put(
        f"/api/loans/{loan['id']}", json={"outstanding_amount": 700000}, headers=auth(token)
    )
    assert resp.json()["data"]["outstanding_amount"] == 700000


async def test_emi_schedule(client):
    token = (await register(client))["access_token"]
    loan = await create_loan(client, token)
    resp = await client.get(f"/api/loans/{loan['id']}/emi-schedule", headers=auth(token))
    assert resp.status_code == 200
    schedule = resp.json()["data"]
    assert len(schedule) > 0
    assert schedule[0]["emi_number"] == 1


async def test_mark_emi_paid(client):
    token = (await register(client))["access_token"]
    loan = await create_loan(client, token)
    resp = await client.put(f"/api/loans/{loan['id']}/mark-emi-paid", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["data"]["outstanding_amount"] == 750000  # 800000 - 50000
