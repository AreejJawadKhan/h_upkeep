"""
Authentication API — Phase 2B + 2C + 2D

Phase 2B  Local authentication
  POST /auth/register              Register; sends verification email
  POST /auth/login                 Credential check + verified-only login
  GET  /auth/me                    Authenticated user info
  POST /auth/verify-email          Consume email-verification token
  POST /auth/resend-verification   Re-send verification link (safe/no-enum)
  POST /auth/password-reset/request   Request a reset link (safe/no-enum)
  POST /auth/password-reset/confirm   Set a new password

Phase 2C  Google OAuth 2.0 / OIDC
  GET  /auth/google/login          Redirect to Google authorization
  GET  /auth/google/callback       Handle Google callback

Phase 2D  Session security
  POST /auth/refresh               Rotate refresh cookie → new access token
  POST /auth/logout                Revoke refresh token + clear cookie

Rate-limit summary
  Registration         5 / minute
  Login               10 / minute
  Refresh             30 / minute
  Resend verification  3 / minute
  Password reset req   3 / minute
  Verify email        10 / minute
  Password reset conf 10 / minute
"""

import secrets
from datetime import datetime
from typing import Optional
from urllib.parse import urlencode

import httpx
from fastapi import APIRouter, Cookie, Depends, HTTPException, Request, Response, status
from fastapi.responses import RedirectResponse
from sqlalchemy.orm import Session

from app.core.config import settings
from app.core.limiter import limiter
from app.core.security import create_access_token, hash_password
from app.db.database import get_db
from app.dependencies.auth import get_current_user
from app.models.refresh_token import RefreshToken
from app.models.user import User
from app.schemas.auth import (
    LoginRequest,
    MessageResponse,
    PasswordResetConfirm,
    PasswordResetRequest,
    RefreshResponse,
    RegisterRequest,
    ResendVerificationRequest,
    TokenResponse,
    UserResponse,
    VerifyEmailRequest,
)
from app.services.auth import (
    GoogleEmailConflictError,
    authenticate_user,
    create_user,
    get_or_create_google_user,
    get_user_by_email,
)
from app.services.email import send_password_reset_email, send_verification_email
from app.services.tokens import (
    consume_password_reset_token,
    consume_refresh_token,
    create_password_reset_token,
    create_refresh_token_record,
    create_verification_token,
    revoke_all_refresh_tokens,
    revoke_refresh_token,
    verify_email_token,
)

router = APIRouter(prefix="/auth", tags=["Authentication"])

# ---------------------------------------------------------------------------
# Cookie helpers
# ---------------------------------------------------------------------------

_REFRESH_COOKIE_NAME = "refresh_token"
_REFRESH_COOKIE_PATH = "/auth"


def _set_refresh_cookie(response: Response, raw_token: str) -> None:
    """Attach an HttpOnly refresh-token cookie to *response*."""
    response.set_cookie(
        key=_REFRESH_COOKIE_NAME,
        value=raw_token,
        httponly=True,
        secure=settings.COOKIE_SECURE,
        samesite="lax",
        max_age=settings.REFRESH_TOKEN_EXPIRE_DAYS * 24 * 3600,
        path=_REFRESH_COOKIE_PATH,
    )


def _clear_refresh_cookie(response: Response) -> None:
    """Expire the refresh-token cookie."""
    response.delete_cookie(
        key=_REFRESH_COOKIE_NAME,
        path=_REFRESH_COOKIE_PATH,
    )


# ---------------------------------------------------------------------------
# 2B — Registration
# ---------------------------------------------------------------------------

@router.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    summary="Register a new local account",
)
@limiter.limit("5/minute")
async def register(
    request: Request,
    data: RegisterRequest,
    db: Session = Depends(get_db),
):
    if get_user_by_email(db, data.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email is already registered.",
        )

    user = create_user(db=db, data=data)
    raw_token = create_verification_token(db, user)
    await send_verification_email(user.email, raw_token)

    return user


# ---------------------------------------------------------------------------
# 2B — Login (verified accounts only)
# ---------------------------------------------------------------------------

@router.post(
    "/login",
    response_model=TokenResponse,
    summary="Login with email and password",
)
@limiter.limit("10/minute")
def login(
    request: Request,
    data: LoginRequest,
    response: Response,
    db: Session = Depends(get_db),
):
    user = authenticate_user(db=db, email=data.email, password=data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password.",
        )

    if not user.email_verified:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Please verify your email address before logging in.",
        )

    access_token = create_access_token(user.id)
    raw_refresh = create_refresh_token_record(db, user.id)
    _set_refresh_cookie(response, raw_refresh)

    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        user=user,
    )


# ---------------------------------------------------------------------------
# 2B — Authenticated user info
# ---------------------------------------------------------------------------

@router.get(
    "/me",
    response_model=UserResponse,
    summary="Get the authenticated user's profile",
)
def get_me(
    current_user: User = Depends(get_current_user),
):
    return current_user


