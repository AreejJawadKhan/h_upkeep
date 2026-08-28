from __future__ import annotations

import pytest
from pydantic import ValidationError

from app.schemas.asset import AssetCreate, AssetUpdate
from app.schemas.maintenance import MaintenanceCategory, MaintenanceCreate, MaintenanceUpdate
from app.schemas.maintenance_schedule import MaintenanceScheduleCreate, MaintenanceScheduleUpdate, ScheduleFrequency
from app.schemas.warranty import WarrantyCreate, WarrantyUpdate


@pytest.mark.parametrize(
    ("model", "payload"),
    [
        (
            AssetCreate,
            {
                "name": "Furnace",
                "category": "HVAC",
                "purchase_date": "2026-08-28T12:30:00Z",
                "installation_date": "2026-08-28",
                "area_id": None,
            },
        ),
        (
            AssetUpdate,
            {
                "purchase_date": "2026-08-28T12:30:00Z",
            },
        ),
        (
            MaintenanceCreate,
            {
                "title": "Filter change",
                "item": "Furnace",
                "category": MaintenanceCategory.HVAC,
                "date": "2026-08-28T12:30:00Z",
                "cost": 100.0,
            },
        ),
        (
            MaintenanceUpdate,
            {
                "date": "2026-08-28T12:30:00Z",
            },
        ),
        (
            MaintenanceScheduleCreate,
            {
                "title": "Filter change",
                "frequency": ScheduleFrequency.QUARTERLY,
                "next_due_date": "2026-08-28T12:30:00Z",
            },
        ),
        (
            MaintenanceScheduleUpdate,
            {
                "next_due_date": "2026-08-28T12:30:00Z",
            },
        ),
        (
            WarrantyCreate,
            {
                "provider": "Carrier",
                "start_date": "2026-08-28T12:30:00Z",
                "expiration_date": "2027-08-28",
                "asset_id": 1,
            },
        ),
        (
            WarrantyUpdate,
            {
                "start_date": "2026-08-28T12:30:00Z",
            },
        ),
    ],
)
def test_date_only_schemas_reject_timestamp_strings(model, payload):
    with pytest.raises(ValidationError):
        model(**payload)

