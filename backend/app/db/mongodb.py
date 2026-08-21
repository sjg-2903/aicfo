"""MongoDB connection management (async, via Motor).

The database handle is stored on the app and exposed through the ``get_db``
FastAPI dependency. Tests can swap in an alternative engine (e.g. an
in-memory, API-compatible client) via :func:`set_database`.
"""

import logging
from typing import Optional

from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase

from app.core.config import settings

logger = logging.getLogger(__name__)

_client: Optional[AsyncIOMotorClient] = None
_db: Optional[AsyncIOMotorDatabase] = None


def get_client() -> AsyncIOMotorClient:
    global _client
    if _client is None:
        _client = AsyncIOMotorClient(
            settings.MONGODB_URI,
            serverSelectionTimeoutMS=5000,
            connectTimeoutMS=10000,
        )
    return _client


async def connect() -> None:
    """Create the client and verify connectivity with a ping."""
    global _client, _db
    client = get_client()
    # Force a server selection round-trip so misconfiguration fails fast.
    await client.admin.command("ping")
    _db = client[settings.MONGODB_DB_NAME]
    logger.info("Connected to MongoDB database '%s'", settings.MONGODB_DB_NAME)


async def disconnect() -> None:
    global _client, _db
    if _client is not None:
        _client.close()
    _client = None
    _db = None


def get_db() -> AsyncIOMotorDatabase:
    """Return the current database (must have been connected first)."""
    if _db is None:
        raise RuntimeError("Database is not connected. Call connect() first.")
    return _db


def set_database(db: AsyncIOMotorDatabase) -> None:
    """Inject a database handle (used by tests and tooling)."""
    global _db
    _db = db


async def get_db_dependency() -> AsyncIOMotorDatabase:
    """FastAPI dependency yielding the database."""
    return get_db()
