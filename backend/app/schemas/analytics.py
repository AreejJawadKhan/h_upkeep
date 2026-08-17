from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict


class SpendingPeriodSummary(BaseModel):
    label: str
    total_spend: float
    record_count: int


class SpendingCategorySummary(BaseModel):
    category: str
    total_spend: float
    record_count: int


class SpendingAssetSummary(BaseModel):
    asset_id: int | None
    asset_name: str
    total_spend: float
    record_count: int


class SpendingRecordSummary(BaseModel):
    id: int
    title: str
    date: date_type
    category: str
    cost: float
    service_provider: str | None
    home_id: int
    home_name: str
    asset_id: int | None
    asset_name: str | None
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class SpendingOverviewResponse(BaseModel):
    scope_home_id: int | None
    scope_home_name: str | None
    total_spend: float
    this_month_spend: float
    this_year_spend: float
    previous_year_spend: float
    average_cost: float
    record_count: int
    monthly_trend: list[SpendingPeriodSummary]
    category_breakdown: list[SpendingCategorySummary]
    asset_breakdown: list[SpendingAssetSummary]
    recent_records: list[SpendingRecordSummary]

    model_config = ConfigDict(from_attributes=True)
