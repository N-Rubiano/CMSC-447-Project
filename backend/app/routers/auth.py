"""
routers/auth.py — POST /api/auth/login (legacy), POST /api/auth/supabase-login,
                  POST /api/auth/supabase-callback, GET /api/auth/me
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel, EmailStr, Field, field_validator

from app.auth import (
    hash_password, verify_password, create_access_token, get_current_user,
    MAX_PASSWORD_BYTES,
)
from app.config import settings
from app.database import get_db
from app.models.user import User


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str

class RegisterRequest(BaseModel):
    email:     EmailStr
    password:  str = Field(min_length=8)
    full_name: str
    role:      str   # must be one of the 6 canonical roles

    @field_validator("password")
    @classmethod
    def validate_password(cls, password: str) -> str:
        if len(password.encode("utf-8")) > MAX_PASSWORD_BYTES:
            raise ValueError("Password must not exceed 72 UTF-8 bytes.")
        return password



# ---------------------------------------------------------------------------
# POST /api/auth/supabase-login
# Signs the user in through Supabase Auth server-side and returns a
# Supabase session (access_token + refresh_token) plus our role profile.
# ---------------------------------------------------------------------------

@router.post("/supabase-login")
def supabase_login(body: SupabaseLoginRequest):
    """
    Server-side Supabase sign-in via GoTrue REST API.
    Returns: { access_token, refresh_token, expires_in, user: { ...our profile } }
    """
    import urllib.request, urllib.error, json as _json

    url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/token?grant_type=password"
    payload = _json.dumps({"email": body.email, "password": body.password}).encode()
    req = urllib.request.Request(
        url,
        data=payload,
        headers={
            "Content-Type": "application/json",
            "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
        },
        method="POST",
    )
    db.add(user)
    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise HTTPException(status_code=400, detail="Email already registered.")
    db.refresh(user)
    return {"id": user.id, "email": user.email, "role": user.role}


@router.post("/token", response_model=TokenResponse)
def login(
    form: OAuth2PasswordRequestForm = Depends(),
    db:   Session = Depends(get_db),
):
    """OAuth2 password flow — returns a JWT bearer token."""
    user = db.query(User).filter(User.email == form.username).first()
    if not user or not verify_password(form.password, user.hashed_pw):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password.",
            headers={"WWW-Authenticate": "Bearer"},
        )
    token = create_access_token(
        data={"sub": str(user.id), "role": user.role},
        expires_delta=timedelta(minutes=settings.access_token_expire_minutes),
    )

    safe_user = {k: v for k, v in user.items() if k != "password_hash"}
    safe_user["company_type"] = company.get("type") if company else user.get("role")

    return {"token": token, "user": safe_user}


# ---------------------------------------------------------------------------
# GET /api/auth/me
# ---------------------------------------------------------------------------

@router.get("/me")
def me(current_user: dict = Depends(get_current_user)):
    user = None
    if current_user.get("id"):
        try:
            user = execute_one("SELECT * FROM users WHERE id=:id", {"id": current_user.get("id")})
        except Exception:
            user = None

    if not user and current_user.get("email"):
        try:
            user = execute_one(
                "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)",
                {"email": current_user.get("email")},
            )
        except Exception:
            user = None

    if not user:
        # Supabase user without a local row yet — return the session claims
        return current_user

    company = None
    if user.get("company_id"):
        try:
            company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": user.get("company_id")})
        except Exception:
            company = None

    safe = {k: v for k, v in user.items() if k != "password_hash"}
    safe["company_type"] = company.get("type") if company else user.get("role")
    return safe


# ---------------------------------------------------------------------------
# Internal helper: provision a local user row on first Supabase login
# ---------------------------------------------------------------------------

def _provision_local_user(supabase_uid: str, email: str) -> dict:
    """
    Find or create a local users row linked to a Supabase auth identity.
    Returns the safe user dict (no password_hash).
    """
    # Try existing link
    user = execute_one("SELECT * FROM users WHERE supabase_uid=:uid", {"uid": supabase_uid})

    # Try email match (existing seed user — link on first Supabase login)
    if not user:
        user = execute_one(
            "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)", {"email": email}
        )
        if user:
            execute_write(
                "UPDATE users SET supabase_uid=:uid WHERE id=:id",
                {"uid": supabase_uid, "id": user["id"]},
            )

    # Brand-new user — create a minimal row
    if not user:
        user_id = f"usr-{uuid.uuid4().hex[:8]}"
        name = email.split("@")[0].replace(".", " ").title()
        now = datetime.now(timezone.utc).isoformat()
        execute_write(
            """INSERT INTO users (id, name, email, role, supabase_uid, created_at, updated_at)
               VALUES (:id, :name, :email, :role, :uid, :now, :now)""",
            {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "field_inspector",
                "uid": supabase_uid,
                "now": now,
            },
        )
        user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})

    if user:
        user.pop("password_hash", None)
    return user or {}
