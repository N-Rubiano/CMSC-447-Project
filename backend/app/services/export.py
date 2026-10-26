"""
services/export.py — PDF and CSV export services.

Replaces Node.js exportService.js (pdfkit / pdf-lib).
Uses reportlab for punch list report PDF generation and pypdf for annotated plan sets.
"""
import csv
import io
import json
from datetime import datetime
from pathlib import Path

# ---------------------------------------------------------------------------
# Status helpers
# ---------------------------------------------------------------------------

STATUS_COLORS_RGB = {
    "open":                           (0.86, 0.15, 0.15),
    "assigned":                       (0.92, 0.40, 0.13),
    "in_progress":                    (0.14, 0.54, 0.85),
    "submitted_for_contractor_review":(0.85, 0.47, 0.02),
    "submitted_for_admin_review":     (0.55, 0.23, 0.74),
    "closed":                         (0.08, 0.50, 0.24),
    "rejected":                       (0.47, 0.44, 0.42),
    # v2 statuses
    "Pending":                        (0.92, 0.40, 0.13),
    "Open":                           (0.14, 0.54, 0.85),
    "Closed":                         (0.08, 0.50, 0.24),
}


def format_status_label(st: str) -> str:
    return {
        "open": "OPEN", "assigned": "ASSIGNED", "in_progress": "IN PROGRESS",
        "submitted_for_contractor_review": "GC REVIEW",
        "submitted_for_admin_review": "ADMIN REVIEW",
        "closed": "CLOSED", "Pending": "PENDING", "Open": "OPEN", "Closed": "CLOSED",
    }.get(st, (st or "OPEN").upper())


# ---------------------------------------------------------------------------
# Annotated Plan Set PDF (embed uploaded PDFs + draw pin circles)
# ---------------------------------------------------------------------------

def generate_annotated_pdf(project: dict, sheets: list, pins: list, markups: list) -> bytes:
    """
    Merges uploaded PDF sheets (if present) and draws pin position markers.
    Falls back to generating a blank CAD-style sheet page per sheet.
    Returns raw PDF bytes.
    """
    try:
        from pypdf import PdfWriter, PdfReader
        from reportlab.pdfgen import canvas as rl_canvas
        from reportlab.lib.colors import Color
        from reportlab.lib.units import pt
        import tempfile

        writer = PdfWriter()

        for sheet in sheets:
            sheet_pins = [p for p in pins if p.get("sheet_id") == sheet.get("id")]
            w = float(sheet.get("width_pts") or 1056)
            h = float(sheet.get("height_pts") or 816)
            fp = sheet.get("file_path")

            if fp and Path(fp).exists():
                try:
                    reader = PdfReader(fp)
                    page_idx = sheet.get("page_index") or 0
                    page_idx = min(page_idx, len(reader.pages) - 1)
                    src_page = reader.pages[page_idx]
                    writer.add_page(src_page)
                    page = writer.pages[-1]
                    w = float(src_page.mediabox.width)
                    h = float(src_page.mediabox.height)
                except Exception:
                    pass
            else:
                # Blank sheet
                from pypdf import PageObject
                from pypdf.generic import RectangleObject
                blank = PageObject.create_blank_page(width=w, height=h)
                writer.add_page(blank)

            # Overlay pin markers using reportlab on a temp PDF then merge
            if sheet_pins:
                overlay_buf = io.BytesIO()
                c = rl_canvas.Canvas(overlay_buf, pagesize=(w, h))
                for pin in sheet_pins:
                    x = float(pin.get("x_pct") or 0.5) * w
                    # PDF y-axis is bottom-up
                    y = h - float(pin.get("y_pct") or 0.5) * h
                    rgb = STATUS_COLORS_RGB.get(pin.get("status", "open"), (0.86, 0.15, 0.15))
                    c.setFillColorRGB(*rgb)
                    c.setStrokeColorRGB(1, 1, 1)
                    c.circle(x, y, 10, fill=1)
                    c.setFillColorRGB(1, 1, 1)
                    c.setFont("Helvetica-Bold", 7)
                    initials = (pin.get("stamp_initials") or pin.get("subcontractorStamp") or "PL")[:3]
                    c.drawCentredString(x, y - 2.5, initials)
                c.save()
                overlay_buf.seek(0)
                overlay_reader = PdfReader(overlay_buf)
                writer.pages[-1].merge_page(overlay_reader.pages[0])

        out = io.BytesIO()
        writer.write(out)
        return out.getvalue()

    except ImportError:
        # If pypdf/reportlab not installed yet, return a minimal placeholder
        return _minimal_report_pdf(project, pins)


