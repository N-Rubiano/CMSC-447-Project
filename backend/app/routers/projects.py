"""routers/projects.py — CRUD /api/projects + members"""
import uuid
from datetime import datetime, timezone, timedelta

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import Optional

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, add_audit_log, get_audit_logs, settings
from ..permissions import can_user_access_project, has_permission
from ..sio import sio

router = APIRouter(prefix="/api/projects", tags=["projects"])


# ---------------------------------------------------------------------------
# List
# ---------------------------------------------------------------------------

@router.get("")
def list_projects(current_user: dict = Depends(get_current_user)):
    all_projects = execute_query("SELECT * FROM projects ORDER BY created_at DESC")
    if current_user.get("role") in ("admin", "owner"):
        return all_projects
    if current_user.get("role") == "general_contractor":
        accessible = [
            p for p in all_projects
            if (not p.get("gc_user_id") or
                p.get("gc_user_id") == current_user.get("id") or
                p.get("contractor_company_id") == current_user.get("company_id") or
                execute_one("SELECT id FROM project_members WHERE project_id=:pid AND user_id=:uid",
                            {"pid": p["id"], "uid": current_user.get("id")}) is not None)
        ]
        return accessible if accessible else all_projects
    accessible = [p for p in all_projects if can_user_access_project(current_user, p["id"])]
    return accessible if accessible else all_projects


# ---------------------------------------------------------------------------
# Get single project with members + stats
# ---------------------------------------------------------------------------

@router.get("/{project_id}")
def get_project(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Access forbidden: You do not have permission to view this project.")

    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    members = execute_query(
        """SELECT u.id, u.name, u.email, u.company, u.company_id, u.phone, u.avatar_url,
                  u.role as system_role, pm.role as project_role
           FROM project_members pm
           JOIN users u ON u.id = pm.user_id
           WHERE pm.project_id=:pid""",
        {"pid": project_id},
    )

    stats = execute_one(
        """SELECT
             COUNT(*) as total_pins,
             SUM(CASE WHEN status='open' THEN 1 ELSE 0 END) as open_count,
             SUM(CASE WHEN status='in_progress' THEN 1 ELSE 0 END) as in_progress_count,
             SUM(CASE WHEN status IN ('submitted_for_contractor_review','submitted_for_admin_review','in_review') THEN 1 ELSE 0 END) as in_review_count,
             SUM(CASE WHEN status='closed' THEN 1 ELSE 0 END) as closed_count,
             SUM(CASE WHEN status='rejected' THEN 1 ELSE 0 END) as rejected_count,
             SUM(CASE WHEN priority='critical' AND status!='closed' THEN 1 ELSE 0 END) as critical_count
           FROM pins WHERE project_id=:pid""",
        {"pid": project_id},
    )

    return {**project, "members": members, "stats": stats}


# ---------------------------------------------------------------------------
# Create project
# ---------------------------------------------------------------------------

class ProjectCreate(BaseModel):
    name: str
    code: Optional[str] = "PRJ"
    address: Optional[str] = ""
    description: Optional[str] = ""
    client_name: Optional[str] = ""
    target_completion: Optional[str] = None
    gc_user_id: Optional[str] = "usr-1"
    contractor_company_id: Optional[str] = None
    building_id: Optional[str] = None
    building_name: Optional[str] = None


@router.post("", status_code=201)
async def create_project(body: ProjectCreate, current_user: dict = Depends(get_current_user)):
    if not has_permission(current_user, "project.create"):
        raise HTTPException(403, "Only Facility Administrators can create new projects.")

    pid = f"proj-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    target = body.target_completion or (
        datetime.now(timezone.utc) + timedelta(days=180)
    ).date().isoformat()

    gc_user_id = body.gc_user_id or "usr-1"
    contractor_company_id = body.contractor_company_id
    if not contractor_company_id:
        gc_user = execute_one("SELECT * FROM users WHERE id=:id", {"id": gc_user_id})
        contractor_company_id = (gc_user or {}).get("company_id", "cmp-gc-1")

    if settings.use_postgres:
        execute_write(
            """INSERT INTO projects (id,name,code,address,description,client_name,target_completion,
               gc_user_id,building_id,building_name,status,contractor_company_id,created_at)
               VALUES (:id,:name,:code,:addr,:desc,:client,:target,:gc,:bldid,:bldname,'active',:ccid,:now)""",
            dict(id=pid, name=body.name, code=body.code or "PRJ", addr=body.address or "",
                 desc=body.description or "", client=body.client_name or "", target=target,
                 gc=gc_user_id, bldid=body.building_id, bldname=body.building_name,
                 ccid=contractor_company_id, now=now),
        )
    else:
        execute_write(
            """INSERT INTO projects (id,name,code,address,description,client_name,target_completion,
               gc_user_id,building_id,building_name,status,contractor_company_id,created_at)
               VALUES (:id,:name,:code,:addr,:desc,:client,:target,:gc,:bldid,:bldname,'active',:ccid,:now)""",
            dict(id=pid, name=body.name, code=body.code or "PRJ", addr=body.address or "",
                 desc=body.description or "", client=body.client_name or "", target=target,
                 gc=gc_user_id, bldid=body.building_id, bldname=body.building_name,
                 ccid=contractor_company_id, now=now),
        )

    # Add creator as member
    execute_write(
        "INSERT OR IGNORE INTO project_members (id,project_id,user_id,role,created_at) VALUES (:id,:pid,:uid,'admin',:now)",
        {"id": f"pm-{uuid.uuid4().hex[:8]}", "pid": pid, "uid": current_user["id"], "now": now},
    ) if not settings.use_postgres else execute_write(
        "INSERT INTO project_members (id,project_id,user_id,role,created_at) VALUES (:id,:pid,:uid,'admin',:now) ON CONFLICT DO NOTHING",
        {"id": f"pm-{uuid.uuid4().hex[:8]}", "pid": pid, "uid": current_user["id"], "now": now},
    )

    add_audit_log("PROJECT_CREATED", project_id=pid, user_id=current_user.get("id"),
                  user_name=current_user.get("name"), user_role=current_user.get("role"),
                  user_company=current_user.get("company"),
                  new_value=body.name, details=f"Project created with code {body.code or 'PRJ'}")

    created = execute_one("SELECT * FROM projects WHERE id=:id", {"id": pid})
    await sio.emit("project:created", created)
    return created


