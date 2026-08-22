"""Professional PDF financial report generation (reportlab).

A report is built from the business's real MongoDB data — metrics, health
score, monthly series, cash flow, expense distribution, GST, loans, risk and
AI recommendations — rendered as a branded PDF with charts drawn in vector
graphics. Generated PDFs are stored in the ``reports`` collection (scoped by
business) so they can be re-downloaded later and referenced from History.
"""

import json
import logging
import re
from datetime import datetime
from io import BytesIO
from typing import Any, Optional

from bson import Binary, ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.agents import llm
from app.analytics.financial_health import compute_health_score
from app.analytics.metrics import (
    compute_daily_cashflow,
    compute_financial_metrics,
    compute_monthly_series,
)
from app.core.constants import COLLECTIONS
from app.core.errors import NotFoundError
from app.ml.loan_readiness import compute_loan_readiness
from app.ml.recommendation import generate_dashboard_recommendations
from app.ml.risk import analyze_risk
from app.utils.dates import utcnow
from app.utils.format import inr, pct

logger = logging.getLogger(__name__)

REPORT_TYPES = ("comprehensive", "financial_summary", "cash_flow", "risk")

BRAND_BLUE = "#2563eb"
INK = "#0f172a"
SLATE = "#64748b"
LIGHT = "#f1f5f9"
GREEN = "#10b981"
RED = "#ef4444"
AMBER = "#f59e0b"

PRIORITY_COLORS = {
    "critical": "#dc2626",
    "high": "#ea580c",
    "medium": "#d97706",
    "low": "#2563eb",
}


def _inr(value: float) -> str:
    """Indian-grouped rupee string safe for PDF core fonts (no ₹ glyph)."""
    return inr(value).replace("₹", "Rs.")


def _safe_slug(value: str) -> str:
    return re.sub(r"[^a-z0-9]+", "-", (value or "business").lower()).strip("-")[:40] or "business"


# ── Data assembly ────────────────────────────────────────────────────────────

async def _collect_report_data(db: AsyncIOMotorDatabase, business_id: Any, report_type: str) -> dict:
    now = utcnow()
    metrics = await compute_financial_metrics(db, business_id, now)
    health = await compute_health_score(db, business_id, now)
    risk = await analyze_risk(db, business_id, now)
    readiness = await compute_loan_readiness(db, business_id, now)
    monthly = await compute_monthly_series(db, business_id, months=6, now=now)
    daily = await compute_daily_cashflow(db, business_id, days=30, now=now)
    recommendations = await generate_dashboard_recommendations(db, business_id, limit=8, now=now)

    expenses = await db[COLLECTIONS["expenses"]].find({"business_id": business_id}).to_list(length=None)
    expense_by_category: dict[str, float] = {}
    for e in expenses:
        category = (e.get("category") or "General").strip() or "General"
        expense_by_category[category] = expense_by_category.get(category, 0.0) + float(e.get("amount") or 0)
    expense_dist = sorted(
        [{"category": k, "amount": round(v, 2)} for k, v in expense_by_category.items()],
        key=lambda x: -x["amount"],
    )[:6]

    gst_records = await db[COLLECTIONS["gst_records"]].find({"business_id": business_id}).sort("due_date", 1).to_list(length=None)
    loans = await db[COLLECTIONS["loans"]].find({"business_id": business_id}).to_list(length=None)
    invoices = await db[COLLECTIONS["invoices"]].find(
        {"business_id": business_id, "status": {"$in": ["sent", "overdue"]}}
    ).sort("due_date", 1).limit(8).to_list(length=None)

    return {
        "generated_at": now,
        "report_type": report_type,
        "metrics": metrics,
        "health": health,
        "risk": risk,
        "loan_readiness": readiness,
        "monthly": monthly["series"],
        "daily": daily,
        "recommendations": recommendations,
        "expense_distribution": expense_dist,
        "gst_records": gst_records,
        "loans": loans,
        "open_invoices": invoices,
    }


# ── Executive summary ────────────────────────────────────────────────────────

