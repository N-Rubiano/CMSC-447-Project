"""
routers/sheets.py — Blueprint sheet upload and management.

Routes
------
GET    /api/projects/{pid}/sheets         — List sheets for a project
POST   /api/projects/{pid}/sheets         — Upload a new blueprint PDF (admin | gc)
GET    /api/sheets/{sheet_id}             — Get sheet metadata
DELETE /api/sheets/{sheet_id}             — Delete a sheet (admin | gc)
"""

import os, uuid
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.config import settings
from app.permissions import require_capability
from app.models.sheet import Sheet

router = APIRouter(tags=["sheets"])


@router.get("/projects/{project_id}/sheets")
def list_sheets(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("sheet.view")),
):
    return db.query(Sheet).filter(Sheet.project_id == project_id).all()


@router.post("/projects/{project_id}/sheets", status_code=status.HTTP_201_CREATED)
async def upload_sheet(
    project_id: int,
    name:       str,
    version:    str = "A",
    file:       UploadFile = File(...),
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("sheet.manage")),
):
    """Accept a PDF blueprint upload and store it in the uploads directory."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    # Build a unique filename
    ext  = os.path.splitext(file.filename)[1]
    fname = f"sheet_{uuid.uuid4().hex}{ext}"
    dest  = os.path.join(settings.upload_dir, "sheets", fname)
    os.makedirs(os.path.dirname(dest), exist_ok=True)

    contents = await file.read()
    with open(dest, "wb") as f:
        f.write(contents)

    sheet = Sheet(
        project_id=project_id,
        name=name,
        version=version,
        pdf_path=f"sheets/{fname}",
    )
    db.add(sheet)
    db.commit()
    db.refresh(sheet)
    return sheet


@router.get("/sheets/{sheet_id}")
def get_sheet(
    sheet_id: int,
    db:       Session = Depends(get_db),
    user    = Depends(require_capability("sheet.view")),
):
    sheet = db.get(Sheet, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    return sheet


@router.delete("/sheets/{sheet_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_sheet(
    sheet_id: int,
    db:       Session = Depends(get_db),
    user    = Depends(require_capability("sheet.manage")),
):
    sheet = db.get(Sheet, sheet_id)
    if not sheet:
        raise HTTPException(status_code=404, detail="Sheet not found.")
    db.delete(sheet)
    db.commit()
