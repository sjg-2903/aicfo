# Dummy MSME CSV dataset

Synthetic books for **Acme Industries Pvt. Ltd.**, a small Indian manufacturing
business. The files match the FastAPI CSV import headers in
`backend/app/services/import_service.py` and can be loaded into MongoDB against
the dummy owner account below.

This is **not** production data. Amounts, customers, GSTINs and lenders are
invented.

## Dummy account

| Field | Value |
|---|---|
| Email | `owner@acmeindustries.com` |
| Password | `demo12345` |
| Business | Acme Industries Pvt. Ltd. |
| Owner | Rajesh Sharma |
| Type / industry | Private Limited / Manufacturing |
| Currency | INR |
| Database | `aicfo` (same as `MONGODB_DB_NAME`) |

These credentials are the same ones used by `backend/scripts/generate_demo_data.py`.

## Files

| File | Collection | Rows | Period |
|---|---|---|---|
| `transactions.csv` | `transactions` | 201 | Feb–Aug 2026 |
| `invoices.csv` | `invoices` | 30 | Feb–Aug 2026 |
| `expenses.csv` | `expenses` | 42 | Feb–Aug 2026 |
| `gst.csv` | `gst_records` | 7 monthly GSTR-3B | Feb–Aug 2026 |
| `loans.csv` | `loans` | 4 active facilities | 2024–2029 |

Dates are ISO-8601 (`YYYY-MM-DD`). Amounts are rupees (not paise).

### Column schemas

**`transactions.csv`** — required: `date`, `description`, `amount`, `type`
(`income` \| `expense`). Optional: `category`, `payment_method`, `reference_id`, `notes`.

**`invoices.csv`** — required: `invoice_number`, `customer_name`, `invoice_date`,
`due_date`, `total_amount`. Optional: `paid_amount`, `status`
(`draft` \| `sent` \| `paid` \| `overdue` \| `cancelled`), `customer_email`, `notes`.

**`expenses.csv`** — required: `date`, `description`, `amount`. Optional:
`category`, `vendor`, `payment_method`, `recurring` (`true`/`false`), `notes`.

**`gst.csv`** — required: `period`, `due_date`, `tax_amount`. Optional:
`period_start`, `period_end`, `taxable_turnover`, `paid_amount`, `status`
(`pending` \| `filed` \| `paid` \| `overdue`), `reference_number`, `notes`.

**`loans.csv`** — required: `lender`, `principal_amount`. Optional: `loan_type`,
`outstanding_amount`, `interest_rate`, `emi_amount`, `start_date`, `end_date`,
`next_emi_date`, `status` (`active` \| `closed` \| `defaulted`).

---

## Load into MongoDB (recommended: API import)

The import pipeline validates headers, types and business rules, stamps
`business_id` from the logged-in user, and skips in-file / in-DB duplicates.
That is safer than `mongoimport` because the CSVs do **not** contain
`business_id` (the API derives it from the dummy user).

Prerequisites: API running at `http://localhost:8000` with a real MongoDB
(Atlas or local). See [LOCAL_LAPTOP_SETUP.md](../LOCAL_LAPTOP_SETUP.md).

### 1. Create the dummy user (once)

```bash
curl -s -X POST http://localhost:8000/api/auth/register \
  -H "Content-Type: application/json" \
  -d '{
    "email": "owner@acmeindustries.com",
    "password": "demo12345",
    "business_name": "Acme Industries Pvt. Ltd.",
    "owner_name": "Rajesh Sharma",
    "business_type": "Private Limited",
    "industry": "Manufacturing"
  }'
```

If the email already exists, skip this step and log in instead.

### 2. Log in and capture the access token

```bash
TOKEN=$(curl -s -X POST http://localhost:8000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"owner@acmeindustries.com","password":"demo12345"}' \
  | python3 -c "import sys,json; print(json.load(sys.stdin)['data']['access_token'])")
```

### 3. Upload each CSV

From the **repository root**:

```bash
curl -s -X POST http://localhost:8000/api/transactions/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-data/transactions.csv"

curl -s -X POST http://localhost:8000/api/invoices/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-data/invoices.csv"

curl -s -X POST http://localhost:8000/api/expenses/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-data/expenses.csv"

curl -s -X POST http://localhost:8000/api/gst/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-data/gst.csv"

curl -s -X POST http://localhost:8000/api/loans/import \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@sample-data/loans.csv"
```

Each response looks like:

```json
{
  "success": true,
  "message": "Import complete",
  "data": {
    "import_type": "transactions",
    "total_rows": 201,
    "successful_rows": 201,
    "failed_rows": 0,
    "duplicates": 0,
    "errors": []
  }
}
```

Re-running the same files is idempotent: already-imported rows are counted as
`duplicates` and skipped.

### 4. Sign in on the frontend

Open `http://localhost:5173/login` with `owner@acmeindustries.com` /
`demo12345`. Dashboard, invoices, GST and loans should show the dummy books.

To refresh forecast / risk / loan-readiness / recommendations / alerts after
import:

```bash
for path in forecast/generate risk/analyze loan-readiness/analyze recommendations/generate; do
  curl -s -X POST "http://localhost:8000/api/$path" \
    -H "Authorization: Bearer $TOKEN"
done
```

---

## Load with `mongoimport` (direct)

Use this only if you need the documents in MongoDB **without** going through
the API. You must still create the dummy user first (step 1 above) so
`users` and `businesses` exist with a bcrypt hash — do **not** insert a
plaintext password.

Look up the business id:

```bash
mongosh "$MONGODB_URI" --quiet --eval '
  const db = db.getSiblingDB("aicfo");
  const u = db.users.findOne({ email: "owner@acmeindustries.com" });
  print(u.business_id);
'
```

Then import. Dates stay as strings unless you convert them; the API import
path above is preferred for that reason. Example for transactions after you
have added a `business_id` column (ObjectId hex) to a working copy of the CSV:

```bash
mongoimport --uri "$MONGODB_URI" --db aicfo --collection transactions \
  --type csv --headerline --file sample-data/transactions.csv
```

Collections:

| CSV | `--collection` |
|---|---|
| `transactions.csv` | `transactions` |
| `invoices.csv` | `invoices` |
| `expenses.csv` | `expenses` |
| `gst.csv` | `gst_records` |
| `loans.csv` | `loans` |

Without `business_id` on every row, the app will never return these documents
(every query is tenant-scoped). Prefer the API import.

---

## Alternative: generator script (no CSVs)

To seed the **same dummy user** with randomly generated records through the
service layer instead of these files:

```bash
cd backend
DEMO_MODE=true python -m scripts.generate_demo_data --yes
```

That wipes existing demo collections for the business when `--reset` is passed.
It does not read the CSVs in this folder.

---

## Notes

- Max import size is 10 MB / 10 000 rows (`MAX_IMPORT_ROWS`).
- Duplicate keys: transactions (`date` + `description` + `amount` + `type`),
  invoices (`invoice_number`), expenses (`date` + `description` + `amount` +
  `category`), GST (`period`), loans (`lender` + `loan_type` + `start_date`).
- Never point these dummy credentials at a production cluster that holds real
  customer data.