def _deterministic_summary(data: dict) -> str:
    m = data["metrics"]
    h = data["health"]
    r = data["risk"]
    overdue = m["receivables"]["overdue"]
    debt = m["debt"]["outstanding"]
    bits = [
        f"{data['generated_at']:%d %B %Y} — Financial health is rated **{h['label'].lower()}** "
        f"({h['score']}/100).",
        f"Revenue for the current month stands at {_inr(m['revenue']['current'])} against "
        f"expenses of {_inr(m['expenses']['current'])}, resulting in a net profit of "
        f"{_inr(m['net_profit']['current'])}.",
    ]
    if overdue > 0:
        bits.append(f"{_inr(overdue)} in receivables is overdue and should be followed up promptly.")
    if debt > 0:
        bits.append(
            f"Outstanding debt is {inr(debt)} with a monthly EMI burden of {_inr(m['debt']['monthly_emi'])}."
        )
    if r["summary"]["active_risks"]:
        bits.append(
            f"{r['summary']['active_risks']} active risk(s) were identified, with an overall risk level of "
            f"{r['risk_level']}."
        )
    else:
        bits.append("No significant risks were detected in the current data.")
    bits.append(f"{len(data['recommendations'])} AI recommendation(s) are attached as priorities for action.")
    return " ".join(bits)


async def _ai_summary(data: dict) -> str:
    """LLM narrative when a provider is configured; deterministic summary otherwise."""
    if llm.is_available():
        context = {
            "generated_at": str(data["generated_at"]),
            "metrics": data["metrics"],
            "financial_health": data["health"],
            "risk_summary": data["risk"]["summary"],
            "top_recommendations": [
                {"title": r["title"], "priority": r["priority"], "action": r["recommended_action"]}
                for r in data["recommendations"][:5]
            ],
        }
        try:
            summary, _ = await llm.complete_engine(
                "You write executive summaries for MSME financial reports. Use only the "
                "numbers provided. Be factual, specific and concise (3-5 sentences).",
                f"Report data (JSON):\n{json.dumps(context, default=str)}",
            )
            if summary:
                return summary.strip()
        except Exception as exc:  # pragma: no cover
            logger.warning("AI summary failed; using deterministic summary: %s", exc)
    return _deterministic_summary(data)


# ── PDF rendering ────────────────────────────────────────────────────────────

