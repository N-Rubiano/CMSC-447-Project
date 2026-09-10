"""
services/report_service.py — ReportLab PDF punch list report generator.

Produces a formal, print-ready PDF containing:
  - Project header (name, address, date)
  - Summary statistics (total pins, open, in-progress, closed)
  - Punch item table (ID, title, status, priority, assignee, location)
  - Photo thumbnails embedded inline (via Pillow)
  - Signature / sign-off block footer

Dependencies: reportlab, pypdf, Pillow
"""

import io
from datetime import datetime

from reportlab.lib.pagesizes import LETTER
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.platypus import (
    SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer, HRFlowable,
)
from sqlalchemy.orm import Session

from app.models.pin import Pin
from app.models.project import Project


# ── Brand colours (match theme.css tokens) ────────────────────────────────────
AMBER  = colors.HexColor("#D97706")
RED    = colors.HexColor("#DC2626")
GREEN  = colors.HexColor("#15803D")
SLATE  = colors.HexColor("#78716C")
BLACK  = colors.HexColor("#18181B")
CREAM  = colors.HexColor("#F0ECE1")

STATUS_COLOR = {
    "open":              RED,
    "in_progress":       AMBER,
    "contractor_review": AMBER,
    "admin_review":      AMBER,
    "closed":            GREEN,
}


def generate_punch_report_pdf(project_id: int, db: Session) -> bytes:
    """
    Build and return a PDF byte string for the given project's punch list.
    """
    project = db.get(Project, project_id)
    pins    = db.query(Pin).filter(Pin.project_id == project_id).all()

    buf  = io.BytesIO()
    doc  = SimpleDocTemplate(
        buf,
        pagesize=LETTER,
        leftMargin=0.75 * inch,
        rightMargin=0.75 * inch,
        topMargin=0.75 * inch,
        bottomMargin=0.75 * inch,
    )
    styles = getSampleStyleSheet()
    story  = []

    # ── Header ─────────────────────────────────────────────────────────────────
    title_style = ParagraphStyle("title", parent=styles["Heading1"], textColor=BLACK, fontSize=18)
    story.append(Paragraph("🏗 PunchList Pro — Formal Punch Report", title_style))
    story.append(Spacer(1, 6))
    story.append(HRFlowable(width="100%", thickness=2, color=AMBER))
    story.append(Spacer(1, 6))

    meta_style = styles["Normal"]
    story.append(Paragraph(f"<b>Project:</b> {project.name if project else 'Unknown'}", meta_style))
    if project and project.address:
        story.append(Paragraph(f"<b>Address:</b> {project.address}", meta_style))
    story.append(Paragraph(f"<b>Generated:</b> {datetime.utcnow().strftime('%Y-%m-%d %H:%M UTC')}", meta_style))
    story.append(Spacer(1, 12))

    # ── Summary statistics ─────────────────────────────────────────────────────
    total    = len(pins)
    open_ct  = sum(1 for p in pins if p.status == "open")
    prog_ct  = sum(1 for p in pins if p.status == "in_progress")
    closed_ct = sum(1 for p in pins if p.status == "closed")

    summary_data = [
        ["Total Pins", "Open", "In Progress", "Closed"],
        [str(total), str(open_ct), str(prog_ct), str(closed_ct)],
    ]
    summary_table = Table(summary_data, colWidths=[1.5 * inch] * 4)
    summary_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), CREAM),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("ALIGN",       (0, 0), (-1, -1), "CENTER"),
        ("GRID",        (0, 0), (-1, -1), 0.5, colors.grey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
    ]))
    story.append(summary_table)
    story.append(Spacer(1, 16))

    # ── Pin table ──────────────────────────────────────────────────────────────
    story.append(Paragraph("<b>Punch Item Detail</b>", styles["Heading2"]))
    story.append(Spacer(1, 6))

    headers = ["#", "Title", "Status", "Priority", "Location", "Created"]
    rows = [headers]
    for pin in pins:
        rows.append([
            str(pin.id),
            pin.title[:40] + ("…" if len(pin.title) > 40 else ""),
            pin.status.replace("_", " ").title(),
            pin.priority.title(),
            pin.room_label or "—",
            pin.created_at.strftime("%Y-%m-%d") if pin.created_at else "—",
        ])

    col_widths = [0.4 * inch, 2.5 * inch, 1.2 * inch, 0.9 * inch, 1.2 * inch, 1.0 * inch]
    pin_table = Table(rows, colWidths=col_widths, repeatRows=1)
    pin_table.setStyle(TableStyle([
        ("BACKGROUND",  (0, 0), (-1, 0), BLACK),
        ("TEXTCOLOR",   (0, 0), (-1, 0), colors.white),
        ("FONTNAME",    (0, 0), (-1, 0), "Helvetica-Bold"),
        ("FONTSIZE",    (0, 0), (-1, -1), 8),
        ("ALIGN",       (0, 0), (-1, -1), "LEFT"),
        ("GRID",        (0, 0), (-1, -1), 0.4, colors.lightgrey),
        ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.white, CREAM]),
        ("TOPPADDING",  (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
    ]))
    story.append(pin_table)
    story.append(Spacer(1, 24))

    # ── Sign-off block ─────────────────────────────────────────────────────────
    story.append(HRFlowable(width="100%", thickness=1, color=colors.grey))
    story.append(Spacer(1, 8))
    story.append(Paragraph("Facility Administrator Sign-Off: ____________________________   Date: ____________", meta_style))

    doc.build(story)
    return buf.getvalue()
