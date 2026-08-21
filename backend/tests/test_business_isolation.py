"""Strict multi-tenant isolation tests.

Business A must never be able to read, update or delete Business B's data.
"""

from tests.helpers import (
    auth,
    create_invoice,
    create_transaction,
    register,
)


async def test_cannot_read_other_business_transactions(client):
    a = await register(client, email="a@acme.com")
    b = await register(client, email="b@acme.com")

    await create_transaction(client, a["access_token"], description="A-secret-txn")
    await create_transaction(client, b["access_token"], description="B-secret-txn")

    resp = await client.get("/api/transactions", headers=auth(a["access_token"]))
    items = resp.json()["data"]
    descriptions = {t["description"] for t in items}
    assert "A-secret-txn" in descriptions
    assert "B-secret-txn" not in descriptions
    assert resp.json()["total"] == 1


async def test_cannot_update_other_business_resource(client):
    a = await register(client, email="a@acme.com")
    b = await register(client, email="b@acme.com")

    inv = await create_invoice(client, b["access_token"], invoice_number="INV-B-1")

    resp = await client.put(
        f"/api/invoices/{inv['id']}",
        json={"customer_name": "Hacked"},
        headers=auth(a["access_token"]),
    )
    assert resp.status_code == 404  # not visible to A → not found


async def test_cannot_delete_other_business_resource(client):
    a = await register(client, email="a@acme.com")
    b = await register(client, email="b@acme.com")

    txn = await create_transaction(client, b["access_token"])
    resp = await client.delete(f"/api/transactions/{txn['id']}", headers=auth(a["access_token"]))
    assert resp.status_code == 404


async def test_business_id_not_derived_from_client(client):
    """The server ignores any client-supplied business_id on create."""
    a = await register(client, email="a@acme.com")
    b = await register(client, email="b@acme.com")

    # Attempt to create a transaction claiming business B's id. The field is
    # ignored by the schema and the server derives the business from the token.
    resp = await client.post(
        "/api/transactions",
        json={
            "business_id": b["user"]["business_id"],
            "date": "2026-01-01T10:00:00Z",
            "description": "sneaky",
            "amount": 5,
            "type": "income",
        },
        headers=auth(a["access_token"]),
    )
    assert resp.status_code == 201
    # The record was created under A's business, not B's.
    assert resp.json()["data"]["business_id"] == a["user"]["business_id"]


async def test_invoices_and_expenses_isolated(client):
    a = await register(client, email="a@acme.com")
    b = await register(client, email="b@acme.com")

    await create_invoice(client, b["access_token"], invoice_number="INV-B-2")
    resp = await client.get("/api/invoices", headers=auth(a["access_token"]))
    assert resp.json()["total"] == 0
