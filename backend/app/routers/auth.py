"""
routers/auth.py — POST /api/auth/login (legacy), POST /api/auth/supabase-login,
                  POST /api/auth/supabase-callback, GET /api/auth/me
"""
import uuid
from datetime import datetime, timezone

from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel

from ..auth import create_token, verify_password, get_current_user, _get_supabase_client
from ..config import settings
from ..database import execute_one, execute_write

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
# POST /api/auth/login  (legacy — still works for seeded demo users)
# ---------------------------------------------------------------------------

@router.post("/login")
def login(body: LoginRequest):
    if not body.email or not body.password:
        raise HTTPException(400, "Email and password are required")

    user = execute_one(
        "SELECT * FROM users WHERE LOWER(email)=LOWER(:email)",
        {"email": body.email.strip()},
    )
    print(f"🔑 Auth login attempt: email='{body.email.strip()}', found_in_db={bool(user)}")
    if not user:
        raise HTTPException(401, "Invalid email or password")

    if user.get("expires_at"):
        try:
            from datetime import datetime, timezone
            from ..database import execute_write
            exp_raw = user["expires_at"]
            if isinstance(exp_raw, str):
                exp_dt = datetime.fromisoformat(exp_raw.replace("Z", "+00:00"))
            elif isinstance(exp_raw, datetime):
                exp_dt = exp_raw
            else:
                exp_dt = None
            if exp_dt and exp_dt.tzinfo is None:
                exp_dt = exp_dt.replace(tzinfo=timezone.utc)
            if exp_dt and exp_dt < datetime.now(timezone.utc):
                execute_write("DELETE FROM users WHERE id=:id", {"id": user["id"]})
                print(f"❌ Demo account expired: {body.email}")
                raise HTTPException(401, "Temporary demo admin account has expired (1hr limit reached)")
        except HTTPException:
            raise
        except Exception as _e:
            pass

    pw_ok = verify_password(body.password, user.get("password_hash", ""))
    if not pw_ok:
        print(f"❌ Password mismatch for user '{body.email}'")
        raise HTTPException(401, "Invalid email or password")
    print(f"✅ Login successful for '{body.email}' ({user.get('role')})")

    from ..database import execute_one as _eo
    company = _eo("SELECT * FROM companies WHERE id=:id", {"id": user.get("company_id")})

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
