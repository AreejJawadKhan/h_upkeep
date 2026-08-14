from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.models.maintenance import MaintenanceRecord
from app.schemas.maintenance import MaintenanceCreate, MaintenanceUpdate
from app.services.asset import get_asset
from app.services.home import get_home


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


def create_maintenance(
    db: Session,
    data: MaintenanceCreate,
    user_id: int,
    home_id: int,
) -> MaintenanceRecord | None:
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

    record = MaintenanceRecord(
        user_id=user_id,
        home_id=home_id,
        asset_id=data.asset_id,
        **data.model_dump(exclude={"asset_id"}),
    )

    db.add(record)
    db.commit()
    db.refresh(record)

    return record


def get_maintenance_records(
    db: Session,
    user_id: int,
    home_id: int,
    asset_id: int | None = None,
) -> list[MaintenanceRecord] | None:
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
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.user_id == user_id,
            MaintenanceRecord.home_id == home_id,
        )
    )
    if asset_id is not None:
        query = query.filter(MaintenanceRecord.asset_id == asset_id)

    return query.order_by(MaintenanceRecord.date.desc()).all()


def get_maintenance_record(
    db: Session,
    record_id: int,
    user_id: int,
    home_id: int,
) -> MaintenanceRecord | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.id == record_id,
            MaintenanceRecord.user_id == user_id,
            MaintenanceRecord.home_id == home_id,
        )
        .first()
    )


def update_maintenance(
    db: Session,
    record: MaintenanceRecord,
    home_id: int,
    user_id: int,
    data: MaintenanceUpdate,
) -> MaintenanceRecord | None:
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
