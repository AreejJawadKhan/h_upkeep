from datetime import date as date_type, datetime
from enum import Enum

from pydantic import BaseModel, ConfigDict, Field

from app.schemas.maintenance import MaintenanceResponse


class ScheduleFrequency(str, Enum):
    ONE_TIME = "one_time"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class MaintenanceScheduleBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    frequency: ScheduleFrequency
    next_due_date: date_type | None = None
    reminder_enabled: bool = True


class MaintenanceScheduleCreate(MaintenanceScheduleBase):
    asset_id: int | None = None


class MaintenanceScheduleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=150)
    description: str | None = Field(default=None, max_length=2000)
    frequency: ScheduleFrequency | None = None
    next_due_date: date_type | None = None
    reminder_enabled: bool | None = None
    asset_id: int | None = None


class MaintenanceScheduleResponse(MaintenanceScheduleBase):
    id: int
    user_id: int
    home_id: int
    asset_id: int | None
    last_completed: datetime | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class MaintenanceScheduleCompleteResponse(BaseModel):
    message: str
    schedule: MaintenanceScheduleResponse
    maintenance_record: MaintenanceResponse | None

    model_config = ConfigDict(from_attributes=True)
