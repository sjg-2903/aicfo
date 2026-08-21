"""Pagination helpers.

Query params: ``page`` (1-based) and ``limit`` (page size).
Response meta: ``page``, ``limit``, ``total`` and ``pages``.
"""

from typing import Optional

from app.core.errors import ValidationError


def resolve_page(page: Optional[int], limit: Optional[int]) -> tuple[int, int]:
    page = page if page is not None else 1
    limit = limit if limit is not None else 20
    if page < 1:
        raise ValidationError("page must be >= 1")
    if limit < 1 or limit > 500:
        raise ValidationError("limit must be between 1 and 500")
    return page, limit


def pagination_meta(page: int, limit: int, total: int) -> dict:
    pages = max(1, (total + limit - 1) // limit) if total else 0
    return {"page": page, "limit": limit, "total": total, "pages": pages}
