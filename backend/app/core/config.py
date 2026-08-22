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

    # ── AI narrative provider (optional) ──────────────────────────────────
    # Google Gemini or OpenAI is used to explain / summarize trusted backend
    # output and answer chat requests. Financial calculations, forecasts,
    # risk scores and deterministic recommendation rules stay in Python.
    # Gemini is the primary default provider, with OpenAI as secondary failover.
    # With no configured API key, callers use deterministic output.
    # See AI_PROVIDER_SETUP.md for setup and data-handling guidance.
    LLM_PROVIDER: str = "auto"  # auto (Gemini first, then OpenAI), gemini, or openai
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-3.6-flash"
    GEMINI_BASE_URL: str = "https://generativelanguage.googleapis.com/v1beta"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_MODEL: str = "gpt-4.1-mini"
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    LLM_TIMEOUT_SECONDS: float = Field(default=90.0, ge=5.0, le=3600.0)
    LLM_MAX_RETRIES: int = Field(default=2, ge=0, le=5)

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
