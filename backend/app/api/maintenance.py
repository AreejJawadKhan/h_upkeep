from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.maintenance import (
    MaintenanceCreate,
    MaintenanceResponse,
    MaintenanceUpdate,
)
from app.services.maintenance import (
    create_maintenance,
    delete_maintenance,
    get_maintenance_record,
    get_maintenance_records,
    update_maintenance,
)


router = APIRouter(
    prefix="/homes/{home_id}/maintenance",
    tags=["Maintenance"],
)


@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_record(
    home_id: int,
    data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = create_maintenance(
        db=db,
        data=data,
        user_id=current_user.id,
        home_id=home_id,
    )
    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home or asset not found",
        )
    return record


@router.get(
    "",
    response_model=list[MaintenanceResponse],
)
def list_maintenance_records(
    home_id: int,
    asset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    records = get_maintenance_records(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        asset_id=asset_id,
    )
    if records is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home or asset not found",
        )
    return records


@router.get(
    "/{record_id}",
    response_model=MaintenanceResponse,
)
def get_maintenance_record_by_id(
    home_id: int,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
        home_id=home_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    return record


@router.patch(
    "/{record_id}",
    response_model=MaintenanceResponse,
)
def update_maintenance_record(
    home_id: int,
    record_id: int,
    data: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
        home_id=home_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    updated = update_maintenance(
        db=db,
        record=record,
        home_id=home_id,
        user_id=current_user.id,
        data=data,
    )

    if updated is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Asset not found",
        )

    return updated


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_record(
    home_id: int,
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
        home_id=home_id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    delete_maintenance(
        db=db,
        record=record,
    )

    return None
