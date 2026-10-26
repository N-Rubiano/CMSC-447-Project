"""
routers/pins.py — Full CRUD for punch-list pins (v1 API):
  GET  /api/sheets/:id/pins
  GET  /api/projects/:id/pins
  GET  /api/pins/:id
  POST /api/pins
  PUT  /api/pins/:id
  PATCH /api/pins/:id/status
  POST /api/pins/:id/assign
  DELETE /api/pins/:id
  POST /api/pins/:id/photos
  POST /api/pins/:id/comments
  GET  /api/projects/:id/comments
  GET  /api/projects/:id/photos
  GET  /api/pins/:id/audit-logs
"""
import json
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form, Query

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, add_audit_log, get_audit_logs, settings
from ..permissions import can_user_access_project, can_user_access_pin, has_permission, validate_status_transition
from ..sio import sio

router = APIRouter(tags=["pins"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _initials_from_company(company: str) -> str:
    parts = company.strip().split()
    parts = [p for p in parts if p]
    if len(parts) >= 2:
        return (parts[0][0] + parts[-1][0]).upper()
    if len(company.strip()) >= 2:
        return company.strip()[:2].upper()
    return company.strip().upper()


def _save_upload(file: UploadFile) -> str:
    ext = Path(file.filename or "file").suffix
    filename = f"{int(datetime.now().timestamp()*1000)}-{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    dest.write_bytes(file.file.read())
    return f"/uploads/{filename}"


# ---------------------------------------------------------------------------
# GET pins by sheet
# ---------------------------------------------------------------------------

@router.get("/api/sheets/{sheet_id}/pins")
def get_pins_by_sheet(sheet_id: str, current_user: dict = Depends(get_current_user)):
    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Forbidden")
    pins = execute_query("SELECT * FROM pins WHERE sheet_id=:sid ORDER BY item_number ASC", {"sid": sheet_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]
    return pins


# ---------------------------------------------------------------------------
# GET pins by project
# ---------------------------------------------------------------------------

@router.get("/api/projects/{project_id}/pins")
def get_pins_by_project(
    project_id: str,
    status: Optional[str] = Query(None),
    discipline: Optional[str] = Query(None),
    priority: Optional[str] = Query(None),
    search: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden: You do not have permission to view punch items for this project.")
    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]
    if status:
        pins = [p for p in pins if p.get("status") == status]
    if discipline:
        pins = [p for p in pins if p.get("discipline") == discipline]
    if priority:
        pins = [p for p in pins if p.get("priority") == priority]
    if search:
        q = search.lower()
        pins = [p for p in pins if
                q in (p.get("title") or "").lower() or
                q in (p.get("description") or "").lower() or
                q in (p.get("room_location") or "").lower() or
                q in (p.get("assigned_to_company") or "").lower()]
    return pins


# ---------------------------------------------------------------------------
# GET single pin with photos/comments/history
# ---------------------------------------------------------------------------

@router.get("/api/pins/{pin_id}")
def get_pin(pin_id: str, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not can_user_access_pin(current_user, pin):
        raise HTTPException(403, "Forbidden: You do not have permission to view this punch item.")

    photos = execute_query("SELECT * FROM pin_photos WHERE pin_id=:pid ORDER BY created_at ASC", {"pid": pin_id})
    comments = execute_query(
        """SELECT c.*, u.name as author_name, u.avatar_url as author_avatar, u.company as author_company
           FROM comments c LEFT JOIN users u ON u.id=c.author_id
           WHERE c.pin_id=:pid ORDER BY c.created_at ASC""",
        {"pid": pin_id},
    )
    history = get_audit_logs(pin_id=pin_id)
    return {**pin, "photos": photos, "comments": comments, "history": history}


# ---------------------------------------------------------------------------
# POST /api/pins — create
# ---------------------------------------------------------------------------

@router.post("/api/pins", status_code=201)
async def create_pin(body: dict, current_user: dict = Depends(get_current_user)):
    user = current_user
    if not has_permission(user, "pin.create"):
        raise HTTPException(403, "Forbidden: Your role cannot create punch list items.")

    project_id = body.get("project_id")
    if not can_user_access_project(user, project_id):
        raise HTTPException(403, "Forbidden: Cannot create punch item on unassigned project.")

    sheet_id = body.get("sheet_id")
    title = body.get("title")
    if not title:
        raise HTTPException(400, "title is required")

    max_num = execute_one("SELECT MAX(item_number) as mx FROM pins WHERE project_id=:pid", {"pid": project_id})
    item_number = (int(max_num.get("mx") or 100) if max_num else 100) + 1
    pin_id = f"pin-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()

    assigned_contractor_id = body.get("assigned_contractor_id")
    assigned_subcontractor_id = body.get("assigned_subcontractor_id")
    assigned_to_company = body.get("assigned_to_company", "")
    assigned_to_user_id = body.get("assigned_to_user_id")

    if not assigned_contractor_id and user.get("role") == "general_contractor":
        assigned_contractor_id = user.get("company_id")

    sub_company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": assigned_subcontractor_id}) if assigned_subcontractor_id else None
    contractor_company = execute_one("SELECT * FROM companies WHERE id=:id", {"id": assigned_contractor_id}) if assigned_contractor_id else None
    company_name = (sub_company or {}).get("name") or assigned_to_company or (contractor_company or {}).get("name") or ""

    stamp = body.get("stamp_initials") or (_initials_from_company(company_name) if company_name else body.get("discipline", "PL")[:2].upper())

    execute_write(
        """INSERT INTO pins (id,sheet_id,project_id,item_number,title,description,status,priority,
           discipline,x_pct,y_pct,room_location,due_date,assigned_to_user_id,assigned_to_company,
           created_by_user_id,assigned_contractor_id,assigned_subcontractor_id,root_cause,stamp_initials,
           stamp_scale,created_at,updated_at)
           VALUES (:id,:sid,:pid,:num,:title,:desc,:status,:prio,:disc,:x,:y,:room,:due,:uid,:company,
           :created_by,:cid,:scid,:root,:stamp,:scale,:now,:now)""",
        dict(id=pin_id, sid=sheet_id, pid=project_id, num=item_number, title=title,
             desc=body.get("description", ""), status=body.get("status", "open"),
             prio=body.get("priority", "medium"), disc=body.get("discipline", "architectural"),
             x=body.get("x_pct", 0.5), y=body.get("y_pct", 0.5),
             room=body.get("room_location"), due=body.get("due_date"),
             uid=assigned_to_user_id, company=company_name, created_by=user.get("id"),
             cid=assigned_contractor_id, scid=assigned_subcontractor_id,
             root=body.get("root_cause"), stamp=stamp, scale=float(body.get("stamp_scale") or 1.0), now=now),
    )

    add_audit_log("CREATED", project_id=project_id, pin_id=pin_id,
                  user_id=user.get("id"), user_name=user.get("name"),
                  user_role=user.get("role"), user_company=user.get("company"),
                  new_value=f"PL-{item_number}: {title}",
                  details=f"Created in {body.get('room_location') or 'Field'}")

    # Inline photos
    photos = body.get("photos", [])
    for ph in photos:
        ph_id = f"pht-{uuid.uuid4().hex[:8]}"
        execute_write(
            "INSERT INTO pin_photos (id,pin_id,url,caption,uploaded_by,created_at) VALUES (:id,:pid,:url,:cap,:by,:now)",
            dict(id=ph_id, pid=pin_id, url=ph.get("url"), cap=ph.get("caption", ""), by=user.get("name"), now=now),
        )

    created = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    await sio.emit("pin:created", created, room=f"project:{project_id}")
    return created


# ---------------------------------------------------------------------------
# PATCH /api/pins/:id/status — status transition
# ---------------------------------------------------------------------------

@router.patch("/api/pins/{pin_id}/status")
async def update_pin_status(pin_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    check = validate_status_transition(current_user, pin, body.get("status", ""))
    if not check["valid"]:
        raise HTTPException(403, check["message"])

    old_status = pin["status"]
    execute_write("UPDATE pins SET status=:s, updated_at=:now WHERE id=:id",
                  {"s": body["status"], "now": datetime.now(timezone.utc).isoformat(), "id": pin_id})

    comment_text = body.get("comment", "")
    if comment_text and comment_text.strip():
        execute_write(
            "INSERT INTO comments (id,pin_id,author_id,body,parent_id,created_at) VALUES (:id,:pid,:aid,:body,NULL,:now)",
            dict(id=f"cmt-{uuid.uuid4().hex[:8]}", pid=pin_id, aid=current_user.get("id"),
                 body=comment_text.strip(), now=datetime.now(timezone.utc).isoformat()),
        )

    add_audit_log("STATUS_CHANGED", project_id=pin["project_id"], pin_id=pin_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  old_value=old_status, new_value=body["status"],
                  details=comment_text or f"Status updated to {body['status']}")

    updated = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    await sio.emit("pin:updated", updated, room=f"project:{pin['project_id']}")
    return updated


# ---------------------------------------------------------------------------
# PUT /api/pins/:id — full update
# ---------------------------------------------------------------------------

@router.put("/api/pins/{pin_id}")
async def update_pin(pin_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not can_user_access_pin(current_user, pin):
        raise HTTPException(403, "Forbidden: You do not have permission to update this pin")

    new_status = body.get("status")
    if new_status and new_status != pin.get("status"):
        check = validate_status_transition(current_user, pin, new_status)
        if not check["valid"]:
            raise HTTPException(403, check["message"])
        add_audit_log("STATUS_CHANGED", project_id=pin["project_id"], pin_id=pin_id,
                      user_id=current_user.get("id"), user_name=current_user.get("name"),
                      user_role=current_user.get("role"), user_company=current_user.get("company"),
                      old_value=pin["status"], new_value=new_status,
                      details=f"Status changed to {new_status}")

    allowed = ["title", "description", "status", "priority", "discipline", "x_pct", "y_pct",
               "room_location", "due_date", "assigned_to_user_id", "assigned_to_company",
               "assigned_contractor_id", "assigned_subcontractor_id", "root_cause", "stamp_initials", "stamp_scale"]

    assigned_to_company = body.get("assigned_to_company")
    if not body.get("stamp_initials") and assigned_to_company:
        body["stamp_initials"] = _initials_from_company(assigned_to_company)

    now = datetime.now(timezone.utc).isoformat()
    sets = ", ".join(f"{k}=:{k}" for k in allowed if k in body)
    sets += ", updated_at=:now"
    execute_write(f"UPDATE pins SET {sets} WHERE id=:pin_id",
                  {**{k: body[k] for k in allowed if k in body}, "now": now, "pin_id": pin_id})

    updated = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    await sio.emit("pin:updated", updated, room=f"project:{pin['project_id']}")
    return updated


# ---------------------------------------------------------------------------
# POST /api/pins/:id/assign
# ---------------------------------------------------------------------------

@router.post("/api/pins/{pin_id}/assign")
async def assign_pin(pin_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not has_permission(current_user, "pin.assign"):
        raise HTTPException(403, "Forbidden: Subcontractors cannot delegate or reassign punch items.")

    contractor_company_id = body.get("contractor_company_id")
    subcontractor_company_id = body.get("subcontractor_company_id")
    user_id = body.get("user_id")

    if current_user.get("role") == "general_contractor":
        if contractor_company_id and contractor_company_id != current_user.get("company_id"):
            raise HTTPException(403, "Forbidden: Contractor cannot reassign work to another contractor.")
        if subcontractor_company_id:
            sub = execute_one("SELECT * FROM companies WHERE id=:id", {"id": subcontractor_company_id})
            if not sub or sub.get("parent_contractor_id") != current_user.get("company_id"):
                raise HTTPException(403, "Forbidden: You can only assign subcontractors under your organization.")

    target_cid = contractor_company_id if current_user.get("role") == "admin" else current_user.get("company_id")
    target_sid = subcontractor_company_id or pin.get("assigned_subcontractor_id")
    sub_c = execute_one("SELECT * FROM companies WHERE id=:id", {"id": target_sid}) if target_sid else None
    con_c = execute_one("SELECT * FROM companies WHERE id=:id", {"id": target_cid}) if target_cid else None
    company_name = (sub_c or {}).get("name") or (con_c or {}).get("name") or pin.get("assigned_to_company")

    execute_write(
        """UPDATE pins SET assigned_contractor_id=:cid, assigned_subcontractor_id=:sid,
           assigned_to_user_id=:uid, assigned_to_company=:company, updated_at=:now WHERE id=:pid""",
        dict(cid=target_cid, sid=target_sid, uid=user_id or pin.get("assigned_to_user_id"),
             company=company_name, now=datetime.now(timezone.utc).isoformat(), pid=pin_id),
    )
    updated = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    await sio.emit("pin:updated", updated, room=f"project:{pin['project_id']}")
    return updated


# ---------------------------------------------------------------------------
# DELETE /api/pins/:id
# ---------------------------------------------------------------------------

@router.delete("/api/pins/{pin_id}")
async def delete_pin(pin_id: str, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    can_delete = (
        has_permission(current_user, "pin.delete")
        or current_user.get("role") == "admin"
    )
    if not can_delete:
        raise HTTPException(403, "Forbidden: Sole authority to delete punch items belongs to Facility Administrator.")
    execute_write("DELETE FROM pins WHERE id=:id", {"id": pin_id})
    add_audit_log("DELETED", project_id=pin["project_id"], pin_id=pin_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  old_value=pin.get("title"), details=f"Punch item removed by {current_user.get('name', 'Admin')}")
    await sio.emit("pin:deleted", {"id": pin_id, "sheet_id": pin.get("sheet_id")},
                   room=f"project:{pin['project_id']}")
    return {"message": "Pin deleted successfully"}


# ---------------------------------------------------------------------------
# POST /api/pins/:id/photos
# ---------------------------------------------------------------------------

@router.post("/api/pins/{pin_id}/photos", status_code=201)
async def add_photo(
    pin_id: str,
    photo: Optional[UploadFile] = File(None),
    url: Optional[str] = Form(None),
    caption: str = Form(""),
    type: str = Form("issue"),
    current_user: dict = Depends(get_current_user),
):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not can_user_access_pin(current_user, pin):
        raise HTTPException(403, "Forbidden")

    photo_url = url
    if photo:
        photo_url = _save_upload(photo)
    if not photo_url:
        raise HTTPException(400, "No photo file or URL provided")

    photo_id = f"pht-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    execute_write(
        "INSERT INTO pin_photos (id,pin_id,url,type,caption,uploaded_by,created_at) VALUES (:id,:pid,:url,:type,:cap,:by,:now)",
        dict(id=photo_id, pid=pin_id, url=photo_url, type=type, cap=caption,
             by=current_user.get("name", "Field Inspector"), now=now),
    )
    add_audit_log("PHOTO_UPLOADED", project_id=pin["project_id"], pin_id=pin_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  new_value=type, details=caption or f"Photo attached: {type}")

    ph = execute_one("SELECT * FROM pin_photos WHERE id=:id", {"id": photo_id})
    await sio.emit("photo:added", {"pinId": pin_id, "photo": ph}, room=f"project:{pin['project_id']}")
    return ph


# ---------------------------------------------------------------------------
# POST /api/pins/:id/comments
# ---------------------------------------------------------------------------

@router.post("/api/pins/{pin_id}/comments", status_code=201)
async def add_comment(pin_id: str, body: dict, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not can_user_access_pin(current_user, pin):
        raise HTTPException(403, "Forbidden")

    text = body.get("body", "")
    if not text or not text.strip():
        raise HTTPException(400, "Comment body cannot be empty")

    comment_id = f"cmt-{uuid.uuid4().hex[:8]}"
    now = datetime.now(timezone.utc).isoformat()
    execute_write(
        "INSERT INTO comments (id,pin_id,author_id,body,parent_id,created_at) VALUES (:id,:pid,:aid,:body,:parent,:now)",
        dict(id=comment_id, pid=pin_id, aid=current_user.get("id"), body=text.strip(),
             parent=body.get("parent_id"), now=now),
    )
    add_audit_log("COMMENT_ADDED", project_id=pin["project_id"], pin_id=pin_id,
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  details=text.strip()[:60])

    comment = execute_one(
        """SELECT c.*, u.name as author_name, u.avatar_url as author_avatar, u.company as author_company
           FROM comments c LEFT JOIN users u ON u.id=c.author_id WHERE c.id=:id""",
        {"id": comment_id},
    )
    await sio.emit("comment:added", {"pinId": pin_id, "comment": comment},
                   room=f"project:{pin['project_id']}")
    return comment


# ---------------------------------------------------------------------------
# GET /api/projects/:id/comments  (field report feed)
# ---------------------------------------------------------------------------

@router.get("/api/projects/{project_id}/comments")
def project_comments(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid", {"pid": project_id})
    pin_ids = {p["id"] for p in pins}
    pin_map = {p["id"]: p for p in pins}
    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    sheet_map = {s["id"]: s for s in sheets}
    users = execute_query("SELECT * FROM users")
    user_map = {u["id"]: u for u in users}
    photos_all = execute_query("SELECT * FROM pin_photos WHERE pin_id IN (SELECT id FROM pins WHERE project_id=:pid)", {"pid": project_id})
    photo_map: dict = {}
    for ph in photos_all:
        photo_map.setdefault(ph["pin_id"], []).append(ph)

    comments = execute_query(
        "SELECT * FROM comments WHERE pin_id IN (SELECT id FROM pins WHERE project_id=:pid) ORDER BY created_at DESC",
        {"pid": project_id},
    )
    result = []
    for c in comments:
        if c["pin_id"] not in pin_ids:
            continue
        pin = pin_map.get(c["pin_id"], {})
        sheet = sheet_map.get(pin.get("sheet_id", ""), {})
        author = user_map.get(c.get("author_id", ""), {})
        result.append({
            "id": c["id"], "pin_id": c["pin_id"], "body": c["body"], "created_at": c["created_at"],
            "author_id": c.get("author_id"), "author_name": author.get("name") or c.get("author_name") or "Field Inspector",
            "author_avatar": author.get("avatar_url"), "author_role": author.get("role", "sub_contractor"),
            "author_company": author.get("company") or pin.get("assigned_to_company") or "Trade Partner",
            "pin_title": pin.get("title") or f"Issue #{pin.get('item_number','')}",
            "pin_item_number": pin.get("item_number"), "pin_status": pin.get("status", "open"),
            "pin_priority": pin.get("priority", "medium"), "pin_discipline": pin.get("discipline", "architectural"),
            "location": pin.get("room_location") or sheet.get("name") or "Site Location",
            "sheet_id": pin.get("sheet_id"), "sheet_number": sheet.get("sheet_number"), "sheet_name": sheet.get("name"),
            "photos": photo_map.get(c["pin_id"], []),
        })
    return result


# ---------------------------------------------------------------------------
# GET /api/projects/:id/photos
# ---------------------------------------------------------------------------

@router.get("/api/projects/{project_id}/photos")
def project_photos(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid", {"pid": project_id})
    pin_ids = {p["id"] for p in pins}
    pin_map = {p["id"]: p for p in pins}
    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    sheet_map = {s["id"]: s for s in sheets}
    comments_all = execute_query("SELECT * FROM comments WHERE pin_id IN (SELECT id FROM pins WHERE project_id=:pid)", {"pid": project_id})
    comments_map: dict = {}
    for c in comments_all:
        comments_map.setdefault(c["pin_id"], []).append(c)

    photos = execute_query(
        "SELECT * FROM pin_photos WHERE pin_id IN (SELECT id FROM pins WHERE project_id=:pid) ORDER BY created_at DESC",
        {"pid": project_id},
    )
    result = []
    for ph in photos:
        if ph["pin_id"] not in pin_ids:
            continue
        pin = pin_map.get(ph["pin_id"], {})
        sheet = sheet_map.get(pin.get("sheet_id", ""), {})
        pin_comments = sorted(comments_map.get(ph["pin_id"], []), key=lambda c: c.get("created_at", ""), reverse=True)
        latest = pin_comments[0] if pin_comments else None
        result.append({
            "id": ph["id"], "url": ph["url"],
            "caption": ph.get("caption") or (latest["body"] if latest else pin.get("title")),
            "comment_body": (latest["body"] if latest else ph.get("caption") or pin.get("description") or ""),
            "uploaded_by": ph.get("uploaded_by") or "Field Inspector",
            "created_at": ph["created_at"], "type": ph.get("type", "issue"),
            "pin_id": ph["pin_id"], "pin_title": pin.get("title"), "pin_item_number": pin.get("item_number"),
            "pin_status": pin.get("status"), "location": pin.get("room_location") or sheet.get("name") or "Site Location",
            "sheet_id": pin.get("sheet_id"), "sheet_number": sheet.get("sheet_number"), "sheet_name": sheet.get("name"),
        })
    return result


# ---------------------------------------------------------------------------
# GET /api/pins/:id/audit-logs
# ---------------------------------------------------------------------------

@router.get("/api/pins/{pin_id}/audit-logs")
def pin_audit_logs(pin_id: str, current_user: dict = Depends(get_current_user)):
    pin = execute_one("SELECT * FROM pins WHERE id=:id", {"id": pin_id})
    if not pin:
        raise HTTPException(404, "Pin not found")
    if not can_user_access_pin(current_user, pin):
        raise HTTPException(403, "Forbidden")
    return get_audit_logs(project_id=pin["project_id"], pin_id=pin_id)
