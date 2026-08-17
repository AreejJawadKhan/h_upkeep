from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.database import Base


class Warranty(Base):
    __tablename__ = "warranties"

    __table_args__ = (
        Index("ix_warranties_user_home_expiration", "user_id", "home_id", "expiration_date"),
        Index("ix_warranties_user_asset_expiration", "user_id", "asset_id", "expiration_date"),
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

    home_id: Mapped[int] = mapped_column(
        ForeignKey("homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    asset_id: Mapped[int] = mapped_column(
        ForeignKey("assets.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    document_id: Mapped[int | None] = mapped_column(
        ForeignKey("maintenance_documents.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    provider: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    coverage_details: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    start_date: Mapped[date_type] = mapped_column(
        Date,
        nullable=False,
    )

    expiration_date: Mapped[date_type] = mapped_column(
        Date,
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

    user = relationship(
        "User",
        back_populates="warranties",
    )

    home = relationship(
        "Home",
        back_populates="warranties",
    )

    asset = relationship(
        "Asset",
        back_populates="warranties",
    )

    document = relationship(
        "MaintenanceDocument",
        back_populates="warranties",
    )