def _build_pdf(data: dict, business: dict) -> bytes:
    from reportlab.lib import colors
    from reportlab.lib.enums import TA_CENTER, TA_LEFT
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.styles import ParagraphStyle, getSampleStyleSheet
    from reportlab.lib.units import mm
    from reportlab.platypus import (
        KeepTogether,
        PageBreak,
        Paragraph,
        SimpleDocTemplate,
        Spacer,
        Table,
        TableStyle,
    )

    report_type = data["report_type"]
    buf = BytesIO()
    doc = SimpleDocTemplate(
        buf,
        pagesize=A4,
        leftMargin=16 * mm,
        rightMargin=16 * mm,
        topMargin=18 * mm,
        bottomMargin=16 * mm,
        title=f"AI CFO Financial Report — {business.get('business_name', '')}",
        author="AI CFO for MSMEs",
    )

    styles = getSampleStyleSheet()
    title_style = ParagraphStyle("TitleX", parent=styles["Title"], fontName="Helvetica-Bold", fontSize=22, leading=26, textColor=colors.HexColor(INK))
    h1 = ParagraphStyle("H1X", parent=styles["Heading1"], fontName="Helvetica-Bold", fontSize=14, leading=18, textColor=colors.HexColor(INK), spaceBefore=10, spaceAfter=6)
    h2 = ParagraphStyle("H2X", parent=styles["Heading2"], fontName="Helvetica-Bold", fontSize=11, leading=15, textColor=colors.HexColor(BRAND_BLUE), spaceBefore=8, spaceAfter=4)
    body = ParagraphStyle("BodyX", parent=styles["BodyText"], fontName="Helvetica", fontSize=9.5, leading=14, textColor=colors.HexColor("#334155"))
    small = ParagraphStyle("SmallX", parent=styles["BodyText"], fontName="Helvetica", fontSize=8, leading=11, textColor=colors.HexColor(SLATE))
    label = ParagraphStyle("LabelX", parent=styles["BodyText"], fontName="Helvetica-Bold", fontSize=8.5, leading=11, textColor=colors.HexColor(SLATE))

    def footer(canvas, doc_):
        canvas.saveState()
        canvas.setStrokeColor(colors.HexColor("#e2e8f0"))
        canvas.setLineWidth(0.5)
        canvas.line(16 * mm, 12 * mm, A4[0] - 16 * mm, 12 * mm)
        canvas.setFont("Helvetica", 7.5)
        canvas.setFillColor(colors.HexColor(SLATE))
        canvas.drawString(16 * mm, 8.5 * mm, "AI CFO & Financial Advisor for MSMEs — confidential")
        canvas.drawRightString(A4[0] - 16 * mm, 8.5 * mm, f"Page {doc_.page}")
        canvas.restoreState()

    story: list = []

    # ── Cover header ──────────────────────────────────────────────────────
    from reportlab.platypus import HRFlowable

    story.append(Paragraph("AI CFO", ParagraphStyle("Brand", parent=title_style, fontSize=10, textColor=colors.HexColor(BRAND_BLUE))))
    story.append(Spacer(1, 2))
    story.append(Paragraph(
        {"comprehensive": "Comprehensive Financial Report",
         "financial_summary": "Financial Summary Report",
         "cash_flow": "Cash Flow Report",
         "risk": "Risk Analysis Report"}[report_type],
        title_style,
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        f"<b>{business.get('business_name') or 'Your Business'}</b> — {business.get('industry') or 'MSME'}"
        + (f" · GSTIN {business.get('gstin')}" if business.get("gstin") else ""),
        body,
    ))
    story.append(Paragraph(f"Generated on {data['generated_at']:%d %B %Y at %H:%M} UTC", small))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=1.2, color=colors.HexColor(BRAND_BLUE)))
    story.append(Spacer(1, 10))

    # ── Executive summary ────────────────────────────────────────────────
    summary_text = data["summary"].replace("**", "")
    story.append(Paragraph("Executive Summary", h1))
    story.append(Paragraph(summary_text, body))
    story.append(Spacer(1, 6))

    m = data["metrics"]
    h = data["health"]

    # ── KPI table ────────────────────────────────────────────────────────
    kpis = [
        ("Revenue (month)", _inr(m["revenue"]["current"]), GREEN),
        ("Expenses (month)", _inr(m["expenses"]["current"]), RED),
        ("Net Profit (month)", _inr(m["net_profit"]["current"]), GREEN if m["net_profit"]["current"] >= 0 else RED),
        ("Cash Balance", _inr(m["cash_balance"]["current"]), BRAND_BLUE),
        ("Outstanding Receivables", _inr(m["receivables"]["outstanding"]), AMBER),
        ("Overdue Receivables", _inr(m["receivables"]["overdue"]), RED),
        ("Outstanding Debt", _inr(m["debt"]["outstanding"]), AMBER),
        ("Monthly EMI", _inr(m["debt"]["monthly_emi"]), SLATE),
    ]
    kpi_rows = [[Paragraph(f"<b>{k}</b>", label), Paragraph(f'<font color="{c}"><b>{v}</b></font>', body)] for k, v, c in kpis]
    kpi_table = Table(kpi_rows, colWidths=[70 * mm, 60 * mm])
    kpi_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), colors.HexColor("#f8fafc")),
        ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
        ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ("TOPPADDING", (0, 0), (-1, -1), 5),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
        ("LEFTPADDING", (0, 0), (-1, -1), 8),
        ("SPLITBYROW", (0, 0), (-1, -1), 1),
    ]))
    story.append(KeepTogether([Paragraph("Key Financial Metrics", h1), Spacer(1, 4), kpi_table]))
    story.append(Spacer(1, 8))

    # ── Health score gauge ───────────────────────────────────────────────
    health_color = "#10b981" if h["score"] >= 75 else "#f59e0b" if h["score"] >= 55 else "#f97316" if h["score"] >= 35 else "#ef4444"
    story.append(Paragraph("Financial Health Score", h1))
    story.append(_health_gauge(h["score"], h["label"], health_color))
    story.append(Spacer(1, 2))
    story.append(Paragraph(h["interpretation"], body))
    factors_text = " · ".join(f"{f['name'].replace('_', ' ').title()}: {f['score']}/100" for f in h["factors"][:6])
    story.append(Paragraph(f"<b>Factors:</b> {factors_text}", small))
    story.append(Spacer(1, 6))

    # ── Charts (comprehensive / financial_summary / cash_flow) ───────────
    if report_type in ("comprehensive", "financial_summary", "cash_flow") and data["monthly"]:
        story.append(Paragraph("Revenue vs Expenses — Last 6 Months", h1))
        story.append(_monthly_bar_chart(data["monthly"]))
        story.append(Spacer(1, 6))

    if report_type in ("comprehensive", "cash_flow") and data["daily"]:
        story.append(Paragraph("Cash Flow — Last 30 Days", h1))
        story.append(_cashflow_chart(data["daily"]))
        story.append(Spacer(1, 6))

    if report_type in ("comprehensive", "financial_summary") and data["expense_distribution"]:
        story.append(Paragraph("Expense Distribution by Category", h1))
        story.append(_expense_bars(data["expense_distribution"]))
        story.append(Spacer(1, 6))

    # ── GST ──────────────────────────────────────────────────────────────
    if report_type in ("comprehensive", "financial_summary") and data["gst_records"]:
        story.append(Paragraph("GST / Tax Position", h1))
        gst_rows = [[Paragraph("<b>Period</b>", label), Paragraph("<b>Due Date</b>", label), Paragraph("<b>Tax Amount</b>", label), Paragraph("<b>Paid</b>", label), Paragraph("<b>Status</b>", label)]]
        for g in data["gst_records"][:8]:
            gst_rows.append([
                Paragraph(str(g.get("period") or "—"), small),
                Paragraph(str(g.get("due_date", "") or "")[:10] or "—", small),
                Paragraph(_inr(g.get("tax_amount") or 0), small),
                Paragraph(_inr(g.get("paid_amount") or 0), small),
                Paragraph(str(g.get("status") or "—"), small),
            ])
        gst_table = Table(gst_rows, colWidths=[30 * mm, 25 * mm, 25 * mm, 25 * mm, 25 * mm])
        gst_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(gst_table)
        story.append(Spacer(1, 6))

    # ── Loans ────────────────────────────────────────────────────────────
    if report_type in ("comprehensive", "financial_summary") and data["loans"]:
        story.append(Paragraph("Loans & Debt", h1))
        loan_rows = [[Paragraph("<b>Lender</b>", label), Paragraph("<b>Type</b>", label), Paragraph("<b>Principal</b>", label), Paragraph("<b>Outstanding</b>", label), Paragraph("<b>EMI</b>", label), Paragraph("<b>Status</b>", label)]]
        for ln in data["loans"][:8]:
            loan_rows.append([
                Paragraph(str(ln.get("lender") or "—"), small),
                Paragraph(str(ln.get("loan_type") or "—"), small),
                Paragraph(_inr(ln.get("principal_amount") or 0), small),
                Paragraph(_inr(ln.get("outstanding_amount") or 0), small),
                Paragraph(_inr(ln.get("emi_amount") or 0), small),
                Paragraph(str(ln.get("status") or "—"), small),
            ])
        loan_table = Table(loan_rows, colWidths=[30 * mm, 26 * mm, 24 * mm, 24 * mm, 16 * mm, 14 * mm])
        loan_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 4),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ]))
        story.append(loan_table)
        story.append(Spacer(1, 6))

    # ── Risk section ─────────────────────────────────────────────────────
    if report_type in ("comprehensive", "risk"):
        risk = data["risk"]
        story.append(Paragraph(
            f"Risk Analysis — {risk['risk_level'].title()} ({risk['risk_score']}/100)", h1
        ))
        if risk["risks"]:
            risk_rows = [[Paragraph("<b>Severity</b>", label), Paragraph("<b>Risk</b>", label), Paragraph("<b>Evidence</b>", label), Paragraph("<b>Recommended Action</b>", label)]]
            for r in risk["risks"][:8]:
                risk_rows.append([
                    Paragraph(f'<font color="{PRIORITY_COLORS.get(r["severity"], SLATE)}"><b>{r["severity"].upper()}</b></font>', small),
                    Paragraph(str(r["title"]), small),
                    Paragraph(str(r["evidence"])[:140], small),
                    Paragraph(str(r["recommended_action"])[:160], small),
                ])
            risk_table = Table(risk_rows, colWidths=[18 * mm, 30 * mm, 44 * mm, 38 * mm])
            risk_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#fff7ed")),
                ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
            ]))
            story.append(risk_table)
        else:
            story.append(Paragraph("No significant risks were detected in the current data.", body))
        story.append(Spacer(1, 6))

    # ── AI recommendations ───────────────────────────────────────────────
    if data["recommendations"]:
        story.append(Paragraph("AI Recommendations & Priorities", h1))
        rec_rows = [[Paragraph("<b>Priority</b>", label), Paragraph("<b>Recommendation</b>", label), Paragraph("<b>Impact</b>", label)]]
        for r in data["recommendations"]:
            rec_rows.append([
                Paragraph(f'<font color="{PRIORITY_COLORS.get(r["priority"], SLATE)}"><b>{r["priority"].upper()}</b></font>', small),
                Paragraph(
                    f"<b>{r['title']}</b><br/>{r['description']}<br/>"
                    f"<font color='#2563eb'>→ {r['recommended_action']}</font>",
                    small,
                ),
                Paragraph(str(r.get("expected_impact") or "—"), small),
            ])
        rec_table = Table(rec_rows, colWidths=[20 * mm, 82 * mm, 28 * mm], repeatRows=1)
        rec_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#eff6ff")),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.HexColor("#e2e8f0")),
            ("TOPPADDING", (0, 0), (-1, -1), 5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 5),
            ("LEFTPADDING", (0, 0), (-1, -1), 6),
        ]))
        story.append(rec_table)
    else:
        story.append(Paragraph("AI Recommendations", h1))
        story.append(Paragraph("Not enough data to generate recommendations yet. Upload transactions, invoices and expenses to enable the AI engine.", body))
    story.append(Spacer(1, 8))

    # ── Closing ──────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=0.8, color=colors.HexColor("#e2e8f0")))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "This report was generated automatically by the AI CFO for MSMEs from your business data. "
        "Figures are computed from your recorded transactions, invoices, expenses, GST and loan records. "
        "Recommendations are decision-support, not financial or tax advice.",
        small,
    ))

    doc.build(story, onFirstPage=footer, onLaterPages=footer)
    return buf.getvalue()


