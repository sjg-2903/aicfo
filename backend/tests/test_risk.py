"""Risk Engine tests."""

from tests.helpers import auth, register, seed_business


async def test_risk_analysis_structure(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/risk/analyze", json={}, headers=auth(token))
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert 0 <= data["risk_score"] <= 100
    assert data["risk_level"] in {"low", "medium", "high", "critical"}
    for r in data["risks"]:
        assert r["severity"] in {"low", "medium", "high", "critical"}
        assert "evidence" in r
        assert "recommended_action" in r
        assert "id" in r


async def test_risk_detects_overdue_receivable(client):
    token = (await register(client))["access_token"]
    # An overdue invoice should produce a receivables risk.
    await client.post(
        "/api/invoices",
        json={
            "invoice_number": "INV-R1", "customer_name": "LateCo",
            "invoice_date": "2026-01-01T00:00:00Z", "due_date": "2026-01-15T00:00:00Z",
            "total_amount": 600000, "paid_amount": 0, "status": "overdue",
        },
        headers=auth(token),
    )
    resp = await client.post("/api/risk/analyze", json={}, headers=auth(token))
    types = {r["type"] for r in resp.json()["data"]["risks"]}
    assert "receivables" in types


async def test_risk_get_and_acknowledge(client):
    token, _ = await seed_business(client)
    resp = await client.get("/api/risk", headers=auth(token))
    assert resp.status_code == 200
    risks = resp.json()["data"]["risks"]
    if risks:
        rid = risks[0]["id"]
        ack = await client.put(f"/api/risk/{rid}/acknowledge", headers=auth(token))
        assert ack.status_code == 200
        assert ack.json()["data"]["status"] == "acknowledged"
