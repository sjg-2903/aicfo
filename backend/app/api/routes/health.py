"""Health endpoint for load-balancer / ECS health checks."""

from datetime import datetime, timezone

from fastapi import APIRouter

from app.core.config import settings
from app.db import mongodb

router = APIRouter()


@router.get("/health", tags=["health"])
async def health() -> dict:
    mongo_status = "up"
    try:
        db = mongodb.get_db()
        await db.command("ping")
    except Exception:
        mongo_status = "down"

    return {
        "status": "ok" if mongo_status == "up" else "degraded",
        "service": settings.APP_NAME,
        "environment": settings.ENVIRONMENT,
        "version": "1.0.0",
        "mongodb": mongo_status,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }
