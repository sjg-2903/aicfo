"""Schemas for forecast, risk, loan-readiness, recommendation, alert and AI-CFO."""

from typing import Literal, Optional

from pydantic import BaseModel, Field


# ── Forecast ────────────────────────────────────────────────────────────────
class ForecastGenerateRequest(BaseModel):
    days: int = Field(default=30, ge=1, le=365)


# ── Risk ───────────────────────────────────────────────────────────────────
class RiskAnalyzeRequest(BaseModel):
    include_history: bool = True


# ── Loan readiness ─────────────────────────────────────────────────────────
class LoanReadinessAnalyzeRequest(BaseModel):
    pass


# ── Recommendations ────────────────────────────────────────────────────────
DEFAULT_RECOMMENDATION_PROMPT = (
    "Give me recommendations on my data analysis which contains the whole finance "
    "section like invoices, cash flow, GST, loans, expenses and transactions in "
    "the schema as defined in the recommendations display."
)


class RecommendationGenerateRequest(BaseModel):
    prompt: str = Field(
        default=DEFAULT_RECOMMENDATION_PROMPT,
        min_length=10,
        max_length=2000,
        description="Instruction sent to the AI recommendation engine.",
    )


# ── Alerts ─────────────────────────────────────────────────────────────────
class AlertPatchRequest(BaseModel):
    read: Optional[bool] = None


# ── AI CFO ─────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None


class ImageGenerateRequest(BaseModel):
    prompt: str = Field(min_length=3, max_length=2000)
    size: Literal["1024x1024", "1536x1024", "1024x1536"] = "1024x1024"


class AnalyzeRequest(BaseModel):
    pass


class RecommendRequest(BaseModel):
    pass
