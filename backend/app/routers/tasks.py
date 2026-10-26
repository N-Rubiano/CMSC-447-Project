"""
routers/tasks.py — v2 Tasks API + Subcontractor Registry.
Python port of backend/src/controllers/tasksController.js.

Endpoints:
  GET    /api/subcontractors
  POST   /api/subcontractors
  PATCH  /api/subcontractors/:id
  DELETE /api/subcontractors/:id
  GET    /api/tasks
  POST   /api/tasks
  GET    /api/tasks/:id
  PATCH  /api/tasks/:id
  PATCH  /api/tasks/:id/status
  PATCH  /api/tasks/:id/assignees
  POST   /api/tasks/:id/comments
  POST   /api/tasks/:id/attachments
  GET    /api/tasks/:id/attachments/zip
  POST   /api/tasks/import/csv
"""
import csv as csv_module
import io
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile
from fastapi.responses import StreamingResponse

from ..auth import get_current_user
from ..database import add_audit_log, execute_one, execute_query, execute_write, get_audit_logs, settings
from ..permissions import can_user_access_project
from ..services.task_validator import (
    CSV_COLUMN_SPEC,
    get_all_subcontractors,
    get_subcontractor,
    normalize_priority,
    normalize_status,
    validate_assignees,
    validate_comment,
    validate_csv_row,
    validate_status_transition_v2,
    validate_task_payload,
)
from ..sio import sio

