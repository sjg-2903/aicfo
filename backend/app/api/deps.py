"""FastAPI dependencies: database, current user, current business, roles.

The authorized business is *always* derived from the authenticated user's
record — never from any client-supplied ``business_id``.
"""

from typing import Any

import jwt as pyjwt
from bson import ObjectId
from fastapi import Depends
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.core.constants import COLLECTIONS, ROLE_ADMIN
from app.core.errors import (
    AuthenticationError,
    InvalidTokenError,
    NotFoundError,
    PermissionError,
)
from app.core.security import decode_token
from app.db import mongodb

bearer_scheme = HTTPBearer(auto_error=False)


async def get_db() -> AsyncIOMotorDatabase:
    return mongodb.get_db()


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    if credentials is None:
        raise AuthenticationError("Authentication required", "UNAUTHORIZED")
    token = credentials.credentials
    try:
        payload = decode_token(token)
    except pyjwt.ExpiredSignatureError:
        raise InvalidTokenError("Token has expired", "TOKEN_EXPIRED")
    except pyjwt.PyJWTError:
        raise InvalidTokenError("Invalid token", "INVALID_TOKEN")

    if payload.get("type") != "access":
        raise InvalidTokenError("Invalid token type", "INVALID_TOKEN")

    user_id = payload.get("sub")
    try:
        user = await db[COLLECTIONS["users"]].find_one({"_id": ObjectId(user_id)})
    except Exception:
        user = None
    if not user or not user.get("is_active", True):
        raise AuthenticationError("Account not found or inactive", "USER_INACTIVE")
    if user.get("token_version", 0) != payload.get("ver"):
        raise InvalidTokenError("Token has been revoked", "TOKEN_REVOKED")
    return user


async def get_current_business(
    user: dict = Depends(get_current_user),
    db: AsyncIOMotorDatabase = Depends(get_db),
) -> dict:
    business_id = user.get("business_id")
    if not business_id:
        raise PermissionError(
            "This account is not linked to a business", "BUSINESS_REQUIRED"
        )
    business = await db[COLLECTIONS["businesses"]].find_one({"_id": business_id})
    if not business:
        raise NotFoundError("Business not found", "BUSINESS_NOT_FOUND")
    return business


def require_role(*roles: str):
    async def dependency(user: dict = Depends(get_current_user)) -> dict:
        if user.get("role") not in roles:
            raise PermissionError("Insufficient permissions", "FORBIDDEN")
        return user

    return dependency
