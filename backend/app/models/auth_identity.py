from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class AuthIdentity(Base):
    """
    Stores per-provider identity records for a user.

    A single User may have multiple AuthIdentity rows (one per provider, e.g.
    "local" and "google"). This prevents provider-specific columns from
    accumulating on the User table and cleanly supports future identity
    providers.

    Columns
    -------
    provider         : Identity provider name ("local", "google", ...).
    provider_user_id : The stable, opaque user identifier issued by the
                       provider. For "local" this is the user's email;
                       for "google" it is the Google subject claim.
    """

    __tablename__ = "auth_identities"

    __table_args__ = (
        # Each (provider, provider_user_id) pair must be globally unique.
        UniqueConstraint(
            "provider",
            "provider_user_id",
            name="uq_auth_identities_provider_user_id",
        ),
    )

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

    # e.g. "local", "google"
    provider: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    # Stable opaque ID from the provider (Google subject, local email, etc.)
    provider_user_id: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    # Relationship back to the owning User
    user = relationship(
        "User",
        back_populates="auth_identities",
    )
