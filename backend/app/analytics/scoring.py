"""Deterministic scoring helpers used by the health / readiness engines.

Every score is clamped to [0, 100] and derived purely from computed ratios —
no randomness, no LLM involvement.
"""

import math
from typing import Optional


def clamp(value: float, lo: float = 0.0, hi: float = 100.0) -> float:
    return max(lo, min(hi, value))


def safe_div(num: float, den: float, default: float = 0.0) -> float:
    return (num / den) if den else default


def score_higher_better(value: float, low: float, high: float) -> float:
    """Score where `low` maps to 0 and `high` maps to 100 (linear)."""
    if high <= low:
        return 100.0 if value >= high else 0.0
    return clamp((value - low) / (high - low) * 100.0)


def score_lower_better(value: float, low: float, high: float) -> float:
    """Score where `low` maps to 100 and `high` maps to 0 (linear)."""
    return 100.0 - score_higher_better(value, low, high)


def coefficient_of_variation(values: list[float]) -> Optional[float]:
    """Population coefficient of variation (std/mean) for a series."""
    n = len(values)
    if n == 0:
        return None
    mean = sum(values) / n
    if mean == 0:
        return None
    variance = sum((v - mean) ** 2 for v in values) / n
    return math.sqrt(variance) / abs(mean)
