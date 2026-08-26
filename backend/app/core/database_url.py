from __future__ import annotations

from sqlalchemy.engine.url import URL, make_url


def normalize_database_url(raw_url: str) -> URL:
    """
    Normalize the configured database URL so SQLAlchemy uses the psycopg
    driver for PostgreSQL URLs when no explicit driver is provided.

    Railway and many managed Postgres providers expose URLs like:
        postgresql://user:pass@host:5432/db

    Our app uses psycopg3, so we normalize those URLs to:
        postgresql+psycopg://user:pass@host:5432/db
    """
    url = make_url(raw_url)

    if url.get_backend_name() == "postgresql" and url.drivername == "postgresql":
        return url.set(drivername="postgresql+psycopg")

    return url


def build_postgres_url(
    *,
    host: str,
    port: str | int | None,
    user: str,
    password: str,
    database: str,
) -> URL:
    return URL.create(
        drivername="postgresql+psycopg",
        username=user,
        password=password,
        host=host,
        port=int(port) if port not in {None, ""} else None,
        database=database,
    )