# ---------------------------------------------------------------------------
# Punch List Report PDF (formal document with pin table)
# ---------------------------------------------------------------------------

def generate_punch_list_report(project: dict, pins: list, sheets: list, audit_logs: list) -> bytes:
    """Generate a formal punch list report PDF using reportlab."""
    try:
        from reportlab.lib.pagesizes import letter, landscape
        from reportlab.lib import colors
        from reportlab.lib.units import inch
        from reportlab.platypus import (
            SimpleDocTemplate, Table, TableStyle, Paragraph,
            Spacer, HRFlowable
        )
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buf = io.BytesIO()
        doc = SimpleDocTemplate(buf, pagesize=landscape(letter),
                                leftMargin=0.5*inch, rightMargin=0.5*inch,
                                topMargin=0.5*inch, bottomMargin=0.5*inch)
        styles = getSampleStyleSheet()
        elements = []

        # Title
        title_style = ParagraphStyle("Title", parent=styles["Title"], fontSize=18, spaceAfter=6)
        elements.append(Paragraph(f"PUNCH LIST REPORT", title_style))
        elements.append(Paragraph(
            f"{project.get('name', 'Project')}  |  Code: {project.get('code', 'PRJ')}  |  "
            f"Generated: {datetime.now().strftime('%Y-%m-%d %H:%M')}",
            styles["Normal"]
        ))
        elements.append(Spacer(1, 0.2*inch))
        elements.append(HRFlowable(width="100%", thickness=1, color=colors.HexColor("#1e293b")))
        elements.append(Spacer(1, 0.15*inch))

        # Stats
        total = len(pins)
        closed = sum(1 for p in pins if p.get("status") == "closed")
        open_count = sum(1 for p in pins if p.get("status") in ("open", "assigned"))
        in_review = sum(1 for p in pins if "review" in (p.get("status") or ""))
        resolution_rate = round(closed / total * 100, 1) if total > 0 else 0

        stat_data = [
            ["Total Items", "Open", "In Review", "Closed", "Resolution Rate"],
            [str(total), str(open_count), str(in_review), str(closed), f"{resolution_rate}%"],
        ]
        stat_table = Table(stat_data, colWidths=[1.5*inch]*5)
        stat_table.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#1e293b")),
            ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (0, 0), (-1, -1), "CENTER"),
            ("GRID", (0, 0), (-1, -1), 0.5, colors.grey),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f8fafc"), colors.white]),
        ]))
        elements.append(stat_table)
        elements.append(Spacer(1, 0.2*inch))

        # Build sheets map
        sheet_map = {s["id"]: s for s in sheets}

        # Pin table
        if pins:
            headers = ["#", "Title", "Status", "Priority", "Discipline", "Location",
                       "Assigned To", "Sheet", "Created"]
            rows = [headers]
            for pin in sorted(pins, key=lambda p: p.get("item_number", 0)):
                sheet = sheet_map.get(pin.get("sheet_id", ""), {})
                rows.append([
                    str(pin.get("item_number", "")),
                    (pin.get("title") or "")[:40],
                    format_status_label(pin.get("status", "open")),
                    (pin.get("priority") or "medium").upper(),
                    (pin.get("discipline") or "").capitalize(),
                    (pin.get("room_location") or sheet.get("name") or "")[:25],
                    (pin.get("assigned_to_company") or "")[:20],
                    (sheet.get("sheet_number") or "")[:10],
                    str(pin.get("created_at") or "")[:10],
                ])

            col_widths = [0.4*inch, 2.2*inch, 1.1*inch, 0.8*inch, 1.0*inch,
                          1.4*inch, 1.3*inch, 0.8*inch, 0.9*inch]
            pin_table = Table(rows, colWidths=col_widths, repeatRows=1)
            pin_table.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), colors.HexColor("#0f172a")),
                ("TEXTCOLOR", (0, 0), (-1, 0), colors.white),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 8),
                ("ALIGN", (0, 0), (-1, -1), "LEFT"),
                ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
                ("GRID", (0, 0), (-1, -1), 0.3, colors.lightgrey),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [colors.HexColor("#f1f5f9"), colors.white]),
                ("ROWHEIGHT", (0, 0), (-1, -1), 16),
            ]))
            elements.append(pin_table)

        doc.build(elements)
        return buf.getvalue()

    except ImportError:
        return _minimal_report_pdf(project, pins)


