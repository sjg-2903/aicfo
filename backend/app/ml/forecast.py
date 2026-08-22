"""30-day cash-flow forecasting service.

Uses Prophet when installed and enough history exists; otherwise falls back
to a scikit-learn linear-trend model, and finally to a moving-average model
that explicitly reports *low* confidence rather than inventing accuracy.
"""

import logging
from datetime import datetime
from typing import Any, Optional

import numpy as np
from motor.motor_asyncio import AsyncIOMotorDatabase
from sklearn.linear_model import LinearRegression

from app.analytics.metrics import compute_daily_cashflow
from app.core.config import settings
from app.core.errors import InsufficientDataError
from app.utils.dates import utcnow

logger = logging.getLogger(__name__)

try:  # Optional heavy dependency.
    from prophet import Prophet  # type: ignore  # noqa: F401

    HAS_PROPHET = True
except Exception:  # pragma: no cover - depends on environment
    HAS_PROPHET = False


def _fit_linear(x: np.ndarray, y: np.ndarray) -> tuple[LinearRegression, float]:
    """Fit a linear trend and return (model, residual_std)."""
    x2 = x.reshape(-1, 1)
    model = LinearRegression()
    model.fit(x2, y)
    preds = model.predict(x2)
    residuals = y - preds
    sigma = float(np.std(residuals)) if len(residuals) > 1 else 0.0
    return model, sigma


async def generate_forecast(
    db: AsyncIOMotorDatabase,
    business_id: Any,
    days: int = 30,
    now: Optional[datetime] = None,
) -> dict:
    now = now or utcnow()
    days = days or settings.FORECAST_HORIZON_DAYS
    history_days = max(90, days * 3)

    daily = await compute_daily_cashflow(db, business_id, days=history_days, now=now)
    # Keep only days that actually have activity for modelling.
    active = [d for d in daily if d["inflow"] > 0 or d["outflow"] > 0]
    if not active:
        raise InsufficientDataError(
            "No transaction history available to produce a cash-flow forecast"
        )

    inflow_hist = np.array([d["inflow"] for d in active], dtype=float)
    outflow_hist = np.array([d["outflow"] for d in active], dtype=float)
    net_hist = inflow_hist - outflow_hist
    n = len(active)
    x = np.arange(n, dtype=float)

    model_name = "moving_average"
    confidence = "low"
    note = ""

    if n >= settings.FORECAST_MIN_HISTORY_DAYS:
        if HAS_PROPHET and n >= 30:
            try:
                return await _prophet_forecast(active, days, now)
            except Exception as exc:  # pragma: no cover - depends on data
                logger.warning("Prophet forecast failed, falling back: %s", exc)
        in_model, in_sigma = _fit_linear(x, inflow_hist)
        out_model, out_sigma = _fit_linear(x, outflow_hist)
        model_name = "sklearn_linear_regression"
        confidence = "high" if n >= 30 else "medium"
        note = "Linear trend fitted on observed daily cash flow."
    else:
        # Moving-average fallback with explicitly limited confidence.
        in_model, out_model = None, None
        in_sigma = float(np.std(inflow_hist))
        out_sigma = float(np.std(outflow_hist))
        note = (
            f"Only {n} days of history available — using a moving-average fallback "
            "with limited confidence."
        )

    future_x = np.arange(n, n + days, dtype=float)
    if model_name == "sklearn_linear_regression":
        pred_inflow = in_model.predict(future_x.reshape(-1, 1))
        pred_outflow = out_model.predict(future_x.reshape(-1, 1))
    else:
        pred_inflow = np.full(days, float(np.mean(inflow_hist)))
        pred_outflow = np.full(days, float(np.mean(outflow_hist)))

    pred_inflow = np.maximum(pred_inflow, 0.0)
    pred_outflow = np.maximum(pred_outflow, 0.0)
    net_forecast = pred_inflow - pred_outflow

    # Confidence bounds (per-step, growing with horizon).
    z = 1.96
    sigma = float(np.sqrt(in_sigma**2 + out_sigma**2))
    bounds = z * sigma * np.sqrt(1.0 + np.arange(1, days + 1) / max(n, 1))

    from app.utils.dates import start_of_day

    base = start_of_day(now)
    forecast_rows = []
    for i in range(days):
        d = _shift_day(base, i + 1)
        conf = round(max(0.5, 0.95 - 0.01 * i), 2) if model_name == "sklearn_linear_regression" else round(max(0.3, 0.6 - 0.01 * i), 2)
        forecast_rows.append(
            {
                "date": d.isoformat(),
                "predicted_inflow": round(float(pred_inflow[i]), 2),
                "predicted_outflow": round(float(pred_outflow[i]), 2),
                "predicted_net_cash_flow": round(float(net_forecast[i]), 2),
                "lower_bound": round(float(net_forecast[i] - bounds[i]), 2),
                "upper_bound": round(float(net_forecast[i] + bounds[i]), 2),
                "confidence": conf,
            }
        )

    return {
        "business_id": business_id,
        "days": days,
        "model": model_name,
        "confidence": confidence,
        "historical_days": n,
        "note": note,
        "forecast": forecast_rows,
        "summary": {
            "predicted_total_inflow": round(float(pred_inflow.sum()), 2),
            "predicted_total_outflow": round(float(pred_outflow.sum()), 2),
            "predicted_net_cash_flow": round(float(net_forecast.sum()), 2),
            "min_daily_net": round(float(net_forecast.min()), 2),
        },
        "generated_at": now,
    }


def _shift_day(base: datetime, offset: int) -> datetime:
    import datetime as _dt

    return base + _dt.timedelta(days=offset)


async def _prophet_forecast(active: list[dict], days: int, now: datetime) -> dict:  # pragma: no cover
    """Prophet-based forecast (used only when the optional dependency exists)."""
    import pandas as pd
    from prophet import Prophet  # type: ignore

    df = pd.DataFrame(
        {
            "ds": pd.to_datetime([d["date"] for d in active], utc=True),
            "y": [d["net_flow"] for d in active],
        }
    )
    model = Prophet(daily_seasonality=False, weekly_seasonality=True)
    model.fit(df)
    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)
    tail = forecast.tail(days)
    rows = []
    for _, r in tail.iterrows():
        rows.append(
            {
                "date": r["ds"].date().isoformat(),
                "predicted_inflow": 0.0,
                "predicted_outflow": 0.0,
                "predicted_net_cash_flow": round(float(r["yhat"]), 2),
                "lower_bound": round(float(r["yhat_lower"]), 2),
                "upper_bound": round(float(r["yhat_upper"]), 2),
                "confidence": 0.8,
            }
        )
    return {
        "days": days,
        "model": "prophet",
        "confidence": "high",
        "historical_days": len(active),
        "note": "Forecast generated with Facebook Prophet.",
        "forecast": rows,
        "summary": {
            "predicted_total_inflow": None,
            "predicted_total_outflow": None,
            "predicted_net_cash_flow": round(float(tail["yhat"].sum()), 2),
            "min_daily_net": round(float(tail["yhat"].min()), 2),
        },
        "generated_at": now,
    }
