"""Shared test helpers."""

from datetime import datetime, timedelta, timezone


def auth(token: str) -> dict:
    return {"Authorization": f"Bearer {token}"}


async def register(
    client,
    email="owner@acme.com",
    password="password123",
    business_name="Acme Industries",
    owner_name="Rajesh Sharma",
    **extra,
) -> dict:
    resp = await client.post(
        "/api/auth/register",
        json={"email": email, "password": password, "business_name": business_name, "owner_name": owner_name, **extra},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def login(client, email="owner@acme.com", password="password123") -> dict:
    resp = await client.post("/api/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["data"]


def _dt(days_ago: int = 0, hour: int = 10) -> str:
    return (datetime.now(timezone.utc) - timedelta(days=days_ago)).replace(
        hour=hour, minute=0, second=0, microsecond=0
    ).isoformat()


async def create_transaction(client, token, **overrides) -> dict:
    payload = {
        "date": _dt(2),
        "description": "Invoice payment — Delta Traders",
        "amount": 100000,
        "type": "income",
        "category": "Sales",
        "payment_method": "NEFT",
    }
    payload.update(overrides)
    resp = await client.post("/api/transactions", json=payload, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_expense(client, token, **overrides) -> dict:
    payload = {
        "date": _dt(3),
        "description": "Raw material purchase",
        "amount": 50000,
        "category": "Materials",
        "vendor": "SteelMart",
        "payment_method": "NEFT",
    }
    payload.update(overrides)
    resp = await client.post("/api/expenses", json=payload, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_invoice(client, token, **overrides) -> dict:
    payload = {
        "invoice_number": "INV-1001",
        "customer_name": "Delta Traders",
        "invoice_date": _dt(20),
        "due_date": _dt(-10),
        "total_amount": 200000,
        "paid_amount": 0,
        "status": "sent",
    }
    payload.update(overrides)
    resp = await client.post("/api/invoices", json=payload, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_gst(client, token, **overrides) -> dict:
    payload = {
        "period": "Jan 2026",
        "period_start": _dt(30),
        "period_end": _dt(0),
        "due_date": _dt(-5),
        "taxable_turnover": 500000,
        "tax_amount": 90000,
        "paid_amount": 0,
        "status": "overdue",
    }
    payload.update(overrides)
    resp = await client.post("/api/gst", json=payload, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def create_loan(client, token, **overrides) -> dict:
    payload = {
        "lender": "HDFC Bank",
        "loan_type": "Term Loan",
        "principal_amount": 1000000,
        "outstanding_amount": 800000,
        "interest_rate": 10.5,
        "emi_amount": 50000,
        "start_date": _dt(365),
        "end_date": _dt(-365),
        "next_emi_date": _dt(-3),
    }
    payload.update(overrides)
    resp = await client.post("/api/loans", json=payload, headers=auth(token))
    assert resp.status_code == 201, resp.text
    return resp.json()["data"]


async def seed_business(client, email="owner@acme.com") -> tuple[str, dict]:
    """Register a business and seed a rich, deterministic dataset."""
    auth_data = await register(client, email=email)
    token = auth_data["access_token"]
    for i in range(8):
        days = i * 20
        await create_transaction(
            client, token, date=_dt(days), description=f"Income {i}", amount=100000 + i * 10000, type="income"
        )
        await create_transaction(
            client, token, date=_dt(days), description=f"Expense {i}", amount=40000 + i * 2000, type="expense"
        )
    await create_invoice(client, token, invoice_number="INV-SEED-1", customer_name="Global Exports", due_date=_dt(-40), status="overdue", total_amount=150000)
    await create_invoice(client, token, invoice_number="INV-SEED-2", customer_name="Delta Traders", due_date=_dt(-20), status="sent", total_amount=120000, paid_amount=20000)
    await create_gst(client, token, period="Oct 2025", due_date=_dt(-50), tax_amount=120000, paid_amount=0, status="overdue")
    await create_loan(client, token)
    return token, auth_data
