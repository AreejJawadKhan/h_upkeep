from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.maintenance_schedule import (
    MaintenanceScheduleCompleteResponse,
    MaintenanceScheduleCreate,
    MaintenanceScheduleResponse,
    MaintenanceScheduleUpdate,
)
from app.services.maintenance_schedule import (
    complete_schedule,
    create_schedule,
    delete_schedule,
    get_schedule,
    get_schedules,
    update_schedule,
)


router = APIRouter(
    prefix="/homes/{home_id}/schedules",
    tags=["Maintenance Schedules"],
)


@router.post(
    "",
    response_model=MaintenanceScheduleResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_schedule_record(
    home_id: int,
    data: MaintenanceScheduleCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = create_schedule(
        db=db,
        data=data,
        user_id=current_user.id,
        home_id=home_id,
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home or asset not found")
    return schedule


@router.get(
    "",
    response_model=list[MaintenanceScheduleResponse],
)
def list_schedule_records(
    home_id: int,
    asset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedules = get_schedules(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        asset_id=asset_id,
    )
    if schedules is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home or asset not found")
    return schedules


@router.get(
    "/{schedule_id}",
    response_model=MaintenanceScheduleResponse,
)
def get_schedule_record_by_id(
    home_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = get_schedule(
        db=db,
        schedule_id=schedule_id,
        user_id=current_user.id,
        home_id=home_id,
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    return schedule


@router.patch(
    "/{schedule_id}",
    response_model=MaintenanceScheduleResponse,
)
def update_schedule_record(
    home_id: int,
    schedule_id: int,
    data: MaintenanceScheduleUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = get_schedule(
        db=db,
        schedule_id=schedule_id,
        user_id=current_user.id,
        home_id=home_id,
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    updated = update_schedule(
        db=db,
        schedule=schedule,
        home_id=home_id,
        user_id=current_user.id,
        data=data,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return updated


@router.post(
    "/{schedule_id}/complete",
    response_model=MaintenanceScheduleCompleteResponse,
)
def complete_schedule_record(
    home_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = get_schedule(
        db=db,
        schedule_id=schedule_id,
        user_id=current_user.id,
        home_id=home_id,
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")

    updated_schedule, maintenance_record = complete_schedule(
        db=db,
        schedule=schedule,
        home_id=home_id,
        user_id=current_user.id,
    )
    return MaintenanceScheduleCompleteResponse(
        message="Schedule marked complete.",
        schedule=updated_schedule,
        maintenance_record=maintenance_record,
    )


@router.delete(
    "/{schedule_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_schedule_record(
    home_id: int,
    schedule_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    schedule = get_schedule(
        db=db,
        schedule_id=schedule_id,
        user_id=current_user.id,
        home_id=home_id,
    )
    if schedule is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Schedule not found")
    delete_schedule(db=db, schedule=schedule)
    return None
