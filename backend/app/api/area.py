from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.area import AreaCreate, AreaResponse, AreaUpdate
from app.services.area import create_area, delete_area, get_area, get_areas, update_area


router = APIRouter(
    prefix="/homes/{home_id}/areas",
    tags=["Areas"],
)


@router.post(
    "",
    response_model=AreaResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_area_record(
    home_id: int,
    data: AreaCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    area = create_area(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
        data=data,
    )
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home not found")
    return area


@router.get(
    "",
    response_model=list[AreaResponse],
)
def list_area_records(
    home_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    areas = get_areas(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
    )
    if areas is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home not found")
    return areas


@router.get(
    "/{area_id}",
    response_model=AreaResponse,
)
def get_area_record_by_id(
    home_id: int,
    area_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    area = get_area(
        db=db,
        area_id=area_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    return area


@router.patch(
    "/{area_id}",
    response_model=AreaResponse,
)
def update_area_record(
    home_id: int,
    area_id: int,
    data: AreaUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    area = get_area(
        db=db,
        area_id=area_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    return update_area(db=db, area=area, data=data)


@router.delete(
    "/{area_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_area_record(
    home_id: int,
    area_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    area = get_area(
        db=db,
        area_id=area_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if area is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    delete_area(db=db, area=area)
    return None
