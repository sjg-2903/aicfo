"""Tests for document extraction, confirmation, Excel import and history."""

import io

import pandas as pd
import pytest

from tests.helpers import auth, register, seed_business


def _xlsx_bytes(rows: list[dict]) -> bytes:
    buf = io.BytesIO()
    pd.DataFrame(rows).to_excel(buf, index=False)
    return buf.getvalue()


async def _upload(client, token, path, content, filename, content_type=None):
    return await client.post(
        path,
        files={"file": (filename, content, content_type or "application/octet-stream")},
        headers=auth(token),
    )


# ── Excel imports ────────────────────────────────────────────────────────────

async def test_excel_import_transactions(client):
    token = (await register(client))["access_token"]
    content = _xlsx_bytes(
        [
            {"date": "2026-01-01", "description": "Excel income", "amount": 125000, "type": "income", "category": "Sales", "payment_method": "NEFT"},
            {"date": "2026-01-02", "description": "Excel expense", "amount": 30000, "type": "expense", "category": "Rent", "payment_method": "NEFT"},
            {"date": "2026-01-03", "description": "Bad row", "amount": "not-a-number", "type": "income"},
        ]
    )
    resp = await _upload(client, token, "/api/transactions/import", content, "data.xlsx")
    assert resp.status_code == 201, resp.text
    body = resp.json()["data"]
    assert body["total_rows"] == 3
    assert body["successful_rows"] == 2
    assert body["failed_rows"] == 1

    listed = await client.get("/api/transactions", headers=auth(token))
    assert listed.json()["total"] == 2


async def test_excel_import_rejects_csv_with_xlsx_name(client):
    token = (await register(client))["access_token"]
    resp = await _upload(client, token, "/api/transactions/import", b"a,b\n1,2\n", "fake.xlsx")
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "IMPORT_INVALID_FILE"


# ── Document extraction + confirmation ──────────────────────────────────────

INVOICE_PDF_TEXT = (
    "TAX INVOICE\n"
    "Invoice No: INV-2026-501\n"
    "Customer: Sunrise Retail\n"
    "Invoice Date: 2026-08-01\n"
    "Due Date: 2026-08-31\n"
    "Total Amount: Rs 445,778.25\n"
    "Amount Paid: 200000.00\n"
    "GSTIN: 29ABCDE1234F1Z5\n"
)


def _pdf_bytes() -> bytes:
    from reportlab.lib.pagesizes import A4
    from reportlab.pdfgen import canvas

    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=A4)
    y = 780
    for line in INVOICE_PDF_TEXT.splitlines():
        c.drawString(72, y, line)
        y -= 16
    c.save()
    return buf.getvalue()


async def test_extract_pdf_and_confirm(client):
    token = (await register(client))["access_token"]
    resp = await _upload(client, token, "/api/uploads/extract?import_type=invoices", _pdf_bytes(), "invoice-scan.pdf", "application/pdf")
    assert resp.status_code == 200, resp.text
    data = resp.json()["data"]
    assert data["method"] in ("heuristics", "gemini", "openai", "manual")
    assert data["rows"], "expected heuristic rows from the PDF text layer"
    first = data["rows"][0]
    assert first.get("invoice_number") == "INV-2026-501"
    assert first.get("total_amount") in ("445778.25", "445778.25", "445778")

    # Nothing should be stored yet.
    listed = await client.get("/api/invoices", headers=auth(token))
    assert listed.json()["total"] == 0

    # User reviews and confirms.
    confirm = {
        "import_type": "invoices",
        "file_name": "invoice-scan.pdf",
        "rows": [
            {
                "invoice_number": "INV-2026-501",
                "customer_name": "Sunrise Retail",
                "invoice_date": "2026-08-01",
                "due_date": "2026-08-31",
                "total_amount": 445778.25,
                "paid_amount": 200000,
                "status": "sent",
            }
        ],
    }
    resp = await client.post("/api/uploads/extracted/confirm", json=confirm, headers=auth(token))
    assert resp.status_code == 201, resp.text
    body = resp.json()["data"]
    assert body["successful_rows"] == 1
    assert body["duplicates"] == 0

    listed = await client.get("/api/invoices", headers=auth(token))
    assert listed.json()["total"] == 1

    # Re-confirming the same row must be caught as a duplicate.
    resp = await client.post("/api/uploads/extracted/confirm", json=confirm, headers=auth(token))
    assert resp.status_code == 201
    assert resp.json()["data"]["duplicates"] == 1


