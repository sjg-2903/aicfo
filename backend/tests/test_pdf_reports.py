"""PDF report generation, storage, download and business isolation."""

from tests.helpers import auth, register, seed_business


async def test_generate_and_download_pdf(client):
    token, _ = await seed_business(client)

    resp = await client.post("/api/reports/pdf", json={"report_type": "comprehensive"}, headers=auth(token))
    assert resp.status_code == 201, resp.text
    meta = resp.json()["data"]
    assert meta["report_type"] == "comprehensive"
    assert meta["size_bytes"] > 1000
    report_id = meta["id"]

    # List includes the report.
    resp = await client.get("/api/reports/pdf", headers=auth(token))
    assert resp.status_code == 200
    ids = [r["id"] for r in resp.json()["data"]]
    assert report_id in ids

    # Download returns a real PDF.
    resp = await client.get(f"/api/reports/pdf/{report_id}", headers=auth(token))
    assert resp.status_code == 200
    assert resp.headers["content-type"] == "application/pdf"
    assert resp.content.startswith(b"%PDF")

    # Delete removes it.
    resp = await client.delete(f"/api/reports/pdf/{report_id}", headers=auth(token))
    assert resp.status_code == 200
    resp = await client.get(f"/api/reports/pdf/{report_id}", headers=auth(token))
    assert resp.status_code == 404


async def test_pdf_report_requires_auth_and_is_scoped(client):
    token_a, _ = await seed_business(client, email="a@corp.com")
    token_b = (await register(client, email="b@corp.com", business_name="Corp B"))["access_token"]

    resp = await client.post("/api/reports/pdf", json={"report_type": "risk"}, headers=auth(token_a))
    report_id = resp.json()["data"]["id"]

    # Unauthenticated → 401.
    resp = await client.get(f"/api/reports/pdf/{report_id}")
    assert resp.status_code in (401, 403)

    # Other business → 404 (no cross-tenant access).
    resp = await client.get(f"/api/reports/pdf/{report_id}", headers=auth(token_b))
    assert resp.status_code == 404

    resp = await client.get("/api/reports/pdf", headers=auth(token_b))
    assert resp.json()["data"] == []


async def test_pdf_report_invalid_type(client):
    token = (await register(client))["access_token"]
    resp = await client.post("/api/reports/pdf", json={"report_type": "nonsense"}, headers=auth(token))
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "REPORT_INVALID_TYPE"


async def test_all_report_types_generate(client):
    token, _ = await seed_business(client)
    for report_type in ("comprehensive", "financial_summary", "cash_flow", "risk"):
        resp = await client.post("/api/reports/pdf", json={"report_type": report_type}, headers=auth(token))
        assert resp.status_code == 201, f"{report_type}: {resp.text}"
        assert resp.json()["data"]["size_bytes"] > 1000
