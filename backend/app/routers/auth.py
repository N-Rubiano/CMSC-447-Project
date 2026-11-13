"""
routers/auth.py — Authentication, Onboarding, and Lifecycle Management:
  - POST /api/auth/login (local & demo)
  - POST /api/auth/supabase-login
  - POST /api/auth/supabase-callback
  - GET  /api/auth/me
  - GET  /api/auth/invitation (verify invitation token)
  - POST /api/auth/complete-onboarding (first-login password setup)
"""
import uuid
import secrets
import re
import base64
from pathlib import Path
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, HTTPException, Depends, Query, Request
from fastapi.responses import FileResponse, Response
from pydantic import BaseModel

from ..auth import (
    create_token,
    verify_password,
    hash_password,
    get_current_user,
    _get_supabase_client,
)
from ..config import settings
from ..database import execute_one, execute_write, add_audit_log

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ---------------------------------------------------------------------------
# Pydantic models
# ---------------------------------------------------------------------------

class LoginRequest(BaseModel):
    email: str
    password: str


class SupabaseLoginRequest(BaseModel):
    email: str
    password: str


class CompleteOnboardingRequest(BaseModel):
    token: str
    password: str


class ProfileUpdatePayload(BaseModel):
    name: Optional[str] = None
    avatar_url: Optional[str] = None
    phone: Optional[str] = None


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
    try:
        with urllib.request.urlopen(req, timeout=10) as resp:
            data = _json.loads(resp.read().decode())
    except urllib.error.HTTPError as e:
        err_body = e.read().decode() if e.fp else ""
        try:
            err_data = _json.loads(err_body)
            msg = err_data.get("error_description") or err_data.get("message") or "Invalid credentials"
        except Exception:
            msg = "Invalid email or password"
        raise HTTPException(401, msg)
    except Exception as e:
        raise HTTPException(503, f"Supabase authentication unavailable: {e}")

    access_token = data.get("access_token")
    if not access_token:
        raise HTTPException(401, "Invalid email or password")

    supa_user = data.get("user", {})
    user = _provision_local_user(supa_user.get("id", ""), supa_user.get("email", body.email))

    # Enforce account lifecycle status on Supabase sign-in
    acc_status = (user.get("status") or "active").lower()
    if acc_status == "suspended":
        raise HTTPException(403, "Account is suspended. Please contact your administrator.")
    if acc_status == "rejected":
        reason = user.get("rejection_reason")
        raise HTTPException(403, f"Account request was rejected: {reason}" if reason else "Account request was rejected.")
    if acc_status == "pending_approval":
        raise HTTPException(403, "Account is pending administrator approval before project access can be granted.")

    return {
        "access_token": access_token,
        "refresh_token": data.get("refresh_token"),
        "expires_in": data.get("expires_in"),
        "token_type": "bearer",
        "user": user,
    }


# ---------------------------------------------------------------------------
# POST /api/auth/supabase-callback
# Called by the frontend after a successful Supabase JS SDK login to
# provision / look up the user in our local DB and return the full profile.
# ---------------------------------------------------------------------------

@router.post("/supabase-callback")
def supabase_callback(current_user: dict = Depends(get_current_user)):
    """
    After the frontend signs in with Supabase JS SDK it calls this endpoint
    (with the Supabase access_token as Bearer) to get our role/company profile.
    """
    return current_user


# ---------------------------------------------------------------------------
# POST /api/auth/login  (legacy & demo accounts)
# ---------------------------------------------------------------------------

