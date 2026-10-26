"""
routers/team.py — Team Members Management with PostgreSQL Persistence
  GET    /api/team           (Fetch all team members categorized by team container)
  POST   /api/team           (Add a new member directly into database)
  DELETE /api/team/:id       (Remove team member from database)
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from ..auth import get_current_user, hash_password
from ..database import execute_query, execute_one, execute_write, add_audit_log
from ..sio import sio

router = APIRouter(tags=["team"])


class AddMemberPayload(BaseModel):
    name: str
    email: str
    phone: Optional[str] = ""
    role: str
    organization: Optional[str] = ""
    teamCategory: str = "crew" # admin, contractor, sub_contractor, crew
    presence: Optional[str] = "on_site"
    presenceText: Optional[str] = "Active on site"
    avatar: Optional[str] = None


@router.get("/api/team")
def get_team_members(current_user: dict = Depends(get_current_user)):
    """Fetch all team members from the PostgreSQL database."""
    users = execute_query("SELECT id, name, email, role, company, phone, avatar_url, presence, presence_text, created_at FROM users ORDER BY created_at ASC")

    # If users table has users, return mapped list
    mapped_members = []
    for u in users:
        role_val = (u.get("role") or "").lower()
        company_val = u.get("company") or "PunchList Pro"

        # Determine container group
        container = "crew"
        if "admin" in role_val or "superintendent" in role_val or "director" in role_val or "manager" in role_val:
            container = "admin"
        elif "general" in role_val or "gc" in role_val or "apex" in company_val.lower() or "contractor" in role_val and "sub" not in role_val:
            container = "contractor"
        elif "sub" in role_val or "electric" in company_val.lower() or "hvac" in company_val.lower() or "plumb" in company_val.lower():
            container = "sub_contractor"
        else:
            container = "crew"

        mapped_members.append({
            "id": u.get("id"),
            "name": u.get("name"),
            "email": u.get("email"),
            "phone": u.get("phone") or "+1 (555) 010-0000",
            "role": u.get("role") or "Team Member",
            "organization": company_val,
            "teamCategory": container,
            "avatar": u.get("avatar_url") or f"https://ui-avatars.com/api/?name={u.get('name', 'User').replace(' ', '+')}&background=D97706&color=fff",
            "presence": u.get("presence") or "on_site",
            "presenceText": u.get("presence_text") or "Active"
        })

    return mapped_members


@router.post("/api/team", status_code=201)
async def add_team_member(
    payload: AddMemberPayload,
    current_user: dict = Depends(get_current_user),
):
    """Add a new member to the PostgreSQL database."""
    # Check if email already exists
    existing = execute_one("SELECT id FROM users WHERE email=:e", {"e": payload.email})
    if existing:
        raise HTTPException(400, f"A user with email {payload.email} already exists.")

    new_id = f"user-{uuid.uuid4().hex[:8]}"
    avatar = payload.avatar or f"https://ui-avatars.com/api/?name={payload.name.replace(' ', '+')}&background=D97706&color=fff"
    default_pw_hash = hash_password("Satyathakur@531")
    now = datetime.now(timezone.utc).isoformat()

    sql = """
        INSERT INTO users (
            id, name, email, role, company, phone, avatar_url,
            password_hash, presence, presence_text, created_at, updated_at
        ) VALUES (
            :id, :name, :email, :role, :company, :phone, :avatar,
            :pw, :pres, :prestext, :now, :now
        )
    """
    execute_write(sql, {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "role": payload.role,
        "company": payload.organization or "PunchList Pro",
        "phone": payload.phone or "",
        "avatar": avatar,
        "pw": default_pw_hash,
        "pres": payload.presence or "on_site",
        "prestext": payload.presenceText or "Active on site",
        "now": now
    })

    # Log to audit_logs table
    add_audit_log(
        action="MEMBER_ADDED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role", "admin"),
        new_value=payload.name,
        details=f"New member \"{payload.name}\" added to {payload.teamCategory.replace('_', ' ').title()} ({payload.role})"
    )

    new_member = {
        "id": new_id,
        "name": payload.name,
        "email": payload.email,
        "phone": payload.phone or "+1 (555) 010-0000",
        "role": payload.role,
        "organization": payload.organization or "PunchList Pro",
        "teamCategory": payload.teamCategory,
        "avatar": avatar,
        "presence": payload.presence or "on_site",
        "presenceText": payload.presenceText or "Active on site"
    }

    await sio.emit("team:member_added", new_member)
    return new_member


@router.delete("/api/team/{user_id}")
async def remove_team_member(
    user_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Remove a team member from the PostgreSQL database."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only administrators can delete team members.")

    target = execute_one("SELECT name, email FROM users WHERE id=:id", {"id": user_id})
    if not target:
        raise HTTPException(404, "Team member not found.")

    execute_write("DELETE FROM users WHERE id=:id", {"id": user_id})

    add_audit_log(
        action="MEMBER_REMOVED",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        details=f"Team member \"{target.get('name')}\" was removed from project"
    )

    await sio.emit("team:member_removed", {"id": user_id})
    return {"message": f"Team member {target.get('name')} removed successfully", "id": user_id}
