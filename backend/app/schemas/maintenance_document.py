from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class MaintenanceDocumentUpload(BaseModel):
    file_name: str = Field(..., min_length=1, max_length=255)
    file_type: str = Field(..., min_length=1, max_length=100)
    data_url: str = Field(..., min_length=1)


class MaintenanceDocumentResponse(BaseModel):
    id: int
    maintenance_id: int
    user_id: int
    file_name: str
    file_type: str
    cloudinary_public_id: str
    cloudinary_resource_type: str
    cloudinary_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class HomeDocumentResponse(BaseModel):
    id: int
    maintenance_id: int
    maintenance_title: str
    file_name: str
    file_type: str
    cloudinary_url: str
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)
