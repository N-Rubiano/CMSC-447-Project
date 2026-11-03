"""
routers/team.py — Team Administration, Onboarding, and Lifecycle Management:
  GET    /api/team                       (List all team members with status & projects)
  POST   /api/team                       (Provision new user & generate invitation)
  POST   /api/team/:id/approve           (Approve pending account — admin only)
  POST   /api/team/:id/reject            (Reject pending account — admin only)
  POST   /api/team/:id/suspend           (Suspend user access — admin only)
  POST   /api/team/:id/reactivate        (Reactivate suspended user — admin only)
  POST   /api/team/:id/resend-invitation (Issue fresh invitation link & token)
  PATCH  /api/team/:id                   (Update user role, trade, projects)
  DELETE /api/team/:id                   (Remove user from system — admin only)
"""
import uuid
import secrets
from datetime import datetime, timezone, timedelta
from typing import Optional, List

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel, EmailStr

from ..auth import get_current_user, hash_password
from ..database import execute_query, execute_one, execute_write, add_audit_log, settings
from ..sio import sio

router = APIRouter(tags=["team"])


# ---------------------------------------------------------------------------
# Request & Response Models
# ---------------------------------------------------------------------------

class AddMemberPayload(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    role: str = "sub_contractor"
    organization: Optional[str] = ""
    company_id: Optional[str] = None
    trade: Optional[str] = ""
    project_ids: Optional[List[str]] = []
    teamCategory: Optional[str] = "crew"
    presence: Optional[str] = "on_site"
    presenceText: Optional[str] = "Active on site"
    avatar: Optional[str] = None
    status: Optional[str] = "pending_invitation"


class UpdateMemberPayload(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    role: Optional[str] = None
    organization: Optional[str] = None
    company_id: Optional[str] = None
    trade: Optional[str] = None
    project_ids: Optional[List[str]] = None
    teamCategory: Optional[str] = None
    presence: Optional[str] = None
    presenceText: Optional[str] = None
    status: Optional[str] = None


class RejectPayload(BaseModel):
    reason: Optional[str] = "Account provisioning rejected by administrator."


# ---------------------------------------------------------------------------
# GET /api/team
# ---------------------------------------------------------------------------

@router.get("/api/team")
def get_team_members(current_user: dict = Depends(get_current_user)):
    """Fetch all team members with their account lifecycle status and project assignments."""
    users = execute_query(
        """SELECT id, name, email, role, company, company_id, phone, avatar_url,
                  presence, presence_text, status, trade, invited_by,
                  invitation_token, invitation_expires_at, must_reset_password,
                  approved_by, approved_at, rejected_by, rejected_at, rejection_reason,
                  created_at
           FROM users
           ORDER BY created_at ASC"""
    )

    # Fetch project memberships for all users
    memberships = execute_query(
        "SELECT user_id, project_id FROM project_members"
    )
    user_projects = {}
    for m in memberships:
        uid = m.get("user_id")
        pid = m.get("project_id")
        if uid and pid:
            user_projects.setdefault(uid, []).append(pid)

    mapped_members = []
    for u in users:
        role_val = (u.get("role") or "").lower()
        company_val = u.get("company") or "PunchList Pro"

        # Determine container group
        container = "crew"
        if "admin" in role_val or "superintendent" in role_val or "director" in role_val or "manager" in role_val:
            container = "admin"
        elif "general" in role_val or "gc" in role_val or "apex" in company_val.lower() or ("contractor" in role_val and "sub" not in role_val):
            container = "contractor"
        elif "sub" in role_val or "electric" in company_val.lower() or "hvac" in company_val.lower() or "plumb" in company_val.lower():
            container = "sub_contractor"
        else:
            container = "crew"

        acc_status = u.get("status") or "active"

        # Check if invitation has expired
        exp_str = u.get("invitation_expires_at")
        is_expired = False
        if exp_str:
            try:
                exp_dt = datetime.fromisoformat(str(exp_str).replace("Z", "+00:00"))
                if exp_dt < datetime.now(timezone.utc):
                    is_expired = True
            except Exception:
                pass

        mapped_members.append({
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone") or "+1 (555) 010-0000",
            "role": u.get("role") or "sub_contractor",
            "organization": company_val,
            "company_id": u.get("company_id"),
            "trade": u.get("trade") or "",
            "teamCategory": container,
            "avatar": u.get("avatar_url") or f"https://ui-avatars.com/api/?name={u.get('name', 'User').replace(' ', '+')}&background=D97706&color=fff",
            "presence": u.get("presence") or "on_site",
            "presenceText": u.get("presence_text") or "Active",
            "status": acc_status,
            "is_invitation_expired": is_expired,
            "invitation_token": u.get("invitation_token"),
            "invitation_expires_at": u.get("invitation_expires_at"),
            "must_reset_password": bool(u.get("must_reset_password")),
            "approved_by": u.get("approved_by"),
            "approved_at": u.get("approved_at"),
            "rejected_by": u.get("rejected_by"),
            "rejected_at": u.get("rejected_at"),
            "rejection_reason": u.get("rejection_reason"),
            "project_ids": user_projects.get(u.get("id"), []),
            "created_at": u.get("created_at")
        })

    return mapped_members


# ---------------------------------------------------------------------------
# POST /api/team  (Provision new user & generate invitation)
# ---------------------------------------------------------------------------

@router.post("/api/team", status_code=201)
async def add_team_member(
    payload: AddMemberPayload,
    current_user: dict = Depends(get_current_user),
):
    """
    Provision a new user account with role-based authorization check,
    secure single-use invitation token, and initial project assignments.
    """
    caller_role = (current_user.get("role") or "").lower()

    # Approval Authority Check
    if caller_role == "general_contractor":
        # General Contractor can only sponsor subcontractors
        if payload.role not in ("sub_contractor", "crew"):
            raise HTTPException(
                403,
                "General Contractors can only provision Subcontractors. Privileged roles require Facility Administrator approval."
            )
        # GC-sponsored accounts start in pending_approval
        initial_status = "pending_approval"
    elif caller_role == "admin":
        initial_status = payload.status or "pending_invitation"
    else:
        raise HTTPException(
            403,
            "Only Facility Administrators and General Contractors have permission to provision new users."
        )

    # Email format and duplicate validation
    clean_email = payload.email.strip().lower()
    if not clean_email or "@" not in clean_email or "." not in clean_email.split("@")[-1]:
        raise HTTPException(400, "Please provide a valid email address.")

    existing = execute_one(
        "SELECT id, status FROM users WHERE LOWER(email)=:e",
        {"e": clean_email}
    )
    if existing:
        raise HTTPException(400, f"A user with email '{clean_email}' already exists.")

    new_id = str(uuid.uuid4())
    avatar = payload.avatar or f"https://ui-avatars.com/api/?name={payload.name.replace(' ', '+')}&background=D97706&color=fff"

    # Cryptographically secure temporary credential / invitation token
    invitation_token = secrets.token_urlsafe(32)
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_iso = (now_dt + timedelta(days=7)).isoformat()

    # Temporary placeholder password hash (never stored in plaintext)
    temp_pw_hash = hash_password(secrets.token_urlsafe(24))

    # Transactional user creation
    try:
        sql = """
            INSERT INTO users (
                id, name, email, role, company, company_id, phone, avatar_url,
                password_hash, presence, presence_text, status, trade, invited_by,
                invitation_token, invitation_expires_at, must_reset_password,
                created_at, updated_at
            ) VALUES (
                :id, :name, :email, :role, :company, :company_id, :phone, :avatar,
                :pw, :pres, :prestext, :status, :trade, :invited_by,
                :inv_tok, :inv_exp, :must_reset,
                :now, :now
            )
        """
        execute_write(sql, {
            "id": new_id,
            "name": payload.name.strip(),
            "email": clean_email,
            "role": payload.role,
            "company": payload.organization or "PunchList Pro",
            "company_id": payload.company_id,
            "phone": payload.phone or "",
            "avatar": avatar,
            "pw": temp_pw_hash,
            "pres": payload.presence or "on_site",
            "prestext": payload.presenceText or "Active on site",
            "status": initial_status,
            "trade": payload.trade or "",
            "invited_by": current_user.get("id"),
            "inv_tok": invitation_token,
            "inv_exp": expires_iso,
            "must_reset": True,
            "now": now_iso,
        })

        # Assign requested project memberships
        if payload.project_ids:
            for pid in payload.project_ids:
                mid = str(uuid.uuid4())
                if settings.use_postgres:
                    execute_write(
                        """INSERT INTO project_members (id, project_id, user_id, role, permissions, created_at)
                           VALUES (:id, :pid, :uid, :role, '["*"]', :now)
                           ON CONFLICT (project_id, user_id) DO NOTHING""",
                        {"id": mid, "pid": pid, "uid": new_id, "role": payload.role, "now": now_iso}
                    )
                else:
                    execute_write(
                        """INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, created_at)
                           VALUES (:id, :pid, :uid, :role, :now)""",
                        {"id": mid, "pid": pid, "uid": new_id, "role": payload.role, "now": now_iso}
                    )

    except Exception as err:
        # Safe recovery: cleanup partial user record if insertion fails
        execute_write("DELETE FROM project_members WHERE user_id=:id", {"id": new_id})
        execute_write("DELETE FROM users WHERE id=:id", {"id": new_id})
        raise HTTPException(500, f"Account provisioning failed: {err}")

    # Audit logging
    add_audit_log(
        action="ACCOUNT_PROVISIONED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role", "admin"),
        new_value=payload.name,
        details=f"User {payload.name} ({clean_email}) provisioned as {payload.role} with status '{initial_status}'."
    )
    add_audit_log(
        action="INVITATION_ISSUED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role", "admin"),
        new_value=clean_email,
        details=f"Secure single-use invitation generated (expires in 7 days)."
    )

    new_member = {
        "id": new_id,
        "name": payload.name,
        "email": clean_email,
        "phone": payload.phone or "+1 (555) 010-0000",
        "role": payload.role,
        "organization": payload.organization or "PunchList Pro",
        "company_id": payload.company_id,
        "trade": payload.trade or "",
        "teamCategory": payload.teamCategory,
        "avatar": avatar,
        "presence": payload.presence or "on_site",
        "presenceText": payload.presenceText or "Active on site",
        "status": initial_status,
        "invitation_token": invitation_token,
        "invitation_expires_at": expires_iso,
        "must_reset_password": True,
        "project_ids": payload.project_ids or [],
        "invitation_link": f"/#onboard?token={invitation_token}"
    }

    await sio.emit("team:member_added", new_member)
    return new_member