# ---------------------------------------------------------------------------
# 2B — Email verification
# ---------------------------------------------------------------------------

@router.post(
    "/verify-email",
    response_model=MessageResponse,
    summary="Verify email address using the token from the verification email",
)
@limiter.limit("10/minute")
def verify_email(
    request: Request,
    data: VerifyEmailRequest,
    db: Session = Depends(get_db),
):
    """
    The React frontend extracts the token from the ?token= query parameter
    in the verification link and POSTs it here.  This is the architecturally
    sound choice: clean API contract, no server-side redirect coupling.
    """
    user = verify_email_token(db, data.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification link is invalid or has expired.",
        )

    return MessageResponse(message="Email verified successfully. You can now log in.")


# ---------------------------------------------------------------------------
# 2B — Resend verification (safe — no account enumeration)
# ---------------------------------------------------------------------------

@router.post(
    "/resend-verification",
    response_model=MessageResponse,
    summary="Re-send the email verification link",
)
@limiter.limit("3/minute")
async def resend_verification(
    request: Request,
    data: ResendVerificationRequest,
    db: Session = Depends(get_db),
):
    """
    Always returns 200 regardless of whether the email is registered, to
    prevent account-enumeration attacks.
    """
    user = get_user_by_email(db, data.email)

    if user is not None and not user.email_verified:
        raw_token = create_verification_token(db, user)
        await send_verification_email(user.email, raw_token)

    return MessageResponse(
        message="If that email is registered and unverified, a new verification link has been sent."
    )


# ---------------------------------------------------------------------------
# 2B — Password reset request (safe — no account enumeration)
# ---------------------------------------------------------------------------

@router.post(
    "/password-reset/request",
    response_model=MessageResponse,
    summary="Request a password-reset link by email",
)
@limiter.limit("3/minute")
async def password_reset_request(
    request: Request,
    data: PasswordResetRequest,
    db: Session = Depends(get_db),
):
    """
    Always returns 200 regardless of whether the email is registered, to
    prevent account-enumeration attacks.  Only sends an email when a local
    account with a password_hash exists for that address.
    """
    user = get_user_by_email(db, data.email)

    if user is not None and user.password_hash is not None:
        raw_token = create_password_reset_token(db, user)
        await send_password_reset_email(user.email, raw_token)

    return MessageResponse(
        message="If that email is registered, a password-reset link has been sent."
    )


# ---------------------------------------------------------------------------
# 2B — Password reset confirm
# ---------------------------------------------------------------------------

@router.post(
    "/password-reset/confirm",
    response_model=MessageResponse,
    summary="Set a new password using a reset token",
)
@limiter.limit("10/minute")
def password_reset_confirm(
    request: Request,
    data: PasswordResetConfirm,
    db: Session = Depends(get_db),
):
    user = consume_password_reset_token(db, data.token)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password reset link is invalid or has expired.",
        )

    # Update the password.
    user.password_hash = hash_password(data.new_password)
    user.updated_at = datetime.utcnow()
    db.commit()

    # Security: revoke all active refresh tokens so existing sessions are
    # invalidated.  A new login is required after a password reset.
    revoke_all_refresh_tokens(db, user.id)

    return MessageResponse(message="Password reset successful. Please log in with your new password.")


# ---------------------------------------------------------------------------
# 2D — Refresh token rotation
# ---------------------------------------------------------------------------

@router.post(
    "/refresh",
    response_model=RefreshResponse,
    summary="Exchange a refresh cookie for a new access token",
)
@limiter.limit("30/minute")
def refresh_access_token(
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=_REFRESH_COOKIE_NAME),
):
    """
    Reads the HttpOnly 'refresh_token' cookie, validates it, revokes the old
    token (rotation), issues a fresh access token, and sets a new refresh
    cookie.  The old cookie value is immediately invalidated in the database.
    """
    if not refresh_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="No refresh token present.",
        )

    user = consume_refresh_token(db, refresh_token)

    if user is None:
        _clear_refresh_cookie(response)
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token is invalid or has expired.",
        )

    new_access_token = create_access_token(user.id)
    new_raw_refresh = create_refresh_token_record(db, user.id)
    _set_refresh_cookie(response, new_raw_refresh)

    return RefreshResponse(access_token=new_access_token, token_type="bearer")


# ---------------------------------------------------------------------------
# 2D — Logout
# ---------------------------------------------------------------------------

@router.post(
    "/logout",
    response_model=MessageResponse,
    summary="Revoke the refresh token and clear the session cookie",
)
def logout(
    response: Response,
    db: Session = Depends(get_db),
    refresh_token: Optional[str] = Cookie(default=None, alias=_REFRESH_COOKIE_NAME),
):
    if refresh_token:
        revoke_refresh_token(db, refresh_token)

    _clear_refresh_cookie(response)
    return MessageResponse(message="Logged out successfully.")


# ---------------------------------------------------------------------------
# 2C — Google OAuth 2.0 / OIDC
# ---------------------------------------------------------------------------

