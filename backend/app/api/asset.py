from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.asset import AssetCreate, AssetResponse, AssetUpdate
from app.services.asset import create_asset, delete_asset, get_asset, get_assets, update_asset


router = APIRouter(
    prefix="/homes/{home_id}/assets",
    tags=["Assets"],
)


@router.post(
    "",
    response_model=AssetResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_asset_record(
    home_id: int,
    data: AssetCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = create_asset(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
        data=data,
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home or area not found")
    return asset


@router.get(
    "",
    response_model=list[AssetResponse],
)
def list_asset_records(
    home_id: int,
    area_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    assets = get_assets(
        db=db,
        home_id=home_id,
        user_id=current_user.id,
        area_id=area_id,
    )
    if assets is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home not found")
    return assets


@router.get(
    "/{asset_id}",
    response_model=AssetResponse,
)
def get_asset_record_by_id(
    home_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = get_asset(
        db=db,
        asset_id=asset_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    return asset


@router.patch(
    "/{asset_id}",
    response_model=AssetResponse,
)
def update_asset_record(
    home_id: int,
    asset_id: int,
    data: AssetUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = get_asset(
        db=db,
        asset_id=asset_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    updated = update_asset(
        db=db,
        asset=asset,
        home_id=home_id,
        user_id=current_user.id,
        data=data,
    )
    if updated is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Area not found")
    return updated


@router.delete(
    "/{asset_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_asset_record(
    home_id: int,
    asset_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    asset = get_asset(
        db=db,
        asset_id=asset_id,
        home_id=home_id,
        user_id=current_user.id,
    )
    if asset is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Asset not found")
    delete_asset(db=db, asset=asset)
    return None