def _health_gauge(score: float, label: str, color: str):
    from reportlab.graphics.charts.piecharts import Pie
    from reportlab.graphics.shapes import Drawing, String
    from reportlab.lib.colors import HexColor

    drawing = Drawing(120, 66)
    pie = Pie()
    pie.x = 10
    pie.y = 6
    pie.width = 60
    pie.height = 60
    pie.data = [max(score, 0.5), max(100 - score, 0.5)]
    pie.labels = None
    pie.slices[0].fillColor = HexColor(color)
    pie.slices[1].fillColor = HexColor("#e2e8f0")
    pie.slices[0].strokeColor = None
    pie.slices[1].strokeColor = None
    pie.startAngle = 90
    pie.direction = "clockwise"
    drawing.add(pie)
    drawing.add(String(40, 30, f"{round(score)}", fontSize=16, fontName="Helvetica-Bold", textAnchor="middle"))
    drawing.add(String(90, 38, label.title(), fontSize=9, fontName="Helvetica", textAnchor="middle"))
    return drawing


def _monthly_bar_chart(series: list[dict]):
    from reportlab.graphics.shapes import Drawing, Line, Rect, String
    from reportlab.lib.colors import HexColor

    width, height = 480, 170
    plot_x0, plot_y0, plot_x1, plot_y1 = 46, 26, width - 8, height - 14
    drawing = Drawing(width, height)
    n = len(series)
    max_val = max([s["revenue"] for s in series] + [s["expenses"] for s in series] + [1])
    slot = (plot_x1 - plot_x0) / n
    bar_w = min(16, slot * 0.28)

    def y_for(v: float) -> float:
        return plot_y0 + (plot_y1 - plot_y0) * (v / max_val)

    for i, s in enumerate(series):
        xc = plot_x0 + slot * i + slot / 2
        rev = s["revenue"]
        exp = s["expenses"]
        drawing.add(Rect(xc - bar_w, plot_y0, bar_w, y_for(rev) - plot_y0, fillColor=HexColor(BRAND_BLUE), strokeColor=None))
        drawing.add(Rect(xc, plot_y0, bar_w, y_for(exp) - plot_y0, fillColor=HexColor("#93c5fd"), strokeColor=None))
        drawing.add(String(xc + bar_w / 2, plot_y0 - 12, s["month"][5:7], fontSize=7, fontName="Helvetica", textAnchor="middle"))

    for i in range(5):
        frac = i / 4
        y = plot_y0 + (plot_y1 - plot_y0) * frac
        drawing.add(Line(plot_x0, y, plot_x1, y, strokeColor=HexColor("#eef2f7"), strokeWidth=0.5))
        drawing.add(String(plot_x0 - 4, y - 3, _short_inr(max_val * frac), fontSize=7, fontName="Helvetica", textAnchor="end"))
    drawing.add(String(width / 2, height - 10, "Revenue (blue) · Expenses (light blue)", fontSize=7.5, fontName="Helvetica", textAnchor="middle"))
    return drawing


