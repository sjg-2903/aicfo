"""AI CFO agent — chat, analysis and recommendations.

All numbers come from the deterministic analytics engines. The LLM (Gemini) is
used only to *explain* these trusted calculations; without an API key the agent
produces deterministic explanations from the same context.
"""

import json
import logging
from datetime import datetime
from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import llm
from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import compute_financial_metrics
from app.core.constants import COLLECTIONS
from app.ml.forecast import generate_forecast
from app.ml.loan_readiness import compute_loan_readiness
from app.ml.risk import analyze_risk
from app.utils.dates import utcnow
from app.utils.format import inr, pct
from app.utils.serialize import serialize_docs, serialize_doc

logger = logging.getLogger(__name__)

SYSTEM_PROMPT = (
    "You are the AI CFO assistant for an Indian MSME. Explain the provided "
    "financial data clearly and give practical, specific advice. Only use the "
    "numbers provided in the context; never invent figures. Be concise."
)


async def build_context(db: AsyncIOMotorDatabase, business_id: Any) -> dict:
    metrics = await compute_financial_metrics(db, business_id)
    health = await compute_health_score(db, business_id)
    risk = await analyze_risk(db, business_id)
    readiness = await compute_loan_readiness(db, business_id)

    forecast_summary = None
    try:
        forecast = await generate_forecast(db, business_id, days=30)
        forecast_summary = {
            "model": forecast["model"],
            "confidence": forecast["confidence"],
            "predicted_net_cash_flow": forecast["summary"]["predicted_net_cash_flow"],
            "min_daily_net": forecast["summary"]["min_daily_net"],
        }
    except Exception:
        pass

    recent_txns = await db[COLLECTIONS["transactions"]].find(
        {"business_id": business_id}
    ).sort("date", -1).limit(8).to_list(length=None)

    receivables = await db[COLLECTIONS["invoices"]].find(
        {"business_id": business_id, "status": {"$in": ["sent", "overdue"]}}
    ).sort("due_date", 1).limit(5).to_list(length=None)

    expenses = await db[COLLECTIONS["expenses"]].find(
        {"business_id": business_id}
    ).sort("date", -1).limit(5).to_list(length=None)

    return {
        "metrics": metrics,
        "health": health,
        "risk": risk,
        "loan_readiness": readiness,
        "forecast": forecast_summary,
        "recent_transactions": serialize_docs(recent_txns),
        "top_receivables": serialize_docs(receivables),
        "recent_expenses": serialize_docs(expenses),
    }


def _deterministic_answer(question: str, ctx: dict) -> str:
    q = question.lower()
    m = ctx["metrics"]
    h = ctx["health"]
    r = ctx["risk"]
    lr = ctx["loan_readiness"]
    f = ctx["forecast"]

    if any(k in q for k in ("health", "doing", "summary", "overview", "score")):
        return (
            f"Here's a snapshot of your business:\n\n"
            f"• Revenue (this month): {inr(m['revenue']['current'])}"
            + (f" ({m['revenue']['change_pct']:+.1f}% vs last month)" if m["revenue"]["change_pct"] is not None else "")
            + f"\n• Expenses: {inr(m['expenses']['current'])}"
            + (f" ({m['expenses']['change_pct']:+.1f}% vs last month)" if m["expenses"]["change_pct"] is not None else "")
            + f"\n• Net profit: {inr(m['net_profit']['current'])}"
            + f"\n• Cash balance: {inr(m['cash_balance']['current'])}"
            + f"\n• Outstanding receivables: {inr(m['receivables']['outstanding'])} (overdue {inr(m['receivables']['overdue'])})"
            + f"\n• Outstanding debt: {inr(m['debt']['outstanding'])} (monthly EMI {inr(m['debt']['monthly_emi'])})"
            + f"\n\nFinancial health score: {h['score']}/100 ({h['label']}). "
            + h["interpretation"]
        )

    if "cash" in q and ("flow" in q or "shortage" in q or "forecast" in q):
        if f:
            return (
                f"Cash-flow outlook (30 days, {f['model']} model, {f['confidence']} confidence):\n\n"
                f"• Predicted net cash flow: {inr(f['predicted_net_cash_flow'])}\n"
                f"• Minimum daily net flow: {inr(f['min_daily_net'])}\n"
                + (f"\n⚠️ Watch item: forecast shows a shortfall on some days. Accelerate collections or arrange a credit line."
                   if f["min_daily_net"] < 0 else "\nNo projected cash shortfall over the horizon.")
            )
        return "There isn't enough transaction history to build a reliable cash-flow forecast yet."

    if "owe" in q or "receivab" in q or "invoice" in q:
        if not ctx["top_receivables"]:
            return "You have no outstanding receivables right now."
        lines = ["Your largest outstanding receivables:"]
        for inv in ctx["top_receivables"]:
            outstanding = max(0.0, inv.get("total_amount", 0) - inv.get("paid_amount", 0))
            lines.append(f"• {inv.get('customer_name')} — {inr(outstanding)} (due {inv.get('due_date', '')[:10]})")
        lines.append(f"\nTotal outstanding: {inr(m['receivables']['outstanding'])}.")
        return "\n".join(lines)

    if "expense" in q or "spend" in q or "cost" in q:
        if not ctx["recent_expenses"]:
            return "No expenses recorded yet."
        lines = ["Recent expenses:"]
        for e in ctx["recent_expenses"]:
            lines.append(f"• {e.get('date', '')[:10]} {e.get('description')} — {inr(e.get('amount', 0))}")
        lines.append(f"\nCurrent-month expenses: {inr(m['expenses']['current'])}.")
        return "\n".join(lines)

    if "loan" in q or "ready" in q or "borrow" in q:
        return (
            f"Loan readiness: {lr['readiness_score']}/100 ({lr['label']}).\n\n"
            + lr["overall_recommendation"]
            + "\n\n" + "\n".join(f"• {s}" for s in lr["improvement_suggestions"])
        )

    if "risk" in q:
        risks = r["risks"]
        if not risks:
            return f"No significant risks detected (risk score {r['risk_score']}/100)."
        lines = [f"You have {len(risks)} active risk(s) (risk score {r['risk_score']}/100, level {r['risk_level']}):"]
        for risk in risks:
            lines.append(f"\n• [{risk['severity'].upper()}] {risk['title']} — {risk['evidence']}\n  Recommended: {risk['recommended_action']}")
        return "\n".join(lines)

    if "profit" in q:
        return (
            f"Profitability this month:\n\n"
            f"• Revenue: {inr(m['revenue']['current'])}\n"
            f"• Expenses: {inr(m['expenses']['current'])}\n"
            f"• Net profit: {inr(m['net_profit']['current'])}"
            + (f"\n• Net margin: {pct(m['net_profit']['current'] / m['revenue']['current'] * 100)}" if m["revenue"]["current"] else "")
        )

    return (
        f"Based on your data — revenue {inr(m['revenue']['current'])} this month, "
        f"net profit {inr(m['net_profit']['current'])}, health score {h['score']}/100 — "
        f"your business is in {h['label'].lower()} shape. "
        f"Ask me about cash flow, receivables, expenses, risks, loans or your financial health."
    )


