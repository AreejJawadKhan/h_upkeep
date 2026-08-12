from sqlalchemy.orm import Session

from app.models.maintenance import MaintenanceRecord
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate


def create_maintenance(
    db: Session,
    data: MaintenanceCreate,
    user_id: int,
) -> MaintenanceRecord:

    record = MaintenanceRecord(
        user_id=user_id,
        **data.model_dump(),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_maintenance_records(
    db: Session,
    user_id: int,
) -> list[MaintenanceRecord]:

    return (
        db.query(MaintenanceRecord)
        .filter(MaintenanceRecord.user_id == user_id)
        .order_by(MaintenanceRecord.date.desc())
        .all()
    )


def get_maintenance_record(
    db: Session,
    record_id: int,
    user_id: int,
) -> MaintenanceRecord | None:

    return (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.id == record_id,
            MaintenanceRecord.user_id == user_id,
        )
        .first()
    )


def update_maintenance(
    db: Session,
    record: MaintenanceRecord,
    data: MaintenanceUpdate,
) -> MaintenanceRecord:

    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(record, field, value)

    db.commit()
    db.refresh(record)

    return record


def delete_maintenance(
    db: Session,
    record: MaintenanceRecord,
) -> None:

    db.delete(record)
    db.commit()