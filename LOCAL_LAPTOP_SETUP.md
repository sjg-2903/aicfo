# Run AI CFO on your laptop

This is the shortest path from a fresh clone to a working app on your machine:
**React frontend** at `http://localhost:5173` talking to **FastAPI** at `http://localhost:8000`,
with data in **MongoDB Atlas** (recommended) or a local MongoDB container.

Secrets stay in `backend/.env`. Never commit that file.

---

## What you need

| Tool | Version | Why |
|------|---------|-----|
| Node.js | 18+ | Frontend (Vite) |
| Python | 3.11+ | Backend |
| Git | any | Clone |
| MongoDB | Atlas **or** Docker `mongo:7` | Persistence |

Optional: [Docker Desktop](https://www.docker.com/products/docker-desktop/) if you prefer a local Mongo instead of Atlas.

---

## 1. Clone

```bash
git clone <repository-url>
cd aicfo
```

---

## 2. MongoDB Atlas URI (recommended)

1. Sign in at [cloud.mongodb.com](https://cloud.mongodb.com) and create a **free M0** cluster.
2. **Database Access** → add a user (password auth). Copy the password; URL-encode it if it contains `@`, `#`, `/`, or `%`.
3. **Network Access** → add your current IP (or `0.0.0.0/0` only for personal laptop experiments).
4. **Connect** → **Drivers** → copy the URI.

Example (placeholders only):

```
mongodb+srv://<user>:<password>@<cluster>.mongodb.net/aicfo?retryWrites=true&w=majority
```

The database name in the path (`aicfo`) should match `MONGODB_DB_NAME`.

### Local Mongo instead of Atlas

```bash
cd backend
docker compose up -d mongo
# then in backend/.env:
# MONGODB_URI=mongodb://localhost:27017
```

---

## 3. Backend `.env`

```bash
cd backend
cp .env.example .env
```

Edit `backend/.env`:

```env
MONGODB_URI=mongodb+srv://<user>:<password>@<cluster>.mongodb.net/aicfo?retryWrites=true&w=majority
MONGODB_DB_NAME=aicfo
JWT_SECRET=pick-a-long-random-string
CORS_ORIGINS=http://localhost:5173,http://localhost:3000
ENVIRONMENT=development
```

Leave `GEMINI_API_KEY` empty unless you want Gemini explanations in the AI CFO chat.

---

## 4. Start the API

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate
pip install -r requirements-dev.txt
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
```

Check:

- Health: [http://localhost:8000/health](http://localhost:8000/health)
- Swagger: [http://localhost:8000/docs](http://localhost:8000/docs)

If ping fails, the URI, password encoding, or Atlas IP allow-list is wrong.

**No Mongo at all?** Dev-only in-memory engine:

```bash
python -m scripts.serve_demo
```

---

## 5. Start the frontend

In a second terminal, from the repo root:

```bash
cp .env.example .env    # VITE_API_BASE_URL=http://localhost:8000
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) → Register a business → Dashboard.

---

## 6. Optional demo seed

Only when you explicitly want synthetic MSME data in Atlas / local Mongo:

```bash
cd backend
source .venv/bin/activate
DEMO_MODE=true python -m scripts.generate_demo_data --yes
```

---

## All-in-one Docker backend

```bash
cd backend
cp .env.example .env
docker compose up --build
```

This starts **local Mongo + API**. To use Atlas instead, comment out the `mongo` service dependency in compose and set `MONGODB_URI` in `.env` to your `mongodb+srv://…` string, then run uvicorn (or a compose override) with that env.

---

## Troubleshooting

| Symptom | Fix |
|---------|-----|
| `ServerSelectionTimeoutError` | Atlas IP allow-list, DNS (`dnspython` is in `requirements.txt`), or bad URI |
| Auth failed on Mongo | Password URL-encoded; user exists on the cluster |
| Frontend 401 / CORS | `CORS_ORIGINS` includes `http://localhost:5173`; API running |
| Port 8000 or 5173 in use | `uvicorn … --port 8001` and update `VITE_API_BASE_URL` / `npm run dev -- --port 5174` |
| `.env` not loaded | Run uvicorn with cwd `backend/` so `env_file=".env"` resolves |

---

## Related docs

- [backend/README.md](backend/README.md) — API architecture, engines, tests
- [QUICK_START.md](QUICK_START.md) — frontend-only walkthrough
- [API_DOCUMENTATION.md](API_DOCUMENTATION.md) — REST contracts
