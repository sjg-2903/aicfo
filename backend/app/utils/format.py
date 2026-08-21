"""Human-friendly formatting for deterministic explanations."""


def inr(value: float) -> str:
    """Format a number as Indian Rupees with Indian digit grouping (₹12,34,567)."""
    v = int(round(value))
    sign = "-" if v < 0 else ""
    s = str(abs(v))
    if len(s) > 3:
        last3 = s[-3:]
        rest = s[:-3]
        parts = [last3]
        while rest:
            parts.append(rest[-2:])
            rest = rest[:-2]
        s = ",".join(reversed(parts))
    return f"{sign}₹{s}"


def pct(value: float, decimals: int = 1) -> str:
    return f"{value:.{decimals}f}%"
