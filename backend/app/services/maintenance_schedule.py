from __future__ import annotations

from calendar import monthrange
from datetime import date as date_type, timedelta

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.asset import Asset
from app.models.maintenance import MaintenanceRecord
from app.models.maintenance_schedule import MaintenanceSchedule
from app.schemas.maintenance import MaintenanceCategory, MaintenanceCreate
from app.schemas.maintenance_schedule import (
    MaintenanceScheduleCreate,
    MaintenanceScheduleUpdate,
    ScheduleFrequency,
)
from app.services.asset import get_asset
from app.services.home import get_home
from app.services.maintenance import create_maintenance


def _resolve_asset(
    db: Session,
    *,
    home_id: int,
    user_id: int,
    asset_id: int | None,
) -> Asset | None:
    if asset_id is None:
        return None
    return get_asset(
        db=db,
        asset_id=asset_id,
        home_id=home_id,
        user_id=user_id,
    )


def _advance_date(base_date: date_type, frequency: ScheduleFrequency) -> date_type | None:
    if frequency == ScheduleFrequency.ONE_TIME:
        return None
    if frequency == ScheduleFrequency.DAILY:
        return base_date + timedelta(days=1)
    if frequency == ScheduleFrequency.WEEKLY:
        return base_date + timedelta(days=7)

    months = {
        ScheduleFrequency.MONTHLY: 1,
        ScheduleFrequency.QUARTERLY: 3,
        ScheduleFrequency.YEARLY: 12,
    }.get(frequency)
    if months is None:
        return None

    year = base_date.year + (base_date.month - 1 + months) // 12
    month = (base_date.month - 1 + months) % 12 + 1
    day = min(base_date.day, monthrange(year, month)[1])
    return date_type(year, month, day)


def create_schedule(
    db: Session,
    data: MaintenanceScheduleCreate,
    user_id: int,
    home_id: int,
) -> MaintenanceSchedule | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    asset = _resolve_asset(
        db,
        home_id=home_id,
        user_id=user_id,
        asset_id=data.asset_id,
    )
    if data.asset_id is not None and asset is None:
        return None

    schedule = MaintenanceSchedule(
        user_id=user_id,
        home_id=home_id,
        asset_id=data.asset_id,
        **data.model_dump(exclude={"asset_id"}),
    )
    db.add(schedule)
    db.commit()
    db.refresh(schedule)
    return schedule


def get_schedules(
    db: Session,
    user_id: int,
    home_id: int,
    asset_id: int | None = None,
) -> list[MaintenanceSchedule] | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    if asset_id is not None and _resolve_asset(
        db,
        home_id=home_id,
        user_id=user_id,
        asset_id=asset_id,
    ) is None:
        return None

    query = (
        db.query(MaintenanceSchedule)
        .filter(
            MaintenanceSchedule.user_id == user_id,
            MaintenanceSchedule.home_id == home_id,
        )
    )
    if asset_id is not None:
        query = query.filter(MaintenanceSchedule.asset_id == asset_id)

    return query.order_by(MaintenanceSchedule.created_at.desc()).all()


def get_schedule(
    db: Session,
    schedule_id: int,
    user_id: int,
    home_id: int,
) -> MaintenanceSchedule | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(MaintenanceSchedule)
        .filter(
            MaintenanceSchedule.id == schedule_id,
            MaintenanceSchedule.user_id == user_id,
            MaintenanceSchedule.home_id == home_id,
        )
        .first()
    )


def update_schedule(
    db: Session,
    schedule: MaintenanceSchedule,
    home_id: int,
    user_id: int,
    data: MaintenanceScheduleUpdate,
) -> MaintenanceSchedule | None:
    update_data = data.model_dump(exclude_unset=True)

    if "asset_id" in update_data:
        asset_id = update_data["asset_id"]
        if asset_id is not None and _resolve_asset(
            db,
            home_id=home_id,
            user_id=user_id,
            asset_id=asset_id,
        ) is None:
            return None

    for field, value in update_data.items():
        setattr(schedule, field, value)

    schedule.updated_at = utc_now()
    db.commit()
    db.refresh(schedule)
    return schedule


def complete_schedule(
    db: Session,
    schedule: MaintenanceSchedule,
    home_id: int,
    user_id: int,
) -> tuple[MaintenanceSchedule, MaintenanceRecord | None]:
    completed_on = utc_now().date()
    schedule.last_completed = utc_now()
    schedule.next_due_date = _advance_date(completed_on, ScheduleFrequency(schedule.frequency))
    schedule.reminder_enabled = schedule.frequency != ScheduleFrequency.ONE_TIME
    schedule.updated_at = utc_now()
    db.commit()
    db.refresh(schedule)

    maintenance_record = create_maintenance(
        db=db,
        data=MaintenanceCreate(
            title=schedule.title,
            description=schedule.description,
            item=schedule.title,
            category=MaintenanceCategory.OTHER,
            date=completed_on,
            cost=0.0,
            service_provider=None,
            next_due_date=schedule.next_due_date,
            image_url=None,
            asset_id=schedule.asset_id,
        ),
        user_id=user_id,
        home_id=home_id,
    )

    return schedule, maintenance_record


def delete_schedule(
    db: Session,
    schedule: MaintenanceSchedule,
) -> None:
    db.delete(schedule)
    db.commit()
