from datetime import date as date_type, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.core.time import utc_now
from app.db.database import Base


class Asset(Base):
    __tablename__ = "assets"

    id: Mapped[int] = mapped_column(
        Integer,
        primary_key=True,
        index=True,
    )

    home_id: Mapped[int] = mapped_column(
        ForeignKey("homes.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    area_id: Mapped[int | None] = mapped_column(
        ForeignKey("areas.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    category: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    manufacturer: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    model: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    serial_number: Mapped[str | None] = mapped_column(
        String(150),
        nullable=True,
    )

    purchase_date: Mapped[date_type | None] = mapped_column(
        Date,
        nullable=True,
    )

    installation_date: Mapped[date_type | None] = mapped_column(
        Date,
        nullable=True,
    )

    expected_lifespan: Mapped[int | None] = mapped_column(
        Integer,
        nullable=True,
    )

    notes: Mapped[str | None] = mapped_column(
        Text,
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

    home = relationship(
        "Home",
        back_populates="assets",
    )

    area = relationship(
        "Area",
        back_populates="assets",
    )

    maintenance_records = relationship(
        "MaintenanceRecord",
        back_populates="asset",
    )
