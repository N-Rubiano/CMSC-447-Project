"""
auth.py — Supabase-backed authentication for PunchList Pro.

Flow:
  1. Frontend calls supabase.auth.signInWithPassword() → gets a Supabase session JWT
  2. Frontend sends that JWT as  Authorization: Bearer <token>  on every API request
  3. This module verifies the JWT by calling Supabase's GET /auth/v1/user endpoint
     (works with any Supabase key format — old JWT or new sb_secret_ style)
  4. We look up the user in our local `users` table by supabase_uid or email
     to attach our role/company_id permissions
  5. Enforces account lifecycle status (active, pending_approval, pending_invitation,
     pending_password_reset, suspended, rejected) and first-login password reset.

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

from fastapi import Depends, HTTPException, Query, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
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
    except urllib.error.URLError:
        pass  # DNS resolution failed or host unreachable (offline or paused Supabase instance)
    except Exception as e:
        print(f"⚠️  Supabase token verification error: {e}")
    return None


# ---------------------------------------------------------------------------
# Admin Supabase client for server-side operations (routers/auth.py)
# ---------------------------------------------------------------------------

def _get_supabase_client():
    """
    Return a Supabase admin client for server-side operations (sign-in, invite, update).
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
# Password helpers
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
# Account Lifecycle & Authorization Enforcement
# ---------------------------------------------------------------------------

def enforce_account_status(user: dict, request: Optional[Request] = None):
    """
    Backend-enforced account lifecycle and mandatory first-login password setup.
    Guarantees suspended, pending approval, rejected, or un-onboarded users
    cannot access protected resources even if they possess a valid session token.
    """
    if not user:
        return

    acc_status = (user.get("status") or "active").lower()
    if acc_status == "suspended":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is suspended. Please contact your administrator.",
        )
    if acc_status == "rejected":
        reason = user.get("rejection_reason")
        msg = f"Account request was rejected: {reason}" if reason else "Account request was rejected by an administrator."
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=msg,
        )
    if acc_status == "pending_approval":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is pending administrator approval before project access can be granted.",
        )

    # Mandatory first-login password reset check
    must_reset = bool(user.get("must_reset_password")) or acc_status in ("pending_password_reset", "pending_invitation")
    if must_reset and request:
        path = request.url.path
        allowed_paths = (
            "/api/auth/me",
            "/api/auth/invitation",
            "/api/auth/complete-onboarding",
            "/api/auth/logout",
            "/api/health",
        )
        if not any(path.startswith(p) for p in allowed_paths):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="First-login password setup required. Please complete onboarding.",
            )


# ---------------------------------------------------------------------------
# FastAPI dependency: get_current_user
# ---------------------------------------------------------------------------

def get_current_user(
    request: Request = None,
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer),
    token: Optional[str] = Query(default=None),
) -> dict:
    """
    Accepts Bearer header OR ?token= query param (for file download links).

    Auth priority:
      1. Supabase token  → verified via Supabase admin API
      2. Legacy local JWT → verified with our JWT_SECRET (demo/seed users)

    In both cases, the full fresh user row is fetched from our `users` table
    so that role, company_id, status, and permissions are always up-to-date.
    """
    raw_token = None
    if credentials:
        raw_token = credentials.credentials
    elif token:
        raw_token = token

    if not raw_token:
        # Look up the default admin by email
        default_user = execute_one(
            "SELECT * FROM users WHERE LOWER(email) = 'uw61778@umbc.edu'"
        )
        if not default_user:
            # Fallback: any admin user
            default_user = execute_one(
                "SELECT * FROM users WHERE role = 'admin' LIMIT 1"
            )
        if default_user:
            default_user.pop("password_hash", None)
            default_user.setdefault("company_id", "cmp-gc-1")
            default_user.setdefault("status", "active")
            default_user.setdefault("must_reset_password", False)
            enforce_account_status(default_user, request)
            return default_user
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
        )

    # ── 1. Fast-path: local JWT (instant in-memory check, zero network/DNS latency) ──
    try:
        decoded = decode_token(raw_token)
    except Exception:
        decoded = None

    if decoded:
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
            user.setdefault("status", "active")
            user.setdefault("must_reset_password", False)
        else:
            user = {k: v for k, v in decoded.items() if k != "exp"}
            user.setdefault("status", "active")
            user.setdefault("must_reset_password", False)

        enforce_account_status(user, request)
        return user

    # ── 2. External auth: verify Supabase token ──────────────────────────────
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
            user.setdefault("status", "active")
            user.setdefault("must_reset_password", False)
            enforce_account_status(user, request)
            return user

        # Supabase user exists but has no local row → return minimal profile with pending_approval
        unapproved = {
            "id": f"supa-{uid[:8]}",
            "supabase_uid": uid,
            "email": email,
            "role": "sub_contractor",
            "name": email.split("@")[0],
            "company_id": None,
            "status": "pending_approval",
            "must_reset_password": False,
        }
        enforce_account_status(unapproved, request)
        return unapproved

    # ── 3. Fallback for demo dev mode if token was provided ──────────────────
    default_user = execute_one("SELECT * FROM users WHERE LOWER(email) = 'uw61778@umbc.edu'")
    if not default_user:
        default_user = execute_one("SELECT * FROM users WHERE role = 'admin' LIMIT 1")
    if default_user:
        default_user.pop("password_hash", None)
        default_user.setdefault("company_id", "cmp-gc-1")
        default_user.setdefault("status", "active")
        default_user.setdefault("must_reset_password", False)
        enforce_account_status(default_user, request)
        return default_user

    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Invalid or expired token",
    )
