"""
routers/sheets.py — Blueprint sheet management:
  GET  /api/projects/:id/sheets
  GET  /api/sheets/:id
  GET  /api/sheets/:id/pdf
  GET  /api/sheets/:id/image
  POST /api/projects/:id/sheets/upload       (PDF multi-page)
  POST /api/projects/:id/blueprints/upload   (image: PNG/JPG/TIFF/WebP)
  GET  /api/sheets/:id/versions
  POST /api/sheets/:id/versions              (new revision upload)
  GET  /api/sheet-versions/:id/pdf
"""
import uuid
import os
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse, StreamingResponse

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, add_audit_log, settings
from ..permissions import can_user_access_project
from ..sio import sio
from ..config import settings as cfg

router = APIRouter(tags=["sheets"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

ALLOWED_IMAGE_TYPES = {"image/png", "image/jpeg", "image/jpg", "image/tiff", "image/webp"}


def _save_upload(file: UploadFile) -> tuple[str, str]:
    """Save uploaded file to uploads dir. Returns (absolute_path, filename)."""
    ext = Path(file.filename or "file").suffix
    filename = f"{int(datetime.now().timestamp()*1000)}-{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    content = file.file.read()
    dest.write_bytes(content)
    return str(dest), filename


def _get_pdf_page_count_and_dims(file_path: str) -> list[tuple[float, float]]:
    """Return list of (width, height) per page using pypdf."""
    try:
        from pypdf import PdfReader
        reader = PdfReader(file_path)
        dims = []
        for page in reader.pages:
            box = page.mediabox
            dims.append((float(box.width), float(box.height)))
        return dims
    except Exception:
        return [(1056.0, 816.0)]


# ---------------------------------------------------------------------------
# List / Get sheets
# ---------------------------------------------------------------------------

@router.get("/api/projects/{project_id}/sheets")
def list_sheets(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Access forbidden for this project")
    return execute_query(
        """SELECT s.*,
             (SELECT COUNT(*) FROM pins WHERE sheet_id=s.id) as pin_count,
             (SELECT COUNT(*) FROM pins WHERE sheet_id=s.id AND status IN ('open','assigned')) as open_pin_count
           FROM sheets s WHERE s.project_id=:pid ORDER BY s.sheet_number ASC, s.created_at ASC""",
        {"pid": project_id},
    )


@router.get("/api/sheets/{sheet_id}")
def get_sheet(sheet_id: str, current_user: dict = Depends(get_current_user)):
    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Access forbidden for sheet drawing")
    return sheet


# ---------------------------------------------------------------------------
# Serve PDF / Image files
# ---------------------------------------------------------------------------

@router.get("/api/sheets/{sheet_id}/pdf")
def serve_sheet_pdf(sheet_id: str, current_user: dict = Depends(get_current_user)):
    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Forbidden")
    fp = sheet.get("file_path")
    if fp and Path(fp).exists():
        return FileResponse(fp, media_type="application/pdf")
    raise HTTPException(404, "No uploaded PDF file attached to this sheet")


@router.get("/api/sheets/{sheet_id}/image")
def serve_sheet_image(sheet_id: str, current_user: dict = Depends(get_current_user)):
    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Forbidden")
    ip = sheet.get("image_path")
    if ip and Path(ip).exists():
        from fastapi.responses import FileResponse as FR
        return FR(ip, headers={"Cache-Control": "public, max-age=86400"})
    raise HTTPException(404, "No image file attached to this sheet.")


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _is_image(ct: Optional[str], filename: Optional[str]) -> bool:
    c = (ct or "").lower()
    ext = Path(filename or "").suffix.lower()
    return c in ALLOWED_IMAGE_TYPES or ext in {".png", ".jpg", ".jpeg", ".tiff", ".tif", ".webp"}


def _resolve_building_id(b_id: Optional[str], b_name: Optional[str]) -> Optional[str]:
    if b_id and b_id.strip():
        return b_id.strip().lower()
    if not b_name or not b_name.strip():
        return None
    name = b_name.strip().lower()
    if "ilsb" in name or "interdisciplinary" in name:
        return "ilsb"
    if "sondheim" in name:
        return "sondheim-hall"
    if "chemistry" in name or "meyerhoff" in name:
        return "chemistry"
    if "ite" in name or "information technology" in name:
        return "ite"
    if "engineering" in name:
        return "engineering"
    if "fine arts" in name:
        return "fine-arts"
    if "administration" in name:
        return "administration"
    if "academic iv" in name:
        return "academic-iv"
    if "academic services" in name:
        return "academic-services"
    if "biological" in name:
        return "biological-sciences"
    if "library" in name or "albin" in name:
        return "albin-o-kuhn-library"
    if "physics" in name:
        return "physics"
    if "math" in name or "psychology" in name:
        return "math-psychology"
    if "public policy" in name:
        return "public-policy"
    if "sherman" in name:
        return "sherman-hall"
    if "commons" in name:
        return "the-commons"
    import re
    return re.sub(r'[^a-z0-9]+', '-', name).strip('-')


# ---------------------------------------------------------------------------
# Upload PDF drawing set (multi-page)
# ---------------------------------------------------------------------------

@router.post("/api/projects/{project_id}/sheets/upload", status_code=201)
async def upload_pdf_sheets(
    project_id: str,
    pdf: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    discipline: str = Form("architectural"),
    sheetPrefix: str = Form("A"),
    revision: str = Form("Rev 1"),
    buildingId: Optional[str] = Form(None),
    buildingName: str = Form(""),
    floorLevel: str = Form(""),
    name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    upload_file = pdf or file
    if not upload_file:
        raise HTTPException(400, "No file provided for upload.")
    if current_user.get("role") not in ("admin", "general_contractor", "power_collaborator"):
        raise HTTPException(403, "Only Admins, General Contractors, and Power Collaborators can upload drawings")
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Access forbidden for this project.")

    resolved_bld_id = _resolve_building_id(buildingId, buildingName)
    file_path, filename = _save_upload(upload_file)
    base_name = name or Path(upload_file.filename or "Drawing Set").stem
    page_dims = _get_pdf_page_count_and_dims(file_path)
    page_count = len(page_dims)

    created_sheets = []
    now = datetime.now(timezone.utc).isoformat()
    execute_write(
        """INSERT INTO projects (id, name, status, created_at)
           VALUES (:pid, :name, 'active', :now)
           ON CONFLICT (id) DO NOTHING""",
        {"pid": project_id, "name": buildingName or "Project", "now": now}
    )

    for i, (w, h) in enumerate(page_dims):
        sheet_id = f"sht-{uuid.uuid4().hex[:8]}"
        sheet_num = f"{sheetPrefix}-101" if page_count == 1 else f"{sheetPrefix}-{100 + i + 1}"
        sheet_title = base_name if page_count == 1 else f"{base_name} (Sheet {i+1} of {page_count})"
        if buildingName and buildingName not in sheet_title:
            sheet_title = f"{sheet_title} — {buildingName}"
        if floorLevel and floorLevel not in sheet_title:
            sheet_title = f"{sheet_title} — {floorLevel}"

        execute_write(
            """INSERT INTO sheets (id,project_id,sheet_number,name,discipline,version,file_path,file_name,
               page_index,page_count,width_pts,height_pts,scale_ratio,building_id,building_name,floor_level,
               uploaded_by,created_at,updated_at)
               VALUES (:id,:pid,:num,:title,:disc,:rev,:fp,:fn,:pi,:pc,:w,:h,'1/4\" = 1''-0\"',:bid,:bld,:fl,:uid,:now,:now)""",
            dict(id=sheet_id, pid=project_id, num=sheet_num, title=sheet_title, disc=discipline, rev=revision,
                 fp=file_path, fn=filename, pi=i, pc=page_count, w=int(w), h=int(h),
                 bid=resolved_bld_id, bld=buildingName, fl=floorLevel, uid=current_user.get("id"), now=now),
        )
        sheet_rec = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
        created_sheets.append(sheet_rec or {
            "id": sheet_id, "project_id": project_id, "sheet_number": sheet_num,
            "name": sheet_title, "discipline": discipline, "page_index": i,
            "page_count": page_count, "width_pts": int(w), "height_pts": int(h),
            "building_id": resolved_bld_id, "building_name": buildingName, "floor_level": floorLevel,
            "file_name": filename, "version": revision
        })

    add_audit_log("SHEETS_UPLOADED", project_id=project_id, user_id=current_user.get("id"),
                  user_name=current_user.get("name"), user_role=current_user.get("role"),
                  user_company=current_user.get("company"),
                  new_value=f"{len(created_sheets)} sheets",
                  details=f"PDF drawing set \"{upload_file.filename}\" uploaded ({len(created_sheets)} sheets created)")
    await sio.emit("sheets:uploaded", {"projectId": project_id, "sheets": created_sheets},
                   room=f"project:{project_id}")
    return {"count": len(created_sheets), "sheets": created_sheets}


# ---------------------------------------------------------------------------
# Upload image blueprint (PNG/JPG/TIFF/WebP)
# ---------------------------------------------------------------------------

@router.post("/api/projects/{project_id}/blueprints/upload", status_code=201)
async def upload_image_blueprint(
    project_id: str,
    image: Optional[UploadFile] = File(None),
    file: Optional[UploadFile] = File(None),
    discipline: str = Form("architectural"),
    sheetPrefix: str = Form("A"),
    revision: str = Form("Rev 1"),
    buildingId: Optional[str] = Form(None),
    buildingName: str = Form(""),
    floorLevel: str = Form(""),
    name: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    upload_file = image or file
    if not upload_file:
        raise HTTPException(400, "No image file provided for upload.")
    if current_user.get("role") not in ("admin", "general_contractor", "power_collaborator"):
        raise HTTPException(403, "Only Admins, General Contractors, and Power Collaborators can upload blueprints.")
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Access forbidden for this project.")
    if not _is_image(upload_file.content_type, upload_file.filename):
        raise HTTPException(415, f"Unsupported image type: {upload_file.content_type}. Use PNG, JPEG, TIFF, or WebP.")

    resolved_bld_id = _resolve_building_id(buildingId, buildingName)
    file_path, filename = _save_upload(upload_file)
    base_name = name or Path(upload_file.filename or "Blueprint").stem
    existing_count = len(execute_query("SELECT id FROM sheets WHERE project_id=:pid", {"pid": project_id}))
    sheet_num = f"{sheetPrefix}-{100 + existing_count + 1}"
    name_parts = [base_name]
    if buildingName:
        name_parts.append(buildingName)
    if floorLevel:
        name_parts.append(floorLevel)
    sheet_name = " — ".join(name_parts)
    sheet_id = f"sht-{uuid.uuid4().hex[:8]}"
    image_url = f"/uploads/{filename}"
    now = datetime.now(timezone.utc).isoformat()
    execute_write(
        """INSERT INTO projects (id, name, status, created_at)
           VALUES (:pid, :name, 'active', :now)
           ON CONFLICT (id) DO NOTHING""",
        {"pid": project_id, "name": buildingName or "Project", "now": now}
    )

    execute_write(
        """INSERT INTO sheets (id,project_id,sheet_number,name,discipline,version,file_path,image_path,image_url,
           file_name,page_index,page_count,width_pts,height_pts,scale_ratio,building_id,building_name,floor_level,
           uploaded_by,created_at,updated_at)
           VALUES (:id,:pid,:num,:name,:disc,:rev,NULL,:ip,:iu,:fn,0,1,1056,816,'1/4\" = 1''-0\"',:bid,:bld,:fl,:uid,:now,:now)""",
        dict(id=sheet_id, pid=project_id, num=sheet_num, name=sheet_name, disc=discipline, rev=revision,
             ip=file_path, iu=image_url, fn=upload_file.filename, bid=resolved_bld_id, bld=buildingName, fl=floorLevel,
             uid=current_user.get("id"), now=now),
    )

    add_audit_log("BLUEPRINT_UPLOADED", project_id=project_id, user_id=current_user.get("id"),
                  user_name=current_user.get("name"), user_role=current_user.get("role"),
                  user_company=current_user.get("company"),
                  new_value=sheet_num, details=f"Image blueprint \"{upload_file.filename}\" uploaded")

    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    await sio.emit("sheets:uploaded", {"projectId": project_id, "sheets": [sheet]},
                   room=f"project:{project_id}")
    return {"count": 1, "sheets": [sheet]}


# ---------------------------------------------------------------------------
# Sheet version history
# ---------------------------------------------------------------------------

@router.get("/api/sheets/{sheet_id}/versions")
def get_versions(sheet_id: str, current_user: dict = Depends(get_current_user)):
    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Forbidden")

    past = execute_query(
        "SELECT * FROM sheet_versions WHERE sheet_id=:sid ORDER BY created_at DESC",
        {"sid": sheet_id},
    )
    current_version = {
        "id": f"curr-{sheet['id']}",
        "sheet_id": sheet["id"],
        "project_id": sheet["project_id"],
        "version": sheet.get("version", "Rev 1"),
        "file_name": sheet.get("file_name", "Current Active Blueprint"),
        "file_path": sheet.get("file_path"),
        "image_path": sheet.get("image_path"),
        "image_url": sheet.get("image_url"),
        "created_at": sheet.get("updated_at") or sheet.get("created_at"),
        "uploaded_by": sheet.get("uploaded_by"),
        "change_notes": sheet.get("change_notes", "Current active blueprint on site"),
        "is_current": True,
    }
    return {
        "sheet_id": sheet["id"],
        "sheet_number": sheet["sheet_number"],
        "sheet_name": sheet["name"],
        "current_version": current_version,
        "versions": [current_version] + [{**v, "is_current": False} for v in past],
    }


@router.post("/api/sheets/{sheet_id}/versions", status_code=200)
async def upload_revision(
    sheet_id: str,
    file: UploadFile = File(...),
    version: Optional[str] = Form(None),
    changeNotes: Optional[str] = Form(None),
    buildingName: Optional[str] = Form(None),
    floorLevel: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    if current_user.get("role") not in ("admin", "general_contractor", "power_collaborator"):
        raise HTTPException(403, "Only Admins and General Contractors can upload blueprint revisions.")

    sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    if not can_user_access_project(current_user, sheet["project_id"]):
        raise HTTPException(403, "Access forbidden for this project")
    if not file:
        raise HTTPException(400, "No blueprint revision file uploaded.")

    past_count = len(execute_query("SELECT id FROM sheet_versions WHERE sheet_id=:sid", {"sid": sheet_id}))
    new_version = (version or "").strip() or f"Rev {past_count + 2}"
    change_notes = (changeNotes or "").strip() or "Latest revision uploaded"
    is_pdf = (file.content_type or "").lower() == "application/pdf"
    now = datetime.now(timezone.utc).isoformat()

    # Archive current sheet as a historical version
    sv_id = f"sv-{uuid.uuid4().hex[:8]}"
    execute_write(
        """INSERT INTO sheet_versions (id,sheet_id,project_id,version_number,version,file_path,image_path,image_url,
           file_name,uploaded_by,change_notes,is_current,created_at)
           VALUES (:id,:sid,:pid,:vnum,:v,:fp,:ip,:iu,:fn,:by,:notes,0,:now)""",
        dict(id=sv_id, sid=sheet_id, pid=sheet.get("project_id"),
             vnum=past_count + 1, v=sheet.get("version", "Rev 1"),
             fp=sheet.get("file_path"), ip=sheet.get("image_path"), iu=sheet.get("image_url"),
             fn=sheet.get("file_name", "Previous Blueprint"),
             by=sheet.get("uploaded_by"), notes=sheet.get("change_notes", "Superseded"), now=now),
    )

    file_path, filename = _save_upload(file)
    updates: dict = {"version": new_version, "change_notes": change_notes,
                     "file_name": file.filename, "updated_at": now, "uploaded_by": current_user.get("id")}
    if is_pdf:
        dims = _get_pdf_page_count_and_dims(file_path)
        updates.update({"file_path": file_path, "image_path": None, "image_url": None,
                         "width_pts": int(dims[0][0]), "height_pts": int(dims[0][1])})
    else:
        updates.update({"file_path": None, "image_path": file_path, "image_url": f"/uploads/{filename}"})

    if buildingName:
        updates["building_name"] = buildingName
    if floorLevel:
        updates["floor_level"] = floorLevel

    sets = ", ".join(f"{k}=:{k}" for k in updates)
    execute_write(f"UPDATE sheets SET {sets} WHERE id=:sheet_id",
                  {**updates, "sheet_id": sheet_id})

    old_version = sheet.get("version", "Rev 1")
    add_audit_log("BLUEPRINT_VERSION_UPLOADED", project_id=sheet["project_id"],
                  user_id=current_user.get("id"), user_name=current_user.get("name"),
                  user_role=current_user.get("role"), user_company=current_user.get("company"),
                  old_value=old_version, new_value=new_version,
                  details=f"Uploaded revision \"{new_version}\" for {sheet['sheet_number']}: {change_notes}")

    updated_sheet = execute_one("SELECT * FROM sheets WHERE id=:id", {"id": sheet_id})
    await sio.emit("sheet:updated", updated_sheet, room=f"project:{sheet['project_id']}")
    await sio.emit("sheet:version_uploaded",
                   {"sheetId": sheet_id, "version": new_version, "sheet": updated_sheet},
                   room=f"project:{sheet['project_id']}")

    archived = execute_one("SELECT * FROM sheet_versions WHERE id=:id", {"id": sv_id})
    return {
        "success": True,
        "message": f"Latest version \"{new_version}\" successfully uploaded for sheet {sheet['sheet_number']}.",
        "sheet": updated_sheet,
        "archivedVersion": archived,
    }


@router.get("/api/sheet-versions/{version_id}/pdf")
def serve_version_pdf(version_id: str, current_user: dict = Depends(get_current_user)):
    version = execute_one("SELECT * FROM sheet_versions WHERE id=:id", {"id": version_id})
    if not version:
        raise HTTPException(404, "Version record not found")
    if not can_user_access_project(current_user, version.get("project_id", "")):
        raise HTTPException(403, "Forbidden")
    fp = version.get("file_path")
    if fp and Path(fp).exists():
        return FileResponse(fp, media_type="application/pdf")
    raise HTTPException(404, "No PDF file attached to this historical version")
