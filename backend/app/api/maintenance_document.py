from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.user import User
from app.schemas.maintenance_document import (
    HomeDocumentResponse,
    MaintenanceDocumentResponse,
    MaintenanceDocumentUpload,
)
from app.services.maintenance_document import (
    DocumentStorageUnavailableError,
    DocumentValidationError,
    create_document,
    delete_document,
    get_document,
    get_home_documents,
    get_documents,
)


router = APIRouter(
    prefix="/homes/{home_id}/maintenance/{maintenance_id}/documents",
    tags=["Maintenance Documents"],
)

home_documents_router = APIRouter(
    prefix="/homes/{home_id}/documents",
    tags=["Home Documents"],
)


@router.post(
    "",
    response_model=MaintenanceDocumentResponse,
    status_code=status.HTTP_201_CREATED,
)
def upload_maintenance_document(
    home_id: int,
    maintenance_id: int,
    data: MaintenanceDocumentUpload,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    try:
        document = create_document(
            db=db,
            user_id=current_user.id,
            home_id=home_id,
            maintenance_id=maintenance_id,
            data=data,
        )
    except DocumentValidationError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except DocumentStorageUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")
    return document


@router.get(
    "",
    response_model=list[MaintenanceDocumentResponse],
)
def list_maintenance_documents(
    home_id: int,
    maintenance_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = get_documents(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        maintenance_id=maintenance_id,
    )
    if documents is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Maintenance record not found")
    return documents


@router.get(
    "/{document_id}",
    response_model=MaintenanceDocumentResponse,
)
def get_maintenance_document_by_id(
    home_id: int,
    maintenance_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_document(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        maintenance_id=maintenance_id,
        document_id=document_id,
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")
    return document


@router.delete(
    "/{document_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def delete_maintenance_document(
    home_id: int,
    maintenance_id: int,
    document_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    document = get_document(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
        maintenance_id=maintenance_id,
        document_id=document_id,
    )
    if document is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Document not found")

    try:
        delete_document(db=db, document=document)
    except DocumentStorageUnavailableError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc
    return None


@home_documents_router.get(
    "",
    response_model=list[HomeDocumentResponse],
)
def list_home_documents(
    home_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    documents = get_home_documents(
        db=db,
        user_id=current_user.id,
        home_id=home_id,
    )
    if documents is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Home not found")
    return documents
