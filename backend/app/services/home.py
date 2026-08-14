from sqlalchemy.orm import Session

from app.models.home import Home
from app.schemas.home import HomeCreate, HomeUpdate


def create_home(
    db: Session,
    data: HomeCreate,
    user_id: int,
) -> Home:
    home = Home(
        user_id=user_id,
        **data.model_dump(),
    )
    db.add(home)
    db.commit()
    db.refresh(home)
    return home


def get_homes(
    db: Session,
    user_id: int,
) -> list[Home]:
    return (
        db.query(Home)
        .filter(Home.user_id == user_id)
        .order_by(Home.created_at.desc())
        .all()
    )


def get_home(
    db: Session,
    home_id: int,
    user_id: int,
) -> Home | None:
    return (
        db.query(Home)
        .filter(
            Home.id == home_id,
            Home.user_id == user_id,
        )
        .first()
    )


def update_home(
    db: Session,
    home: Home,
    data: HomeUpdate,
) -> Home:
    update_data = data.model_dump(exclude_unset=True)

    for field, value in update_data.items():
        setattr(home, field, value)

    db.commit()
    db.refresh(home)
    return home


def delete_home(
    db: Session,
    home: Home,
) -> None:
    db.delete(home)
    db.commit()