# ---------------------------------------------------------------------------
# Update project
# ---------------------------------------------------------------------------

@router.patch("/{project_id}")
async def update_project(project_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if not has_permission(current_user, "project.update"):
        raise HTTPException(403, "Only Admins or General Contractors can update projects.")
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Access forbidden for this project.")
    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    allowed = ["name", "code", "address", "description", "client_name",
               "target_completion", "building_id", "building_name", "status"]
    sets = ", ".join(f"{k}=:{k}" for k in allowed if k in body)
    if sets:
        execute_write(f"UPDATE projects SET {sets} WHERE id=:pid",
                      {**{k: body[k] for k in allowed if k in body}, "pid": project_id})

    updated = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    await sio.emit("project:updated", updated)
    return updated


# ---------------------------------------------------------------------------
# Project members
# ---------------------------------------------------------------------------

@router.get("/{project_id}/members")
def get_members(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")
    return execute_query(
        """SELECT u.id, u.name, u.email, u.company, u.company_id, u.role as system_role,
                  pm.role as project_role
           FROM project_members pm JOIN users u ON u.id=pm.user_id
           WHERE pm.project_id=:pid""",
        {"pid": project_id},
    )


@router.post("/{project_id}/members", status_code=201)
async def add_member(project_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if not has_permission(current_user, "team.manage"):
        raise HTTPException(403, "Only Admins and General Contractors can add project members.")
    now = datetime.now(timezone.utc).isoformat()
    mid = f"pm-{uuid.uuid4().hex[:8]}"
    user_id = body.get("user_id")
    role = body.get("role", "member")
    company_name = body.get("company_name", "")
    if not user_id:
        raise HTTPException(400, "user_id is required")
    if settings.use_postgres:
        execute_write(
            "INSERT INTO project_members (id,project_id,user_id,role,company_name,created_at) VALUES (:id,:pid,:uid,:role,:cn,:now) ON CONFLICT (project_id,user_id) DO NOTHING",
            dict(id=mid, pid=project_id, uid=user_id, role=role, cn=company_name, now=now),
        )
    else:
        execute_write(
            "INSERT OR IGNORE INTO project_members (id,project_id,user_id,role,company_name,created_at) VALUES (:id,:pid,:uid,:role,:cn,:now)",
            dict(id=mid, pid=project_id, uid=user_id, role=role, cn=company_name, now=now),
        )
    member = execute_one("SELECT * FROM project_members WHERE project_id=:pid AND user_id=:uid",
                         {"pid": project_id, "uid": user_id})
    await sio.emit("project:member_added", member)
    return member


@router.delete("/{project_id}/members/{user_id}")
async def remove_member(project_id: str, user_id: str, current_user: dict = Depends(get_current_user)):
    if not has_permission(current_user, "team.manage"):
        raise HTTPException(403, "Only Admins and General Contractors can remove members.")
    execute_write("DELETE FROM project_members WHERE project_id=:pid AND user_id=:uid",
                  {"pid": project_id, "uid": user_id})
    await sio.emit("project:member_removed", {"project_id": project_id, "user_id": user_id})
    return {"message": "Member removed"}


# ---------------------------------------------------------------------------
# Audit logs
# ---------------------------------------------------------------------------

@router.get("/{project_id}/audit-logs")
def project_audit_logs(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")
    return get_audit_logs(project_id=project_id)