router = APIRouter(tags=["tasks"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def can_write_task(user: dict) -> bool:
    return user.get("role") in ("admin", "general_contractor", "power_collaborator")


def resolve_task(task_id: str) -> Optional[dict]:
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        return None

    # Hydrate assignees
    assignees_raw = task.get("assignees") or "[]"
    try:
        assignee_ids = json.loads(assignees_raw) if isinstance(assignees_raw, str) else assignees_raw
    except Exception:
        assignee_ids = []

    assignees = []
    for aid in assignee_ids:
        sub = get_subcontractor(aid)
        if sub:
            assignees.append({k: sub[k] for k in ("id", "name", "initials", "color", "trade") if k in sub})
        else:
            assignees.append({"id": aid})

    photos = execute_query("SELECT * FROM pin_photos WHERE pin_id=:pid ORDER BY created_at ASC", {"pid": task_id})
    comments_raw = execute_query("SELECT * FROM comments WHERE pin_id=:pid ORDER BY created_at ASC", {"pid": task_id})
    comments = []
    for c in comments_raw:
        author = execute_one("SELECT * FROM users WHERE id=:id", {"id": c.get("author_id")}) or {}
        comments.append({**c, "author_name": author.get("name"), "author_email": author.get("email"),
                         "author_avatar": author.get("avatar_url")})

    return {**task, "assignees": assignees, "photos": photos, "comments": comments}


def generate_task_id(project_id: str) -> tuple[int, str]:
    pins = execute_query("SELECT item_number FROM pins WHERE project_id=:pid", {"pid": project_id})
    max_num = max((int(p.get("item_number") or 100) for p in pins), default=100)
    next_num = max_num + 1
    return next_num, f"TASK-{str(next_num).zfill(5)}"


def _save_upload(file: UploadFile) -> str:
    ext = Path(file.filename or "file").suffix
    filename = f"{int(datetime.now().timestamp()*1000)}-{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    dest.write_bytes(file.file.read())
    return f"/uploads/{filename}"


# ---------------------------------------------------------------------------
# Subcontractor registry
# ---------------------------------------------------------------------------

@router.get("/api/subcontractors")
def list_subcontractors(current_user: dict = Depends(get_current_user)):
    return get_all_subcontractors()


@router.post("/api/subcontractors", status_code=201)
async def register_subcontractor(body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "general_contractor"):
        raise HTTPException(403, "Only Admins and General Contractors can register subcontractors.")

    name = (body.get("name") or "").strip()
    initials = (body.get("initials") or "").strip()
    if not name or not initials:
        raise HTTPException(400, "name and initials are required.")
    if len(initials) > 6:
        raise HTTPException(400, "initials must be 6 characters or fewer.")

    existing = execute_query("SELECT id FROM subcontractors WHERE LOWER(name)=LOWER(:name)", {"name": name})
    if existing:
        raise HTTPException(409, f'Subcontractor "{name}" is already registered.')

    sub_id = f"sub-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    execute_write(
        """INSERT INTO subcontractors (id,name,trade,contact_name,contact_email,contact_phone,
           initials,color,license_number,created_by,created_at,updated_at)
           VALUES (:id,:name,:trade,:cn,:ce,:cp,:ini,:color,:lic,:by,:now,:now)""",
        dict(id=sub_id, name=name, trade=body.get("trade", ""),
             cn=body.get("contactName", ""), ce=body.get("contactEmail", ""),
             cp=body.get("contactPhone", ""),
             ini=initials.upper()[:6], color=body.get("color", "#EF4444"),
             lic=body.get("licenseNumber", ""), by=current_user.get("id"), now=now),
    )
    sub = execute_one("SELECT * FROM subcontractors WHERE id=:id", {"id": sub_id})
    await sio.emit("subcontractor:created", sub)
    return sub


@router.patch("/api/subcontractors/{sub_id}")
async def update_subcontractor(sub_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") not in ("admin", "general_contractor"):
        raise HTTPException(403, "Forbidden.")
    existing = execute_one("SELECT * FROM subcontractors WHERE id=:id", {"id": sub_id})
    if not existing:
        raise HTTPException(404, "Subcontractor not found.")

    allowed = ["name", "trade", "contact_name", "contact_email", "contact_phone",
               "initials", "color", "license_number"]
    updates = {k: body[k] for k in allowed if k in body}
    if "initials" in updates:
        updates["initials"] = str(updates["initials"]).upper().strip()[:6]
    updates["updated_at"] = datetime.now(timezone.utc).isoformat()

    sets = ", ".join(f"{k}=:{k}" for k in updates)
    execute_write(f"UPDATE subcontractors SET {sets} WHERE id=:sub_id",
                  {**updates, "sub_id": sub_id})
    updated = execute_one("SELECT * FROM subcontractors WHERE id=:id", {"id": sub_id})
    await sio.emit("subcontractor:updated", updated)
    return updated


@router.delete("/api/subcontractors/{sub_id}")
async def delete_subcontractor(sub_id: str, current_user: dict = Depends(get_current_user)):
    if current_user.get("role") != "admin":
        raise HTTPException(403, "Only Admins can remove subcontractors.")
    sub = execute_one("SELECT * FROM subcontractors WHERE id=:id", {"id": sub_id})
    if not sub:
        raise HTTPException(404, "Subcontractor not found.")

    # Check for open tasks
    all_pins = execute_query("SELECT id, assignees, status FROM pins")
    open_assigned = []
    for p in all_pins:
        assignees_raw = p.get("assignees") or "[]"
        try:
            ids = json.loads(assignees_raw) if isinstance(assignees_raw, str) else assignees_raw
        except Exception:
            ids = []
        if sub_id in ids and normalize_status(p.get("status")) != "Closed":
            open_assigned.append(p["id"])

    if open_assigned:
        raise HTTPException(
            409,
            f"Cannot delete: subcontractor is assigned to {len(open_assigned)} open task(s).",
        )

    execute_write("DELETE FROM subcontractors WHERE id=:id", {"id": sub_id})
    await sio.emit("subcontractor:deleted", {"id": sub_id})
    return {"success": True, "id": sub_id}


# ---------------------------------------------------------------------------
# Tasks v2
# ---------------------------------------------------------------------------

@router.get("/api/tasks")
def list_tasks(
    project_id: str = Query(...),
    status: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    assignee: Optional[str] = Query(None),
    sheet_id: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden.")

    tasks = execute_query("SELECT * FROM pins WHERE project_id=:pid", {"pid": project_id})

    if current_user.get("role") == "sub_contractor":
        def _has_assignee(t):
            try:
                ids = json.loads(t.get("assignees") or "[]")
            except Exception:
                ids = []
            return current_user.get("company_id") in ids
        tasks = [t for t in tasks if _has_assignee(t)]

    if status:
        tasks = [t for t in tasks if normalize_status(t.get("status")) == normalize_status(status)]
    if priority:
        tasks = [t for t in tasks if normalize_priority(t.get("priority")) == normalize_priority(priority)]
    if sheet_id:
        tasks = [t for t in tasks if t.get("sheet_id") == sheet_id]
    if assignee:
        def _has(t):
            try:
                return assignee in json.loads(t.get("assignees") or "[]")
            except Exception:
                return False
        tasks = [t for t in tasks if _has(t)]
    if search:
        q = search.lower()
        tasks = [t for t in tasks if
                 q in (t.get("title") or "").lower() or
                 q in (t.get("description") or "").lower() or
                 q in (t.get("task_id") or "").lower()]

    return [{**t, "priority": normalize_priority(t.get("priority")),
             "status": normalize_status(t.get("status"))} for t in tasks]


@router.post("/api/tasks", status_code=201)
async def create_task(body: dict, current_user: dict = Depends(get_current_user)):
    if not can_write_task(current_user):
        raise HTTPException(403, "Forbidden: Subcontractors cannot create tasks.")

    validation = validate_task_payload(body, is_update=False)
    if not validation["valid"]:
        raise HTTPException(400, {"error": "Validation failed.", "details": validation["errors"]})

    n = validation["normalized"]
    project_id = n["project_id"]
    sheet_id = n["sheet_id"]

    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden: Cannot create task on this project.")

    item_number, task_id = generate_task_id(project_id)
    pin_id = f"pin-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    location = n.get("location") or {}
    assignees = json.dumps(n.get("assignees") or [])
    watchers = json.dumps(n.get("watchers") or [])

    execute_write(
        """INSERT INTO pins (id,task_id,sheet_id,project_id,item_number,title,stamp_initials,
           priority,status,room_location,root_cause,description,start_date,end_date,
           x_pct,y_pct,assignees,watchers,created_by_user_id,assigned_subcontractor_id,
           created_at,updated_at,location)
           VALUES (:id,:tid,:sid,:pid,:num,:title,:stamp,:prio,:status,:room,:root,:desc,
           :sd,:ed,:x,:y,:assignees,:watchers,:created_by,:sub_id,:now,:now,:loc)""",
        dict(id=pin_id, tid=task_id, sid=sheet_id, pid=project_id, num=item_number,
             title=n.get("title"), stamp=n.get("subcontractorStamp", ""),
             prio=n.get("priority", "P-2"), status=n.get("status", "Pending"),
             room=location.get("officeRoomNo") or n.get("room_location", ""),
             root=n.get("rootCause", ""), desc=n.get("description", ""),
             sd=n.get("startDate"), ed=n.get("endDate"),
             x=n.get("x_pct") or (location.get("coordinates") or {}).get("x"),
             y=n.get("y_pct") or (location.get("coordinates") or {}).get("y"),
             assignees=assignees, watchers=watchers,
             created_by=current_user.get("id"),
             sub_id=(n.get("assignees") or [None])[0],
             now=now, loc=json.dumps(location)),
    )

    add_audit_log("TASK_CREATED", project_id=project_id, pin_id=pin_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  new_value=f"{task_id}: {n.get('title')}")

    resolved = resolve_task(pin_id)
    await sio.emit("task:created", resolved, room=f"project:{project_id}")
    return resolved


@router.get("/api/tasks/{task_id}")
def get_task(task_id: str, current_user: dict = Depends(get_current_user)):
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")
    if not can_user_access_project(current_user, task["project_id"]):
        raise HTTPException(403, "Forbidden.")

    if current_user.get("role") == "sub_contractor":
        try:
            ids = json.loads(task.get("assignees") or "[]")
        except Exception:
            ids = []
        if current_user.get("company_id") not in ids:
            raise HTTPException(403, "Forbidden: Task not assigned to your organization.")

    resolved = resolve_task(task_id)
    history = get_audit_logs(pin_id=task_id)
    return {**resolved, "priority": normalize_priority(resolved.get("priority")),
            "status": normalize_status(resolved.get("status")), "history": history}


@router.patch("/api/tasks/{task_id}")
async def update_task(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if not can_write_task(current_user):
        raise HTTPException(403, "Forbidden.")
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")
    if not can_user_access_project(current_user, task["project_id"]):
        raise HTTPException(403, "Forbidden.")

    validation = validate_task_payload(body, is_update=True)
    if not validation["valid"]:
        raise HTTPException(400, {"error": "Validation failed.", "details": validation["errors"]})

    n = validation["normalized"]
    now = datetime.now(timezone.utc).isoformat()

    location_raw = task.get("location") or "{}"
    try:
        old_loc = json.loads(location_raw) if isinstance(location_raw, str) else location_raw
    except Exception:
        old_loc = {}

    new_loc = {**old_loc, **(n.get("location") or {})}

    updates: dict = {}
    for field, col in [("title", "title"), ("subcontractorStamp", "stamp_initials"),
                        ("description", "description"), ("rootCause", "root_cause"),
                        ("startDate", "start_date"), ("endDate", "end_date")]:
        if field in n and n[field] is not None:
            updates[col] = n[field]

    updates["priority"] = normalize_priority(n.get("priority") or task.get("priority"))
    updates["room_location"] = new_loc.get("officeRoomNo") or n.get("room_location") or task.get("room_location")
    updates["location"] = json.dumps(new_loc)
    updates["updated_at"] = now

    sets = ", ".join(f"{k}=:{k}" for k in updates)
    execute_write(f"UPDATE pins SET {sets} WHERE id=:tid", {**updates, "tid": task_id})

    add_audit_log("TASK_UPDATED", project_id=task["project_id"], pin_id=task_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  details=f"Fields updated: {', '.join(body.keys())}")

    resolved = resolve_task(task_id)
    await sio.emit("task:updated", resolved, room=f"project:{task['project_id']}")
    return resolved


@router.patch("/api/tasks/{task_id}/status")
async def update_task_status(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")
    if not can_user_access_project(current_user, task["project_id"]):
        raise HTTPException(403, "Forbidden.")

    check = validate_status_transition_v2(current_user, task, body.get("status", ""))
    if not check["valid"]:
        raise HTTPException(403, check["message"])

    old_status = normalize_status(task.get("status"))
    now = datetime.now(timezone.utc).isoformat()
    execute_write("UPDATE pins SET status=:s, updated_at=:now WHERE id=:tid",
                  {"s": check["normalizedStatus"], "now": now, "tid": task_id})

    comment_text = (body.get("comment") or "").strip()
    if comment_text:
        cv = validate_comment(comment_text)
        if cv["valid"]:
            execute_write(
                "INSERT INTO comments (id,pin_id,author_id,body,parent_id,created_at) VALUES (:id,:pid,:aid,:body,NULL,:now)",
                dict(id=f"cmt-{uuid.uuid4().hex[:8]}", pid=task_id, aid=current_user.get("id"),
                     body=comment_text, now=now),
            )

    add_audit_log("STATUS_CHANGED", project_id=task["project_id"], pin_id=task_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  old_value=old_status, new_value=check["normalizedStatus"],
                  details=comment_text or f"Moved to {check['normalizedStatus']}")

    resolved = resolve_task(task_id)
    await sio.emit("task:status", {
        "taskId": task_id, "oldStatus": old_status,
        "newStatus": check["normalizedStatus"], "task": resolved,
    }, room=f"project:{task['project_id']}")
    return resolved


@router.patch("/api/tasks/{task_id}/assignees")
async def update_task_assignees(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    if not can_write_task(current_user):
        raise HTTPException(403, "Forbidden.")
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")

    assignees = body.get("assignees")
    watchers = body.get("watchers")

    if assignees is not None:
        check = validate_assignees(assignees)
        if not check["valid"]:
            raise HTTPException(400, check["error"])

    try:
        old_assignees = json.loads(task.get("assignees") or "[]")
        old_watchers = json.loads(task.get("watchers") or "[]")
    except Exception:
        old_assignees, old_watchers = [], []

    new_assignees = assignees if assignees is not None else old_assignees
    new_watchers = watchers if watchers is not None else old_watchers
    now = datetime.now(timezone.utc).isoformat()

    execute_write(
        "UPDATE pins SET assignees=:a, watchers=:w, assigned_subcontractor_id=:sid, updated_at=:now WHERE id=:tid",
        dict(a=json.dumps(new_assignees), w=json.dumps(new_watchers),
             sid=new_assignees[0] if new_assignees else None, now=now, tid=task_id),
    )

    add_audit_log("ASSIGNEES_UPDATED", project_id=task["project_id"], pin_id=task_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  new_value=", ".join(new_assignees))

    resolved = resolve_task(task_id)
    await sio.emit("task:updated", resolved, room=f"project:{task['project_id']}")
    return resolved


@router.post("/api/tasks/{task_id}/comments", status_code=201)
async def add_task_comment(task_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")
    if not can_user_access_project(current_user, task["project_id"]):
        raise HTTPException(403, "Forbidden.")

    text = body.get("body", "")
    cv = validate_comment(text)
    if not cv["valid"]:
        raise HTTPException(400, cv["error"])

    now = datetime.now(timezone.utc).isoformat()
    comment = {
        "id": f"cmt-{uuid.uuid4().hex[:8]}",
        "pin_id": task_id,
        "author_id": current_user.get("id"),
        "body": text.strip(),
        "char_count": len(text.strip()),
        "parent_id": body.get("parent_id"),
        "created_at": now,
        "edited": False,
    }
    execute_write(
        """INSERT INTO comments (id,pin_id,author_id,body,char_count,parent_id,created_at)
           VALUES (:id,:pid,:aid,:body,:cc,:parent,:now)""",
        dict(id=comment["id"], pid=task_id, aid=current_user.get("id"), body=comment["body"],
             cc=comment["char_count"], parent=comment.get("parent_id"), now=now),
    )

    author = execute_one("SELECT * FROM users WHERE id=:id", {"id": current_user.get("id")}) or {}
    enriched = {**comment, "author_name": author.get("name"), "author_email": author.get("email"),
                "author_avatar": author.get("avatar_url")}

    await sio.emit("comment:new", {"taskId": task_id, "comment": enriched},
                   room=f"project:{task['project_id']}")
    return enriched


@router.post("/api/tasks/{task_id}/attachments", status_code=201)
async def upload_task_attachment(
    task_id: str,
    file: UploadFile = File(...),
    caption: str = Form(""),
    current_user: dict = Depends(get_current_user),
):
    if not can_write_task(current_user):
        raise HTTPException(403, "Forbidden.")
    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")

    file_url = _save_upload(file)
    ext = Path(file.filename or "").suffix.lower()
    is_video = ext in (".mp4", ".mov", ".avi", ".webm")
    ftype = "video" if is_video else "photo"
    att_id = f"att-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    execute_write(
        """INSERT INTO pin_photos (id,pin_id,type,url,thumbnail_url,caption,uploaded_by,uploaded_by_id,created_at)
           VALUES (:id,:pid,:type,:url,:thumb,:cap,:by,:byid,:now)""",
        dict(id=att_id, pid=task_id, type=ftype, url=file_url,
             thumb=None if is_video else file_url, cap=caption,
             by=current_user.get("name"), byid=current_user.get("id"), now=now),
    )

    att = execute_one("SELECT * FROM pin_photos WHERE id=:id", {"id": att_id})
    await sio.emit("task:attachment", {"taskId": task_id, "attachment": att},
                   room=f"project:{task['project_id']}")
    return att


@router.get("/api/tasks/{task_id}/attachments/zip")
def download_attachments_zip(task_id: str, current_user: dict = Depends(get_current_user)):
    import zipfile

    task = execute_one("SELECT * FROM pins WHERE id=:id", {"id": task_id})
    if not task:
        raise HTTPException(404, "Task not found.")
    if not can_user_access_project(current_user, task["project_id"]):
        raise HTTPException(403, "Forbidden.")

    attachments = execute_query("SELECT * FROM pin_photos WHERE pin_id=:pid", {"pid": task_id})
    if not attachments:
        raise HTTPException(404, "No attachments found for this task.")

    zip_buf = io.BytesIO()
    with zipfile.ZipFile(zip_buf, "w", zipfile.ZIP_DEFLATED) as zf:
        for att in attachments:
            url = att.get("url", "")
            filename = Path(url).name
            file_path = UPLOADS_DIR / filename
            if file_path.exists():
                zf.write(file_path, arcname=f"{att['id']}{Path(filename).suffix}")

    zip_buf.seek(0)
    task_label = task.get("task_id") or task_id
    return StreamingResponse(
        iter([zip_buf.getvalue()]),
        media_type="application/zip",
        headers={"Content-Disposition": f'attachment; filename="{task_label}-attachments.zip"'},
    )


@router.post("/api/tasks/import/csv", status_code=201)
async def import_csv(
    csv: UploadFile = File(...),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "general_contractor"):
        raise HTTPException(403, "Only Admins and General Contractors can bulk import tasks.")

    content = csv.file.read().decode("utf-8", errors="replace")
    reader = csv_module.DictReader(io.StringIO(content))
    rows = list(reader)

    if not rows:
        raise HTTPException(400, "CSV file is empty.")

    imported = []
    failed = []
    now = datetime.now(timezone.utc).isoformat()

    for i, row in enumerate(rows, start=2):
        result = validate_csv_row(dict(row), i)
        if not result["valid"]:
            failed.append({"row": i, "data": dict(row), "errors": result["errors"]})
            continue

        n = result["normalized"]
        if not can_user_access_project(current_user, n["project_id"]):
            failed.append({"row": i, "data": dict(row),
                           "errors": [f"Row {i}: Access denied to project \"{n['project_id']}\"."]})
            continue

        item_number, task_id = generate_task_id(n["project_id"])
        pin_id = f"pin-{uuid.uuid4().hex[:8]}"

        execute_write(
            """INSERT INTO pins (id,task_id,sheet_id,project_id,item_number,title,stamp_initials,
               priority,status,room_location,root_cause,description,start_date,end_date,
               assignees,watchers,created_by_user_id,assigned_subcontractor_id,
               created_at,updated_at,location)
               VALUES (:id,:tid,:sid,:pid,:num,:title,:stamp,:prio,:status,:room,:root,:desc,
               :sd,:ed,:assignees,:watchers,:by,:sub_id,:now,:now,:loc)""",
            dict(id=pin_id, tid=task_id, sid=n["sheet_id"], pid=n["project_id"],
                 num=item_number, title=n["title"], stamp=n["subcontractorStamp"],
                 prio=n["priority"], status=n["status"],
                 room=n["location"].get("officeRoomNo", ""),
                 root=n["rootCause"], desc=n["description"],
                 sd=n["startDate"], ed=n["endDate"],
                 assignees=json.dumps(n["assignees"]), watchers=json.dumps(n["watchers"]),
                 by=current_user.get("id"),
                 sub_id=n["assignees"][0] if n["assignees"] else None,
                 now=now, loc=json.dumps(n["location"])),
        )
        imported.append(pin_id)

    if imported:
        add_audit_log("CSV_IMPORT", user_id=current_user.get("id"), user_name=current_user.get("name"),
                      user_role=current_user.get("role"),
                      new_value=f"{len(imported)} task(s) imported",
                      details=f"{len(failed)} row(s) failed validation")

    return {
        "imported": len(imported),
        "failed": len(failed),
        "tasks": [execute_one("SELECT * FROM pins WHERE id=:id", {"id": pid}) for pid in imported],
        "errors": failed,
    }
