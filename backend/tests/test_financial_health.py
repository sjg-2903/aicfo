"""Financial Health Engine tests."""

from tests.helpers import _dt, auth, register, seed_business


async def test_health_score_bounds_and_factors(client):
    token, _ = await seed_business(client)
    resp = await client.get("/api/dashboard/financial-health", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert 0 <= data["score"] <= 100
    assert data["status"] in {"good", "moderate", "at_risk", "critical"}
    assert len(data["factors"]) == 9
    total_weight = sum(f["weight"] for f in data["factors"])
    assert abs(total_weight - 1.0) < 1e-6


async def test_health_uses_actual_revenue_and_expenses(client):
    token = (await register(client))["access_token"]
    # 200k revenue, 80k expense in the current month.
    await client.post(
        "/api/transactions",
        json={"date": _dt(1), "description": "sales", "amount": 200000, "type": "income"},
        headers=auth(token),
    )
    await client.post(
        "/api/transactions",
        json={"date": _dt(2), "description": "cost", "amount": 80000, "type": "expense"},
        headers=auth(token),
    )
    resp = await client.get("/api/dashboard/summary", headers=auth(token))
    summary = resp.json()["data"]
    assert summary["revenue"]["current"] == 200000
    assert summary["expenses"]["current"] == 80000
    assert summary["net_profit"]["current"] == 120000