@router.post("/login")
def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password are required")

    user = execute_one(
        "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)",
        {"email": body.email.strip()},
    )
    if not user:
        raise HTTPException(401, "Invalid email or password")

    pw_ok = verify_password(body.password, user.get("password_hash", ""))
    if not pw_ok:
        raise HTTPException(401, "Invalid email or password")

    # Enforce account status
    acc_status = (user.get("status") or "active").lower()
    if acc_status == "suspended":
        raise HTTPException(403, "Account is suspended. Please contact your administrator.")
    if acc_status == "rejected":
        reason = user.get("rejection_reason")
        raise HTTPException(403, f"Account request was rejected: {reason}" if reason else "Account request was rejected.")
    if acc_status == "pending_approval":
        raise HTTPException(403, "Account is pending administrator approval before project access can be granted.")
    if user.get("must_reset_password"):
        raise HTTPException(403, "First-login password setup required. Please complete onboarding.")

    company = None
    if user.get("company_id"):
        company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": user.get("company_id")})

    token = create_token(
        {
            "id": user["id"],
            "role": user["role"],
            "email": user["email"],
            "company": user.get("company"),
            "company_id": user.get("company_id") or (company["id"] if company else None),
        }
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
        return current_user

    company = None
    if user.get("company_id"):
        try:
            company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": user.get("company_id")})
        except Exception:
            company = None

    # Handle avatar URL to avoid leaking massive base64 payloads in auth/session endpoint
    avatar_url = user.get("avatar_url") or ""
    if avatar_url.startswith("data:image/"):
        uid = str(user.get("id") or "default")
        avatar_url = f"/api/auth/avatar?uid={uid}"

    safe = {
        "id": str(user.get("id")),
        "email": user.get("email"),
        "name": user.get("name") or (user.get("email", "").split("@")[0] if user.get("email") else "User"),
        "role": user.get("role", "admin"),
        "company": user.get("company"),
        "company_id": user.get("company_id"),
        "company_type": company.get("type") if company else user.get("role"),
        "phone": user.get("phone"),
        "presence": user.get("presence", "active"),
        "presence_text": user.get("presence_text"),
        "status": user.get("status", "active"),
        "avatar_url": avatar_url,
        "avatar": avatar_url,
    }
    return safe


# ---------------------------------------------------------------------------
# GET /api/auth/avatar (lazy cached avatar endpoint)
# ---------------------------------------------------------------------------

@router.get("/avatar")
def get_avatar(uid: Optional[str] = Query(None)):
    if not uid:
        raise HTTPException(400, "User ID required")

    avatar_dir = Path(__file__).parent.parent.parent / "uploads" / "avatars"
    for ext in ("jpg", "jpeg", "png", "webp"):
        p = avatar_dir / f"{uid}.{ext}"
        if p.exists():
            return FileResponse(str(p), headers={"Cache-Control": "public, max-age=86400"})

    user = execute_one("SELECT avatar_url FROM users WHERE id=:id", {"id": uid})
    if user and user.get("avatar_url"):
        url = user["avatar_url"]
        if url.startswith("data:image/"):
            match = re.match(r"data:image/([a-zA-Z0-9]+);base64,(.+)", url)
            if match:
                media_type = f"image/{match.group(1)}"
                data = base64.b64decode(match.group(2))
                return Response(content=data, media_type=media_type, headers={"Cache-Control": "public, max-age=86400"})
        elif url.startswith("/uploads/"):
            file_path = Path(__file__).parent.parent.parent / url.lstrip("/")
            if file_path.exists():
                return FileResponse(str(file_path), headers={"Cache-Control": "public, max-age=86400"})

    raise HTTPException(404, "Avatar not found")


# ---------------------------------------------------------------------------
# PATCH /api/auth/profile
# ---------------------------------------------------------------------------

@router.patch("/profile")
def update_profile(body: ProfileUpdatePayload, current_user: dict = Depends(get_current_user)):
    user_id = current_user.get("id")
    email = current_user.get("email")
    if not user_id and not email:
        raise HTTPException(401, "Not authenticated")

    updates = {}
    if body.name is not None and body.name.strip():
        updates["name"] = body.name.strip()
    if body.avatar_url is not None:
        raw_avatar = body.avatar_url.strip()
        if raw_avatar.startswith("data:image/"):
            match = re.match(r"data:image/([a-zA-Z0-9]+);base64,(.+)", raw_avatar)
            if match:
                ext = match.group(1).lower()
                if ext == "jpeg":
                    ext = "jpg"
                try:
                    data = base64.b64decode(match.group(2))
                    avatar_dir = Path(__file__).parent.parent.parent / "uploads" / "avatars"
                    avatar_dir.mkdir(parents=True, exist_ok=True)
                    target_fname = f"{user_id or uuid.uuid4()}.{ext}"
                    (avatar_dir / target_fname).write_bytes(data)
                    raw_avatar = f"/uploads/avatars/{target_fname}"
                except Exception as ex:
                    print(f"Failed to persist avatar file: {ex}")
        updates["avatar_url"] = raw_avatar
    if body.phone is not None:
        updates["phone"] = body.phone.strip()

    if updates:
        updates["updated_at"] = datetime.now(timezone.utc).isoformat()
        set_clauses = [f"{col}=:{col}" for col in updates.keys()]
        if user_id:
            sql = f"UPDATE users SET {', '.join(set_clauses)} WHERE id=:uid"
            execute_write(sql, {**updates, "uid": user_id})
        else:
            sql = f"UPDATE users SET {', '.join(set_clauses)} WHERE LOWER(email)=LOWER(:email)"
            execute_write(sql, {**updates, "email": email})

    user = None
    if user_id:
        user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not user and email:
        user = execute_one("SELECT * FROM users WHERE LOWER(email)=LOWER(:email)", {"email": email})

    if user:
        user.pop("password_hash", None)
        user["avatar"] = user.get("avatar_url")

    res_user = user or {**current_user, **updates}
    res_user["avatar"] = res_user.get("avatar_url")
    return {"user": res_user}


# ---------------------------------------------------------------------------
# GET /api/auth/invitation (verify invitation token)
# ---------------------------------------------------------------------------

@router.get("/invitation")
def verify_invitation(token: str = Query(...)):
    """Validate an onboarding invitation token and return safe onboarding metadata."""
    if not token or not token.strip():
        raise HTTPException(400, "Invitation token is required.")

    user = execute_one(
        "SELECT id, name, email, role, company, company_id, trade, status, invitation_expires_at, must_reset_password FROM users WHERE invitation_token=:tok",
        {"tok": token.strip()},
    )
    if not user:
        raise HTTPException(404, "Invalid or already used invitation link.")

    # Check expiration
    exp_str = user.get("invitation_expires_at")
    if exp_str:
        try:
            exp_dt = datetime.fromisoformat(str(exp_str).replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(410, "Invitation link has expired. Please contact an administrator for a new invite.")
        except (ValueError, TypeError):
            pass

    acc_status = (user.get("status") or "active").lower()
    if acc_status == "suspended":
        raise HTTPException(403, "This account is suspended. Please contact your administrator.")
    if acc_status == "rejected":
        reason = user.get("rejection_reason")
        raise HTTPException(403, f"Account request was rejected: {reason}" if reason else "Account request was rejected.")
    if acc_status == "pending_approval":
        raise HTTPException(403, "This account is currently awaiting administrator approval.")

    return {
        "valid": True,
        "id": user["id"],
        "name": user["name"],
        "email": user["email"],
        "role": user["role"],
        "company": user.get("company"),
        "trade": user.get("trade"),
        "status": user.get("status"),
        "must_reset_password": bool(user.get("must_reset_password")),
    }


# ---------------------------------------------------------------------------
# POST /api/auth/complete-onboarding (first-login password setup)
# ---------------------------------------------------------------------------

@router.post("/complete-onboarding")
def complete_onboarding(body: CompleteOnboardingRequest):
    """
    Establish new password for an invited user, activate their account,
    invalidate the invitation token, and return a signed JWT session.
    """
    if not body.token or not body.token.strip():
        raise HTTPException(400, "Invitation token is required.")
    if not body.password or len(body.password) < 8:
        raise HTTPException(400, "Password must be at least 8 characters long.")
    if not any(c.isupper() for c in body.password):
        raise HTTPException(400, "Password must contain at least one uppercase letter.")
    if not any(c.islower() for c in body.password):
        raise HTTPException(400, "Password must contain at least one lowercase letter.")
    if not any(c.isdigit() for c in body.password):
        raise HTTPException(400, "Password must contain at least one digit.")
    if len(body.password.encode("utf-8")) > 72:
        raise HTTPException(400, "Password exceeds 72 UTF-8 bytes.")

    user = execute_one(
        "SELECT * FROM users WHERE invitation_token=:tok",
        {"tok": body.token.strip()},
    )
    if not user:
        raise HTTPException(404, "Invalid or already used invitation link.")

    exp_str = user.get("invitation_expires_at")
    if exp_str:
        try:
            exp_dt = datetime.fromisoformat(str(exp_str).replace("Z", "+00:00"))
            if exp_dt < datetime.now(timezone.utc):
                raise HTTPException(410, "Invitation link has expired. Please contact an administrator for a new invite.")
        except (ValueError, TypeError):
            pass

    acc_status = (user.get("status") or "active").lower()
    if acc_status == "suspended":
        raise HTTPException(403, "Account is suspended. Please contact an administrator.")
    if acc_status == "rejected":
        raise HTTPException(403, "Account request was rejected.")
    if acc_status == "pending_approval":
        raise HTTPException(403, "Account is awaiting administrator approval before onboarding can be completed.")

    new_pw_hash = hash_password(body.password)
    now = datetime.now(timezone.utc).isoformat()

    # Synchronize with Supabase Auth if applicable
    supa_uid = user.get("supabase_uid")
    if supa_uid and settings.SUPABASE_URL and settings.SUPABASE_SERVICE_ROLE_KEY:
        try:
            import urllib.request, json as _json
            url = f"{settings.SUPABASE_URL.rstrip('/')}/auth/v1/admin/users/{supa_uid}"
            payload = _json.dumps({"password": body.password}).encode()
            req = urllib.request.Request(
                url,
                data=payload,
                headers={
                    "Content-Type": "application/json",
                    "apikey": settings.SUPABASE_SERVICE_ROLE_KEY,
                    "Authorization": f"Bearer {settings.SUPABASE_SERVICE_ROLE_KEY}",
                },
                method="PUT",
            )
            with urllib.request.urlopen(req, timeout=5):
                pass
        except Exception as e:
            print(f"⚠️  Supabase password sync notice: {e}")

    # Activate user and invalidate single-use invitation token
    execute_write(
        """UPDATE users SET
           password_hash=:pw,
           status='active',
           must_reset_password=:must_reset,
           invitation_token=NULL,
           invitation_expires_at=NULL,
           updated_at=:now
           WHERE id=:id""",
        {"pw": new_pw_hash, "must_reset": False, "now": now, "id": user["id"]},
    )

    add_audit_log(
        action="ONBOARDING_COMPLETED",
        user_id=user["id"],
        user_name=user["name"],
        user_role=user["role"],
        new_value=user["email"],
        details=f"User {user['name']} ({user['email']}) completed first-login password setup and activated account.",
    )

    updated_user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user["id"]})
    company = None
    if updated_user.get("company_id"):
        company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": updated_user.get("company_id")})

    token = create_token({
        "id": updated_user["id"],
        "role": updated_user["role"],
        "email": updated_user["email"],
        "company": updated_user.get("company"),
        "company_id": updated_user.get("company_id"),
    })

    safe_user = {k: v for k, v in updated_user.items() if k != "password_hash"}
    safe_user["company_type"] = company.get("type") if company else updated_user.get("role")

    return {
        "message": "Password established and onboarding complete! Welcome to PunchList Pro.",
        "token": token,
        "user": safe_user,
    }


