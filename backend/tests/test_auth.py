"""Authentication tests: register, login, refresh, logout, errors, RBAC."""

import time

import pytest

from tests.helpers import auth, login, register


async def test_register_and_login(client):
    data = await register(client)
    assert data["user"]["email"] == "owner@acme.com"
    assert data["access_token"]
    assert data["refresh_token"]

    login_data = await login(client)
    assert login_data["access_token"]


async def test_register_duplicate_email(client):
    await register(client)
    resp = await client.post(
        "/api/auth/register",
        json={"email": "owner@acme.com", "password": "password123", "business_name": "Other Business", "owner_name": "Jane Doe"},
    )
    assert resp.status_code == 409
    body = resp.json()
    assert body["success"] is False
    assert body["error_code"] == "EMAIL_EXISTS"


async def test_login_wrong_password(client):
    await register(client)
    resp = await client.post("/api/auth/login", json={"email": "owner@acme.com", "password": "wrong-password"})
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "INVALID_CREDENTIALS"


async def test_me_endpoint(client):
    data = await register(client)
    resp = await client.get("/api/auth/me", headers=auth(data["access_token"]))
    assert resp.status_code == 200
    assert resp.json()["data"]["email"] == "owner@acme.com"


async def test_protected_route_requires_token(client):
    resp = await client.get("/api/transactions")
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "UNAUTHORIZED"


async def test_invalid_token_rejected(client):
    resp = await client.get("/api/transactions", headers=auth("not-a-real-token"))
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "INVALID_TOKEN"


async def test_refresh_flow(client):
    data = await register(client)
    resp = await client.post("/api/auth/refresh", json={"refresh_token": data["refresh_token"]})
    assert resp.status_code == 200
    new_tokens = resp.json()["data"]
    assert new_tokens["access_token"]


async def test_refresh_with_access_token_rejected(client):
    data = await register(client)
    resp = await client.post("/api/auth/refresh", json={"refresh_token": data["access_token"]})
    assert resp.status_code == 401


async def test_logout_revokes_tokens(client):
    data = await register(client)
    resp = await client.post("/api/auth/logout", headers=auth(data["access_token"]))
    assert resp.status_code == 200

    # The access token should now be revoked (token_version bumped).
    resp = await client.get("/api/auth/me", headers=auth(data["access_token"]))
    assert resp.status_code == 401
    assert resp.json()["error_code"] == "TOKEN_REVOKED"


async def test_admin_role_assignment(client, monkeypatch):
    monkeypatch.setattr("app.core.config.settings.ADMIN_EMAILS", "admin@acme.com")
    data = await register(client, email="admin@acme.com", owner_name="Admin")
    assert data["user"]["role"] == "ADMIN"
    assert data["user"]["business_id"] is None

    # Admin has no business → business-scoped endpoints require one.
    resp = await client.get("/api/dashboard/summary", headers=auth(data["access_token"]))
    assert resp.status_code == 403
    assert resp.json()["error_code"] == "BUSINESS_REQUIRED"


async def test_short_password_rejected(client):
    resp = await client.post(
        "/api/auth/register",
        json={"email": "x@y.com", "password": "short", "business_name": "X", "owner_name": "Y"},
    )
    assert resp.status_code == 422
