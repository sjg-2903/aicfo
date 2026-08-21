"""Loan Readiness Engine tests."""

from tests.helpers import auth, register, seed_business


async def test_loan_readiness_structure(client):
    token, _ = await seed_business(client)
    resp = await client.post("/api/loan-readiness/analyze", json={}, headers=auth(token))
    assert resp.status_code == 201
    data = resp.json()["data"]
    assert 0 <= data["readiness_score"] <= 100
    assert data["status"] in {"ready", "moderate", "not_ready"}
    assert len(data["factors"]) == 6
    total_weight = sum(f["weight"] for f in data["factors"])
    assert abs(total_weight - 1.0) < 1e-6


async def test_loan_readiness_get(client):
    token = (await register(client))["access_token"]
    resp = await client.get("/api/loan-readiness", headers=auth(token))
    assert resp.status_code == 200
    data = resp.json()["data"]
    assert "readiness_score" in data
