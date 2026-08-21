"""Shared schemas: pagination, IDs, generic query filters."""

from datetime import datetime
from typing import Annotated, Optional

from pydantic import AfterValidator, BaseModel, Field

from app.utils.dates import ensure_naive_utc

# Datetimes are normalized to naive UTC after parsing so that storage and
# analytics consistently operate on naive-UTC values (Mongo returns naive UTC).
NaiveDatetime = Annotated[datetime, AfterValidator(ensure_naive_utc)]


class PaginationParams(BaseModel):
    page: int = Field(default=1, ge=1)
    limit: int = Field(default=20, ge=1, le=500)


class DateRangeParams(BaseModel):
    start_date: Optional[datetime] = None
    end_date: Optional[datetime] = None


class ImportResponse(BaseModel):
    import_type: str
    total_rows: int
    successful_rows: int
    failed_rows: int
    duplicates: int
    errors: list[dict] = Field(default_factory=list)
