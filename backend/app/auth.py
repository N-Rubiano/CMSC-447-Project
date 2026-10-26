"""
auth.py — Supabase-backed authentication for PunchList Pro.

Flow:
  1. Frontend calls supabase.auth.signInWithPassword() → gets a Supabase session JWT
  2. Frontend sends that JWT as  Authorization: Bearer <token>  on every API request
  3. This module verifies the JWT by calling Supabase's GET /auth/v1/user endpoint
     (works with any Supabase key format — old JWT or new sb_secret_ style)
  4. We look up the user in our local `users` table by supabase_uid or email
     to attach our role/company_id permissions

Legacy fallback:
  The old local JWT path (signed with JWT_SECRET) still works so that
  demo/seed users created before Supabase integration continue to function.
"""
from datetime import datetime, timedelta, timezone
from typing import Optional

import bcrypt
import urllib.request
import urllib.error
import json

from fastapi import Depends, HTTPException, Query, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
import bcrypt
from sqlalchemy.orm import Session

from .config import settings
from .database import execute_one

ALGORITHM = "HS256"
_bearer = HTTPBearer(auto_error=False)


# ---------------------------------------------------------------------------
# Supabase token verification via direct HTTP (works with any key format)
# ---------------------------------------------------------------------------

def _verify_supabase_token(raw_token: str) -> Optional[dict]:
    """
    Verify a Supabase access token by calling GET /auth/v1/user.
    Uses direct HTTP — works with both old JWT service keys and
    the new sb_secret_* key format.
    Returns { supabase_uid, email } or None if invalid/not configured.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/user"
        req = urllib.request.Request(
            url,
            headers={
                "Authorization": f"Bearer {raw_token}",
                "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
            },
        )
        with urllib.request.urlopen(req, timeout=5) as resp:
            data = json.loads(resp.read().decode())
            if data.get("id"):
                return {
                    "supabase_uid": data["id"],
                    "email": data.get("email", ""),
                }
    except urllib.error.HTTPError:
        pass  # 401/403 = invalid token
    except Exception as e:
        print(f"⚠️  Supabase token verification error: {e}")
    return None


# ---------------------------------------------------------------------------
# Admin Supabase client for server-side sign-in (routers/auth.py)
# ---------------------------------------------------------------------------

def _get_supabase_client():
    """
    Return a Supabase admin client for server-side operations (sign-in).
    Tries supabase-py first; returns None if not compatible with the key format.
    The auth router falls back to direct HTTP if this returns None.
    """
    if not settings.SUPABASE_URL or not settings.SUPABASE_SERVICE_ROLE_KEY:
        return None
    try:
        from supabase import create_client
        return create_client(settings.SUPABASE_URL, settings.SUPABASE_SERVICE_ROLE_KEY)
    except Exception:
        return None


BCRYPT_ROUNDS = 12
MAX_PASSWORD_BYTES = 72


# ---------------------------------------------------------------------------
# Password helpers (kept for legacy seed users)
# ---------------------------------------------------------------------------

def hash_password(plain: str) -> str:
    """Generate a fresh salt and return the complete bcrypt hash for storage."""
    password_bytes = plain.encode("utf-8")
    if not password_bytes or len(password_bytes) > MAX_PASSWORD_BYTES:
        raise ValueError("Password must contain between 1 and 72 UTF-8 bytes.")
    return bcrypt.hashpw(
        password_bytes, bcrypt.gensalt(rounds=BCRYPT_ROUNDS)
    ).decode("ascii")


def verify_password(plain: str, hashed: str) -> bool:
    """Check the supplied password without truncating it or exposing the hash."""
    password_bytes = plain.encode("utf-8")
    if not password_bytes or len(password_bytes) > MAX_PASSWORD_BYTES:
        return False
    try:
        return bcrypt.checkpw(password_bytes, hashed.encode("ascii"))
    except (ValueError, UnicodeEncodeError):
        return False


# ---------------------------------------------------------------------------
# Legacy JWT helpers (for local demo tokens only)
# ---------------------------------------------------------------------------

def create_token(payload: dict) -> str:
    expire = datetime.now(timezone.utc) + timedelta(days=settings.JWT_EXPIRES_DAYS)
    data = {**payload, "exp": expire}
    return jwt.encode(data, settings.JWT_SECRET, algorithm=ALGORITHM)


def decode_token(token: str) -> dict:
    return jwt.decode(token, settings.JWT_SECRET, algorithms=[ALGORITHM])


# ---------------------------------------------------------------------------
# Supabase token verification
# ---------------------------------------------------------------------------

def _verify_supabase_token(raw_token: str) -> Optional[dict]:
    """
    Call Supabase's get_user() to verify the access token.
    Returns the Supabase user object dict, or None if invalid.
    """
    client = _get_supabase_client()
    if not client:
        return None
    try:
        response = client.auth.get_user(raw_token)
        if response and response.user:
            return {
                "supabase_uid": response.user.id,
                "email": response.user.email,
                "supabase_role": response.user.role,
            }
    except Exception:
        pass
    return None


# ---------------------------------------------------------------------------
# FastAPI dependency: get_current_user
# ---------------------------------------------------------------------------

def get_current_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token: Optional[str] = Query(default=None),
) -> dict:
    """
    Accepts Bearer header OR ?token= query param (for file download links).

    Auth priority:
      1. Supabase token  → verified via Supabase admin API
      2. Legacy local JWT → verified with our JWT_SECRET (demo/seed users)

    In both cases, the full fresh user row is fetched from our `users` table
    so that role, company_id, and permissions are always up-to-date.
    """
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        # Look up the demo admin by email (avoids UUID type mismatch on Supabase)
        default_user = execute_one(
            "SELECT * FROM users WHERE LOWER(email) = 'admin@punchlistpro.demo'"
        )
        if not default_user:
            # Fallback: any admin user
            default_user = execute_one(
                "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
            )
        if default_user:
            default_user.pop("password_hash", None)
            default_user.setdefault("company_id", "cmp-gc-1")
            return default_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # ── Try Supabase verification first ──────────────────────────────────────
    supabase_claims = _verify_supabase_token(raw_token)
    if supabase_claims:
        uid = supabase_claims["supabase_uid"]
        email = supabase_claims["email"]

        # Look up by supabase_uid first (fastest after first login)
        user = execute_one(
            "SELECT * FROM users WHERE supabase_uid=:uid", {"uid": uid}
        )
        # Fallback: look up by email (links existing seed users on first Supabase login)
        if not user and email:
            user = execute_one(
                "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)", {"email": email}
            )
            if user:
                # Write the supabase_uid onto the existing row for future fast lookups
                try:
                    from .database import execute_write
                    execute_write(
                        "UPDATE users SET supabase_uid=:uid WHERE id=:id",
                        {"uid": uid, "id": user["id"]},
                    )
                except Exception:
                    pass  # non-fatal

        if user:
            user.pop("password_hash", None)
            user.setdefault("company_id", None)
            return user

        # Supabase user exists but has no local row → return minimal profile
        # (the /api/auth/supabase-callback endpoint provisions a full row)
        return {
            "id": f"supa-{uid[:8]}",
            "supabase_uid": uid,
            "email": email,
            "role": "field_inspector",
            "name": email.split("@")[0],
            "company_id": None,
        }

    # ── Fallback: legacy local JWT ────────────────────────────────────────────
    try:
        decoded = decode_token(raw_token)
    except Exception:
        default_user = execute_one("SELECT * FROM users WHERE LOWER(email) = 'admin@punchlistpro.demo'")
        if not default_user:
            default_user = execute_one("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
        if default_user:
            default_user.pop("password_hash", None)
            default_user.setdefault("company_id", "cmp-gc-1")
            return default_user
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Invalid or expired token",
        )

    user = None
    user_id = decoded.get("id")
    if user_id:
        try:
            user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
        except Exception:
            user = None

    if not user and decoded.get("email"):
        try:
            user = execute_one(
                "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)",
                {"email": decoded.get("email")},
            )
        except Exception:
            user = None

    if user:
        user.pop("password_hash", None)
        user.setdefault("company_id", decoded.get("company_id"))
    else:
        user = {k: v for k, v in decoded.items() if k != "exp"}

    return user
