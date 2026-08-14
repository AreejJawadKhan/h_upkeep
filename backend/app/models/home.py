from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.database import Base


class Home(Base):
    __tablename__ = "homes"

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

    name: Mapped[str] = mapped_column(
        String(150),
        nullable=False,
    )

    address: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
    )

    property_type: Mapped[str] = mapped_column(
        String(100),
        nullable=False,
    )

    year_built: Mapped[int] = mapped_column(
        Integer,
        nullable=False,
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        nullable=False,
    )

    updated_at: Mapped[datetime] = mapped_column(
        DateTime,
        default=datetime.utcnow,
        onupdate=datetime.utcnow,
        nullable=False,
    )

    areas = relationship(
        "Area",
        back_populates="home",
        cascade="all, delete-orphan",
    )

    assets = relationship(
        "Asset",
        back_populates="home",
        cascade="all, delete-orphan",
    )

    maintenance_records = relationship(
        "MaintenanceRecord",
        back_populates="home",
        cascade="all, delete-orphan",
    )

    user = relationship(
        "User",
        back_populates="homes",
    )
