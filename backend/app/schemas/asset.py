from datetime import date as date_type, datetime

from pydantic import BaseModel, ConfigDict, Field


class AssetBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    category: str = Field(..., min_length=1, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=150)
    model: str | None = Field(default=None, max_length=150)
    serial_number: str | None = Field(default=None, max_length=150)
    purchase_date: date_type | None = None
    installation_date: date_type | None = None
    expected_lifespan: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)


class AssetCreate(AssetBase):
    area_id: int | None = None


class AssetUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    category: str | None = Field(default=None, min_length=1, max_length=100)
    manufacturer: str | None = Field(default=None, max_length=150)
    model: str | None = Field(default=None, max_length=150)
    serial_number: str | None = Field(default=None, max_length=150)
    purchase_date: date_type | None = None
    installation_date: date_type | None = None
    expected_lifespan: int | None = Field(default=None, ge=0)
    notes: str | None = Field(default=None, max_length=2000)
    area_id: int | None = None


class AssetResponse(AssetBase):
    id: int
    home_id: int
    area_id: int | None
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
