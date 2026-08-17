from __future__ import annotations

import base64
import hashlib
import json
import time
import urllib.error
import urllib.parse
import urllib.request
import uuid
from dataclasses import dataclass
from typing import Any

from sqlalchemy.orm import Session

from app.core.config import settings
from app.models.maintenance import MaintenanceRecord
from app.models.maintenance_document import MaintenanceDocument
from app.schemas.maintenance_document import MaintenanceDocumentUpload

MAX_DOCUMENT_BYTES = 15 * 1024 * 1024
ALLOWED_MIME_TYPES = {
    "application/pdf",
    "application/msword",
    "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/heic",
    "image/heif",
}


class DocumentStorageUnavailableError(RuntimeError):
    pass


class DocumentValidationError(ValueError):
    pass


@dataclass(slots=True)
class DecodedDocument:
    file_name: str
    file_type: str
    data: bytes


def is_cloudinary_configured() -> bool:
    return all(
        [
            settings.CLOUDINARY_CLOUD_NAME,
            settings.CLOUDINARY_API_KEY,
            settings.CLOUDINARY_API_SECRET,
        ]
    )


def _normalize_mime_type(file_name: str, file_type: str, data_url: str) -> str:
    mime_type = file_type.strip().lower()
    if mime_type.startswith("data:") and ";base64," in mime_type:
        mime_type = mime_type[5 : mime_type.index(";base64,")]
    if mime_type:
        return mime_type
    if data_url.startswith("data:") and ";base64," in data_url:
        header = data_url[5 : data_url.index(";base64,")]
        if header:
            return header
    if "." in file_name:
        ext = file_name.rsplit(".", 1)[-1].lower()
        inferred = {
            "pdf": "application/pdf",
            "jpg": "image/jpeg",
            "jpeg": "image/jpeg",
            "png": "image/png",
            "webp": "image/webp",
            "gif": "image/gif",
            "heic": "image/heic",
            "heif": "image/heif",
            "doc": "application/msword",
            "docx": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        }.get(ext)
        if inferred:
            return inferred
    return "application/octet-stream"


def _validate_mime_type(mime_type: str) -> None:
    if mime_type not in ALLOWED_MIME_TYPES:
        raise DocumentValidationError(
            "Unsupported file type. Use a PDF, image, or Word document."
        )


def _decode_document(data: MaintenanceDocumentUpload) -> DecodedDocument:
    file_name = data.file_name.strip()
    if not file_name:
        raise DocumentValidationError("File name is required.")

    payload = data.data_url.strip()
    if not payload:
        raise DocumentValidationError("Document data is required.")

    mime_type = _normalize_mime_type(file_name, data.file_type, payload)
    _validate_mime_type(mime_type)

    if payload.startswith("data:") and ";base64," in payload:
        payload = payload.split(";base64,", 1)[1]

    try:
        decoded = base64.b64decode(payload, validate=True)
    except (ValueError, base64.binascii.Error) as exc:
        raise DocumentValidationError("Document data is not valid base64.") from exc

    if len(decoded) == 0:
        raise DocumentValidationError("Document file cannot be empty.")
    if len(decoded) > MAX_DOCUMENT_BYTES:
        raise DocumentValidationError("Document file is too large.")

    return DecodedDocument(
        file_name=file_name,
        file_type=mime_type,
        data=decoded,
    )


def _cloudinary_signature(params: dict[str, Any]) -> str:
    filtered = {k: v for k, v in params.items() if v not in (None, "")}
    signing_string = "&".join(f"{key}={filtered[key]}" for key in sorted(filtered))
    signing_string = f"{signing_string}{settings.CLOUDINARY_API_SECRET}"
    return hashlib.sha1(signing_string.encode("utf-8")).hexdigest()


def _cloudinary_request(resource_type: str, path: str, data: dict[str, Any]) -> dict[str, Any]:
    if not is_cloudinary_configured():
        raise DocumentStorageUnavailableError("Document storage is not configured.")

    url = f"https://api.cloudinary.com/v1_1/{settings.CLOUDINARY_CLOUD_NAME}/{resource_type}/{path}"
    encoded = urllib.parse.urlencode(data).encode("utf-8")
    request = urllib.request.Request(url, data=encoded, method="POST")
    request.add_header("Content-Type", "application/x-www-form-urlencoded")

    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            body = response.read().decode("utf-8")
    except urllib.error.HTTPError as exc:
        raise DocumentStorageUnavailableError(
            f"Cloudinary request failed with status {exc.code}."
        ) from exc
    except urllib.error.URLError as exc:
        raise DocumentStorageUnavailableError("Cloudinary request could not be completed.") from exc

    try:
        payload = json.loads(body)
    except json.JSONDecodeError as exc:
        raise DocumentStorageUnavailableError("Cloudinary returned an invalid response.") from exc
    if isinstance(payload, dict) and payload.get("error"):
        message = payload["error"].get("message") if isinstance(payload["error"], dict) else payload["error"]
        raise DocumentStorageUnavailableError(str(message))
    return payload