# ---------------------------------------------------------------------------
# POST /api/team/{user_id}/approve  (Facility Administrator Approval)
# ---------------------------------------------------------------------------

@router.post("/api/team/{user_id}/approve")
async def approve_team_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Approve a pending account. Only Facility Administrators can approve accounts."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Facility Administrators can approve user accounts.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    # If the user still has an unused invitation token, transition to pending_invitation, otherwise active
    next_status = "pending_invitation" if target.get("invitation_token") else "active"

    execute_write(
        """UPDATE users SET
           status=:st,
           approved_by=:adm_id,
           approved_at=:now,
           rejected_by=NULL,
           rejected_at=NULL,
           rejection_reason=NULL,
           updated_at=:now
           WHERE id=:id""",
        {"st": next_status, "adm_id": current_user.get("id"), "now": now_iso, "id": user_id}
    )

    add_audit_log(
        action="ACCOUNT_APPROVED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role="admin",
        new_value=target.get("name"),
        details=f"Account for {target.get('name')} ({target.get('email')}) approved by administrator."
    )

    updated = {**target, "status": next_status, "approved_by": current_user.get("id"), "approved_at": now_iso}
    updated.pop("password_hash", None)
    await sio.emit("team:member_updated", updated)
    return {"message": f"Account for {target.get('name')} approved successfully.", "user": updated}


