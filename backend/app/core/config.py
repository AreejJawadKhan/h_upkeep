import json
from typing import List

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    # --- Database ---
    DATABASE_URL: str = "sqlite:///./home_repair_log.db"
    AUTO_CREATE_TABLES: bool = True

    # --- JWT access tokens ---
    JWT_SECRET: str = "set-via-env"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 15

    # --- Refresh tokens ---
    REFRESH_TOKEN_EXPIRE_DAYS: int = 30

    # --- Verification / reset tokens ---
    VERIFICATION_TOKEN_EXPIRE_HOURS: int = 24
    PASSWORD_RESET_TOKEN_EXPIRE_HOURS: int = 2

    # --- Frontend ---
    FRONTEND_URL: str = "http://localhost:5173"

    # --- Cookie security ---
    # Set to True in production (requires HTTPS).
    COOKIE_SECURE: bool = False

    # --- CORS ---
    # Accepts a JSON array string: '["http://localhost:5173"]'
    # or comma-separated: 'http://localhost:5173,https://myapp.com'
    CORS_ORIGINS: List[str] = ["http://localhost:5173"]

    # --- Session (OAuth state signing) ---
    SESSION_SECRET_KEY: str = "set-via-env"

    # --- Email ---
    # True (default) → print emails to console instead of sending via SMTP.
    # Set to False and configure SMTP settings for real email delivery.
    MAIL_CONSOLE_MODE: bool = True
    MAIL_SERVER: str = "smtp.gmail.com"
    MAIL_PORT: int = 587
    MAIL_USERNAME: str = ""
    MAIL_PASSWORD: str = ""
    MAIL_FROM: str = "noreply@homerepairlog.com"
    MAIL_FROM_NAME: str = "HomeRepair Log"

    # --- Google OAuth 2.0 / OIDC ---
    # Leave empty to disable Google sign-in (endpoints return 503).
    GOOGLE_CLIENT_ID: str = ""
    GOOGLE_CLIENT_SECRET: str = ""
    GOOGLE_REDIRECT_URI: str = "http://localhost:8000/auth/google/callback"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @field_validator("CORS_ORIGINS", mode="before")
    @classmethod
    def parse_cors_origins(cls, v: object) -> List[str]:
        """
        Allow CORS_ORIGINS in .env as either:
          - JSON array:        '["http://localhost:5173"]'
          - Comma-separated:   'http://localhost:5173,https://example.com'
        """
        if isinstance(v, str):
            v = v.strip()
            try:
                parsed = json.loads(v)
                if isinstance(parsed, list):
                    return [str(o).strip() for o in parsed]
            except json.JSONDecodeError:
                pass
            return [o.strip() for o in v.split(",") if o.strip()]
        return v  # already a list (from default)


settings = Settings()
