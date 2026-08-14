"""
Token lifecycle management for HomeRepair Log.

This module handles the creation, validation, and revocation of all opaque
tokens: email verification, password reset, and refresh tokens.

Design principles
-----------------
- Raw tokens are generated with secrets.token_urlsafe(32) in security.py.
- Only the SHA-256 hash of each raw token is stored in the database.
- Every validation checks both expiry (expires_at) and single-use (used_at /
  revoked_at) before accepting a token.
- Datetime arithmetic uses timezone-aware UTC datetimes throughout.
"""

from datetime import timedelta
from typing import Optional

from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.security import generate_raw_token, hash_token
from app.core.time import ensure_utc, utc_now
from app.models.email_verification import EmailVerificationToken
from app.models.password_reset_token import PasswordResetToken
from app.models.refresh_token import RefreshToken
from app.models.user import User


# ---------------------------------------------------------------------------
# Email verification tokens
# ---------------------------------------------------------------------------

def create_verification_token(db: Session, user: User) -> str:
    """
    Generate a raw email-verification token, persist only its hash, and
    return the raw token so it can be embedded in the verification email link.
    """
    raw = generate_raw_token()
    token_hash = hash_token(raw)
    expires_at = utc_now() + timedelta(
        hours=settings.VERIFICATION_TOKEN_EXPIRE_HOURS
    )
    record = EmailVerificationToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    return raw


def verify_email_token(db: Session, raw_token: str) -> Optional[User]:
    """
    Validate a raw verification token.

    Returns the User if the token is valid, unexpired, and unused; marks it
    used and sets email_verified=True atomically.  Returns None otherwise.
    """
    token_hash = hash_token(raw_token)

    record = (
        db.query(EmailVerificationToken)
        .filter(EmailVerificationToken.token_hash == token_hash)
        .first()
    )

    if record is None:
        return None
    if record.used_at is not None:
        return None  # Already used
    if utc_now() > ensure_utc(record.expires_at):
        return None  # Expired

    # Atomically mark used and verify the user's email.
    record.used_at = utc_now()
    record.user.email_verified = True
    db.commit()

    return record.user


# ---------------------------------------------------------------------------
# Password reset tokens
# ---------------------------------------------------------------------------

def create_password_reset_token(db: Session, user: User) -> str:
    """
    Generate a raw password-reset token, persist only its hash, and return
    the raw token to be embedded in the reset email link.
    """
    raw = generate_raw_token()
    token_hash = hash_token(raw)
    expires_at = utc_now() + timedelta(
        hours=settings.PASSWORD_RESET_TOKEN_EXPIRE_HOURS
    )
    record = PasswordResetToken(
        user_id=user.id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    return raw


def consume_password_reset_token(db: Session, raw_token: str) -> Optional[User]:
    """
    Validate and consume a raw password-reset token.

    Returns the User if valid, unexpired, and unused; marks it used.
    Returns None otherwise.  The caller is responsible for updating the
    user's password_hash and revoking active sessions.
    """
    token_hash = hash_token(raw_token)

    record = (
        db.query(PasswordResetToken)
        .filter(PasswordResetToken.token_hash == token_hash)
        .first()
    )

    if record is None:
        return None
    if record.used_at is not None:
        return None  # Already used
    if utc_now() > ensure_utc(record.expires_at):
        return None  # Expired

    record.used_at = utc_now()
    db.commit()

    return record.user


# ---------------------------------------------------------------------------
# Refresh tokens
# ---------------------------------------------------------------------------

def create_refresh_token_record(db: Session, user_id: int) -> str:
    """
    Generate a raw refresh token, persist only its hash, and return the raw
    token to be placed in an HttpOnly cookie.
    """
    raw = generate_raw_token()
    token_hash = hash_token(raw)
    expires_at = utc_now() + timedelta(
        days=settings.REFRESH_TOKEN_EXPIRE_DAYS
    )
    record = RefreshToken(
        user_id=user_id,
        token_hash=token_hash,
        expires_at=expires_at,
    )
    db.add(record)
    db.commit()
    return raw


def consume_refresh_token(db: Session, raw_token: str) -> Optional[User]:
    """
    Validate a raw refresh token and rotate it.

    If the token is valid, non-expired, and non-revoked, marks it as revoked
    (rotation) and returns the owning User.  The caller must immediately issue
    a new refresh token and replace the cookie.

    Returns None if the token is invalid, expired, or already revoked.
    """
    token_hash = hash_token(raw_token)

    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )

    if record is None:
        return None
    if record.revoked_at is not None:
        return None  # Revoked / already rotated
    if utc_now() > ensure_utc(record.expires_at):
        return None  # Expired

    user = record.user

    # Revoke the consumed token (rotation — a new one will be issued).
    record.revoked_at = utc_now()
    db.commit()

    return user


def revoke_refresh_token(db: Session, raw_token: str) -> None:
    """
    Revoke a refresh token by hash (used during explicit logout).
    No-op if the token is not found or already revoked.
    """
    token_hash = hash_token(raw_token)
    record = (
        db.query(RefreshToken)
        .filter(RefreshToken.token_hash == token_hash)
        .first()
    )
    if record and record.revoked_at is None:
        record.revoked_at = utc_now()
        db.commit()


def revoke_all_refresh_tokens(db: Session, user_id: int) -> None:
    """
    Revoke every active refresh token for a user.
    Called after a successful password reset to invalidate all existing sessions.
    """
    now = utc_now()
    (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user_id,
            RefreshToken.revoked_at.is_(None),
        )
        .update({"revoked_at": now}, synchronize_session=False)
    )
    db.commit()
