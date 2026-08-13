from datetime import datetime
from typing import Optional

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class RefreshToken(Base):
    """
    Represents a single issued refresh token.

    Security rules
    --------------
    - Only the SHA-256 hash of the raw token is persisted; the raw token is
      sent to the client over HTTPS in an HttpOnly cookie and is never stored.
    - revoked_at is set either during token rotation (a new refresh token was
      issued in exchange for this one) or during explicit logout.
    - An entry with revoked_at IS NOT NULL or expires_at < now() must NEVER
      produce a new access token.
    - If a revoked token is presented, treat it as a possible replay attack:
      revoke the entire family (future work) and reject the request.
    """

    __tablename__ = "refresh_tokens"

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

    # SHA-256 hex digest of the raw opaque token.
    token_hash: Mapped[str] = mapped_column(
        String(64),
        nullable=False,
        unique=True,
        index=True,
    )

    expires_at: Mapped[datetime] = mapped_column(
        DateTime,
        nullable=False,
    )

    # Non-null after rotation (a new token was issued) or logout.
    revoked_at: Mapped[Optional[datetime]] = mapped_column(
        DateTime,
        nullable=True,
        default=None,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    user = relationship(
        "User",
        back_populates="refresh_tokens",
    )