def _cashflow_chart(daily: list[dict]):
    from reportlab.graphics.shapes import Drawing, Line, PolyLine, String
    from reportlab.lib.colors import HexColor

    width, height = 480, 150
    plot_x0, plot_y0, plot_x1, plot_y1 = 46, 24, width - 8, height - 20
    drawing = Drawing(width, height)
    n = len(daily)
    max_val = max([d["inflow"] for d in daily] + [d["outflow"] for d in daily] + [1])

    def xy(series_key: str) -> list:
        pts = []
        for i, d in enumerate(daily):
            x = plot_x0 + (plot_x1 - plot_x0) * i / max(n - 1, 1)
            y = plot_y0 + (plot_y1 - plot_y0) * (d[series_key] / max_val)
            pts.extend([x, y])
        return pts

    drawing.add(PolyLine(xy("inflow"), strokeColor=HexColor(GREEN), strokeWidth=1.4))
    drawing.add(PolyLine(xy("outflow"), strokeColor=HexColor(RED), strokeWidth=1.4))
    for i in range(5):
        frac = i / 4
        y = plot_y0 + (plot_y1 - plot_y0) * frac
        drawing.add(Line(plot_x0, y, plot_x1, y, strokeColor=HexColor("#eef2f7"), strokeWidth=0.5))
        drawing.add(String(plot_x0 - 4, y - 3, _short_inr(max_val * frac), fontSize=7, fontName="Helvetica", textAnchor="end"))
    drawing.add(String(width / 2, height - 10, f"{daily[0]['date']} → {daily[-1]['date']} · Inflow (green) · Outflow (red)", fontSize=7.5, fontName="Helvetica", textAnchor="middle"))
    return drawing


