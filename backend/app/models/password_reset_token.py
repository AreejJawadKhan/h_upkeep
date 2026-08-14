from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.database import Base


class PasswordResetToken(Base):
    """
    A single-use, time-limited token for resetting a user's password.

    Security rules
    --------------
    - Only the SHA-256 hash of the raw token is stored; the raw token is
      delivered to the user's email and never written to the database.
    - used_at is set on first successful use; any subsequent attempt with the
      same token must be rejected even if the token has not yet expired.
    - Tokens are short-lived (default 2 hours) to limit exposure.
    - On successful reset, all existing refresh tokens for the user should be
      revoked to invalidate active sessions that may belong to an attacker.
    """

    __tablename__ = "password_reset_tokens"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # SHA-256 hex digest of the raw reset token.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
    )

    # Non-null after the first (and only valid) use.
    used_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
        default=None,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="password_reset_tokens",
    )
