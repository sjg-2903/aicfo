"""Pytest fixtures.

Tests run against an in-memory, API-compatible MongoDB engine
(``mongomock_motor``) so the full application logic — authentication, tenant
isolation, CRUD, engines and CSV import — is exercised end-to-end without a
running MongoDB server. The production application uses real MongoDB (Motor).
"""

import os

os.environ.setdefault("MONGODB_DB_NAME", "aicfo_test")
os.environ.setdefault("JWT_SECRET", "test-secret-that-is-long-enough-1234567890")
os.environ.setdefault("ENVIRONMENT", "test")
os.environ.setdefault("DEMO_MODE", "false")
# Tests must never make an external AWS Bedrock request even when a developer
# has real credentials exported in their shell or in ~/.aws/credentials.
for _var in ("AWS_ACCESS_KEY_ID", "AWS_SECRET_ACCESS_KEY", "AWS_SESSION_TOKEN", "AWS_PROFILE"):
    os.environ.pop(_var, None)
os.environ.setdefault("BEDROCK_MODEL_ID", "anthropic.claude-test-model")
os.environ.setdefault("AWS_REGION", "us-east-1")
os.environ.setdefault("ADMIN_EMAILS", "")

import pytest
import pytest_asyncio
from httpx import ASGITransport, AsyncClient
from mongomock_motor import AsyncMongoMockClient

from app.api.deps import get_db
from app.db import mongodb
from app.db.indexes import create_indexes
from app.main import app


@pytest_asyncio.fixture
async def db():
    client = AsyncMongoMockClient()
    database = client["aicfo_test"]
    await create_indexes(database)
    yield database
    client.close()


@pytest_asyncio.fixture
async def client(db):
    async def _get_db():
        return db

    app.dependency_overrides[get_db] = _get_db
    mongodb.set_database(db)
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    mongodb.set_database(None)


@pytest.fixture
def anyio_backend():
    return "asyncio"
