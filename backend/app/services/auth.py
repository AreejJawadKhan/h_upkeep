from sqlalchemy.orm import Session

from app.core.security import hash_password, verify_password
from app.models.auth_identity import AuthIdentity
from app.models.user import User
from app.schemas.auth import RegisterRequest


# ---------------------------------------------------------------------------
# Email normalization
# ---------------------------------------------------------------------------

def normalize_email(email: str) -> str:
    """
    Normalize an email address for application-level matching.
    Lowercases the address and strips leading/trailing whitespace.
    Pydantic's EmailStr validates syntax before this is called.
    """
    return email.lower().strip()


# ---------------------------------------------------------------------------
# User lookup
# ---------------------------------------------------------------------------

def get_user_by_email(db: Session, email: str) -> User | None:
    normalized = normalize_email(email)
    return (
        db.query(User)
        .filter(User.email == normalized)
        .first()
    )


# ---------------------------------------------------------------------------
# Local account creation
# ---------------------------------------------------------------------------

def create_user(db: Session, data: RegisterRequest) -> User:
    """
    Create a new local user account and its corresponding AuthIdentity.

    The user starts with email_verified=False.  A verification email must be
    sent separately, and login must be blocked until verification completes.
    """
    normalized_email = normalize_email(data.email)

    user = User(
        name=data.name,
        email=normalized_email,
        password_hash=hash_password(data.password),
        email_verified=False,
    )
    db.add(user)
    db.flush()  # Populate user.id before creating the identity record.

    identity = AuthIdentity(
        user_id=user.id,
        provider="local",
        provider_user_id=normalized_email,
    )
    db.add(identity)
    db.commit()
    db.refresh(user)

    return user


# ---------------------------------------------------------------------------
# Local authentication
# ---------------------------------------------------------------------------

def authenticate_user(
    db: Session,
    email: str,
    password: str,
) -> User | None:
    """
    Verify an email/password pair.

    Returns the User if credentials are valid, regardless of email_verified
    status (the caller is responsible for checking email_verified and
    raising an appropriate error).  Returns None for any credential failure.

    The caller must NOT distinguish between "wrong email" and "wrong password"
    in error messages to avoid account-enumeration.
    """
    user = get_user_by_email(db, email)

    if user is None:
        return None

    # Google-only accounts have no local password hash.
    if user.password_hash is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


# ---------------------------------------------------------------------------
# Google identity — find or create
# ---------------------------------------------------------------------------

class GoogleEmailConflictError(Exception):
    """
    Raised when the Google identity's email is already registered as a local
    account, and automatic linking is not performed (per spec).
    """
    pass


def get_or_create_google_user(
    db: Session,
    google_sub: str,
    email: str,
    name: str,
) -> User:
    """
    Return the HomeRepair Log User associated with a Google identity.

    Lookup strategy
    ---------------
    1. Search for AuthIdentity(provider="google", provider_user_id=google_sub).
       If found → return the linked User (returning user sign-in).

    2. If not found, check whether the email is already taken by a local user.
       If so → raise GoogleEmailConflictError (do NOT auto-merge; spec §10).

    3. Otherwise → create a new User + AuthIdentity.
       Google-verified emails are created with email_verified=True.

    The spec explicitly states: "do not blindly merge accounts solely because
    an email string matches."
    """
    # Step 1: Look up by stable Google subject identifier.
    identity = (
        db.query(AuthIdentity)
        .filter(
            AuthIdentity.provider == "google",
            AuthIdentity.provider_user_id == google_sub,
        )
        .first()
    )
    if identity is not None:
        return identity.user

    normalized_email = normalize_email(email)

    # Step 2: Guard against silent email-based merging.
    existing_user = (
        db.query(User)
        .filter(User.email == normalized_email)
        .first()
    )
    if existing_user is not None:
        raise GoogleEmailConflictError(
            f"Email '{normalized_email}' is already registered with a local account."
        )

    # Step 3: Create a brand-new user for this Google identity.
    user = User(
        name=name,
        email=normalized_email,
        password_hash=None,    # No local password for Google-only users.
        email_verified=True,   # Google has verified ownership of the email.
    )
    db.add(user)
    db.flush()

    identity = AuthIdentity(
        user_id=user.id,
        provider="google",
        provider_user_id=google_sub,
    )
    db.add(identity)
    db.commit()
    db.refresh(user)

    return user