from __future__ import annotations

import sys
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parents[1]
if str(BASE_DIR) not in sys.path:
    sys.path.insert(0, str(BASE_DIR))

from app.core.config import settings
from app.core.database_url import normalize_database_url


def main() -> None:
    url = normalize_database_url(settings.get_database_url())

    print("DATABASE TARGET DIAGNOSTIC")
    print(f"APP_ENV={settings.APP_ENV}")
    print(f"driver={url.drivername}")
    print(f"user={url.username or ''}")
    print(f"host={url.host or ''}")
    print(f"port={url.port or ''}")
    print(f"database={url.database or ''}")
    print("password=redacted" if url.password else "password=missing")
    print(f"raw_scheme={url.get_backend_name()}")


if __name__ == "__main__":
    main()