# ---------------------------------------------------------------------------
# POST /api/team/{user_id}/reject  (Facility Administrator Rejection)
# ---------------------------------------------------------------------------

@router.post("/api/team/{user_id}/reject")
async def reject_team_member(
    user_id: str,
    payload: RejectPayload,
    current_user: dict = Depends(get_current_user),
):
    """Reject a pending account with an explicit recorded reason."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Facility Administrators can reject user accounts.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    execute_write(
        """UPDATE users SET
           status='rejected',
           rejected_by=:adm_id,
           rejected_at=:now,
           rejection_reason=:reason,
           updated_at=:now
           WHERE id=:id""",
        {"adm_id": current_user.get("id"), "now": now_iso, "reason": payload.reason, "id": user_id}
    )

    add_audit_log(
        action="ACCOUNT_REJECTED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role="admin",
        new_value=target.get("name"),
        details=f"Account {target.get('name')} rejected. Reason: {payload.reason}"
    )

    updated = {**target, "status": "rejected", "rejection_reason": payload.reason}
    updated.pop("password_hash", None)
    await sio.emit("team:member_updated", updated)
    return {"message": f"Account for {target.get('name')} rejected.", "user": updated}


# ---------------------------------------------------------------------------
# POST /api/team/{user_id}/suspend  (Suspend Account Access)
# ---------------------------------------------------------------------------

@router.post("/api/team/{user_id}/suspend")
async def suspend_team_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Suspend a user's account access. Administrators cannot suspend themselves."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Facility Administrators can suspend accounts.")

    if user_id == current_user.get("id"):
        raise HTTPException(400, "Administrators cannot suspend their own account.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    execute_write(
        "UPDATE users SET status='suspended', updated_at=:now WHERE id=:id",
        {"now": now_iso, "id": user_id}
    )

    add_audit_log(
        action="ACCOUNT_SUSPENDED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role="admin",
        new_value=target.get("name"),
        details=f"Account access for {target.get('name')} ({target.get('email')}) suspended by administrator."
    )

    updated = {**target, "status": "suspended"}
    updated.pop("password_hash", None)
    await sio.emit("team:member_updated", updated)
    return {"message": f"Account for {target.get('name')} suspended.", "user": updated}


# ---------------------------------------------------------------------------
# POST /api/team/{user_id}/reactivate  (Reactivate Suspended Account)
# ---------------------------------------------------------------------------

@router.post("/api/team/{user_id}/reactivate")
async def reactivate_team_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Reactivate a suspended account."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Facility Administrators can reactivate accounts.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    now_iso = datetime.now(timezone.utc).isoformat()
    next_status = "pending_invitation" if target.get("invitation_token") else "active"

    execute_write(
        "UPDATE users SET status=:st, updated_at=:now WHERE id=:id",
        {"st": next_status, "now": now_iso, "id": user_id}
    )

    add_audit_log(
        action="ACCOUNT_REACTIVATED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role="admin",
        new_value=target.get("name"),
        details=f"Account access for {target.get('name')} ({target.get('email')}) restored to '{next_status}'."
    )

    updated = {**target, "status": next_status}
    updated.pop("password_hash", None)
    await sio.emit("team:member_updated", updated)
    return {"message": f"Account for {target.get('name')} reactivated.", "user": updated}


# ---------------------------------------------------------------------------
# POST /api/team/{user_id}/resend-invitation  (Generate Fresh Token)
# ---------------------------------------------------------------------------

@router.post("/api/team/{user_id}/resend-invitation")
async def resend_invitation(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Generate and issue a fresh invitation token with a 7-day expiration."""
    caller_role = (current_user.get("role") or "").lower()
    if caller_role not in ("admin", "general_contractor"):
        raise HTTPException(403, "Only administrators and general contractors can resend invitations.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    if target.get("status") in ("suspended", "rejected"):
        raise HTTPException(400, "Cannot invite a suspended or rejected user. Please reactivate the account first.")

    new_token = secrets.token_urlsafe(32)
    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    expires_iso = (now_dt + timedelta(days=7)).isoformat()

    execute_write(
        """UPDATE users SET
           invitation_token=:tok,
           invitation_expires_at=:exp,
           must_reset_password=:must_reset,
           status='pending_invitation',
           updated_at=:now
           WHERE id=:id""",
        {"tok": new_token, "exp": expires_iso, "must_reset": True, "now": now_iso, "id": user_id}
    )

    add_audit_log(
        action="INVITATION_RESENT",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        new_value=target.get("email"),
        details=f"Fresh invitation link generated for {target.get('name')} (expires in 7 days)."
    )

    return {
        "message": f"Invitation resent to {target.get('email')}.",
        "invitation_token": new_token,
        "invitation_expires_at": expires_iso,
        "invitation_link": f"/#onboard?token={new_token}"
    }


# ---------------------------------------------------------------------------
# PATCH /api/team/{user_id}  (Update role, trade, projects)
# ---------------------------------------------------------------------------

@router.patch("/api/team/{user_id}")
async def update_team_member(
    user_id: str,
    payload: UpdateMemberPayload,
    current_user: dict = Depends(get_current_user),
):
    """Update team member attributes, role assignments, or project memberships."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Facility Administrators can update team member properties.")

    target = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "User not found.")

    updates = {}
    if payload.name is not None: updates["name"] = payload.name.strip()
    if payload.phone is not None: updates["phone"] = payload.phone
    if payload.role is not None: updates["role"] = payload.role
    if payload.organization is not None: updates["company"] = payload.organization
    if payload.company_id is not None: updates["company_id"] = payload.company_id
    if payload.trade is not None: updates["trade"] = payload.trade
    if payload.status is not None: updates["status"] = payload.status
    if payload.presence is not None: updates["presence"] = payload.presence
    if payload.presenceText is not None: updates["presence_text"] = payload.presenceText

    now_iso = datetime.now(timezone.utc).isoformat()
    updates["updated_at"] = now_iso

    if updates:
        set_clauses = [f"{col}=:{col}" for col in updates.keys()]
        sql = f"UPDATE users SET {', '.join(set_clauses)} WHERE id=:id"
        execute_write(sql, {**updates, "id": user_id})

    # Update project assignments if provided
    if payload.project_ids is not None:
        execute_write("DELETE FROM project_members WHERE user_id=:uid", {"uid": user_id})
        for pid in payload.project_ids:
            mid = str(uuid.uuid4())
            role_to_assign = payload.role or target.get("role", "member")
            if settings.use_postgres:
                execute_write(
                    """INSERT INTO project_members (id, project_id, user_id, role, permissions, created_at)
                       VALUES (:id, :pid, :uid, :role, '["*"]', :now)
                       ON CONFLICT (project_id, user_id) DO NOTHING""",
                    {"id": mid, "pid": pid, "uid": user_id, "role": role_to_assign, "now": now_iso}
                )
            else:
                execute_write(
                    """INSERT OR IGNORE INTO project_members (id, project_id, user_id, role, created_at)
                       VALUES (:id, :pid, :uid, :role, :now)""",
                    {"id": mid, "pid": pid, "uid": user_id, "role": role_to_assign, "now": now_iso}
                )
        add_audit_log(
            action="PROJECT_MEMBERSHIP_UPDATED",
            user_id=current_user.get("id"),
            user_name=current_user.get("name"),
            user_role="admin",
            new_value=target.get("name"),
            details=f"Project assignments updated for {target.get('name')}: {len(payload.project_ids)} project(s)."
        )

    if payload.role and payload.role != target.get("role"):
        add_audit_log(
            action="ROLE_CHANGED",
            user_id=current_user.get("id"),
            user_name=current_user.get("name"),
            user_role="admin",
            old_value=target.get("role"),
            new_value=payload.role,
            details=f"Role for {target.get('name')} changed from {target.get('role')} to {payload.role}."
        )

    updated = execute_one("SELECT * FROM users WHERE id=:id", {"id": user_id})
    updated.pop("password_hash", None)
    await sio.emit("team:member_updated", updated)
    return updated


# ---------------------------------------------------------------------------
# DELETE /api/team/{user_id}
# ---------------------------------------------------------------------------

@router.delete("/api/team/{user_id}")
async def remove_team_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a team member from the system. Admin only."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only administrators can delete team members.")

    if user_id == current_user.get("id"):
        raise HTTPException(400, "Administrators cannot delete their own account.")

    target = execute_one("SELECT name, email FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "Team member not found.")

    execute_write("DELETE FROM project_members WHERE user_id=:id", {"id": user_id})
    execute_write("DELETE FROM users WHERE id=:id", {"id": user_id})

    add_audit_log(
        action="MEMBER_REMOVED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role="admin",
        old_value=target.get("name"),
        details=f"Team member \"{target.get('name')}\" ({target.get('email')}) was removed from system."
    )

    await sio.emit("team:member_removed", {"id": user_id})
    return {"message": f"Team member {target.get('name')} removed successfully", "id": user_id}
