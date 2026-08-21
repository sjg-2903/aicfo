"""Application configuration loaded from environment variables / .env file."""

from functools import lru_cache
from typing import List, Optional

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

    # ── LLM provider (optional) ────────────────────────────────────────────
    # Which provider powers the AI narrative / document extraction.
    #   "openai" → any OpenAI-compatible Chat Completions endpoint
    #              (OpenAI, DeepSeek, Groq, OpenRouter, Together, Mistral,
    #               Azure OpenAI, vLLM / Ollama, …). Set OPENAI_BASE_URL,
    #               OPENAI_MODEL and OPENAI_API_KEY accordingly.
    #   "gemini" → Google Gemini (legacy).
    # When unset / no key configured, the AI CFO uses deterministic
    # explanations built from the trusted backend calculations (no fake numbers).
    LLM_PROVIDER: str = "openai"
    OPENAI_API_KEY: Optional[str] = None
    OPENAI_BASE_URL: str = "https://api.openai.com/v1"
    OPENAI_MODEL: str = "gpt-4o-mini"
    OPENAI_IMAGE_MODEL: str = "gpt-image-1"

    # ── Gemini (legacy, optional) ──────────────────────────────────────────
    GEMINI_API_KEY: Optional[str] = None
    GEMINI_MODEL: str = "gemini-2.0-flash"
    GEMINI_IMAGE_MODEL: str = "gemini-2.0-flash-preview-image-generation"

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
