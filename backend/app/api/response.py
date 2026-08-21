"""Consistent JSON response envelopes.

Success:  {"success": true, "message": "...", "data": ...}
Paged:    {"success": true, "message": "...", "data": [...], "page", "limit", "total", "pages"}
Error:    {"success": false, "message": "...", "error_code": "...", "details": ...}
"""

from typing import Any, Optional

from app.utils.pagination import pagination_meta


def ok(data: Any = None, message: str = "OK", **extra: Any) -> dict:
    body: dict = {"success": True, "message": message}
    if data is not None:
        body["data"] = data
    body.update(extra)
    return body


def ok_page(items: list, total: int, page: int, limit: int, message: str = "OK") -> dict:
    body = {
        "success": True,
        "message": message,
        "data": items,
    }
    body.update(pagination_meta(page, limit, total))
    return body


def error(message: str, error_code: str, details: Optional[Any] = None, status_code: int = 400) -> dict:
    body: dict = {"success": False, "message": message, "error_code": error_code}
    if details is not None:
        body["details"] = details
    return body
