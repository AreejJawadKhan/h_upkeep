from __future__ import annotations

from sqlalchemy.orm import Session

from app.core.time import utc_now
from app.models.asset import Asset
from app.models.maintenance import MaintenanceRecord
from app.models.maintenance_document import MaintenanceDocument
from app.models.warranty import Warranty
from app.schemas.warranty import WarrantyCreate, WarrantyUpdate
from app.services.asset import get_asset
from app.services.home import get_home


def _get_owned_asset(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    asset_id: int,
) -> Asset | None:
    return get_asset(
        db=db,
        asset_id=asset_id,
        home_id=home_id,
        user_id=user_id,
    )


def _get_owned_document(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    document_id: int,
) -> MaintenanceDocument | None:
    return (
        db.query(MaintenanceDocument)
        .join(MaintenanceRecord, MaintenanceDocument.maintenance_id == MaintenanceRecord.id)
        .filter(
            MaintenanceDocument.id == document_id,
            MaintenanceDocument.user_id == user_id,
            MaintenanceRecord.home_id == home_id,
        )
        .first()
    )


def _validate_dates(start_date, expiration_date) -> None:
    if expiration_date < start_date:
        raise ValueError("Expiration date must be on or after the start date.")


def create_warranty(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    data: WarrantyCreate,
) -> Warranty | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    asset = _get_owned_asset(
        db,
        user_id=user_id,
        home_id=home_id,
        asset_id=data.asset_id,
    )
    if asset is None:
        return None

    document = None
    if data.document_id is not None:
        document = _get_owned_document(
            db,
            user_id=user_id,
            home_id=home_id,
            document_id=data.document_id,
        )
        if document is None:
            return None

    _validate_dates(data.start_date, data.expiration_date)
    provider = data.provider.strip()
    if not provider:
        raise ValueError("Provider is required.")
    coverage_details = data.coverage_details.strip() if data.coverage_details else None
    if coverage_details == "":
        coverage_details = None

    warranty = Warranty(
        user_id=user_id,
        home_id=home_id,
        asset_id=data.asset_id,
        document_id=data.document_id,
        provider=provider,
        coverage_details=coverage_details,
        start_date=data.start_date,
        expiration_date=data.expiration_date,
    )
    db.add(warranty)
    db.commit()
    db.refresh(warranty)
    return warranty


def get_warranties(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    asset_id: int | None = None,
) -> list[Warranty] | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    if asset_id is not None and _get_owned_asset(
        db,
        user_id=user_id,
        home_id=home_id,
        asset_id=asset_id,
    ) is None:
        return None

    query = (
        db.query(Warranty)
        .filter(
            Warranty.user_id == user_id,
            Warranty.home_id == home_id,
        )
    )
    if asset_id is not None:
        query = query.filter(Warranty.asset_id == asset_id)

    return query.order_by(Warranty.expiration_date.asc(), Warranty.created_at.desc()).all()


def get_warranty(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    warranty_id: int,
) -> Warranty | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(Warranty)
        .filter(
            Warranty.id == warranty_id,
            Warranty.user_id == user_id,
            Warranty.home_id == home_id,
        )
        .first()
    )


def update_warranty(
    db: Session,
    *,
    warranty: Warranty,
    user_id: int,
    home_id: int,
    data: WarrantyUpdate,
) -> Warranty | None:
    update_data = data.model_dump(exclude_unset=True)

    if "asset_id" in update_data:
        asset_id = update_data["asset_id"]
        if asset_id is None or _get_owned_asset(
            db,
            user_id=user_id,
            home_id=home_id,
            asset_id=asset_id,
        ) is None:
            return None

    if "document_id" in update_data:
        document_id = update_data["document_id"]
        if document_id is not None and _get_owned_document(
            db,
            user_id=user_id,
            home_id=home_id,
            document_id=document_id,
        ) is None:
            return None

    start_date = update_data.get("start_date", warranty.start_date)
    expiration_date = update_data.get("expiration_date", warranty.expiration_date)
    _validate_dates(start_date, expiration_date)

    for field, value in update_data.items():
        if field == "provider" and isinstance(value, str):
            value = value.strip()
            if not value:
                raise ValueError("Provider is required.")
        if field == "coverage_details" and isinstance(value, str):
            value = value.strip() or None
        if field == "provider" and value is None:
            raise ValueError("Provider is required.")
        setattr(warranty, field, value)

    warranty.updated_at = utc_now()
    db.commit()
    db.refresh(warranty)
    return warranty


def delete_warranty(
    db: Session,
    *,
    warranty: Warranty,
) -> None:
    db.delete(warranty)
    db.commit()
