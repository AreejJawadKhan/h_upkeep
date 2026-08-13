from fastapi import APIRouter, Depends, HTTPException, status
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
    prefix="/maintenance",
    tags=["Maintenance"],
)


@router.post(
    "",
    response_model=MaintenanceResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_maintenance_record(
    data: MaintenanceCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return create_maintenance(
        db=db,
        data=data,
        user_id=current_user.id,
    )


@router.get(
    "",
    response_model=list[MaintenanceResponse],
)
def list_maintenance_records(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return get_maintenance_records(
        db=db,
        user_id=current_user.id,
    )


@router.get(
    "/{record_id}",
    response_model=MaintenanceResponse,
)
def get_maintenance_record_by_id(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    return record


@router.put(
    "/{record_id}",
    response_model=MaintenanceResponse,
)
def update_maintenance_record(
    record_id: int,
    data: MaintenanceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
    )

    if record is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Maintenance record not found",
        )

    return update_maintenance(
        db=db,
        record=record,
        data=data,
    )


@router.delete(
    "/{record_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_record(
    record_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    record = get_maintenance_record(
        db=db,
        record_id=record_id,
        user_id=current_user.id,
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