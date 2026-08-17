from app.schemas.area import AreaCreate, AreaResponse, AreaUpdate
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate
from app.schemas.analytics import (
    SpendingAssetSummary,
    SpendingCategorySummary,
    SpendingOverviewResponse,
    SpendingPeriodSummary,
    SpendingRecordSummary,
)
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshResponse,
    RegisterRequest,
    ResendVerificationRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.schemas.home import HomeCreate, HomeResponse, HomeUpdate
from app.schemas.maintenance import MaintenanceCreate, MaintenanceResponse, MaintenanceUpdate
from app.schemas.maintenance_document import (
    MaintenanceDocumentResponse,
    MaintenanceDocumentUpload,
)
from app.schemas.maintenance_schedule import (
    MaintenanceScheduleCompleteResponse,
    MaintenanceScheduleCreate,
    MaintenanceScheduleResponse,
    MaintenanceScheduleUpdate,
)

__all__ = [
    "AreaCreate",
    "AreaResponse",
    "AreaUpdate",
    "AssetCreate",
    "AssetResponse",
    "AssetUpdate",
    "SpendingAssetSummary",
    "SpendingCategorySummary",
    "SpendingOverviewResponse",
    "SpendingPeriodSummary",
    "SpendingRecordSummary",
    "LoginRequest",
    "MessageResponse",
    "PasswordResetConfirm",
    "PasswordResetRequest",
    "RefreshResponse",
    "RegisterRequest",
    "ResendVerificationRequest",
    "TokenResponse",
    "UserResponse",
    "VerifyEmailRequest",
    "HomeCreate",
    "HomeResponse",
    "HomeUpdate",
    "MaintenanceCreate",
    "MaintenanceResponse",
    "MaintenanceUpdate",
    "MaintenanceDocumentUpload",
    "MaintenanceDocumentResponse",
    "MaintenanceScheduleCreate",
    "MaintenanceScheduleResponse",
    "MaintenanceScheduleUpdate",
    "MaintenanceScheduleCompleteResponse",
]
