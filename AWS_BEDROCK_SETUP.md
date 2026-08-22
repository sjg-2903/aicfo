# AWS Bedrock Setup Guide

This project uses **Amazon Bedrock** (instead of xAI Grok) as the optional AI
narrative layer for the AI CFO assistant. Bedrock explains already-calculated
financial numbers, writes summaries and insights, and answers chat questions.
All financial calculations, forecasts, risk scores, and recommendation rules
stay deterministic in Python — if Bedrock is not configured or a call fails,
the app automatically falls back to trusted deterministic explanations.

This guide walks you through everything: creating an AWS account, enabling a
model, getting an API key (access key), and configuring the backend.

---

## Contents
1. [How Bedrock is used in this app](#how-bedrock-is-used-in-this-app)
2. [Prerequisites](#prerequisites)
3. [Step 1 — Create an AWS account](#step-1--create-an-aws-account)
4. [Step 2 — Enable model access in Amazon Bedrock](#step-2--enable-model-access-in-amazon-bedrock)
5. [Step 3 — Get your API key (IAM access key)](#step-3--get-your-api-key-iam-access-key)
6. [Step 4 — Configure the backend](#step-4--configure-the-backend)
7. [Step 5 — Pick a model ID](#step-5--pick-a-model-id)
8. [Step 6 — Verify the integration](#step-6--verify-the-integration)
9. [Cost overview](#cost-overview)
10. [Privacy & security notes](#privacy--security-notes)
11. [Troubleshooting](#troubleshooting)

---

## How Bedrock is used in this app

| Capability | Who does it |
|---|---|
| Financial health scores, forecasts, risk, loan readiness, recommendation rules | **Deterministic Python engines** (always) |
| Natural-language explanations, executive summaries, dashboard insights | **AWS Bedrock** (optional) |
| AI CFO chat answers (including image attachments) | **AWS Bedrock** (optional, with deterministic fallback) |

Every AI response is grounded in already-calculated data. The API reports
which engine produced each response via the `engine` field:
`"bedrock"` (AI narrative) or `"deterministic"` (local fallback).

---

## Prerequisites

- The backend running locally (`cd backend && uvicorn app.main:app --reload`)
  or via `docker compose`.
- An AWS account with access to the **AWS Management Console**.
- Region choice: Bedrock model availability differs per region. This guide
  uses **US East (N. Virginia) / `us-east-1`**, which has the broadest model
  support.

---

## Step 1 — Create an AWS account

1. Go to <https://aws.amazon.com/> and click **Create an AWS Account**.
2. Follow the sign-up flow (email, password, contact details, payment card).
   AWS requires a card, but nothing is charged until you use paid services —
   and this integration costs pennies at demo scale (see
   [Cost overview](#cost-overview)).
3. Sign in to the console at <https://console.aws.amazon.com/>.

> **Tip:** Avoid using root-account credentials for apps. You will create a
> dedicated IAM user in Step 3, which is the AWS equivalent of an "API key".

---

## Step 2 — Enable model access in Amazon Bedrock

Every Bedrock model must be **explicitly enabled** in your account before you
can call it. This is the step most people miss.

1. In the AWS Console, set the region selector (top-right) to **US East (N. Virginia)**.
2. Open the service **Amazon Bedrock** (search box → "Bedrock").
3. In the left sidebar, go to **Bedrock configurations → Model access**.
4. Click **Modify model access** (or "Enable specific models").
5. Select **Anthropic Claude Sonnet 4** (the default model this project uses).
   You can also tick additional Claude models — access is free to request;
   you only pay per usage.
6. For Anthropic models you must confirm the end-user license and, for some
   regions, provide use-case details. Choose **No** for "apply for
   provisional/PoC access" unless you want the free limited tier (full access
   is granted instantly for standard use cases).
7. Submit and wait for the status to change from **In progress** to
   **Access granted** (usually under a minute).

Optionally verify the model works: in the Bedrock console left sidebar open
**Playgrounds → Chat/text**, pick the model, and send a test message.

---

## Step 3 — Get your API key (IAM access key)

AWS doesn't use a single "API key" string like other AI providers. Instead you
use an **IAM access key** — a pair of values:

- `AWS_ACCESS_KEY_ID` (starts with `AKIA…`)
- `AWS_SECRET_ACCESS_KEY`

Create them for a dedicated least-privilege IAM user:

### Console path

1. Go to **IAM → Users → Create user**.
2. Name it e.g. `aicfo-bedrock`, and choose **"I want to create an IAM user"**
   (no console access needed — programmatic access only).
3. After creation, open the user → **Security credentials** tab.
4. Scroll to **Access keys** → **Create access key**.
5. Choose the use case **"Application running outside AWS"** (or
   "Command Line Interface (CLI)"), confirm the recommendation warning.
6. Copy **Access key ID** and **Secret access key** *now* — the secret is
   shown only once. (You can still activate/deactivate or rotate keys later.)

### Attach a least-privilege policy

The user only needs permission to call Bedrock models — nothing else. In the
IAM user → **Permissions** tab → **Add permissions → Create inline policy** →
JSON, paste:

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": ["bedrock:InvokeModel", "bedrock:InvokeModelWithResponseStream"],
      "Resource": "arn:aws:bedrock:*:::foundation-model/*"
    }
  ]
}
```

> **Never** put raw account keys in the code or commit them to Git. Treat the
> secret key like a password: store it in your local `.env` (which is
> git-ignored), your secret manager, or `~/.aws/credentials`.

### CLI alternative (if you have the AWS CLI installed)

```bash
aws iam create-user --user-name aicfo-bedrock
aws iam put-user-policy \
  --user-name aicfo-bedrock \
  --policy-name aicfo-bedrock-invoke \
  --policy-document '{"Version":"2012-10-17","Statement":[{"Effect":"Allow","Action":["bedrock:InvokeModel","bedrock:InvokeModelWithResponseStream"],"Resource":"arn:aws:bedrock:*:::foundation-model/*"}]}'
aws iam create-access-key --user-name aicfo-bedrock
```

---

## Step 4 — Configure the backend

All configuration lives in `backend/.env` (copy it from `backend/.env.example`).
Three credential options are supported — pick one:

### Option A — Access key in `.env` (simplest for laptops)

```env
AWS_ACCESS_KEY_ID=AKIA...your-key-id
AWS_SECRET_ACCESS_KEY=your-secret-access-key
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
BEDROCK_TIMEOUT_SECONDS=90
BEDROCK_MAX_RETRIES=2
```

`AWS_SESSION_TOKEN` is only needed for **temporary** credentials (e.g. from
SSO or an assumed role) — leave it empty for a normal IAM access key.

### Option B — Named profile (`~/.aws/credentials`)

If you already use the AWS CLI, add a profile to `~/.aws/credentials`:

```ini
[aicfo]
aws_access_key_id = AKIA...
aws_secret_access_key = ...
```

and reference it:

```env
AWS_PROFILE=aicfo
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-sonnet-4-20250514-v1:0
```

### Option C — IAM role (EC2 / ECS / EKS / Lambda)

When the backend runs inside AWS, attach an IAM role with the same
`bedrock:InvokeModel` policy and configure **nothing** — boto3 resolves role
credentials automatically.

After editing `.env`, restart the FastAPI backend. With Docker Compose, export
the variables in your shell first (`export AWS_ACCESS_KEY_ID=...` etc.) because
`backend/docker-compose.yml` forwards them from the environment.

Leave all credential variables empty to run in **deterministic-only mode** —
every feature keeps working with locally generated explanations.

---

## Step 5 — Pick a model ID

The default is `anthropic.claude-sonnet-4-20250514-v1:0` — strong at
financial reasoning, supports images (for invoice screenshot chat
attachments), and is cost-effective.

Set `BEDROCK_MODEL_ID` in `backend/.env` to switch. Common options (enable
them in the console first — see Step 2):

| Model | Model ID | Vision | Notes |
|---|---|---|---|
| Claude Sonnet 4 (default) | `anthropic.claude-sonnet-4-20250514-v1:0` | ✅ | Best all-rounder |
| Claude Sonnet 4.5 | `anthropic.claude-sonnet-4-5-20250929-v1:0` | ✅ | Newest Sonnet |
| Claude Haiku 4.5 | `anthropic.claude-haiku-4-5-20251001-v1:0` | ✅ | Cheapest/fastest |
| Amazon Nova Pro | `amazon.nova-pro-v1:0` | ✅ | AWS-first alternative |
| Amazon Nova Lite | `amazon.nova-lite-v1:0` | ✅ | Very cheap |
| Meta Llama 3.3 70B | `meta.llama3-3-70b-instruct-v1:0` | ❌ | Open-weights option |

**Cross-region inference profiles:** prefixing the ID with a geographic
prefix (e.g. `us.anthropic.claude-sonnet-4-20250514-v1:0`, `eu.…`, `apac.…`)
routes the request across a region set for higher throughput limits. The
Bedrock console shows the exact IDs: **Model access** page, or **Cross-region
inference** in the sidebar.

Notes:
- Model availability varies by region — enable the model in the **same
  region** as `AWS_REGION`.
- Chat attachments with images require a vision-capable model (✅ above).
  With a non-vision model, the app automatically falls back to locally
  extracted attachment text.

---

## Step 6 — Verify the integration

1. Start the backend and check the startup logs for errors.
2. Open the interactive API docs: <http://localhost:8000/docs>.
3. Log in through the app (or `POST /api/auth/login`) and ask the AI CFO a
   question, e.g. *"How is my cash flow?"*
4. In the chat response, `engine` should now be `"bedrock"` instead of
   `"deterministic"`. The same applies to recommendations — the summary badge
   shows **AI insights (AWS Bedrock)**.

Quick programmatic check with a temporary script:

```bash
cd backend
python - <<'PY'
import asyncio
from app.agents import llm
print("Bedrock available:", llm.is_available())
print(asyncio.run(llm.complete("You are a test.", "Say OK.")))
PY
```

`True` plus a model reply means credentials, region, and model access are all
correct. `False` means the credential chain resolved nothing — check Step 4.

---

## Cost overview

You pay per token, only for what you use (Bedrock on-demand pricing; no
subscription):

- Each AI CFO chat answer or summary costs a fraction of a US cent at Sonnet
  pricing (typical request ≈ 2–4k input tokens, ≤ 1–2k output tokens).
- A typical demo/development session with dozens of questions stays well
  under **US $1**.
- Set a **billing alarm** in AWS Budgets (console → Billing → Budgets) to get
  notified if spend crosses a threshold like $5/month.
- To stop all spend: set the credential variables empty (deterministic mode)
  and optionally deactivate the access key in IAM.

Current prices: <https://aws.amazon.com/bedrock/pricing/>

---

## Privacy & security notes

- **AWS does not use your Bedrock inputs/outputs to train foundation models**
  (see the Amazon Bedrock FAQ / AWS AI service terms for the legally binding
  wording).
- Prompts contain only *already-calculated* financial aggregates — never raw
  credentials or unrelated personal data.
- Keep the least-privilege IAM policy above; never grant `*:*` permissions.
- Rotate or delete access keys in IAM if a secret leaks (IAM → Users →
  Security credentials). Keys can be deactivated instantly without deleting.
- Check whether your organisation's Bedrock **model invocation logging** is
  enabled (account-level setting) if you must guarantee prompts are not
  logged to S3/CloudWatch.

---

## Troubleshooting

| Symptom / log line | Cause | Fix |
|---|---|---|
| `Bedrock request failed (AccessDeniedException)` | Model access not enabled, wrong region, or IAM policy missing | Redo [Step 2](#step-2--enable-model-access-in-amazon-bedrock) in the exact region of `AWS_REGION`; attach the policy from [Step 3](#step-3--get-your-api-key-iam-access-key) |
| `Bedrock request failed (ValidationException)` … `with model id` | Unknown/typo'd model ID, or inference-profile prefix not valid in that region | Use a model ID from the console **Model access** page ([Step 5](#step-5--pick-a-model-id)) |
| `Bedrock request failed (ThrottlingException)` | Account-level throttling | Already retried automatically (`BEDROCK_MAX_RETRIES`); switch to a `us.`/`eu.` cross-region inference profile |
| `Bedrock request failed (ExpiredTokenException)` | Temporary credentials expired | Refresh SSO login (`aws sso login`) or generate a new access key |
| `Bedrock request failed (EndpointConnectionError)` / region mismatch | `AWS_REGION` unset or model not offered there | Set `AWS_REGION` to the region where you enabled the model |
| `engine` stays `"deterministic"` | Credential chain resolved nothing, or `BEDROCK_MODEL_ID` empty | Run the check script from [Step 6](#step-6--verify-the-integration); verify `.env` is in `backend/` and the server was restarted |
| `NoCredentialsError` / profile not found | `AWS_PROFILE` names a missing profile | Check `~/.aws/credentials` spelling, or switch to Option A keys |
| Docker: AI features inactive | Compose didn't receive the variables | `export AWS_ACCESS_KEY_ID=… AWS_SECRET_ACCESS_KEY=… AWS_REGION=…` before `docker compose up` |

---

## Related docs

- [Root README](README.md) — project overview
- [Backend README](backend/README.md) — backend env variable reference
- [Local laptop setup](LOCAL_LAPTOP_SETUP.md) — full laptop environment guide
