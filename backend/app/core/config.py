"""Application configuration loaded from environment variables / .env file."""

from functools import lru_cache
from typing import List, Optional

from pydantic import Field
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Application ────────────────────────────────────────────────────────
    APP_NAME: str = "AI CFO & Financial Advisor for MSMEs"
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    LOG_LEVEL: str = "INFO"
    API_V1_PREFIX: str = "/api"

    # ── MongoDB ────────────────────────────────────────────────────────────
    MONGODB_URI: str = "mongodb://localhost:27017"
    MONGODB_DB_NAME: str = "aicfo"

    # ── Authentication / JWT ───────────────────────────────────────────────
    JWT_SECRET: str = "dev-only-insecure-secret-change-me"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    REFRESH_TOKEN_EXPIRE_DAYS: int = 7

    # ── AWS Bedrock (optional narrative layer) ─────────────────────────────
    # Bedrock is intentionally used only to explain / summarize trusted backend
    # output and to answer chat requests. Financial calculations, forecasts,
    # risk scoring and deterministic recommendation rules remain in Python.
    # Credentials follow boto3's standard chain: explicit keys below, a named
    # AWS_PROFILE, or an attached IAM role. When no credentials resolve,
    # callers fall back to deterministic explanations generated from the same
    # calculated data. See AWS_BEDROCK_SETUP.md for the full walkthrough.
    AWS_ACCESS_KEY_ID: Optional[str] = None
    AWS_SECRET_ACCESS_KEY: Optional[str] = None
    AWS_SESSION_TOKEN: Optional[str] = None  # only for temporary credentials (SSO / assumed roles)
    AWS_PROFILE: Optional[str] = None  # use a profile from ~/.aws/credentials instead of keys
    AWS_REGION: str = "us-east-1"
    BEDROCK_MODEL_ID: str = "anthropic.claude-sonnet-4-20250514-v1:0"
    BEDROCK_TIMEOUT_SECONDS: float = Field(default=90.0, ge=5.0, le=3600.0)
    BEDROCK_MAX_RETRIES: int = Field(default=2, ge=0, le=5)

    # ── CORS / security ────────────────────────────────────────────────────
    CORS_ORIGINS: str = "http://localhost:5173,http://localhost:3000"

    # ── Roles ──────────────────────────────────────────────────────────────
    ADMIN_EMAILS: str = ""

    # ── Demo mode ──────────────────────────────────────────────────────────
    DEMO_MODE: bool = False

    # ── Guard-rails / analytics ────────────────────────────────────────────
    MAX_IMPORT_ROWS: int = 10000
    FORECAST_MIN_HISTORY_DAYS: int = 14
    FORECAST_HORIZON_DAYS: int = 30
    # Minimum distinct days of data needed before a trend model is trusted.
    LOW_CONFIDENCE_THRESHOLD_DAYS: int = 7

    @property
    def cors_origins_list(self) -> List[str]:
        return [o.strip() for o in self.CORS_ORIGINS.split(",") if o.strip()]

    @property
    def admin_emails_list(self) -> List[str]:
        return [e.strip().lower() for e in self.ADMIN_EMAILS.split(",") if e.strip()]

    @property
    def is_production(self) -> bool:
        return self.ENVIRONMENT.lower() in {"production", "prod"}


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