def _get_owned_maintenance(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    maintenance_id: int,
) -> MaintenanceRecord | None:
    return (
        db.query(MaintenanceRecord)
        .filter(
            MaintenanceRecord.id == maintenance_id,
            MaintenanceRecord.user_id == user_id,
            MaintenanceRecord.home_id == home_id,
        )
        .first()
    )


def upload_document_to_cloudinary(*, document: DecodedDocument, public_id: str) -> dict[str, Any]:
    timestamp = str(int(time.time()))
    data_url = f"data:{document.file_type};base64,{base64.b64encode(document.data).decode('ascii')}"
    params = {
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "folder": settings.CLOUDINARY_UPLOAD_FOLDER,
        "public_id": public_id,
    }
    params["signature"] = _cloudinary_signature(params)
    params["file"] = data_url
    return _cloudinary_request("auto", "upload", params)


def delete_document_from_cloudinary(*, public_id: str, resource_type: str) -> dict[str, Any]:
    timestamp = str(int(time.time()))
    params = {
        "api_key": settings.CLOUDINARY_API_KEY,
        "timestamp": timestamp,
        "public_id": public_id,
        "invalidate": "true",
    }
    params["signature"] = _cloudinary_signature(params)
    return _cloudinary_request(resource_type, "destroy", params)


def create_document(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    maintenance_id: int,
    data: MaintenanceDocumentUpload,
) -> MaintenanceDocument | None:
    maintenance = _get_owned_maintenance(
        db,
        user_id=user_id,
        home_id=home_id,
        maintenance_id=maintenance_id,
    )
    if maintenance is None:
        return None

    decoded = _decode_document(data)
    public_id = f"{settings.CLOUDINARY_UPLOAD_FOLDER}/u{user_id}/m{maintenance.id}/{uuid.uuid4().hex}"
    uploaded = upload_document_to_cloudinary(document=decoded, public_id=public_id)
    cloudinary_public_id = uploaded.get("public_id")
    cloudinary_url = uploaded.get("secure_url") or uploaded.get("url")
    cloudinary_resource_type = uploaded.get("resource_type", "raw")
    if not cloudinary_public_id or not cloudinary_url:
        raise DocumentStorageUnavailableError("Cloudinary upload did not return a usable file URL.")

    document = MaintenanceDocument(
        maintenance_id=maintenance.id,
        user_id=user_id,
        file_name=decoded.file_name,
        file_type=decoded.file_type,
        cloudinary_public_id=cloudinary_public_id,
        cloudinary_resource_type=cloudinary_resource_type,
        cloudinary_url=cloudinary_url,
    )
    db.add(document)
    db.commit()
    db.refresh(document)
    return document


def get_documents(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    maintenance_id: int,
) -> list[MaintenanceDocument] | None:
    maintenance = _get_owned_maintenance(
        db,
        user_id=user_id,
        home_id=home_id,
        maintenance_id=maintenance_id,
    )
    if maintenance is None:
        return None

    return (
        db.query(MaintenanceDocument)
        .filter(
            MaintenanceDocument.user_id == user_id,
            MaintenanceDocument.maintenance_id == maintenance_id,
        )
        .order_by(MaintenanceDocument.created_at.desc())
        .all()
    )


def get_document(
    db: Session,
    *,
    user_id: int,
    home_id: int,
    maintenance_id: int,
    document_id: int,
) -> MaintenanceDocument | None:
    maintenance = _get_owned_maintenance(
        db,
        user_id=user_id,
        home_id=home_id,
        maintenance_id=maintenance_id,
    )
    if maintenance is None:
        return None

    return (
        db.query(MaintenanceDocument)
        .filter(
            MaintenanceDocument.id == document_id,
            MaintenanceDocument.user_id == user_id,
            MaintenanceDocument.maintenance_id == maintenance_id,
        )
        .first()
    )


def delete_document(
    db: Session,
    *,
    document: MaintenanceDocument,
) -> None:
    delete_document_from_cloudinary(
        public_id=document.cloudinary_public_id,
        resource_type=document.cloudinary_resource_type,
    )
    db.delete(document)
    db.commit()
