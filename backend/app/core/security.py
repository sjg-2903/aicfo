"""Password hashing (bcrypt) and JWT token creation / decoding."""

import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Dict, Optional

import bcrypt
import jwt

from app.core.config import settings

ACCESS_TOKEN_TYPE = "access"
REFRESH_TOKEN_TYPE = "refresh"


def _utcnow() -> datetime:
    return datetime.now(timezone.utc)


# ── Password hashing ─────────────────────────────────────────────────────────
def hash_password(password: str) -> str:
    if not password or len(password) < 8:
        raise ValueError("Password must be at least 8 characters long")
    return bcrypt.hashpw(password.encode("utf-8"), bcrypt.gensalt()).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return bcrypt.checkpw(plain_password.encode("utf-8"), hashed_password.encode("utf-8"))
    except (ValueError, TypeError):
        return False


# ── JWT ──────────────────────────────────────────────────────────────────────
def create_token(
    *,
    subject: str,
    role: str,
    token_type: str,
    token_version: int,
    business_id: Optional[str] = None,
    expires_delta: timedelta,
) -> str:
    now = _utcnow()
    payload: Dict[str, Any] = {
        "sub": subject,
        "role": role,
        "type": token_type,
        "ver": token_version,
        "jti": uuid.uuid4().hex,
        "iat": now,
        "exp": now + expires_delta,
    }
    if business_id:
        payload["bid"] = business_id
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)


def create_access_token(
    subject: str,
    role: str,
    token_version: int,
    business_id: Optional[str] = None,
) -> str:
    return create_token(
        subject=subject,
        role=role,
        token_type=ACCESS_TOKEN_TYPE,
        token_version=token_version,
        business_id=business_id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES),
    )


def create_refresh_token(
    subject: str,
    role: str,
    token_version: int,
    business_id: Optional[str] = None,
) -> str:
    return create_token(
        subject=subject,
        role=role,
        token_type=REFRESH_TOKEN_TYPE,
        token_version=token_version,
        business_id=business_id,
        expires_delta=timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS),
    )


def decode_token(token: str) -> Dict[str, Any]:
    """Decode and validate a JWT. Raises jwt.PyJWTError on failure."""
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
