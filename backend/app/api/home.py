from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.home import HomeCreate, HomeResponse, HomeUpdate
from app.services.home import (
    create_home,
    delete_home,
    get_home,
    get_homes,
    update_home,
)


router = APIRouter(
    prefix="/homes",
    tags=["Homes"],
)


@router.post(
    "",
    response_model=HomeResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_home_record(
    data: HomeCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_home(
        db=db,
        data=data,
        user_id=current_user.id,
    )


@router.get(
    "",
    response_model=list[HomeResponse],
)
def list_home_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_homes(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/{home_id}",
    response_model=HomeResponse,
)
def get_home_record_by_id(
    home_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    home = get_home(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
    )

    if home is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )

    return home


@router.patch(
    "/{home_id}",
    response_model=HomeResponse,
)
def update_home_record(
    home_id: int,
    data: HomeUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    home = get_home(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
    )

    if home is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )

    return update_home(
        db=db,
        home=home,
        data=data,
    )


@router.delete(
    "/{home_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_home_record(
    home_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    home = get_home(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
    )

    if home is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )

    delete_home(
        db=db,
        home=home,
    )

    return None