def _google_is_configured() -> bool:
    return bool(settings.GOOGLE_CLIENT_ID and settings.GOOGLE_CLIENT_SECRET)


@router.get(
    "/google/login",
    summary="Initiate Google OAuth 2.0 sign-in",
    include_in_schema=True,
)
async def google_login(request: Request):
    """
    Redirects the browser to Google's authorization endpoint.
    Requires GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in .env.
    """
    if not _google_is_configured():
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Google sign-in is not configured on this server.",
        )

    # Generate and store CSRF state token in the session.
    state = secrets.token_urlsafe(16)
    request.session["google_oauth_state"] = state

    params = {
        "response_type": "code",
        "client_id": settings.GOOGLE_CLIENT_ID,
        "redirect_uri": settings.GOOGLE_REDIRECT_URI,
        "scope": "openid email profile",
        "state": state,
        "access_type": "online",
        "prompt": "select_account",
    }

    google_auth_url = "https://accounts.google.com/o/oauth2/v2/auth?" + urlencode(params)
    return RedirectResponse(url=google_auth_url, status_code=status.HTTP_302_FOUND)


@router.get(
    "/google/callback",
    summary="Handle Google OAuth 2.0 callback",
    include_in_schema=True,
)
async def google_callback(
    request: Request,
    db: Session = Depends(get_db),
    code: Optional[str] = None,
    state: Optional[str] = None,
    error: Optional[str] = None,
):
    """
    Handles the redirect back from Google after user authorization.

    Flow
    ----
    1. Validate CSRF state.
    2. Exchange authorization code for tokens with Google.
    3. Fetch user identity from Google's userinfo endpoint.
    4. Find or create a HomeRepair Log User + AuthIdentity.
    5. Issue our own short-lived access token + long-lived refresh cookie.
    6. Redirect to the frontend callback page with the access token in the
       URL fragment (fragments are not sent in HTTP requests or server logs).
    """
    frontend_error_url = f"{settings.FRONTEND_URL}/auth/error"

    if not _google_is_configured():
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=google_not_configured",
            status_code=status.HTTP_302_FOUND,
        )

    # User denied access on Google's consent screen.
    if error:
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=access_denied",
            status_code=status.HTTP_302_FOUND,
        )

    # Validate CSRF state.
    expected_state = request.session.pop("google_oauth_state", None)
    if not state or state != expected_state:
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=invalid_state",
            status_code=status.HTTP_302_FOUND,
        )

    if not code:
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=missing_code",
            status_code=status.HTTP_302_FOUND,
        )

    # --- Exchange authorization code for tokens ---
    try:
        async with httpx.AsyncClient() as client:
            token_response = await client.post(
                "https://oauth2.googleapis.com/token",
                data={
                    "client_id": settings.GOOGLE_CLIENT_ID,
                    "client_secret": settings.GOOGLE_CLIENT_SECRET,
                    "code": code,
                    "grant_type": "authorization_code",
                    "redirect_uri": settings.GOOGLE_REDIRECT_URI,
                },
                headers={"Accept": "application/json"},
            )
            token_response.raise_for_status()
            token_data = token_response.json()

            # --- Fetch Google user info ---
            userinfo_response = await client.get(
                "https://www.googleapis.com/oauth2/v3/userinfo",
                headers={"Authorization": f"Bearer {token_data['access_token']}"},
            )
            userinfo_response.raise_for_status()
            userinfo = userinfo_response.json()

    except httpx.HTTPError:
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=google_api_error",
            status_code=status.HTTP_302_FOUND,
        )

    google_sub = userinfo.get("sub")
    email = userinfo.get("email", "")
    name = userinfo.get("name") or userinfo.get("given_name") or "Google User"

    if not google_sub or not email:
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=incomplete_profile",
            status_code=status.HTTP_302_FOUND,
        )

    # --- Find or create HomeRepair Log user ---
    try:
        user = get_or_create_google_user(db, google_sub, email, name)
    except GoogleEmailConflictError:
        # The email is already registered as a local account.
        # Redirect to a frontend page that can prompt the user to log in
        # with their password and link their Google account later.
        return RedirectResponse(
            url=f"{frontend_error_url}?reason=email_conflict",
            status_code=status.HTTP_302_FOUND,
        )

    # --- Issue HomeRepair Log tokens ---
    access_token = create_access_token(user.id)
    raw_refresh = create_refresh_token_record(db, user.id)

    # Pass the access token via URL fragment (not sent to servers, not in
    # server logs, cleared from browser history on React navigation).
    frontend_callback_url = (
        f"{settings.FRONTEND_URL}/auth/callback"
        f"#access_token={access_token}&token_type=bearer"
    )

    redirect = RedirectResponse(
        url=frontend_callback_url,
        status_code=status.HTTP_302_FOUND,
    )
    _set_refresh_cookie(redirect, raw_refresh)
    return redirect