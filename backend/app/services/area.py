from sqlalchemy.orm import Session

from app.models.area import Area
from app.models.asset import Asset
from app.schemas.area import AreaCreate, AreaUpdate
from app.services.home import get_home


def create_area(
    db: Session,
    home_id: int,
    user_id: int,
    data: AreaCreate,
) -> Area | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    area = Area(
        home_id=home_id,
        **data.model_dump(),
    )
    db.add(area)
    db.commit()
    db.refresh(area)
    return area


def get_areas(
    db: Session,
    home_id: int,
    user_id: int,
) -> list[Area] | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(Area)
        .filter(Area.home_id == home_id)
        .order_by(Area.created_at.desc())
        .all()
    )


def get_area(
    db: Session,
    area_id: int,
    home_id: int,
    user_id: int,
) -> Area | None:
    home = get_home(db=db, home_id=home_id, user_id=user_id)
    if home is None:
        return None

    return (
        db.query(Area)
        .filter(
            Area.id == area_id,
            Area.home_id == home_id,
        )
        .first()
    )


def update_area(
    db: Session,
    area: Area,
    data: AreaUpdate,
) -> Area:
    update_data = data.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(area, field, value)
    db.commit()
    db.refresh(area)
    return area


def delete_area(
    db: Session,
    area: Area,
) -> None:
    db.query(Asset).filter(Asset.area_id == area.id).update(
        {"area_id": None},
        synchronize_session=False,
    )
    db.delete(area)
    db.commit()
