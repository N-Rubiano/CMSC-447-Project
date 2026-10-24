"""
routers/audit_logs.py — Real-Time Audit Logs Persistent API
  GET    /api/audit-logs          (Fetch live logs from PostgreSQL audit_logs table)
  POST   /api/audit-logs          (Insert new log record directly into database & emit via WebSocket)
  DELETE /api/audit-logs          (Clear audit logs)
"""
import uuid
from datetime import datetime, timezone
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query
from pydantic import BaseModel

from ..auth import get_current_user
from ..database import execute_query, execute_write
from ..sio import sio

router = APIRouter(tags=["audit_logs"])


class CreateLogPayload(BaseModel):
    category: str = "Status"
    action: str
    details: Optional[str] = ""
    target: Optional[str] = "—"
    project_id: Optional[str] = None
    pin_id: Optional[str] = None
    actor: Optional[str] = None
    role: Optional[str] = None
    company: Optional[str] = None


@router.get("/api/audit-logs")
def get_persisted_audit_logs(
    project_id: Optional[str] = None,
    limit: int = Query(200, ge=1, le=1000),
    current_user: dict = Depends(get_current_user),
):
    """Retrieve all real-time audit logs from the PostgreSQL audit_logs table."""
    params = {"limit": limit}
    if project_id:
        sql = """
            SELECT * FROM audit_logs
            WHERE project_id=:pid OR project_id IS NULL
            ORDER BY created_at DESC
            LIMIT :limit
        """
        params["pid"] = project_id
    else:
        sql = "SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT :limit"

    rows = execute_query(sql, params)

    # Transform database columns to format expected by dashboard
    transformed = []
    for r in rows:
        action_str = r.get("action") or "System Activity"
        # Determine category based on action or stored value
        cat = "Status"
        action_lower = action_str.lower()
        if "project" in action_lower:
            cat = "Projects"
        elif "sheet" in action_lower or "blueprint" in action_lower or "drawing" in action_lower:
            cat = "Blueprints"
        elif "pin" in action_lower or "punch" in action_lower or "assign" in action_lower or "comment" in action_lower:
            cat = "Assignments"
        elif "member" in action_lower or "team" in action_lower or "user" in action_lower:
            cat = "Team"

        created = r.get("created_at") or ""
        time_str = "Just now"
        timestamp_str = "Live Sync"
        if created:
            try:
                # Format timestamp
                dt = datetime.fromisoformat(created.replace("Z", "+00:00"))
                time_str = dt.strftime("%I:%M %p")
                timestamp_str = dt.strftime("%b %d, %Y")
            except Exception:
                time_str = str(created)[:16]

        transformed.append({
            "id": r.get("id"),
            "category": cat,
            "action": action_str,
            "details": r.get("details") or f"{action_str} on target {r.get('new_value') or '—'}",
            "target": r.get("new_value") or r.get("pin_id") or r.get("project_id") or "—",
            "actor": r.get("user_name") or "Field User",
            "actorRole": r.get("user_role") or "Inspector",
            "actorCompany": r.get("user_company") or "Apex Construction GC",
            "time": time_str,
            "timestamp": timestamp_str,
            "created_at": created,
            "color": "#2563EB" if cat == "Projects" else "#7C3AED" if cat == "Blueprints" else "#D97706" if cat == "Assignments" else "#16A34A" if cat == "Team" else "#059669",
            "bg": "#DBEAFE" if cat == "Projects" else "#EDE9FE" if cat == "Blueprints" else "#FEF3C7" if cat == "Assignments" else "#DCFCE7" if cat == "Team" else "#D1FAE5"
        })

    return transformed


@router.post("/api/audit-logs", status_code=201)
async def record_audit_log(
    payload: CreateLogPayload,
    current_user: dict = Depends(get_current_user),
):
    """Insert a real-time event into the PostgreSQL audit_logs table and broadcast via WebSocket."""
    log_id = f"log-{int(datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:4]}"
    now = datetime.now(timezone.utc).isoformat()
    actor_name = payload.actor or current_user.get("name") or "Field Inspector"
    actor_role = payload.role or current_user.get("role") or "Inspector"
    actor_company = payload.company or current_user.get("company") or "Apex Construction GC"

    sql = """
        INSERT INTO audit_logs (
            id, project_id, pin_id, user_id, user_name, user_role, user_company,
            action, old_value, new_value, details, created_at
        ) VALUES (
            :id, :pid, :pin, :uid, :uname, :urole, :ucomp,
            :action, NULL, :target, :details, :now
        )
    """
    execute_write(sql, {
        "id": log_id,
        "pid": payload.project_id,
        "pin": payload.pin_id,
        "uid": current_user.get("id", "user"),
        "uname": actor_name,
        "urole": actor_role,
        "ucomp": actor_company,
        "action": payload.action,
        "target": payload.target or "—",
        "details": payload.details or "",
        "now": now
    })

    log_entry = {
        "id": log_id,
        "category": payload.category,
        "action": payload.action,
        "details": payload.details,
        "target": payload.target or "—",
        "actor": actor_name,
        "actorRole": actor_role,
        "actorCompany": actor_company,
        "time": "Just now",
        "timestamp": datetime.now().strftime("%I:%M %p"),
        "created_at": now,
        "color": "#2563EB" if payload.category == "Projects" else "#7C3AED" if payload.category == "Blueprints" else "#D97706" if payload.category == "Assignments" else "#16A34A" if payload.category == "Team" else "#059669",
        "bg": "#DBEAFE" if payload.category == "Projects" else "#EDE9FE" if payload.category == "Blueprints" else "#FEF3C7" if payload.category == "Assignments" else "#DCFCE7" if payload.category == "Team" else "#D1FAE5"
    }

    # Broadcast real-time to all connected users
    await sio.emit("audit:log", log_entry)

    return log_entry


@router.delete("/api/audit-logs")
def clear_audit_logs(
    project_id: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Clear audit logs from PostgreSQL table."""
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Admins can clear audit logs.")

    if project_id:
        execute_write("DELETE FROM audit_logs WHERE project_id=:pid", {"pid": project_id})
    else:
        execute_write("DELETE FROM audit_logs")

    return {"message": "Audit logs cleared successfully"}
