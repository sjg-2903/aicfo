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
class RecommendationGenerateRequest(BaseModel):
    pass


# ── Alerts ─────────────────────────────────────────────────────────────────
class AlertPatchRequest(BaseModel):
    read: Optional[bool] = None


# ── AI CFO ─────────────────────────────────────────────────────────────────
class ChatRequest(BaseModel):
    message: str = Field(min_length=1, max_length=4000)
    session_id: Optional[str] = None


class AnalyzeRequest(BaseModel):
    pass


class RecommendRequest(BaseModel):
    pass
