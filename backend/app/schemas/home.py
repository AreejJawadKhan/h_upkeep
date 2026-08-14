from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class HomeBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    address: str = Field(..., min_length=1, max_length=255)
    property_type: str = Field(..., min_length=1, max_length=100)
    year_built: int = Field(..., ge=1, le=9999)


class HomeCreate(HomeBase):
    pass


class HomeUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    address: str | None = Field(default=None, min_length=1, max_length=255)
    property_type: str | None = Field(default=None, min_length=1, max_length=100)
    year_built: int | None = Field(default=None, ge=1, le=9999)


class HomeResponse(HomeBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
