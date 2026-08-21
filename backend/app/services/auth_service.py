"""Authentication service: register, login, refresh, logout."""

from typing import Any, Optional

from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.config import settings
from app.core.constants import COLLECTIONS, ROLE_ADMIN, ROLE_BUSINESS_OWNER
from app.core.errors import AuthenticationError, ConflictError, InvalidTokenError
from app.core.security import (
    create_access_token,
    create_refresh_token,
    decode_token,
    hash_password,
    verify_password,
)
from app.schemas.auth import LoginRequest, RegisterRequest
from app.utils.dates import utcnow
from app.utils.serialize import serialize_value

import jwt as pyjwt


def _issue_tokens(user: dict) -> dict:
    business_id = str(user["business_id"]) if user.get("business_id") else None
    return {
        "access_token": create_access_token(
            str(user["_id"]), user["role"], user.get("token_version", 0), business_id
        ),
        "refresh_token": create_refresh_token(
            str(user["_id"]), user["role"], user.get("token_version", 0), business_id
        ),
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


def _user_out(user: dict) -> dict:
    return {
        "id": str(user["_id"]),
        "email": user["email"],
        "role": user["role"],
        "owner_name": user.get("owner_name", ""),
        "business_id": str(user["business_id"]) if user.get("business_id") else None,
        "created_at": user.get("created_at"),
    }


async def register(db: AsyncIOMotorDatabase, data: RegisterRequest) -> dict:
    users = db[COLLECTIONS["users"]]
    businesses = db[COLLECTIONS["businesses"]]

    email = data.email.lower()
    if await users.find_one({"email": email}):
        raise ConflictError("An account with this email already exists", "EMAIL_EXISTS")

    role = ROLE_ADMIN if email in settings.admin_emails_list else ROLE_BUSINESS_OWNER
    now = utcnow()
    user_id = ObjectId()

    user_doc: dict[str, Any] = {
        "_id": user_id,
        "email": email,
        "hashed_password": hash_password(data.password),
        "role": role,
        "owner_name": data.owner_name,
        "business_id": None,
        "is_active": True,
        "token_version": 0,
        "created_at": now,
        "updated_at": now,
    }

    if role == ROLE_BUSINESS_OWNER:
        business_id = ObjectId()
        user_doc["business_id"] = business_id
        await users.insert_one(user_doc)
        try:
            await businesses.insert_one(
                {
                    "_id": business_id,
                    "owner_id": user_id,
                    "business_name": data.business_name,
                    "business_type": data.business_type or "",
                    "industry": data.industry or "",
                    "email": email,
                    "currency": "INR",
                    "fiscal_year_start": "04-01",
                    "created_at": now,
                    "updated_at": now,
                }
            )
        except Exception:
            await users.delete_one({"_id": user_id})
            raise
    else:
        await users.insert_one(user_doc)

    tokens = _issue_tokens(user_doc)
    return {**tokens, "user": _user_out(user_doc)}


async def login(db: AsyncIOMotorDatabase, data: LoginRequest) -> dict:
    email = data.email.lower()
    user = await db[COLLECTIONS["users"]].find_one({"email": email})
    if not user or not verify_password(data.password, user.get("hashed_password", "")):
        raise AuthenticationError("Invalid email or password", "INVALID_CREDENTIALS")
    if not user.get("is_active", True):
        raise AuthenticationError("Account is deactivated", "USER_INACTIVE")
    tokens = _issue_tokens(user)
    return {**tokens, "user": _user_out(user)}


async def refresh(db: AsyncIOMotorDatabase, refresh_token: str) -> dict:
    try:
        payload = decode_token(refresh_token)
    except pyjwt.ExpiredSignatureError:
        raise InvalidTokenError("Refresh token has expired", "TOKEN_EXPIRED")
    except pyjwt.PyJWTError:
        raise InvalidTokenError("Invalid refresh token", "INVALID_TOKEN")

    if payload.get("type") != "refresh":
        raise InvalidTokenError("Invalid token type", "INVALID_TOKEN")

    user = await db[COLLECTIONS["users"]].find_one({"_id": ObjectId(payload["sub"])})
    if not user or not user.get("is_active", True):
        raise AuthenticationError("Account not found or inactive", "USER_INACTIVE")
    if user.get("token_version", 0) != payload.get("ver"):
        raise InvalidTokenError("Refresh token has been revoked", "TOKEN_REVOKED")

    tokens = _issue_tokens(user)
    return {**tokens, "user": _user_out(user)}


async def logout(db: AsyncIOMotorDatabase, user_id: Any) -> None:
    """Revoke all outstanding tokens by bumping the token version."""
    await db[COLLECTIONS["users"]].update_one(
        {"_id": user_id},
        {"$inc": {"token_version": 1}, "$set": {"updated_at": utcnow()}},
    )


async def get_me(db: AsyncIOMotorDatabase, user_id: Any) -> dict:
    user = await db[COLLECTIONS["users"]].find_one({"_id": user_id})
    if not user:
        raise AuthenticationError("Account not found", "USER_INACTIVE")
    return _user_out(serialize_value(user))
