from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from starlette.middleware.sessions import SessionMiddleware
from sqlalchemy.engine.url import make_url

from app.core.config import settings
from app.core.limiter import limiter
from app.db.database import Base, engine

# Import all ORM models before create_all so SQLAlchemy's metadata knows
# about every table.  The noqa comments suppress "imported but unused" lints;
# these imports are intentional side-effects required for table registration.
from app.models import (  # noqa: F401
    Asset,
    Area,
    AuthIdentity,
    EmailVerificationToken,
    Home,
    MaintenanceDocument,
    MaintenanceRecord,
    PasswordResetToken,
    RefreshToken,
    User,
)

from app.api.auth import router as auth_router
from app.api.area import router as area_router
from app.api.analytics import router as analytics_router
from app.api.dashboard import router as dashboard_router
from app.api.asset import router as asset_router
from app.api.home import router as home_router
from app.api.maintenance_document import (
    home_documents_router,
    router as maintenance_document_router,
)
from app.api.maintenance import router as maintenance_router
from app.api.maintenance_schedule import router as maintenance_schedule_router
from app.api.warranty import router as warranty_router

# ---------------------------------------------------------------------------
# Schema / table creation
# ---------------------------------------------------------------------------

if settings.AUTO_CREATE_TABLES and make_url(settings.get_database_url()).get_backend_name() == "sqlite":
    Base.metadata.create_all(bind=engine)

# ---------------------------------------------------------------------------
# Application
# ---------------------------------------------------------------------------

app = FastAPI(
    title="HomeRepair Log API",
    description=(
        "Backend API for HomeRepair Log — a production-minded home maintenance "
        "management system. See /docs for interactive Swagger UI."
    ),
    version="0.9.0",
)

# ---------------------------------------------------------------------------
# Rate limiting
# ---------------------------------------------------------------------------

app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# ---------------------------------------------------------------------------
# Session middleware (required for Google OAuth CSRF state)
# Must be added BEFORE CORSMiddleware so the session is available in routes.
# ---------------------------------------------------------------------------

app.add_middleware(
    SessionMiddleware,
    secret_key=settings.SESSION_SECRET_KEY,
    same_site="lax",
    https_only=settings.COOKIE_SECURE,
)

# ---------------------------------------------------------------------------
# CORS
# allow_credentials=True is required for the browser to include the
# HttpOnly refresh-token cookie in cross-origin requests (e.g. from the
# React dev server on port 5173 to the API on port 8000).
# ---------------------------------------------------------------------------

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------------------
# Routers
# ---------------------------------------------------------------------------

app.include_router(auth_router)
app.include_router(area_router)
app.include_router(analytics_router)
app.include_router(dashboard_router)
app.include_router(asset_router)
app.include_router(home_router)
app.include_router(maintenance_router)
app.include_router(maintenance_document_router)
app.include_router(home_documents_router)
app.include_router(maintenance_schedule_router)
app.include_router(warranty_router)


# ---------------------------------------------------------------------------
# Health / root
# ---------------------------------------------------------------------------

@app.get("/", tags=["Health"])
def root():
    return {"message": "HomeRepair Log API is running", "version": "0.9.0"}


@app.get("/health", tags=["Health"])
def health_check():
    return {"status": "ok"}