def _expense_bars(distribution: list[dict]):
    from reportlab.graphics.shapes import Drawing, Rect, String
    from reportlab.lib.colors import HexColor

    width, height = 480, max(46, 24 * len(distribution) + 26)
    drawing = Drawing(width, height)
    max_val = max([d["amount"] for d in distribution] + [1])
    palette = ["#2563eb", "#10b981", "#f59e0b", "#f97316", "#8b5cf6", "#64748b"]
    bar_x = 120
    for i, d in enumerate(distribution):
        y = height - 22 - i * 24
        drawing.add(String(bar_x - 6, y - 3, d["category"][:18], fontSize=8, fontName="Helvetica", textAnchor="end"))
        w = (width - bar_x - 90) * (d["amount"] / max_val)
        drawing.add(Rect(bar_x, y, max(w, 1), 12, fillColor=HexColor(palette[i % len(palette)]), strokeColor=None))
        drawing.add(String(bar_x + max(w, 1) + 5, y - 1, _short_inr(d["amount"]), fontSize=7.5, fontName="Helvetica"))
    return drawing


def _short_inr(value: float) -> str:
    value = float(value)
    if value >= 10_000_000:
        return f"Rs.{value / 10_000_000:.1f}Cr"
    if value >= 100_000:
        return f"Rs.{value / 100_000:.1f}L"
    if value >= 1_000:
        return f"Rs.{value / 1_000:.0f}K"
    return f"Rs.{value:.0f}"


