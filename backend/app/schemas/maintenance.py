from enum import Enum
from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict, Field

class MaintenanceCategory(str, Enum):
    HVAC = "HVAC"
    PLUMBING = "Plumbing"
    ELECTRICAL = "Electrical"
    APPLIANCE = "Appliance"
    STRUCTURAL = "Structural"
    CLEANING = "Cleaning"
    PEST_CONTROL = "Pest Control"
    OTHER = "Other"

class MaintenanceBase(BaseModel):
    title: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    item: str = Field(
        ...,
        min_length=1,
        max_length=150,
    )

    category: MaintenanceCategory = Field(
        ...,
        min_length=1,
        max_length=50,
    )

    date: date_type

    cost: float = Field(
        ...,
        ge=0,
    )

    service_provider: str | None = Field(
        default=None,
        max_length=150,
    )

    next_due_date: date_type | None = None

    image_url: str | None = Field(
        default=None,
        max_length=500,
    )


class MaintenanceCreate(MaintenanceBase):
    pass


class MaintenanceUpdate(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    description: str | None = Field(
        default=None,
        max_length=2000,
    )

    item: str | None = Field(
        default=None,
        min_length=1,
        max_length=150,
    )

    category: MaintenanceCategory | None = Field(
        default=None,
        min_length=1,
        max_length=50,
    )

    date: date_type | None = None

    cost: float | None = Field(
        default=None,
        ge=0,
    )

    service_provider: str | None = Field(
        default=None,
        max_length=150,
    )

    next_due_date: date_type | None = None

    image_url: str | None = Field(
        default=None,
        max_length=500,
    )


class MaintenanceResponse(MaintenanceBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(
        from_attributes=True,
    )