async def chat(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    message: str,
    session_id: Optional[str] = None,
) -> dict:
    now = utcnow()
    sessions = db[COLLECTIONS["chat_sessions"]]
    messages = db[COLLECTIONS["chat_messages"]]

    session = None
    if session_id:
        session = await sessions.find_one({"_id": ObjectId(session_id), "business_id": business_id})
    if not session:
        result = await sessions.insert_one(
            {"business_id": business_id, "created_at": now, "updated_at": now, "message_count": 0}
        )
        session = {"_id": result.inserted_id}

    await messages.insert_one(
        {"session_id": session["_id"], "business_id": business_id, "role": "user", "content": message, "created_at": now}
    )

    ctx = await build_context(db, business_id)

    answer = None
    if llm.is_available():
        user_prompt = (
            f"Business financial context (JSON):\n{json.dumps(ctx, default=str)}\n\n"
            f"User question: {message}\n\nExplain using only the provided numbers."
        )
        answer = await llm.complete(SYSTEM_PROMPT, user_prompt)
    if not answer:
        answer = _deterministic_answer(message, ctx)

    await messages.insert_one(
        {"session_id": session["_id"], "business_id": business_id, "role": "assistant", "content": answer, "created_at": utcnow()}
    )
    await sessions.update_one(
        {"_id": session["_id"]},
        {"$set": {"updated_at": utcnow()}, "$inc": {"message_count": 2}},
    )

    return {
        "session_id": str(session["_id"]),
        "message": {
            "role": "assistant",
            "content": answer,
            "timestamp": now,
        },
        "engine": "gemini" if answer and llm.is_available() else "deterministic",
        "suggested_follow_ups": [
            "What are my biggest risks?",
            "Am I ready for a loan?",
            "How is my cash flow?",
        ],
    }


async def analyze(db: AsyncIOMotorDatabase, business_id: Any) -> dict:
    ctx = await build_context(db, business_id)
    return {
        "generated_at": utcnow(),
        "metrics": ctx["metrics"],
        "financial_health": ctx["health"],
        "risk": ctx["risk"],
        "loan_readiness": ctx["loan_readiness"],
        "forecast": ctx["forecast"],
        "narrative": _deterministic_answer("summary", ctx),
    }


async def recommend(db: AsyncIOMotorDatabase, business_id: Any) -> dict:
    from app.services.recommendation_service import generate

    recs = await generate(db, business_id)
    ctx = await build_context(db, business_id)
    return {
        "generated_at": utcnow(),
        "recommendations": recs,
        "narrative": (
            f"Your financial-health score is {ctx['health']['score']}/100 ({ctx['health']['label']}) "
            f"with {ctx['risk']['summary']['active_risks']} active risk(s). "
            f"{len(recs)} recommendation(s) generated from your actual data."
        ),
    }
