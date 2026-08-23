from datetime import date as date_type, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict

from app.schemas.analytics import SpendingOverviewResponse


class DashboardUpcomingItem(BaseModel):
    kind: Literal["maintenance", "schedule"]
    title: str
    description: str
    due_date: date_type | None
    home_id: int
    home_name: str
    asset_id: int | None
    asset_name: str | None
    status: Literal["overdue", "due_soon", "on_track"]
    source_id: int

    model_config = ConfigDict(from_attributes=True)


class DashboardWarrantyAlert(BaseModel):
    status: Literal["expired", "expiring_soon"]
    provider: str
    asset_name: str
    home_id: int
    home_name: str
    expiration_date: date_type
    source_id: int
    document_id: int | None

    model_config = ConfigDict(from_attributes=True)


class DashboardActivityItem(BaseModel):
    kind: Literal["maintenance", "schedule", "document", "warranty"]
    title: str
    description: str
    timestamp: datetime
    home_id: int
    home_name: str
    asset_id: int | None
    asset_name: str | None
    source_id: int

    model_config = ConfigDict(from_attributes=True)


class DashboardHomeHealthItem(BaseModel):
    home_id: int
    home_name: str
    asset_count: int
    maintenance_record_count: int
    schedule_count: int
    warranty_count: int
    due_soon_count: int
    overdue_count: int
    expiring_soon_count: int
    expired_warranty_count: int
    status_label: str
    summary: str

    model_config = ConfigDict(from_attributes=True)


class DashboardOverviewResponse(BaseModel):
    scope_home_id: int | None
    scope_home_name: str | None
    home_count: int
    asset_count: int
    maintenance_record_count: int
    schedule_count: int
    warranty_count: int
    due_soon_count: int
    overdue_count: int
    expiring_soon_count: int
    expired_warranty_count: int
    total_spend: float
    this_month_spend: float
    this_year_spend: float
    average_cost: float
    upcoming_maintenance: list[DashboardUpcomingItem]
    warranty_alerts: list[DashboardWarrantyAlert]
    recent_activity: list[DashboardActivityItem]
    home_health: list[DashboardHomeHealthItem]
    spending: SpendingOverviewResponse

    model_config = ConfigDict(from_attributes=True)
