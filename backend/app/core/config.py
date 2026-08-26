import json
from typing import List, Literal

from pydantic import field_validator, model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.core.database_url import build_postgres_url


class Settings(BaseSettings):
    # --- Runtime mode ---
    APP_ENV: Literal["development", "test", "production"] = "development"

    # --- Database ---
    DATABASE_URL: str = "sqlite:///./home_repair_log.db"
    AUTO_CREATE_TABLES: bool = True
    PGHOST: str = ""
    PGPORT: str = ""
    PGUSER: str = ""
    PGPASSWORD: str = ""
    PGDATABASE: str = ""

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

    # --- Cloudinary ---
    CLOUDINARY_CLOUD_NAME: str = ""
    CLOUDINARY_API_KEY: str = ""
    CLOUDINARY_API_SECRET: str = ""
    CLOUDINARY_UPLOAD_FOLDER: str = "home-repair-log"

    model_config = SettingsConfigDict(
        env_file=".env",
        extra="ignore",
    )

    @property
    def is_production(self) -> bool:
        return self.APP_ENV == "production"

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

    @field_validator("CORS_ORIGINS")
    @classmethod
    def validate_cors_origins(cls, v: List[str]) -> List[str]:
        cleaned = [origin.strip() for origin in v if origin and origin.strip()]
        if not cleaned:
            raise ValueError("CORS_ORIGINS must contain at least one origin")
        return cleaned

    @model_validator(mode="after")
    def validate_production_settings(self) -> "Settings":
        if self.PGHOST and self.PGUSER and self.PGDATABASE and self.PGPASSWORD:
            self.DATABASE_URL = str(
                build_postgres_url(
                    host=self.PGHOST,
                    port=self.PGPORT,
                    user=self.PGUSER,
                    password=self.PGPASSWORD,
                    database=self.PGDATABASE,
                )
            )

        if not self.is_production:
            return self

        errors: list[str] = []

        if self.DATABASE_URL.startswith("sqlite:"):
            errors.append("DATABASE_URL must point to PostgreSQL in production")

        if self.JWT_SECRET in {"", "set-via-env"}:
            errors.append("JWT_SECRET must be set to a strong random value")

        if self.SESSION_SECRET_KEY in {"", "set-via-env"}:
            errors.append("SESSION_SECRET_KEY must be set to a strong random value")

        if not self.COOKIE_SECURE:
            errors.append("COOKIE_SECURE must be true in production")

        if self.MAIL_CONSOLE_MODE:
            errors.append("MAIL_CONSOLE_MODE must be false in production")

        if any(origin == "*" for origin in self.CORS_ORIGINS):
            errors.append("CORS_ORIGINS must not include wildcard origins in production")

        if any(origin.startswith("http://localhost") for origin in self.CORS_ORIGINS):
            errors.append("CORS_ORIGINS must not include localhost origins in production")

        if not self.FRONTEND_URL.startswith("https://"):
            errors.append("FRONTEND_URL must use HTTPS in production")

        if not self.GOOGLE_CLIENT_ID or not self.GOOGLE_CLIENT_SECRET:
            errors.append("GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET must be set in production")

        if self.GOOGLE_REDIRECT_URI and not self.GOOGLE_REDIRECT_URI.startswith("https://"):
            errors.append("GOOGLE_REDIRECT_URI must use HTTPS in production")

        if errors:
            raise ValueError("Production settings invalid: " + "; ".join(errors))

        return self


settings = Settings()
