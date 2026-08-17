from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict, Field, model_validator


class WarrantyBase(BaseModel):
    provider: str = Field(..., min_length=1, max_length=150)
    coverage_details: str | None = Field(default=None, max_length=5000)
    start_date: date_type
    expiration_date: date_type

    @model_validator(mode="after")
    def validate_dates(self):
        if self.expiration_date < self.start_date:
            raise ValueError("Expiration date must be on or after the start date.")
        return self


class WarrantyCreate(WarrantyBase):
    asset_id: int
    document_id: int | None = None


class WarrantyUpdate(BaseModel):
    provider: str | None = Field(default=None, min_length=1, max_length=150)
    coverage_details: str | None = Field(default=None, max_length=5000)
    start_date: date_type | None = None
    expiration_date: date_type | None = None
    asset_id: int | None = None
    document_id: int | None = None


class WarrantyResponse(WarrantyBase):
    id: int
    user_id: int
    home_id: int
    asset_id: int
    document_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
