"""Helpers to serialize Mongo documents into JSON-safe structures."""

from datetime import date, datetime, timezone
from typing import Any

from bson import ObjectId


def isoformat(value: datetime) -> str:
    if value.tzinfo is None:
        value = value.replace(tzinfo=timezone.utc)
    return value.astimezone(timezone.utc).isoformat().replace("+00:00", "Z")


def serialize_value(value: Any) -> Any:
    if isinstance(value, ObjectId):
        return str(value)
    if isinstance(value, datetime):
        return isoformat(value)
    if isinstance(value, date):
        return value.isoformat()
    if isinstance(value, dict):
        return {k: serialize_value(v) for k, v in value.items()}
    if isinstance(value, (list, tuple)):
        return [serialize_value(v) for v in value]
    return value


def serialize_doc(doc: dict | None) -> dict | None:
    """Serialize a document, renaming ``_id`` to ``id`` for API responses."""
    if doc is None:
        return None
    out = serialize_value(doc)
    if "_id" in out:
        out["id"] = out.pop("_id")
    return out


def serialize_docs(docs: list) -> list:
    return [serialize_doc(d) for d in docs]