# ---------------------------------------------------------------------------
# Internal helper: provision a local user row on first Supabase login
# ---------------------------------------------------------------------------

def _provision_local_user(supabase_uid: str, email: str) -> dict:
    """
    Find or link a local users row linked to a Supabase auth identity.
    Enforces administrator-controlled provisioning: unprovisioned users
    are created with status='pending_approval' and least privilege.
    """
    # Try existing link
    user = execute_one("SELECT * FROM users WHERE supabase_uid=:uid", {"uid": supabase_uid})

    # Try email match (existing seed/provisioned user — link on first Supabase login)
    if not user:
        user = execute_one(
            "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)", {"email": email}
        )
        if user:
            execute_write(
                "UPDATE users SET supabase_uid=:uid WHERE id=:id",
                {"uid": supabase_uid, "id": user["id"]},
            )

    # Brand-new user trying to register publicly — require admin approval
    if not user:
        user_id = str(uuid.uuid4())
        name = email.split("@")[0].replace(".", " ").title()
        now = datetime.now(timezone.utc).isoformat()
        execute_write(
            """INSERT INTO users (id, name, email, role, supabase_uid, status, must_reset_password, created_at, updated_at)
               VALUES (:id, :name, :email, :role, :uid, 'pending_approval', :must_reset, :now, :now)""",
            {
                "id": user_id,
                "name": name,
                "email": email,
                "role": "sub_contractor",
                "uid": supabase_uid,
                "must_reset": False,
                "now": now,
            },
        )
        user = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
        try:
            add_audit_log(
                action="ACCOUNT_REQUESTED",
                user_id=user_id,
                user_name=name,
                user_role="sub_contractor",
                new_value=email,
                details=f"Unprovisioned user {email} signed in via auth provider. Placed in pending_approval state.",
            )
        except Exception:
            pass

    if user:
        user.pop("password_hash", None)
    return user or {}
