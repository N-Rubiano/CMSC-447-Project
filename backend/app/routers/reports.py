"""
routers/reports.py — Export & reporting endpoints:
  GET /api/projects/:id/export/annotated-pdf
  GET /api/projects/:id/export/punch-report
  GET /api/projects/:id/export/excel
  GET /api/projects/:id/export/csv
"""
from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi.responses import Response
from typing import Optional

from ..auth import get_current_user
from ..database import execute_query, execute_one, get_audit_logs, add_audit_log
from ..permissions import can_user_access_project, can_user_access_pin, has_permission
from ..services.export import (
    generate_annotated_pdf,
    generate_punch_list_report,
    generate_punch_list_csv,
    generate_project_excel,
)

router = APIRouter(tags=["reports"])


def _require_export_access(current_user: dict, project_id: str) -> dict:
    if not has_permission(current_user, "report.export"):
        raise HTTPException(403, "Your role does not have permission to export project reports")
    if not can_user_access_project(current_user, project_id):
        raise HTTPException(403, "Forbidden")
    project = execute_one("SELECT * FROM projects WHERE id=:id", {"id": project_id})
    if not project:
        raise HTTPException(404, "Project not found")
    return project


@router.get("/api/projects/{project_id}/export/annotated-pdf")
async def export_annotated_pdf(
    project_id: str,
    sheetId: Optional[str] = Query(None),
    current_user: dict = Depends(get_current_user),
):
    project = _require_export_access(current_user, project_id)

    if sheetId:
        sheets = execute_query("SELECT * FROM sheets WHERE CAST(id AS TEXT)=:id", {"id": sheetId})
    else:
        sheets = execute_query("SELECT * FROM sheets WHERE CAST(project_id AS TEXT)=:pid ORDER BY sheet_number ASC", {"pid": project_id})

    pins = execute_query("SELECT * FROM pins WHERE CAST(project_id AS TEXT)=:pid", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    markups = execute_query(
        "SELECT m.* FROM markups m JOIN sheets s ON CAST(s.id AS TEXT)=CAST(m.sheet_id AS TEXT) WHERE CAST(s.project_id AS TEXT)=:pid",
        {"pid": project_id},
    )

    pdf_bytes = generate_annotated_pdf(project, sheets, pins, markups)
    filename = f"{project.get('code', 'PRJ')}_Annotated_PlanSet.pdf"
    add_audit_log(
        "EXPORT_ANNOTATED_PDF",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        project_id=project_id,
        details=f"Exported annotated drawing set PDF ({filename}).",
    )
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
    project = _require_export_access(current_user, project_id)

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    audit_logs = get_audit_logs(project_id=project_id)

    pdf_bytes = generate_punch_list_report(project, pins, sheets, audit_logs)
    filename = f"{project.get('code', 'PRJ')}_PunchList_Report.pdf"
    add_audit_log(
        "EXPORT_PUNCH_REPORT",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        project_id=project_id,
        details=f"Exported formal punch list PDF report ({filename}).",
    )
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/projects/{project_id}/export/excel")
def export_excel(project_id: str, current_user: dict = Depends(get_current_user)):
    project = _require_export_access(current_user, project_id)

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    members = execute_query(
        """SELECT u.id, u.name, u.email, u.role, u.company, u.company_id
           FROM users u
           JOIN project_members pm ON CAST(pm.user_id AS TEXT)=CAST(u.id AS TEXT)
           WHERE CAST(pm.project_id AS TEXT)=:pid""",
        {"pid": project_id},
    )
    xlsx_bytes = generate_project_excel(project, pins, sheets, members)
    filename = f"{project.get('code', 'PRJ')}_Project_Report.xlsx"
    add_audit_log(
        "EXPORT_EXCEL",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        project_id=project_id,
        details=f"Exported Excel project report ({filename}).",
    )
    return Response(
        content=xlsx_bytes,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/api/projects/{project_id}/export/csv")
def export_csv(project_id: str, current_user: dict = Depends(get_current_user)):
    project = _require_export_access(current_user, project_id)

    pins = execute_query("SELECT * FROM pins WHERE project_id=:pid ORDER BY item_number ASC", {"pid": project_id})
    if current_user.get("role") != "admin":
        pins = [p for p in pins if can_user_access_pin(current_user, p)]

    sheets = execute_query("SELECT * FROM sheets WHERE project_id=:pid", {"pid": project_id})
    csv_content = generate_punch_list_csv(pins, sheets)
    filename = f"{project.get('code', 'PRJ')}_PunchList.csv"
    add_audit_log(
        "EXPORT_CSV",
        user_id=current_user.get("id"),
        user_name=current_user.get("name"),
        user_role=current_user.get("role"),
        project_id=project_id,
        details=f"Exported CSV punch list ({filename}).",
    )
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
