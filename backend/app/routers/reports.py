"""
routers/reports.py — PDF and CSV export endpoints.

Routes
------
GET /api/projects/{pid}/reports/pdf   — Generate and download annotated punch report PDF
GET /api/projects/{pid}/reports/csv   — Generate and download CSV punch list spreadsheet

Both endpoints delegate to services/report_service.py for ReportLab / CSV generation.
"""

from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
import io, csv

from app.database import get_db
from app.permissions import require_capability
from app.models.pin import Pin

router = APIRouter(prefix="/projects", tags=["reports"])


@router.get("/{project_id}/reports/csv")
def export_csv(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("report.export")),
):
    """Export all punch pins for a project as a CSV spreadsheet."""
    pins = db.query(Pin).filter(Pin.project_id == project_id).all()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["ID", "Title", "Status", "Priority", "Pin Type", "X%", "Y%", "Created At"])
    for pin in pins:
        writer.writerow([
            pin.id, pin.title, pin.status, pin.priority,
            pin.pin_type, f"{pin.x_pct:.2f}", f"{pin.y_pct:.2f}",
            pin.created_at.isoformat(),
        ])
    output.seek(0)

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename=project_{project_id}_punchlist.csv"},
    )


@router.get("/{project_id}/reports/pdf")
def export_pdf(
    project_id: int,
    db:         Session = Depends(get_db),
    user      = Depends(require_capability("report.export")),
):
    """
    Generate a formal punch list PDF with embedded pin table.
    TODO: wire up services/report_service.py for full ReportLab layout
    (header, logo, pin table, photo thumbnails, signature block).
    """
    from app.services.report_service import generate_punch_report_pdf
    pdf_bytes = generate_punch_report_pdf(project_id, db)

    return StreamingResponse(
        io.BytesIO(pdf_bytes),
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename=project_{project_id}_report.pdf"},
    )
