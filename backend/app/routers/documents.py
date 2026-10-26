"""
routers/documents.py — Construction Document Management & Database Storage
  GET    /api/documents            (List project documents from DB)
  POST   /api/documents/upload     (Upload file, save to /uploads, record in DB)
  DELETE /api/documents/:id        (Delete document from DB and disk)
  GET    /api/documents/:id/file   (Download or view document file)
"""
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from fastapi.responses import FileResponse

from ..auth import get_current_user
from ..database import execute_query, execute_one, execute_write, add_audit_log
from ..sio import sio

router = APIRouter(tags=["documents"])

UPLOADS_DIR = Path(__file__).parent.parent.parent / "uploads"
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)


def _format_file_size(size_bytes: int) -> str:
    if not size_bytes:
        return "0 B"
    for unit in ["B", "KB", "MB", "GB"]:
        if size_bytes < 1024:
            return f"{size_bytes:.1f} {unit}" if unit != "B" else f"{size_bytes} B"
        size_bytes /= 1024
    return f"{size_bytes:.1f} TB"


@router.get("/api/documents")
def list_documents(
    project_id: Optional[str] = None,
    category: Optional[str] = None,
    current_user: dict = Depends(get_current_user),
):
    """Fetch all construction documents stored in the database."""
    conditions = []
    params = {}

    if project_id:
        conditions.append("(project_id=:pid OR project_id IS NULL)")
        params["pid"] = project_id
    if category and category.lower() != "all":
        conditions.append("LOWER(category) = LOWER(:cat)")
        params["cat"] = category

    where_clause = ("WHERE " + " AND ".join(conditions)) if conditions else ""
    sql = f"SELECT * FROM documents {where_clause} ORDER BY created_at DESC"
    docs = execute_query(sql, params)

    # Enhance with formatted size
    for doc in docs:
        doc["sizeFormatted"] = _format_file_size(doc.get("file_size_bytes") or 0)
        doc["url"] = doc.get("file_url") or f"/uploads/{doc.get('file_name')}"

    return docs


@router.post("/api/documents/upload", status_code=201)
async def upload_document(
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    category: str = Form("General"),
    project_id: Optional[str] = Form(None),
    current_user: dict = Depends(get_current_user),
):
    """Store an uploaded document file on disk and persist its metadata in the PostgreSQL database."""
    if not file:
        raise HTTPException(400, "No file provided for upload.")

    ext = Path(file.filename or "doc").suffix
    safe_name = name or Path(file.filename or "Document").stem
    filename = f"doc-{int(datetime.now().timestamp()*1000)}-{uuid.uuid4().hex[:6]}{ext}"
    dest = UPLOADS_DIR / filename

    content = await file.read()
    file_size = len(content)
    dest.write_bytes(content)

    doc_id = f"doc-{uuid.uuid4().hex[:8]}"
    file_url = f"/uploads/{filename}"
    now = datetime.now(timezone.utc).isoformat()
    uploader_name = current_user.get("name") or "User"
    uploader_id = current_user.get("id")

    sql = """
        INSERT INTO documents (
            id, project_id, name, file_name, file_path, file_url,
            file_size_bytes, file_type, category, uploaded_by, uploaded_by_id, created_at
        ) VALUES (
            :id, :pid, :name, :fname, :fpath, :furl,
            :size, :ftype, :cat, :up_by, :up_id, :now
        )
    """
    execute_write(sql, {
        "id": doc_id,
        "pid": project_id,
        "name": safe_name,
        "fname": filename,
        "fpath": str(dest),
        "furl": file_url,
        "size": file_size,
        "ftype": file.content_type or ext.replace(".", "").upper(),
        "cat": category,
        "up_by": uploader_name,
        "up_id": uploader_id,
        "now": now
    })

    # Log to audit_logs table
    add_audit_log(
        action="DOCUMENT_UPLOADED",
        project_id=project_id,
        user_id=uploader_id,
        user_name=uploader_name,
        user_role=current_user.get("role", "admin"),
        user_company=current_user.get("company"),
        new_value=safe_name,
        details=f"Document \"{safe_name}\" ({category}) uploaded to database",
    )

    created_doc = execute_one("SELECT * FROM documents WHERE id=:id", {"id": doc_id})
    if created_doc:
        created_doc["sizeFormatted"] = _format_file_size(file_size)
        created_doc["url"] = file_url

    # Broadcast via WebSocket
    await sio.emit("document:created", created_doc)

    return created_doc


@router.delete("/api/documents/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a document record from the database and remove file from disk."""
    doc = execute_one("SELECT * FROM documents WHERE id=:id", {"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")

    fp = doc.get("file_path")
    if fp and Path(fp).exists():
        try:
            Path(fp).unlink(missing_ok=True)
        except Exception:
            pass

    execute_write("DELETE FROM documents WHERE id=:id", {"id": doc_id})

    add_audit_log(
        action="DOCUMENT_DELETED",
        project_id=doc.get("project_id"),
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        details=f"Document \"{doc.get('name')}\" was deleted",
    )

    await sio.emit("document:deleted", {"id": doc_id})
    return {"message": "Document deleted successfully", "id": doc_id}


@router.get("/api/documents/{doc_id}/file")
def download_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user),
):
    doc = execute_one("SELECT * FROM documents WHERE id=:id", {"id": doc_id})
    if not doc:
        raise HTTPException(404, "Document not found")
    fp = doc.get("file_path")
    if not fp or not Path(fp).exists():
        raise HTTPException(404, "Document file not found on server")
    return FileResponse(fp, filename=doc.get("file_name") or "document")
