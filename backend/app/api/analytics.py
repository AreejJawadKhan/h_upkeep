from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.analytics import SpendingOverviewResponse
from app.services.analytics import get_spending_overview


router = APIRouter(
    prefix="/analytics",
    tags=["Analytics"],
)


@router.get(
    "/spending",
    response_model=SpendingOverviewResponse,
)
def spending_overview(
    home_id: int | None = Query(default=None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    overview = get_spending_overview(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
    )
    if overview is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Home not found",
        )
    return overview