# ---------------------------------------------------------------------------
# CSV Export
# ---------------------------------------------------------------------------

def generate_punch_list_csv(pins: list, sheets: list) -> str:
    """Generate a CSV punch list matching the Node.js generatePunchListCsv output."""
    sheet_map = {s["id"]: s for s in sheets}
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow([
        "Item #", "Title", "Status", "Priority", "Discipline", "Room/Location",
        "Assigned To", "Root Cause", "Sheet Number", "Sheet Name",
        "Due Date", "Created At", "Stamp Initials",
    ])
    for pin in sorted(pins, key=lambda p: p.get("item_number", 0)):
        sheet = sheet_map.get(pin.get("sheet_id", ""), {})
        writer.writerow([
            pin.get("item_number", ""),
            pin.get("title", ""),
            pin.get("status", "open"),
            pin.get("priority", "medium"),
            pin.get("discipline", "architectural"),
            pin.get("room_location", ""),
            pin.get("assigned_to_company", ""),
            pin.get("root_cause", ""),
            sheet.get("sheet_number", ""),
            sheet.get("name", ""),
            pin.get("due_date", ""),
            str(pin.get("created_at", ""))[:10],
            pin.get("stamp_initials", ""),
        ])
    return buf.getvalue()


# ---------------------------------------------------------------------------
# Minimal fallback PDF (if reportlab not yet installed)
# ---------------------------------------------------------------------------

def _minimal_report_pdf(project: dict, pins: list) -> bytes:
    lines = [
        f"PUNCHLIST PRO — {project.get('name', 'Project')}",
        f"Generated: {datetime.now().isoformat()}",
        f"Total items: {len(pins)}",
        "",
    ]
    for pin in pins:
        lines.append(f"[{pin.get('item_number')}] {pin.get('title')} — {pin.get('status')}")
    text = "\n".join(lines)
    # Minimal valid PDF
    content = (
        "%PDF-1.4\n1 0 obj\n<< /Type /Catalog /Pages 2 0 R >>\nendobj\n"
        "2 0 obj\n<< /Type /Pages /Kids [3 0 R] /Count 1 >>\nendobj\n"
        "3 0 obj\n<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792]\n"
        "/Contents 4 0 R /Resources << /Font << /F1 << /Type /Font "
        "/Subtype /Type1 /BaseFont /Helvetica >> >> >> >>\nendobj\n"
        f"4 0 obj\n<< /Length {len(text) + 50} >>\nstream\nBT /F1 10 Tf 50 750 Td\n"
        + text.replace("\n", "\\n Tj T*\n") + " Tj\nET\nendstream\nendobj\n"
        "xref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n"
        "0000000058 00000 n\n0000000115 00000 n\n0000000274 00000 n\n"
        "trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n0\n%%EOF"
    )
    return content.encode("latin-1", errors="replace")
