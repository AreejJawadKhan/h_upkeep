from __future__ import annotations

from app.core.config import settings
from app.core.database_url import normalize_database_url


def main() -> None:
    url = normalize_database_url(settings.DATABASE_URL)

    print("DATABASE TARGET DIAGNOSTIC")
    print(f"APP_ENV={settings.APP_ENV}")
    print(f"driver={url.drivername}")
    print(f"user={url.username or ''}")
    print(f"host={url.host or ''}")
    print(f"port={url.port or ''}")
    print(f"database={url.database or ''}")
    print(f"has_password={'yes' if url.password else 'no'}")
    print(f"raw_scheme={url.get_backend_name()}")


if __name__ == "__main__":
    main()
