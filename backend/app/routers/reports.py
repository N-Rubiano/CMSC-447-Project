"""
routers/reports.py — Export & reporting endpoints:
  GET /api/projects/:id/export/annotated-pdf
  GET /api/projects/:id/export/punch-report
  GET /api/projects/:id/export/csv
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional

from ..auth import get_current_user
from ..database import execute_query, execute_one, get_audit_logs
from ..permissions import can_user_access_project, can_user_access_pin
from ..services.export import generate_annotated_pdf, generate_punch_list_report, generate_punch_list_csv

router = APIRouter(tags=["reports"])


@router.get("/api/projects/{project_id}/export/annotated-pdf")
async def export_annotated_pdf(
    project_id: str,
    sheetId: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")

    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    if sheetId:
        sheets = execute_query("SELECT * FROM sheets WHERE id=:id", {"id": sheetId})
    else:
        sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid ORDER BY sheet_number ASC", {"pid": project_id})

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    markups = execute_query(
        "SELECT m.* FROM markups m JOIN sheets s ON s.id=m.sheet_id WHERE s.project_id=:pid",
        {"pid": project_id},
    )

    pdf_bytes = generate_annotated_pdf(project, sheets, pins, markups)
    filename = f"{project.get('code', 'PRJ')}_Annotated_PlanSet.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/projects/{project_id}/export/punch-report")
async def export_punch_report(
    project_id: str,
    current_user: dict = Depends(get_current_user),
):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")

    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    audit_logs = get_audit_logs(project_id=project_id)

    pdf_bytes = generate_punch_list_report(project, pins, sheets, audit_logs)
    filename = f"{project.get('code', 'PRJ')}_PunchList_Report.pdf"
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/projects/{project_id}/export/csv")
def export_csv(project_id: str, current_user: dict = Depends(get_current_user)):
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")

    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    csv_content = generate_punch_list_csv(pins, sheets)
    filename = f"{project.get('code', 'PRJ')}_PunchList.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
