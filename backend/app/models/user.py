from datetime import datetime
from typing import List, Optional

from sqlalchemy import Boolean, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.database import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    email: Mapped[str] = mapped_column(
        String(255),
        unique=True,
        nullable=False,
        index=True,
    )

    # Nullable: Google-authenticated users may not have a local password.
    password_hash: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
    )

    # False until the user clicks the verification link sent to their email.
    # Google-authenticated users are created with email_verified=True because
    # Google has already verified ownership of the email address.
    email_verified: Mapped[bool] = mapped_column(
        Boolean,
        default=False,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=utc_now,
        onupdate=utc_now,
        nullable=False,
    )

    # --- Relationships ---

    maintenance_records = relationship(
        "MaintenanceRecord",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    auth_identities = relationship(
        "AuthIdentity",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    email_verification_tokens = relationship(
        "EmailVerificationToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    refresh_tokens = relationship(
        "RefreshToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    password_reset_tokens = relationship(
        "PasswordResetToken",
        back_populates="user",
        cascade="all, delete-orphan",
    )

    homes = relationship(
        "Home",
        back_populates="user",
        cascade="all, delete-orphan",
    )
