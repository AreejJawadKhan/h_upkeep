from fastapi import FastAPI

from app.db.database import Base, engine
from app.models import MaintenanceRecord, User
from app.api.maintenance import router as maintenance_router
from app.api.auth import router as auth_router

Base.metadata.create_all(bind=engine)

app = FastAPI(
    title="HomeRepair Log API",
    description="Backend API for HomeRepair Log",
    version="0.1.0",
)

app.include_router(auth_router)
app.include_router(maintenance_router)

@app.get("/")
def root():
    return {
        "message": "HomeRepair Log API is running"
    }


@app.get("/health")
def health_check():
    return {
        "status": "ok"
    }