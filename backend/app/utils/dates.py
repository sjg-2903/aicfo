"""Date parsing and period helpers (deterministic, timezone-aware UTC)."""

from datetime import date, datetime, time, timedelta, timezone
from typing import Optional

from dateutil import parser as date_parser

from app.core.errors import ValidationError


def utcnow() -> datetime:
    """Naive UTC now — datetimes are stored/compared as naive UTC throughout.

    (MongoDB stores UTC epoch millis and PyMongo/Motor return naive datetimes
    by default; keeping everything naive-UTC avoids tz-mismatch errors.)
    """
    return datetime.now(timezone.utc).replace(tzinfo=None)


def ensure_naive_utc(value: datetime) -> datetime:
    """Normalize a datetime (aware or naive) to naive UTC."""
    if value.tzinfo is None:
        return value
    return value.astimezone(timezone.utc).replace(tzinfo=None)


def parse_datetime(value, field: str = "date") -> datetime:
    """Parse an ISO date/datetime string into naive UTC."""
    if isinstance(value, datetime):
        return ensure_naive_utc(value)
    if isinstance(value, date):
        return datetime.combine(value, time.min)
    if isinstance(value, str):
        try:
            parsed = date_parser.isoparse(value.strip())
        except ValueError:
            raise ValidationError(f"Invalid {field}: '{value}' (expected ISO 8601)")
        return ensure_naive_utc(parsed)
    raise ValidationError(f"Invalid {field}: expected a date string")


def start_of_day(value: datetime) -> datetime:
    return value.replace(hour=0, minute=0, second=0, microsecond=0)


def end_of_day(value: datetime) -> datetime:
    return value.replace(hour=23, minute=59, second=59, microsecond=999999)


def start_of_month(value: datetime) -> datetime:
    return value.replace(day=1, hour=0, minute=0, second=0, microsecond=0)


def month_key(value: datetime) -> str:
    return value.strftime("%Y-%m")


def days_between(start: datetime, end: datetime) -> int:
    return (end.date() - start.date()).days


def previous_month_range(now: Optional[datetime] = None) -> tuple[datetime, datetime]:
    now = now or utcnow()
    this_month = start_of_month(now)
    prev_start = (this_month - timedelta(days=1)).replace(day=1)
    return start_of_month(prev_start), this_month  # [prev_start, this_month)


def months_back(value: datetime, n: int) -> datetime:
    """Return the start of the month `n` months before `value` (0 = current)."""
    month = value.month - 1 - n
    year = value.year + month // 12
    month = month % 12 + 1
    return datetime(year, month, 1)
