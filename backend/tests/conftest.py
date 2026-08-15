from __future__ import annotations

import secrets
from pathlib import Path

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from app.api import auth as auth_api
from app.core.config import settings
from app.core.limiter import limiter
from app.db.database import Base


@pytest.fixture()
def app_client(tmp_path, monkeypatch):
    db_path = Path(tmp_path) / "test.db"
    db_url = f"sqlite:///{db_path.as_posix()}"

    monkeypatch.setattr(settings, "DATABASE_URL", db_url)
    monkeypatch.setattr(settings, "AUTO_CREATE_TABLES", True)
    monkeypatch.setattr(settings, "JWT_SECRET", secrets.token_hex(32))
    monkeypatch.setattr(settings, "SESSION_SECRET_KEY", secrets.token_hex(32))
    monkeypatch.setattr(settings, "FRONTEND_URL", "http://testserver")
    monkeypatch.setattr(settings, "CORS_ORIGINS", ["http://testserver"])
    monkeypatch.setattr(settings, "MAIL_CONSOLE_MODE", True)
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_ID", "")
    monkeypatch.setattr(settings, "GOOGLE_CLIENT_SECRET", "")

    engine = create_engine(
        db_url,
        connect_args={"check_same_thread": False},
    )
    TestingSessionLocal = sessionmaker(
        autocommit=False,
        autoflush=False,
        bind=engine,
    )

    monkeypatch.setattr("app.db.database.engine", engine, raising=False)
    monkeypatch.setattr("app.db.database.SessionLocal", TestingSessionLocal, raising=False)
    monkeypatch.setattr("app.main.engine", engine, raising=False)

    limiter.reset()
    Base.metadata.create_all(bind=engine)

    state = {
        "verification_tokens": [],
        "password_reset_tokens": [],
    }

    async def _capture_verification_email(email: str, raw_token: str):
        state["verification_tokens"].append(raw_token)

    async def _capture_password_reset_email(email: str, raw_token: str):
        state["password_reset_tokens"].append(raw_token)

    monkeypatch.setattr(auth_api, "send_verification_email", _capture_verification_email)
    monkeypatch.setattr(auth_api, "send_password_reset_email", _capture_password_reset_email)

    from app.main import app

    with TestClient(app) as client:
        yield client, TestingSessionLocal, state
