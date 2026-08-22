# AI CFO & Financial Advisor for MSMEs — Backend

Production REST API for the **AI CFO & Financial Advisor for MSMEs** platform.
Built with **Python 3.11 · FastAPI · Pydantic v2 · Motor (async MongoDB) ·
pandas · NumPy · scikit-learn** (Prophet optional). Connects to the React
frontend through real REST APIs — no mock endpoints, no dummy calculations.

---

## Table of contents

1. [Features](#features)
2. [Architecture](#architecture)
3. [Quick start (Docker)](#quick-start-docker)
4. [Quick start (virtualenv)](#quick-start-virtualenv)
5. [MongoDB Atlas configuration](#mongodb-atlas-configuration)
6. [Environment variables](#environment-variables)
7. [Authentication & multi-tenancy](#authentication--multi-tenancy)
8. [API overview](#api-overview)
9. [Response conventions](#response-conventions)
10. [CSV imports](#csv-imports)
11. [Financial engines](#financial-engines)
12. [AI CFO & AI providers](#ai-cfo--ai-providers)
13. [Demo mode & demo data](#demo-mode--demo-data)
14. [Testing](#testing)
15. [Frontend integration notes](#frontend-integration-notes)
16. [Production notes](#production-notes)

---

## Features

- **JWT auth** — bcrypt password hashing, access + refresh tokens, expiry,
  logout revocation (token versioning), protected routes.
- **Role-based access control** — `BUSINESS_OWNER` and `ADMIN`.
- **Strict multi-tenancy** — the authorized business is always derived from
  the authenticated user; a client-supplied `business_id` is never trusted.
- **Real MongoDB persistence** — collections `users`, `businesses`,
  `transactions`, `invoices`, `expenses`, `gst_records`, `loans`, `forecasts`,
  `risk_assessments`, `recommendations`, `alerts`, `chat_sessions`,
  `chat_messages`, `audit_logs`, with proper indexes.
- **Deterministic Financial Health Engine** — transparent 0–100 score.
- **30-day cash-flow forecasting** — Prophet when available, scikit-learn /
  statistical fallback, explicit limited-confidence handling.
- **Risk Engine, Loan Readiness Engine, Recommendation Engine, Alert Engine.**
- **CSV import** for transactions, invoices, expenses, GST and loans with full
  validation, normalization, duplicate detection and error reporting.
- **AI CFO** chat / analyze / recommend endpoints (LLM optional).
- **`/health`** for load-balancer / orchestrator health checks.
- **Automatic OpenAPI/Swagger** at `/docs`.

---

## Architecture

```
backend/
├── app/
│   ├── main.py                # FastAPI app, CORS, exception handlers, lifespan
│   ├── api/
│   │   ├── deps.py            # get_db, get_current_user, get_current_business, require_role
│   │   ├── response.py        # consistent {success, message, data} envelope
│   │   └── routes/            # one router per domain
│   ├── core/                  # config, security (JWT/bcrypt), errors, logging
│   ├── db/                    # MongoDB connection + index definitions
│   ├── models/                # internal domain entities (dataclasses)
│   ├── schemas/               # Pydantic request/response models
│   ├── services/              # CRUD + import + audit + domain services
│   ├── analytics/             # metrics, financial health, cash flow
│   ├── ml/                    # forecast, risk, loan readiness, recommendations
│   ├── agents/                # AI CFO orchestration + LLM client
│   └── utils/                 # dates, pagination, serialization, formatting
├── scripts/
│   ├── generate_demo_data.py  # synthetic demo-data generator (Demo Mode only)
│   └── serve_demo.py          # dev-only server on an in-memory Mongo engine
├── tests/                     # pytest suite (70 tests)
├── Dockerfile
├── docker-compose.yml
├── requirements.txt / requirements-dev.txt
└── .env.example
```

**End-to-end flow:** authenticated user → business identification →
MongoDB retrieval → deterministic financial calculations → forecasting/risk
analysis → specialized agent APIs → recommendation generation → optional
LLM explanation → JSON response → React frontend.

---

## Quick start (Docker)

```bash
cd backend
cp .env.example .env            # fill in a strong JWT_SECRET
docker compose up --build
```

- API: `http://localhost:8000`
- Swagger: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`

Seed demo data (only when explicitly enabled):

```bash
DEMO_MODE=true docker compose run --rm backend python -m scripts.generate_demo_data --yes
```

---

## Quick start (virtualenv)

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements-dev.txt
cp .env.example .env            # set MONGODB_URI and JWT_SECRET

# start a local MongoDB (e.g. `docker run -p 27017:27017 mongo:7`)
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

> No MongoDB available? For **local development only**, run the API against an
> in-memory, API-compatible engine and pre-seed demo data:
> `python -m scripts.serve_demo`. The application logic is identical; only the
> database engine is swapped. Production always uses real MongoDB.

---

## MongoDB Atlas configuration

Full laptop walkthrough: **[../LOCAL_LAPTOP_SETUP.md](../LOCAL_LAPTOP_SETUP.md)**.

1. Create a cluster at [cloud.mongodb.com](https://cloud.mongodb.com).
2. Create a database user with least-privilege access to a single database
   (e.g. `aicfo`).
3. Allow-list your application's IP (or use VPC peering/private endpoint).
4. Copy `backend/.env.example` → `backend/.env` and set `MONGODB_URI` to the
   Atlas connection string (`dnspython` is required for `mongodb+srv://` and
   is listed in `requirements.txt`):

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/aicfo?retryWrites=true&w=majority
```

URL-encode special characters in the password. Indexes are created
automatically at startup (`app/db/indexes.py`).

---

## Environment variables

| Variable | Description | Default |
|---|---|---|
| `MONGODB_URI` | MongoDB connection string | `mongodb://localhost:27017` |
| `MONGODB_DB_NAME` | Database name | `aicfo` |
| `JWT_SECRET` | HMAC secret for JWTs | insecure dev default |
| `JWT_ALGORITHM` | JWT algorithm | `HS256` |
| `ACCESS_TOKEN_EXPIRE_MINUTES` | Access token TTL | `30` |
| `REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token TTL | `7` |
| `LLM_PROVIDER` | `auto`, `openai`, or `gemini` | `auto` |
| `OPENAI_API_KEY` | Backend-only OpenAI API key | *(empty)* |
| `OPENAI_MODEL` | OpenAI chat/vision model | `gpt-4.1-mini` |
| `OPENAI_BASE_URL` | OpenAI API base URL | `https://api.openai.com/v1` |
| `GEMINI_API_KEY` | Backend-only Google Gemini API key | *(empty)* |
| `GEMINI_MODEL` | Gemini chat/vision model | `gemini-2.5-flash` |
| `GEMINI_BASE_URL` | Gemini API base URL | Google Generative Language v1beta |
| `LLM_TIMEOUT_SECONDS` | Bounded timeout for one provider request | `90` |
| `LLM_MAX_RETRIES` | Retries for transient provider failures (0–5) | `2` |
| `ENVIRONMENT` | `development` / `production` | `development` |
| `CORS_ORIGINS` | Comma-separated allowed origins | `http://localhost:5173,...` |
| `ADMIN_EMAILS` | Emails granted the `ADMIN` role | *(empty)* |
| `DEMO_MODE` | Enable demo-data seeding | `false` |
| `MAX_IMPORT_ROWS` | Max rows per CSV import | `10000` |
| `FORECAST_MIN_HISTORY_DAYS` | Min days for trend model | `14` |

Never commit `.env` (it is git-ignored).

---

## Authentication & multi-tenancy

- **Register** creates a `BUSINESS_OWNER` user **and** a business. Emails in
  `ADMIN_EMAILS` are created as `ADMIN` (no business attached).
- Access tokens carry `sub`, `role`, `ver` (token version) and `exp`.
- **Logout** bumps the user's `token_version`, invalidating all outstanding
  tokens — no server-side session store required.
- Every business-scoped endpoint resolves the business from
  `user.business_id`; the client can never select another tenant's data.

---

## API overview

Prefix: `/api`. Full interactive docs at `/docs`.

| Domain | Endpoints |
|---|---|
| Auth | `POST /auth/register`, `POST /auth/login`, `POST /auth/refresh`, `POST /auth/logout`, `GET /auth/me` |
| Business | `GET /business`, `PUT /business` |
| Dashboard | `GET /dashboard/summary`, `/financial-health`, `/revenue-trend`, `/cash-flow-trend`, `/expense-distribution`, `/receivables-aging`, `/loan-overview`, `/forecast-30day` |
| Transactions | `GET/POST /transactions`, `PUT/DELETE /transactions/{id}`, `POST /transactions/import` |
| Invoices | `GET/POST /invoices`, `PUT/DELETE /invoices/{id}`, `GET /invoices/overdue`, `PUT …/mark-paid`, `PUT …/send`, `POST /invoices/import` |
| Expenses | `GET/POST /expenses`, `PUT/DELETE /expenses/{id}`, `GET /expenses/categories`, `POST /expenses/import` |
| GST | `GET/POST /gst`, `GET/PUT/DELETE /gst/{id}`, `GET /gst/obligations/upcoming`, `/overdue`, `PUT …/mark-filed`, `POST /gst/import` |
| Loans | `GET/POST /loans`, `PUT/DELETE /loans/{id}`, `GET /loans/{id}/emi-schedule`, `PUT …/mark-emi-paid`, `POST /loans/import` |
| Forecast | `GET /forecast/cashflow`, `POST /forecast/generate` |
| Risk | `GET /risk`, `POST /risk/analyze`, `PUT /risk/{id}/acknowledge`, `/resolve` |
| Loan readiness | `GET /loan-readiness`, `POST /loan-readiness/analyze` |
| Recommendations | `GET /recommendations`, `GET /recommendations/summary`, `POST /recommendations/generate`, `PUT …/acknowledge`, `/complete`, `/dismiss` |
| Alerts | `GET /alerts`, `PATCH /alerts/{id}/read` |
| AI CFO | `POST /ai-cfo/chat`, `POST /ai-cfo/chat/file`, `POST /ai-cfo/analyze`, `POST /ai-cfo/recommend` |
| Reports | `GET /reports/financial-summary`, `/cashflow`, `/risk` |
| Health | `GET /health` |

---

## Response conventions

Every response is JSON. Success:

```json
{ "success": true, "message": "OK", "data": { } }
```

Paginated endpoints additionally return `page`, `limit`, `total` and `pages`:

```json
{ "success": true, "message": "OK", "data": [ … ], "page": 1, "limit": 20, "total": 150, "pages": 8 }
```

Errors (consistent, no stack traces, no secrets):

```json
{ "success": false, "message": "Resource not found", "error_code": "NOT_FOUND" }
```

---

## CSV imports

`POST /{domain}/import` accepts a `multipart/form-data` CSV file. The pipeline:

1. **File type** — only `.csv`, ≤ 10 MB.
2. **Headers** — required columns validated case-insensitively.
3. **Data types** — dates parsed as ISO-8601, amounts numeric.
4. **Business rules** — positive amounts, valid `type`/`status` enums,
   `due_date ≥ invoice_date`, interest rate 0–100, etc.
5. **Normalization** — trimming, currency symbols, numeric coercion.
6. **Duplicates** — detected in-file and against existing DB records.
7. **Insert** valid records; reject invalid ones.

Response:

```json
{ "import_type": "transactions", "total_rows": 100, "successful_rows": 94,
  "failed_rows": 4, "duplicates": 2, "errors": [ { "row": 12, "field": "amount", "message": "…" } ] }
```

---

## Financial engines

All critical calculations are **deterministic Python** — never delegated to an
LLM.

- **Metrics** — revenue/expenses/profit from transactions; receivables from
  unpaid invoice values; debt/EMI from loans; cash balance from actual
  inflows minus outflows.
- **Financial Health (0–100)** — weighted factors: profitability (0.20),
  revenue stability (0.15), expense ratio (0.15), cash reserves (0.10),
  receivable health (0.10), debt pressure (0.10), EMI burden (0.10),
  GST compliance (0.05), cash-flow stability (0.05).
- **Forecasting** — daily inflow/outflow series → Prophet (if installed and
  ≥30 days of data) → scikit-learn linear trend (≥14 days) → moving-average
  fallback with `confidence: "low"` and a documented note. Forecasts are
  stored in MongoDB with predicted inflow/outflow/net, confidence bounds,
  model and `generated_at`.
- **Risk Engine** — cash-flow, overdue-receivable, abnormal-expense,
  debt-pressure, GST-obligation, profitability-decline and liquidity risks,
  each with severity, evidence, impact and recommended action.
- **Loan Readiness (0–100)** — configurable weights (`ml/loan_readiness.py`).
- **Recommendation & Alert Engines** — rule-based over the same trusted data.

---

## AI CFO & AI providers

`POST /api/ai-cfo/chat` stores the local conversation (`chat_sessions`,
`chat_messages`) and answers from real context gathered by the financial
engines. OpenAI and Google Gemini are supported as optional narrative providers.

### Configure OpenAI or Gemini

See [AI_PROVIDER_SETUP.md](../AI_PROVIDER_SETUP.md) for provider keys, model
selection, security guidance, Docker setup, verification, and troubleshooting.
A minimal OpenAI configuration is:

```env
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
```

A minimal Gemini configuration is:

```env
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
```

Restart the API after changing configuration. Calls happen server-side and API
keys are never returned to the frontend. Providers are used only for
explanations, summaries, insights, chat, and attachment understanding.
Financial metrics, forecasts, scores, and recommendation rules remain trusted
Python calculations. Missing keys, timeouts, rate limits, malformed responses,
and other provider failures automatically use deterministic output.

Image generation is not part of the AI CFO API. Image attachments are available
only for understanding an image when the selected model supports image input.

---

## Demo mode & demo data

`scripts/generate_demo_data.py` creates fully synthetic MSME data and pushes
it through the **same service + MongoDB pipeline** as normal data. It runs only
when `DEMO_MODE=true` or `--yes` is passed, and seeds the derived analytics
(forecast, risk, readiness, alerts) too.

```bash
DEMO_MODE=true python -m scripts.generate_demo_data --yes
```

---

## Testing

```bash
cd backend
pip install -r requirements-dev.txt
pytest
```

The suite (96 tests) covers authentication, RBAC, business isolation, CRUD for
every domain, CSV imports (valid/invalid/duplicate), forecasting, risk, loan
readiness, recommendations, alerts, AI CFO and the health endpoint.

> Tests run against `mongomock_motor` (an in-memory, API-compatible Mongo
> engine) so no server is required; the production app uses real MongoDB. To
> run against a real MongoDB instead, point `MONGODB_URI` at a local instance
> and adjust `tests/conftest.py`.

---

## Frontend integration notes

The React frontend lives in the parent directory. Its `src/services/*` modules
already define the client contracts. Two things to note when wiring them:

1. The API wraps payloads in `{success, message, data}` (errors in
   `{success:false, message, error_code}`). A one-line unwrap in the shared
   axios client (`src/lib/axios.ts`) maps these to the shapes the services
   expect.
2. Pagination uses `page`/`limit` query params and returns `page`, `limit`,
   `total`, `pages`.

---

## Production notes

- Run behind a reverse proxy / load balancer; use `/health` for health checks.
- CORS is restricted to the configured frontend origin(s).
- Use a strong `JWT_SECRET` and inject all secrets via environment/secret
  manager — never commit them.
- The container runs as a non-root user and exposes only port 8000 internally.
