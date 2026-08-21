"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.exceptions import RequestValidationError
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from pymongo.errors import DuplicateKeyError

from app.api.response import error as error_body
from app.api.routes import ROUTERS
from app.api.routes.health import router as health_router
from app.core.config import settings
from app.core.errors import AppError
from app.core.logging import configure_logging
from app.db import mongodb
from app.db.indexes import create_indexes

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    configure_logging()
    await mongodb.connect()
    await create_indexes(mongodb.get_db())
    logger.info("Application startup complete (env=%s)", settings.ENVIRONMENT)
    yield
    await mongodb.disconnect()


app = FastAPI(
    title=settings.APP_NAME,
    description=(
        "Production REST API for the AI CFO & Financial Advisor for MSMEs — "
        "authentication, multi-tenant financial data, deterministic financial "
        "health, forecasting, risk analysis, loan readiness, recommendations, "
        "alerts, CSV import and Grok-powered AI CFO explanations."
    ),
    version="1.0.0",
    lifespan=lifespan,
    docs_url="/docs",
    redoc_url="/redoc",
    openapi_url="/openapi.json",
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# ── Routers ──────────────────────────────────────────────────────────────────
app.include_router(health_router)
for router in ROUTERS:
    app.include_router(router, prefix=settings.API_V1_PREFIX)


@app.get("/", include_in_schema=False)
async def root() -> dict:
    return {
        "service": settings.APP_NAME,
        "version": "1.0.0",
        "docs": "/docs",
        "health": "/health",
    }


# ── Centralized exception handlers ───────────────────────────────────────────
@app.exception_handler(AppError)
async def app_error_handler(request: Request, exc: AppError):
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(exc.message, exc.error_code, exc.details),
    )


@app.exception_handler(RequestValidationError)
async def validation_error_handler(request: Request, exc: RequestValidationError):
    details = [
        {"field": ".".join(str(loc) for loc in err.get("loc", [])[1:]), "message": err.get("msg", "")}
        for err in exc.errors()
    ]
    return JSONResponse(
        status_code=422,
        content=error_body("Validation failed", "VALIDATION_ERROR", details),
    )


@app.exception_handler(DuplicateKeyError)
async def duplicate_key_handler(request: Request, exc: DuplicateKeyError):
    return JSONResponse(
        status_code=409,
        content=error_body("A record with the same unique value already exists", "CONFLICT"),
    )


@app.exception_handler(HTTPException)
async def http_exception_handler(request: Request, exc: HTTPException):
    # Keep routing errors on the same envelope as everything else.
    return JSONResponse(
        status_code=exc.status_code,
        content=error_body(str(exc.detail), "HTTP_ERROR", None),
    )


@app.exception_handler(404)
async def not_found_handler(request: Request, exc):
    return JSONResponse(
        status_code=404,
        content=error_body("Resource not found", "NOT_FOUND"),
    )


@app.exception_handler(405)
async def method_not_allowed_handler(request: Request, exc):
    return JSONResponse(
        status_code=405,
        content=error_body("Method not allowed", "METHOD_NOT_ALLOWED"),
    )


@app.exception_handler(Exception)
async def unhandled_error_handler(request: Request, exc: Exception):
    # Never leak the stack trace or internals.
    if "duplicate key" in str(exc).lower():
        return JSONResponse(
            status_code=409,
            content=error_body("A record with the same unique value already exists", "CONFLICT"),
        )
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content=error_body("Internal server error", "INTERNAL_ERROR"),
    )