# ── Storage / public API ─────────────────────────────────────────────────────

async def generate_and_store(
    db: AsyncIOMotorDatabase,
    business: dict,
    user_id: Any,
    report_type: str = "comprehensive",
) -> dict:
    if report_type not in REPORT_TYPES:
        from app.core.errors import BadRequestError

        raise BadRequestError(
            f"Unknown report type '{report_type}'. Expected one of: {', '.join(REPORT_TYPES)}",
            error_code="REPORT_INVALID_TYPE",
        )
    business_id = business["_id"]
    data = await _collect_report_data(db, business_id, report_type)
    data["summary"] = await _ai_summary(data)
    pdf_bytes = _build_pdf(data, business)

    stamp = data["generated_at"].strftime("%Y%m%d-%H%M")
    slug = _safe_slug(business.get("business_name", ""))
    filename = f"aicfo-{slug}-{report_type.replace('_', '-')}-{stamp}.pdf"
    title = {
        "comprehensive": "Comprehensive Financial Report",
        "financial_summary": "Financial Summary Report",
        "cash_flow": "Cash Flow Report",
        "risk": "Risk Analysis Report",
    }[report_type]

    doc = {
        "business_id": business_id,
        "user_id": user_id,
        "title": title,
        "report_type": report_type,
        "filename": filename,
        "content": Binary(pdf_bytes),
        "size_bytes": len(pdf_bytes),
        "generated_at": data["generated_at"],
        "created_at": utcnow(),
    }
    result = await db[COLLECTIONS["reports"]].insert_one(doc)
    return {
        "id": str(result.inserted_id),
        "title": title,
        "report_type": report_type,
        "filename": filename,
        "size_bytes": len(pdf_bytes),
        "generated_at": data["generated_at"],
    }


async def list_reports(db: AsyncIOMotorDatabase, business_id: Any) -> list[dict]:
    docs = await (
        db[COLLECTIONS["reports"]]
        .find({"business_id": business_id}, {"content": 0})
        .sort("created_at", -1)
        .limit(50)
        .to_list(length=None)
    )
    return [
        {
            "id": str(d["_id"]),
            "title": d.get("title"),
            "report_type": d.get("report_type"),
            "filename": d.get("filename"),
            "size_bytes": d.get("size_bytes"),
            "generated_at": d.get("generated_at"),
            "created_at": d.get("created_at"),
        }
        for d in docs
    ]


async def fetch_report(db: AsyncIOMotorDatabase, business_id: Any, report_id: str) -> tuple[bytes, str]:
    try:
        doc = await db[COLLECTIONS["reports"]].find_one(
            {"_id": ObjectId(report_id), "business_id": business_id}
        )
    except Exception:
        doc = None
    if not doc:
        raise NotFoundError("Report not found", "REPORT_NOT_FOUND")
    content = doc.get("content")
    if isinstance(content, Binary):
        content = bytes(content)
    return bytes(content or b""), doc.get("filename") or "report.pdf"


async def delete_report(db: AsyncIOMotorDatabase, business_id: Any, report_id: str) -> None:
    try:
        result = await db[COLLECTIONS["reports"]].delete_one(
            {"_id": ObjectId(report_id), "business_id": business_id}
        )
    except Exception:
        result = None
    if not result or result.deleted_count == 0:
        raise NotFoundError("Report not found", "REPORT_NOT_FOUND")
