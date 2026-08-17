from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.warranty import WarrantyCreate, WarrantyResponse, WarrantyUpdate
from app.services.warranty import (
    create_warranty,
    delete_warranty,
    get_warranty,
    get_warranties,
    update_warranty,
)


router = APIRouter(
    prefix="/homes/{home_id}/warranties",
    tags=["Warranties"],
)


@router.post(
    "",
    response_model=WarrantyResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_warranty_record(
    home_id: int,
    data: WarrantyCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        warranty = create_warranty(
            db=db,
            user_id=current_user.id,
            home_id=home_id,
            data=data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if warranty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home, asset, or document not found")
    return warranty


@router.get(
    "",
    response_model=list[WarrantyResponse],
)
def list_warranty_records(
    home_id: int,
    asset_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warranties = get_warranties(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        asset_id=asset_id,
    )
    if warranties is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home or asset not found")
    return warranties


@router.get(
    "/{warranty_id}",
    response_model=WarrantyResponse,
)
def get_warranty_record_by_id(
    home_id: int,
    warranty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warranty = get_warranty(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        warranty_id=warranty_id,
    )
    if warranty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warranty not found")
    return warranty


@router.patch(
    "/{warranty_id}",
    response_model=WarrantyResponse,
)
def update_warranty_record(
    home_id: int,
    warranty_id: int,
    data: WarrantyUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warranty = get_warranty(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        warranty_id=warranty_id,
    )
    if warranty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warranty not found")
    try:
        updated = update_warranty(
            db=db,
            warranty=warranty,
            user_id=current_user.id,
            home_id=home_id,
            data=data,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home, asset, or document not found")
    return updated


@router.delete(
    "/{warranty_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_warranty_record(
    home_id: int,
    warranty_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    warranty = get_warranty(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        warranty_id=warranty_id,
    )
    if warranty is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Warranty not found")
    delete_warranty(db=db, warranty=warranty)
    return None
