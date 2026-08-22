# OpenAI or Google Gemini setup

The AI CFO can use **OpenAI** or **Google Gemini** for grounded explanations,
summary text, recommendations, chat, and image understanding. The provider is
optional: all financial calculations and rules continue to work through the
trusted deterministic Python engines when no API key is configured.

## Data and security model

- API keys are stored only in `backend/.env` or the deployment secret manager.
- Keys must never use a `VITE_` prefix; Vite variables are shipped to browsers.
- Prompts contain relevant stored business context, so review your selected
  provider's data-processing and retention terms before enabling it.
- The provider explains already-calculated results. It does not own financial
  metrics, forecasts, health/risk scores, or deterministic rules.
- Provider failures, timeouts, rate limits, and malformed responses fall back
  to deterministic output instead of failing the finance workflow.
- Attached images are sent only for image understanding. This app does not
  expose provider image generation.

## Configure OpenAI

1. Create an API key in the OpenAI platform.
2. Copy `backend/.env.example` to `backend/.env` if needed.
3. Add:

```dotenv
LLM_PROVIDER=openai
OPENAI_API_KEY=your_openai_api_key
OPENAI_MODEL=gpt-4.1-mini
LLM_TIMEOUT_SECONDS=90
LLM_MAX_RETRIES=2
```

`OPENAI_BASE_URL` defaults to `https://api.openai.com/v1`. It can be changed
for an explicitly trusted OpenAI-compatible endpoint. The selected model needs
chat support and must support images if attachment understanding is required.

## Configure Google Gemini

1. Create a Gemini API key in Google AI Studio (or the applicable Google API
   console for your account).
2. Copy `backend/.env.example` to `backend/.env` if needed.
3. Add:

```dotenv
LLM_PROVIDER=gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-2.5-flash
LLM_TIMEOUT_SECONDS=90
LLM_MAX_RETRIES=2
```

`GEMINI_BASE_URL` defaults to
`https://generativelanguage.googleapis.com/v1beta`. The key is sent in the
`x-goog-api-key` request header, not in the URL.

## Automatic selection

You can use:

```dotenv
LLM_PROVIDER=auto
```

In `auto` mode, the backend uses OpenAI when `OPENAI_API_KEY` is configured;
otherwise it uses Gemini when `GEMINI_API_KEY` is configured. If both keys are
present, OpenAI is selected. For predictable production behavior, explicitly
set `LLM_PROVIDER=openai` or `LLM_PROVIDER=gemini`.

## Docker Compose

The included `backend/docker-compose.yml` passes the provider settings through
to the backend container. Export the key before starting the stack, for example:

```bash
cd backend
export LLM_PROVIDER=gemini
export GEMINI_API_KEY='your-key'
docker compose up --build
```

Use your platform's secret manager in production instead of a plaintext env
file or a committed Compose override.

## Verify the integration

1. Restart the FastAPI backend after changing environment variables.
2. Log in normally and open **AI CFO Assistant**.
3. Ask a question such as “Summarize my cash-flow risks.”
4. A provider-backed response is labeled **AI CFO (OpenAI)** or
   **AI CFO (Google Gemini)**. Without a configured provider, it is labeled
   **Financial analysis** and uses the deterministic fallback.

You can also verify configuration without making a provider request:

```bash
cd backend
python - <<'PY'
from app.agents.llm import active_provider
print("Active provider:", active_provider() or "deterministic fallback")
PY
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| Responses say `Financial analysis` | Key missing, wrong `LLM_PROVIDER`, or model name empty | Check `backend/.env`, restart the backend, and run the verification snippet |
| HTTP 401/403 in backend logs | Invalid/revoked key or provider access restriction | Create a valid key and verify project/account permissions |
| HTTP 429 | Provider quota or rate limit reached | Check billing/quota; requests are retried within `LLM_MAX_RETRIES` before fallback |
| Timeout or HTTP 5xx | Temporary provider/network issue | The app falls back safely; retry later or adjust `LLM_TIMEOUT_SECONDS` |
| Text works but image review falls back | Selected model lacks image input support | Choose a vision-capable OpenAI or Gemini model |
| Docker does not see the key | Variable was not exported into Compose | Export it before `docker compose up` or configure a deployment secret |

The backend logs only provider names and coarse failure reasons. It does not log
API keys, prompts, attachments, or provider response bodies.
