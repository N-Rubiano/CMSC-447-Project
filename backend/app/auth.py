"""
auth.py — JWT token creation/verification and bcrypt password hashing.

Provides
--------
- `hash_password(plain)` — bcrypt-hash a plaintext password
- `verify_password(plain, hashed)` — compare plaintext against hash
- `create_access_token(data, expires_delta)` — mint a signed JWT
- `get_current_user(token, db)` — FastAPI dependency that decodes a
  Bearer token and returns the authenticated User ORM object
- `require_role(*roles)` — returns a dependency that raises 403 if the
  current user's role is not in the allowed set
"""

from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db

# ── Bcrypt context ─────────────────────────────────────────────────────────────
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# ── OAuth2 scheme — clients send Authorization: Bearer <token> ─────────────────
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


def hash_password(plain: str) -> str:
    return pwd_context.hash(plain)


def verify_password(plain: str, hashed: str) -> bool:
    return pwd_context.verify(plain, hashed)


# ── JWT helpers ────────────────────────────────────────────────────────────────

def create_access_token(data: dict, expires_delta: timedelta | None = None) -> str:
    payload = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=settings.access_token_expire_minutes)
    )
    payload.update({"exp": expire})
    return jwt.encode(payload, settings.secret_key, algorithm=settings.algorithm)


# ── FastAPI dependencies ───────────────────────────────────────────────────────

def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db),
):
    """Decode the JWT and return the authenticated User row."""
    from app.models.user import User  # local import to avoid circular deps

    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        user_id: str = payload.get("sub")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.get(User, int(user_id))
    if user is None:
        raise credentials_exception
    return user


def require_role(*roles: str):
    """
    Dependency factory — raises HTTP 403 if the current user's role is not
    in the provided list.

    Usage::

        @router.get("/admin-only")
        def admin_route(user=Depends(require_role("admin"))):
            ...
    """
    def _check(current_user=Depends(get_current_user)):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Role '{current_user.role}' is not authorised for this action.",
            )
        return current_user
    return _check