async def test_confirm_validates_rows(client):
    token = (await register(client))["access_token"]
    confirm = {
        "import_type": "transactions",
        "file_name": "scan.png",
        "rows": [
            {"date": "2026-01-01", "description": "Good row", "amount": 500, "type": "income"},
            {"date": "2026-01-02", "description": "Bad amount", "amount": "abc", "type": "income"},
            {"date": "2026-01-03", "description": "Bad type", "amount": 100, "type": "transfer"},
            {"date": "2026-01-04", "description": "Junk field", "amount": 100, "type": "income", "hacker_field": "x"},
        ],
    }
    resp = await client.post("/api/uploads/extracted/confirm", json=confirm, headers=auth(token))
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["total_rows"] == 4
    assert body["successful_rows"] == 2
    assert body["failed_rows"] == 2


async def test_confirm_rejects_unknown_type_and_empty(client):
    token = (await register(client))["access_token"]
    resp = await client.post(
        "/api/uploads/extracted/confirm",
        json={"import_type": "crypto", "rows": [{"x": 1}]},
        headers=auth(token),
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "IMPORT_INVALID_TYPE"

    resp = await client.post(
        "/api/uploads/extracted/confirm",
        json={"import_type": "transactions", "rows": []},
        headers=auth(token),
    )
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "IMPORT_EMPTY_ROWS"


async def test_extract_rejects_bad_files(client):
    token = (await register(client))["access_token"]
    resp = await _upload(client, token, "/api/uploads/extract?import_type=transactions", b"hello", "data.csv", "text/csv")
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "EXTRACT_INVALID_FILE"


# ── History ──────────────────────────────────────────────────────────────────

async def test_history_records_operations(client):
    token, _ = await seed_business(client)

    # Import a file → import event.
    csv = "date,description,amount,type,category,payment_method\n2026-01-10,History txn,1000,income,Sales,NEFT\n"
    await _upload(client, token, "/api/transactions/import", csv.encode(), "jan.csv", "text/csv")

    # Generate recommendations → recommendations event.
    await client.post("/api/recommendations/generate", json={}, headers=auth(token))

    # Generate a PDF report → report event (needs the PDF pipeline to work).
    resp = await client.post("/api/reports/pdf", json={"report_type": "comprehensive"}, headers=auth(token))
    assert resp.status_code == 201, resp.text

    resp = await client.get("/api/history", params={"limit": 50}, headers=auth(token))
    assert resp.status_code == 200
    body = resp.json()
    items = body["data"]
    types = {e["event_type"] for e in items}
    assert "import" in types
    assert "recommendations" in types
    assert "report" in types
    assert "record" in types  # CRUD from the seed helpers

    # The import event carries the filename.
    import_ev = next(e for e in items if e["event_type"] == "import")
    assert import_ev["details"]["file_name"] == "jan.csv"

    # The report event carries a downloadable report id.
    report_ev = next(e for e in items if e["event_type"] == "report")
    report_id = report_ev["report_id"]
    assert report_id

    # Filter by type.
    resp = await client.get("/api/history", params={"event_type": "report"}, headers=auth(token))
    assert resp.status_code == 200
    assert all(e["event_type"] == "report" for e in resp.json()["data"])


async def test_history_is_business_scoped(client):
    token_a = (await register(client, email="a@corp.com", business_name="Corp A"))["access_token"]
    token_b = (await register(client, email="b@corp.com", business_name="Corp B"))["access_token"]

    csv = "date,description,amount,type,category,payment_method\n2026-01-10,A only,1000,income,Sales,NEFT\n"
    await _upload(client, token_a, "/api/transactions/import", csv.encode(), "a-only.csv", "text/csv")

    resp_a = await client.get("/api/history", headers=auth(token_a))
    resp_b = await client.get("/api/history", headers=auth(token_b))
    assert any(e["details"].get("file_name") == "a-only.csv" for e in resp_a.json()["data"])
    assert not any(e["details"].get("file_name") == "a-only.csv" for e in resp_b.json()["data"])


async def test_extraction_recorded_in_history(client):
    token = (await register(client))["access_token"]
    await _upload(client, token, "/api/uploads/extract?import_type=invoices", _pdf_bytes(), "inv.pdf", "application/pdf")
    resp = await client.get("/api/history", params={"event_type": "extraction"}, headers=auth(token))
    items = resp.json()["data"]
    assert any(e["details"].get("file_name") == "inv.pdf" for e in items)
