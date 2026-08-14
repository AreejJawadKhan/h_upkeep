from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AreaBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=150)
    notes: str | None = Field(default=None, max_length=2000)


class AreaCreate(AreaBase):
    pass


class AreaUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=150)
    notes: str | None = Field(default=None, max_length=2000)


class AreaResponse(AreaBase):
    id: int
    home_id: int
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)
