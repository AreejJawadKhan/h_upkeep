import hashlib
import secrets
from datetime import datetime, timedelta, timezone

import jwt
from pwdlib import PasswordHash

from app.core.config import settings


password_hash = PasswordHash.recommended()


# ---------------------------------------------------------------------------
# Password utilities
# ---------------------------------------------------------------------------

def hash_password(password: str) -> str:
    return password_hash.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return password_hash.verify(plain_password, hashed_password)


# ---------------------------------------------------------------------------
# JWT access tokens
# ---------------------------------------------------------------------------

def create_access_token(user_id: int) -> str:
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES
    )
    payload = {
        "sub": str(user_id),
        "exp": expires_at,
    }
    return jwt.encode(
        payload,
        settings.JWT_SECRET,
        algorithm=settings.JWT_ALGORITHM,
    )


# ---------------------------------------------------------------------------
# Opaque token utilities (email verification, password reset, refresh tokens)
# ---------------------------------------------------------------------------

def generate_raw_token() -> str:
    """
    Generate a cryptographically secure, URL-safe opaque token.
    32 bytes → 43-character base64url string with no padding.
    This is the value sent to users (in emails or cookies); never store it.
    """
    return secrets.token_urlsafe(32)


def hash_token(raw_token: str) -> str:
    """
    Return the SHA-256 hex digest of *raw_token*.
    This is the value stored in the database; never store the raw token itself.
    """
    return hashlib.sha256(raw_token.encode()).hexdigest()