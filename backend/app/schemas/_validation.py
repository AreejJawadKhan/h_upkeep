from __future__ import annotations

from datetime import date as date_type, datetime


def normalize_date_only(value):
    if value in {None, ""}:
        return None

    if isinstance(value, datetime):
        return value.date()

    if isinstance(value, date_type):
        return value

    if isinstance(value, str):
        text = value.strip()
        if not text:
            return None
        if "T" in text or ":" in text:
            raise ValueError("must be a date-only value in YYYY-MM-DD format")
        try:
            return date_type.fromisoformat(text)
        except ValueError as exc:
            raise ValueError("must be a valid date in YYYY-MM-DD format") from exc

    raise ValueError("must be a date-only value in YYYY-MM-DD format")
