"""Invoice CRUD, overdue listing and mark-paid."""

from tests.helpers import auth, create_invoice, register


async def test_create_invoice_and_outstanding(client):
    token = (await register(client))["access_token"]
    inv = await create_invoice(client, token)
    assert inv["outstanding_amount"] == 200000


async def test_duplicate_invoice_number_rejected(client):
    token = (await register(client))["access_token"]
    await create_invoice(client, token, invoice_number="INV-X")
    resp = await client.post(
        "/api/invoices",
        json={
            "invoice_number": "INV-X", "customer_name": "Other", "invoice_date": "2026-01-01T00:00:00Z",
            "due_date": "2026-02-01T00:00:00Z", "total_amount": 1000,
        },
        headers=auth(token),
    )
    assert resp.status_code == 409
    assert resp.json()["error_code"] == "INVOICE_NUMBER_EXISTS"


async def test_overdue_listing(client):
    token = (await register(client))["access_token"]
    await create_invoice(client, token, invoice_number="INV-1", status="sent")
    await create_invoice(client, token, invoice_number="INV-2", status="overdue")

    resp = await client.get("/api/invoices/overdue", headers=auth(token))
    assert resp.status_code == 200
    assert len(resp.json()["data"]) == 1
    assert resp.json()["data"][0]["status"] == "overdue"


async def test_mark_paid(client):
    token = (await register(client))["access_token"]
    inv = await create_invoice(client, token)
    resp = await client.put(
        f"/api/invoices/{inv['id']}/mark-paid", json={"paid_amount": 200000}, headers=auth(token)
    )
    assert resp.status_code == 200
    assert resp.json()["data"]["status"] == "paid"
    assert resp.json()["data"]["outstanding_amount"] == 0


async def test_invoice_filters(client):
    token = (await register(client))["access_token"]
    await create_invoice(client, token, invoice_number="INV-A", status="paid")
    await create_invoice(client, token, invoice_number="INV-B", status="sent")

    resp = await client.get("/api/invoices?status=paid", headers=auth(token))
    assert resp.json()["total"] == 1

    resp = await client.get("/api/invoices?search=Delta", headers=auth(token))
    assert resp.json()["total"] == 2
