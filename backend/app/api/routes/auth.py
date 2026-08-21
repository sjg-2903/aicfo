"""Authentication routes."""

from fastapi import APIRouter, Depends
from motor.motor_asyncio import AsyncIOMotorDatabase

from app.api.deps import get_current_user, get_db
from app.api.response import ok
from app.schemas.auth import LoginRequest, RefreshRequest, RegisterRequest
from app.services import auth_service
from app.services.audit_service import record

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", status_code=201)
async def register(payload: RegisterRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.register(db, payload)
    return ok(result, "Account created")


@router.post("/login")
async def login(payload: LoginRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.login(db, payload)
    return ok(result, "Login successful")


@router.post("/refresh")
async def refresh(payload: RefreshRequest, db: AsyncIOMotorDatabase = Depends(get_db)):
    result = await auth_service.refresh(db, payload.refresh_token)
    return ok(result, "Token refreshed")


@router.post("/logout")
async def logout(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    await auth_service.logout(db, user["_id"])
    await record(db, business_id=user.get("business_id"), user_id=user["_id"], action="logout", entity="user", entity_id=user["_id"])
    return ok(message="Logged out")


@router.get("/me")
async def me(
    db: AsyncIOMotorDatabase = Depends(get_db),
    user: dict = Depends(get_current_user),
):
    result = await auth_service.get_me(db, user["_id"])
    return ok(result)
