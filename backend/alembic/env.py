from __future__ import annotations

import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings  # noqa: E402
from app.core.database_url import normalize_database_url  # noqa: E402
from app.db.database import Base  # noqa: E402
from app.models import (  # noqa: E402,F401
    Asset,
    Area,
    AuthIdentity,
    EmailVerificationToken,
    Home,
    MaintenanceRecord,
    PasswordResetToken,
    RefreshToken,
    User,
)

config = context.config

if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def _configure_context(connection=None) -> None:
    context.configure(
        connection=connection,
        url=str(normalize_database_url(settings.DATABASE_URL)) if connection is None else None,
        target_metadata=target_metadata,
        compare_type=True,
        render_as_batch=(connection is not None and connection.dialect.name == "sqlite"),
    )


def run_migrations_offline() -> None:
    _configure_context()
    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    connectable = create_engine(
        str(normalize_database_url(settings.DATABASE_URL)),
        poolclass=pool.NullPool,
    )

    with connectable.connect() as connection:
        _configure_context(connection=connection)
        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
