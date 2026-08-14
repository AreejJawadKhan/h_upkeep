from sqlalchemy.orm import Session

from app.models.asset import Asset
from app.services.area import get_area
from app.services.home import get_home
from app.schemas.asset import AssetCreate, AssetUpdate


def _validate_area(
    db: Session,
    *,
    area_id: int | None,
    home_id: int,
    user_id: int,
):
    if area_id is None:
        return None
    return get_area(db=db, area_id=area_id, home_id=home_id, user_id=user_id)


def create_asset(
    db: Session,
    home_id: int,
    user_id: int,
    data: AssetCreate,
) -> Asset | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    if data.area_id is not None and _validate_area(
        db,
        area_id=data.area_id,
        home_id=home_id,
        user_id=user_id,
    ) is None:
        return None

    asset = Asset(
        home_id=home_id,
        **data.model_dump(),
    )
    db.add(asset)
    db.commit()
    db.refresh(asset)
    return asset


def get_assets(
    db: Session,
    home_id: int,
    user_id: int,
    area_id: int | None = None,
) -> list[Asset] | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    if area_id is not None and _validate_area(
        db,
        area_id=area_id,
        home_id=home_id,
        user_id=user_id,
    ) is None:
        return None

    query = db.query(Asset).filter(Asset.home_id == home_id)
    if area_id is not None:
        query = query.filter(Asset.area_id == area_id)
    return query.order_by(Asset.created_at.desc()).all()


def get_asset(
    db: Session,
    asset_id: int,
    home_id: int,
    user_id: int,
) -> Asset | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(Asset)
        .filter(
            Asset.id == asset_id,
            Asset.home_id == home_id,
        )
        .first()
    )


def update_asset(
    db: Session,
    asset: Asset,
    home_id: int,
    user_id: int,
    data: AssetUpdate,
) -> Asset | None:
    update_data = data.model_dump(exclude_unset=True)
    new_area_id = update_data.get("area_id")
    if "area_id" in update_data and new_area_id is not None:
        if _validate_area(
            db,
            area_id=new_area_id,
            home_id=home_id,
            user_id=user_id,
        ) is None:
            return None

    for field, value in update_data.items():
        setattr(asset, field, value)
    db.commit()
    db.refresh(asset)
    return asset


def delete_asset(
    db: Session,
    asset: Asset,
) -> None:
    db.delete(asset)
    db.commit()
