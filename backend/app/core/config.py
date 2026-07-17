"""
app/core/config.py
Centralised application configuration loaded from environment variables.

Uses pydantic-settings so every required value is validated at startup —
missing variables raise a clear error before the server accepts any requests.
"""

from __future__ import annotations

import json
from functools import lru_cache

from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # ── Application metadata ────────────────────────────────────────────────
    app_name: str = Field(default="Medicare API")
    app_env: str = Field(default="development")
    app_version: str = Field(default="1.0.0")
    debug: bool = Field(default=False)

    # ── API routing ─────────────────────────────────────────────────────────
    api_v1_prefix: str = Field(default="/api/v1")

    # ── CORS ────────────────────────────────────────────────────────────────
    backend_cors_origins: list[str] = Field(
        default=["http://localhost:3000", "http://127.0.0.1:3000"]
    )
    frontend_url: str = Field(default="http://localhost:3000")

    # ── Supabase (required) ─────────────────────────────────────────────────
    supabase_url: str = Field(...)
    supabase_anon_key: str = Field(...)
    supabase_service_role_key: str = Field(...)

    # ── Gemini AI ───────────────────────────────────────────────────────────
    gemini_api_key: str | None = Field(default=None)
    gemini_model: str = Field(default="gemini-2.5-flash")
    ai_provider: str = Field(default="gemini")
    ai_request_timeout_seconds: int = Field(default=30)
    ai_max_input_characters: int = Field(default=2000)
    ai_max_history_messages: int = Field(default=10)
    ai_temperature: float = Field(default=0.2)
    ai_assistant_enabled: bool = Field(default=True)
    ai_rate_limit_per_minute: int = Field(default=10)
    ai_rate_limit_per_day: int = Field(default=100)
    ai_conversation_retention_days: int = Field(default=30)

    # ── Hugging Face (optional, disabled by default) ─────────────────────────
    hf_token: str | None = Field(default=None)
    hf_chat_model: str | None = Field(default=None)
    hf_intent_model: str | None = Field(default=None)
    hf_provider_enabled: bool = Field(default=False)

    # ── ML Severity Prediction ──────────────────────────────────────────────
    ml_severity_enabled: bool = Field(default=True)
    ml_severity_confidence_threshold: float = Field(default=0.65)
    ml_severity_rate_limit_per_minute: int = Field(default=10)
    hf_severity_enabled: bool = Field(default=False)
    hf_zero_shot_model: str | None = Field(default=None)
    hf_severity_model: str | None = Field(default=None)

    # ── Geoapify Places API ─────────────────────────────────────────────────
    geoapify_enabled: bool = Field(default=True)
    geoapify_api_key: str | None = Field(default=None)
    geoapify_timeout_seconds: int = Field(default=10)

    # ── Twilio (optional, disabled by default) ──────────────────────────────
    twilio_enabled: bool = Field(default=False)
    twilio_account_sid: str | None = Field(default=None)
    twilio_auth_token: str | None = Field(default=None)
    twilio_phone_number: str | None = Field(default=None)
    twilio_messaging_service_sid: str | None = Field(default=None)
    twilio_status_callback_url: str | None = Field(default=None)
    twilio_call_twiml_url: str | None = Field(default=None)
    twilio_timeout_seconds: int = Field(default=15)

    # ── Pydantic-settings config ─────────────────────────────────────────────
    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
        case_sensitive=False,
        extra="ignore",
    )

    # ── Validators ───────────────────────────────────────────────────────────

    @field_validator("backend_cors_origins", mode="before")
    @classmethod
    def _parse_cors_origins(cls, value: object) -> list[str]:
        if isinstance(value, list):
            return value
        if isinstance(value, str):
            stripped = value.strip()
            if stripped.startswith("["):
                return json.loads(stripped)
            return [o.strip() for o in stripped.split(",") if o.strip()]
        return list(value)  # type: ignore[arg-type]

    @field_validator("supabase_url", "supabase_anon_key", "supabase_service_role_key")
    @classmethod
    def _must_not_be_empty(cls, value: str, info: object) -> str:
        if not value or not value.strip():
            raise ValueError(
                f"{info.field_name} must not be empty. "  # type: ignore[union-attr]
                "Check your backend/.env file."
            )
        return value.strip()

    @field_validator("ai_temperature")
    @classmethod
    def _validate_temperature(cls, v: float) -> float:
        if not (0.0 <= v <= 2.0):
            raise ValueError("ai_temperature must be between 0.0 and 2.0")
        return v

    @field_validator("ai_max_input_characters", "ai_max_history_messages", "ai_request_timeout_seconds")
    @classmethod
    def _validate_positive_limits(cls, v: int, info: object) -> int:
        if v <= 0:
            raise ValueError(f"{info.field_name} must be positive")  # type: ignore[union-attr]
        return v

    @field_validator("geoapify_api_key")
    @classmethod
    def _validate_geoapify_key(cls, v: str | None, info: object) -> str | None:
        if v is not None and not v.strip():
            raise ValueError("geoapify_api_key must not be empty when provided")
        return v.strip() if v else None

    @field_validator("geoapify_timeout_seconds")
    @classmethod
    def _validate_geoapify_timeout(cls, v: int) -> int:
        if v <= 0:
            raise ValueError("geoapify_timeout_seconds must be positive")
        return v

    def __repr__(self) -> str:
        """Hide sensitive values from logs and representations."""
        safe_dict = self.model_dump()
        safe_dict["supabase_anon_key"] = "***HIDDEN***"
        safe_dict["supabase_service_role_key"] = "***HIDDEN***"
        safe_dict["gemini_api_key"] = "***HIDDEN***" if safe_dict.get("gemini_api_key") else None
        safe_dict["hf_token"] = "***HIDDEN***" if safe_dict.get("hf_token") else None
        safe_dict["geoapify_api_key"] = "***HIDDEN***" if safe_dict.get("geoapify_api_key") else None
        return f"Settings({safe_dict})"


@lru_cache
def get_settings() -> Settings:
    """Return a cached Settings instance.

    lru_cache ensures the .env file is parsed only once per process,
    regardless of how many modules call get_settings().
    """
    return Settings()
