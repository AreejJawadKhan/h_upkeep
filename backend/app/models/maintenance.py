from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, Float, ForeignKey, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.database import Base


class MaintenanceRecord(Base):
    __tablename__ = "maintenance_records"

    __table_args__ = (
        Index("ix_maintenance_records_user_home_date", "user_id", "home_id", "date"),
        Index("ix_maintenance_records_user_category_date", "user_id", "category", "date"),
        Index("ix_maintenance_records_user_asset_date", "user_id", "asset_id", "date"),
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

    asset_id: Mapped[int | None] = mapped_column(
        ForeignKey("assets.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    title: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    description: Mapped[str | None] = mapped_column(
        Text,
        nullable=True,
    )

    item: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(50),
        nullable=False,
    )

    date: Mapped[date_type] = mapped_column(
        Date,
        nullable=False,
    )

    cost: Mapped[float] = mapped_column(
        Float,
        nullable=False,
    )

    service_provider: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    next_due_date: Mapped[date_type | None] = mapped_column(
        Date,
        nullable=True,
    )

    image_url: Mapped[str | None] = mapped_column(
        String(500),
        nullable=True,
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
        back_populates="maintenance_records",
    )

    home = relationship(
        "Home",
        back_populates="maintenance_records",
    )

    asset = relationship(
        "Asset",
        back_populates="maintenance_records",
    )
