"""Forecasting tests: regression path, fallback and insufficient data."""

from datetime import datetime, timedelta, timezone

from tests.helpers import auth, register


async def _seed_days(client, token, n_days: int):
    base = datetime.now(timezone.utc)
    for i in range(n_days):
        d = (base - timedelta(days=n_days - i)).isoformat()
        await client.post(
            "/api/transactions",
            json={"date": d, "description": f"income {i}", "amount": 50000 + (i % 7) * 5000, "type": "income"},
            headers=auth(token),
        )
        await client.post(
            "/api/transactions",
            json={"date": d, "description": f"expense {i}", "amount": 30000 + (i % 5) * 2000, "type": "expense"},
            headers=auth(token),
        )


async def test_forecast_with_sufficient_history(client):
    token = (await register(client))["access_token"]
    await _seed_days(client, token, 30)

    resp = await client.post("/api/forecast/generate", json={"days": 30}, headers=auth(token))
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["days"] == 30
    assert len(body["predicted_net_cash_flow"]) == 30
    assert body["model"] in {"sklearn_linear_regression", "moving_average"}


async def test_forecast_fallback_with_limited_history(client):
    token = (await register(client))["access_token"]
    await _seed_days(client, token, 5)

    resp = await client.post("/api/forecast/generate", json={"days": 30}, headers=auth(token))
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["model"] == "moving_average"
    assert body["confidence"] == "low"


async def test_forecast_insufficient_data(client):
    token = (await register(client))["access_token"]
    resp = await client.post("/api/forecast/generate", json={"days": 30}, headers=auth(token))
    assert resp.status_code == 422
    assert resp.json()["error_code"] == "INSUFFICIENT_DATA"


async def test_get_cashflow_forecast(client):
    token = (await register(client))["access_token"]
    await _seed_days(client, token, 20)
    resp = await client.get("/api/forecast/cashflow", headers=auth(token))
    assert resp.status_code == 200
