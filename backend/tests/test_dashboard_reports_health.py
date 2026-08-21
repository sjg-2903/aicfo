"""Dashboard, reports and health endpoint tests."""

from tests.helpers import auth, register, seed_business


async def test_dashboard_summary(client):
    token, _ = await seed_business(client)
    resp = await client.get("/api/dashboard/summary", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    for key in ("revenue", "expenses", "net_profit", "cash_balance",
                "outstanding_receivables", "outstanding_debt"):
        assert key in data


async def test_dashboard_extras(client):
    token, _ = await seed_business(client)
    for path in (
        "/api/dashboard/revenue-trend",
        "/api/dashboard/cash-flow-trend",
        "/api/dashboard/expense-distribution",
        "/api/dashboard/receivables-aging",
        "/api/dashboard/loan-overview",
        "/api/dashboard/forecast-30day",
    ):
        resp = await client.get(path, headers=auth(token))
        assert resp.status_code == 200, path


async def test_reports(client):
    token, _ = await seed_business(client)
    for path in (
        "/api/reports/financial-summary",
        "/api/reports/cashflow",
        "/api/reports/risk",
    ):
        resp = await client.get(path, headers=auth(token))
        assert resp.status_code == 200, path


async def test_business_get_update(client):
    token = (await register(client))["access_token"]
    resp = await client.get("/api/business", headers=auth(token))
    assert resp.status_code == 200
    assert resp.json()["data"]["business_name"] == "Acme Industries"

    resp = await client.put(
        "/api/business", json={"industry": "Manufacturing", "city": "Mumbai"}, headers=auth(token)
    )
    assert resp.json()["data"]["city"] == "Mumbai"


async def test_health_endpoint(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    body = resp.json()
    assert body["status"] in {"ok", "degraded"}
    assert body["service"]


async def test_error_envelope_shape(client):
    resp = await client.get("/api/nonexistent")
    # 404 — consistent envelope with success/error_code.
    assert resp.status_code == 404
    body = resp.json()
    assert body["success"] is False
    assert "error_code" in body or "message" in body
