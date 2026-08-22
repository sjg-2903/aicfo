"""CSV import pipeline tests."""

from tests.helpers import auth, register

TRANSACTIONS_CSV = (
    "date,description,amount,type,category,payment_method\n"
    "2026-01-01,Invoice payment Alpha,100000,income,Sales,NEFT\n"
    "2026-01-02,Raw material,50000,expense,Materials,NEFT\n"
    "2026-01-03,Duplicate row,100000,income,Sales,NEFT\n"
    "2026-01-03,Duplicate row,100000,income,Sales,NEFT\n"
    "2026-01-04,Bad amount,not-a-number,income,Sales,NEFT\n"
    "2026-01-05,Bad type,200,transfer,Sales,NEFT\n"
)


async def _upload(client, token, import_type, content, filename="data.csv"):
    return await client.post(
        f"/api/{import_type}/import",
        files={"file": (filename, content.encode(), "text/csv")},
        headers=auth(token),
    )


async def test_transaction_csv_import(client):
    token = (await register(client))["access_token"]
    resp = await _upload(client, token, "transactions", TRANSACTIONS_CSV)
    assert resp.status_code == 201, resp.text
    body = resp.json()["data"]
    assert body["total_rows"] == 6
    assert body["successful_rows"] == 3  # three valid unique rows
    assert body["duplicates"] == 1       # in-file duplicate (row 4)
    assert body["failed_rows"] == 2      # bad amount + bad type
    assert body["errors"]


async def test_import_rejects_wrong_file_type(client):
    token = (await register(client))["access_token"]
    resp = await _upload(client, token, "transactions", TRANSACTIONS_CSV, filename="data.xlsx")
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "IMPORT_INVALID_FILE"


async def test_import_rejects_missing_headers(client):
    token = (await register(client))["access_token"]
    csv = "date,description\n2026-01-01,no amount\n"
    resp = await _upload(client, token, "transactions", csv)
    assert resp.status_code == 400
    assert resp.json()["error_code"] == "IMPORT_INVALID_HEADERS"


async def test_import_rejects_unknown_type(db):
    from app.core.errors import BadRequestError
    from app.services import import_service

    import pytest

    with pytest.raises(BadRequestError) as exc_info:
        await import_service.import_csv(db, 1, 1, "cryptocurrency", b"a,b\n1,2\n", "data.csv")
    assert exc_info.value.error_code == "IMPORT_INVALID_TYPE"


async def test_import_detects_duplicate_against_db(client):
    token = (await register(client))["access_token"]
    await client.post(
        "/api/transactions",
        json={"date": "2026-01-01T00:00:00Z", "description": "Existing", "amount": 777, "type": "income"},
        headers=auth(token),
    )
    csv = "date,description,amount,type\n2026-01-01,Existing,777,income\n"
    resp = await _upload(client, token, "transactions", csv)
    assert resp.json()["data"]["duplicates"] == 1
    assert resp.json()["data"]["successful_rows"] == 0


async def test_invoice_csv_import(client):
    token = (await register(client))["access_token"]
    csv = (
        "invoice_number,customer_name,invoice_date,due_date,total_amount,paid_amount,status\n"
        "INV-CSV-1,Delta Traders,2026-01-01,2026-02-01,150000,0,sent\n"
        "INV-CSV-2,Global Exports,2026-01-02,2026-02-02,200000,200000,paid\n"
    )
    resp = await _upload(client, token, "invoices", csv)
    assert resp.status_code == 201
    body = resp.json()["data"]
    assert body["successful_rows"] == 2
