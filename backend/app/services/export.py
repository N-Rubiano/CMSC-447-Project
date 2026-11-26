"""
services/export.py — PDF and CSV export services.

Replaces Node.js exportService.js (pdfkit / pdf-lib).
Uses reportlab for punch list report PDF generation and pypdf for annotated plan sets.
"""
import base64
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


def _norm_pct(val, default: float = 0.5) -> float:
    """Normalize coordinates stored as either 0..1 or 0..100 into 0.0..1.0."""
    try:
        num = float(val)
    except (TypeError, ValueError):
        return default
    if num > 1.0:
        num = num / 100.0
    return max(0.0, min(1.0, num))


def _resolve_upload_path(raw_path: str | None) -> Path | None:
    if not raw_path:
        return None
    p = Path(raw_path)
    if p.exists():
        return p
    if raw_path.startswith("/uploads/"):
        rel = raw_path.lstrip("/")
        candidate = Path(__file__).parent.parent.parent / rel
        if candidate.exists():
            return candidate
        tmp_candidate = Path("/tmp") / rel
        if tmp_candidate.exists():
            return tmp_candidate
    return None


def _load_sheet_pil_image(sheet: dict, target_w: int = 1400, target_h: int = 900):
    """Load actual PDF/raster blueprint image if available, else draw CAD grid canvas."""
    from PIL import Image, ImageDraw, ImageFont

    image_exts = {".png", ".jpg", ".jpeg", ".webp", ".bmp", ".tiff", ".tif"}

    # 1. Try local image_path, image_url (/uploads/...), or file_path if raster
    for candidate_key in ("image_path", "image_url", "file_path"):
        val = sheet.get(candidate_key)
        if not val or not isinstance(val, str):
            continue
        if val.startswith("data:image/"):
            try:
                _, b64 = val.split(",", 1)
                return Image.open(io.BytesIO(base64.b64decode(b64))).convert("RGB")
            except Exception:
                continue
        resolved = _resolve_upload_path(val)
        if resolved and resolved.suffix.lower() in image_exts:
            try:
                return Image.open(resolved).convert("RGB")
            except Exception:
                continue

    # 2. Render actual uploaded PDF blueprint page via pypdfium2
    for candidate_key in ("file_path", "pdf_url", "image_url"):
        val = sheet.get(candidate_key)
        if not val or not isinstance(val, str):
            continue
        resolved = _resolve_upload_path(val)
        if resolved and resolved.suffix.lower() == ".pdf":
            try:
                import pypdfium2 as pdfium
                pdf_doc = pdfium.PdfDocument(str(resolved))
                page_idx = int(sheet.get("page_index") or 0)
                page_idx = max(0, min(page_idx, len(pdf_doc) - 1))
                page = pdf_doc[page_idx]
                pw, ph = page.get_size()
                scale = max(1.5, min(3.0, 1600.0 / max(1.0, float(pw))))
                bitmap = page.render(scale=scale)
                pil_img = bitmap.to_pil().convert("RGB")
                pdf_doc.close()
                return pil_img
            except Exception:
                continue

    # 2. Fallback: crisp architectural drafting grid matching BlueprintViewer
    img = Image.new("RGB", (target_w, target_h), (255, 255, 255))
    draw = ImageDraw.Draw(img)

    # Outer border & inner drafting frame
    draw.rectangle([20, 20, target_w - 20, target_h - 20], outline=(24, 24, 27), width=3)
    draw.rectangle([28, 28, target_w - 28, target_h - 28], outline=(92, 58, 33), width=1)

    # Subtle grid
    cols = ["A", "B", "C", "D", "E", "F", "G", "H"]
    rows = ["1", "2", "3", "4", "5", "6"]
    font = ImageFont.load_default()

    for idx, col in enumerate(cols):
        x = int((idx + 0.5) / len(cols) * (target_w - 80)) + 40
        draw.line([(x, 40), (x, target_h - 90)], fill=(228, 224, 214), width=1)
        draw.text((x - 4, 26), col, fill=(92, 58, 33), font=font)

    for idx, row_lbl in enumerate(rows):
        y = int((idx + 0.5) / len(rows) * (target_h - 140)) + 50
        draw.line([(40, y), (target_w - 40, y)], fill=(228, 224, 214), width=1)
        draw.text((26, y - 5), row_lbl, fill=(92, 58, 33), font=font)

    # Title block bottom right
    tb_x1, tb_y1, tb_x2, tb_y2 = target_w - 390, target_h - 92, target_w - 32, target_h - 32
    draw.rectangle([tb_x1, tb_y1, tb_x2, tb_y2], fill=(248, 247, 244), outline=(24, 24, 27), width=2)
    s_num = sheet.get("sheet_number") or sheet.get("number") or "SHEET"
    s_name = (sheet.get("name") or sheet.get("title") or "Architectural Plan")[:38]
    s_loc = " / ".join(filter(None, [sheet.get("building_name"), sheet.get("floor_level")])) or "Active Floor"
    draw.text((tb_x1 + 12, tb_y1 + 10), f"{s_num} — {s_name}", fill=(24, 24, 27), font=font)
    draw.text((tb_x1 + 12, tb_y1 + 32), f"{s_loc}  |  {sheet.get('version', 'Rev 1')}", fill=(92, 58, 33), font=font)

    return img


def _render_sheet_with_pins_png(sheet: dict, pins: list, max_width: int = 1400) -> bytes:
    """Render a blueprint sheet image with numbered, color-coded punch pins overlaid."""
    from PIL import Image, ImageDraw, ImageFont

    img = _load_sheet_pil_image(sheet)
    w, h = img.size
    if w > max_width:
        scale = max_width / float(w)
        img = img.resize((max_width, max(1, int(h * scale))), Image.Resampling.LANCZOS)
        w, h = img.size

    draw = ImageDraw.Draw(img)
    font = ImageFont.load_default()
    radius = max(14, min(24, int(w * 0.015)))

    for pin in pins:
        px = int(_norm_pct(pin.get("x_pct"), 0.5) * w)
        py = int(_norm_pct(pin.get("y_pct"), 0.5) * h)
        px = max(radius + 4, min(w - radius - 4, px))
        py = max(radius + 4, min(h - radius - 4, py))

        rgb_float = STATUS_COLORS_RGB.get(pin.get("status", "open"), (0.86, 0.15, 0.15))
        fill_rgb = tuple(int(c * 255) for c in rgb_float)

        # Outer white rim + colored circle
        draw.ellipse(
            [px - radius - 2, py - radius - 2, px + radius + 2, py + radius + 2],
            fill=(255, 255, 255),
            outline=(24, 24, 27),
            width=1,
        )
        draw.ellipse(
            [px - radius, py - radius, px + radius, py + radius],
            fill=fill_rgb,
        )

        # Label: item number or stamp initials
        item_num = pin.get("item_number")
        label = f"#{item_num}" if item_num else (pin.get("stamp_initials") or pin.get("trade") or "PL")[:3]
        bbox = draw.textbbox((0, 0), str(label), font=font)
        tw, th = bbox[2] - bbox[0], bbox[3] - bbox[1]
        draw.text((px - tw / 2, py - th / 2 - 1), str(label), fill=(255, 255, 255), font=font)

    out = io.BytesIO()
    img.save(out, format="PNG", optimize=True)
    return out.getvalue()


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

            if fp and Path(fp).exists() and Path(fp).suffix.lower() == ".pdf":
                try:
                    reader = PdfReader(fp)
                    page_idx = sheet.get("page_index") or 0
                    page_idx = min(page_idx, len(reader.pages) - 1)
                    src_page = reader.pages[page_idx]
                    writer.add_page(src_page)
                    w = float(src_page.mediabox.width)
                    h = float(src_page.mediabox.height)
                except Exception:
                    from pypdf import PageObject
                    writer.add_page(PageObject.create_blank_page(width=w, height=h))
            else:
                # Render raster image or CAD grid sheet into a PDF page
                sheet_png = _render_sheet_with_pins_png(sheet, [])
                img_pdf_buf = io.BytesIO()
                c_img = rl_canvas.Canvas(img_pdf_buf, pagesize=(w, h))
                from reportlab.lib.utils import ImageReader
                c_img.drawImage(ImageReader(io.BytesIO(sheet_png)), 0, 0, width=w, height=h, preserveAspectRatio=True)
                c_img.save()
                img_pdf_buf.seek(0)
                writer.add_page(PdfReader(img_pdf_buf).pages[0])

            # Overlay pin markers using reportlab on a temp PDF then merge
            if sheet_pins:
                overlay_buf = io.BytesIO()
                c = rl_canvas.Canvas(overlay_buf, pagesize=(w, h))
                for pin in sheet_pins:
                    x = _norm_pct(pin.get("x_pct"), 0.5) * w
                    # PDF y-axis is bottom-up
                    y = h - _norm_pct(pin.get("y_pct"), 0.5) * h
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
        closed = sum(1 for p in pins if (p.get("status") or "").lower() in ("closed", "resolved"))
        open_count = sum(1 for p in pins if (p.get("status") or "").lower() in ("open", "assigned"))
        in_review = sum(1 for p in pins if "review" in (p.get("status") or "").lower())
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
                    (pin.get("room_location") or sheet.get("name") or "")[:18],
                    (pin.get("assigned_to_company") or "")[:18],
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

        # Blueprint Pin Map Snapshots
        if sheets:
            from reportlab.platypus import Image as RLImage, PageBreak, KeepTogether
            from PIL import Image as PILImage

            elements.append(PageBreak())
            section_style = ParagraphStyle("Section", parent=styles["Heading2"], fontSize=14, spaceAfter=8)
            elements.append(Paragraph("BLUEPRINT PIN MAPS", section_style))

            for sheet in sheets:
                sheet_pins = [p for p in pins if p.get("sheet_id") == sheet.get("id")]
                png_bytes = _render_sheet_with_pins_png(sheet, sheet_pins, max_width=1400)
                pil_dim = PILImage.open(io.BytesIO(png_bytes))
                pw, ph = pil_dim.size
                display_w = 9.0 * inch
                display_h = min(5.2 * inch, display_w * (ph / float(pw or 1)))
                s_num = sheet.get("sheet_number") or sheet.get("number") or "Sheet"
                s_name = sheet.get("name") or sheet.get("title") or ""
                elements.append(KeepTogether([
                    Paragraph(
                        f"<b>{s_num}</b> — {s_name} ({len(sheet_pins)} pinned items)",
                        styles["Normal"]
                    ),
                    Spacer(1, 0.08 * inch),
                    RLImage(io.BytesIO(png_bytes), width=display_w, height=display_h),
                    Spacer(1, 0.2 * inch),
                ]))

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
# Excel (.xlsx) Export
# ---------------------------------------------------------------------------

def generate_project_excel(
    project: dict,
    pins: list,
    sheets: list,
    members: list | None = None,
) -> bytes:
    """Generate a multi-sheet Excel (.xlsx) workbook with Project Info, Punch Items, and Team."""
    from openpyxl import Workbook
    from openpyxl.styles import Font, PatternFill, Alignment, Border, Side

    wb = Workbook()

    header_fill = PatternFill(start_color="18181B", end_color="18181B", fill_type="solid")
    amber_fill = PatternFill(start_color="FEF3C7", end_color="FEF3C7", fill_type="solid")
    stripe_fill = PatternFill(start_color="F8F7F4", end_color="F8F7F4", fill_type="solid")
    header_font = Font(name="Calibri", size=11, bold=True, color="FFFFFF")
    section_font = Font(name="Calibri", size=12, bold=True, color="18181B")
    bold_font = Font(name="Calibri", size=11, bold=True, color="18181B")
    body_font = Font(name="Calibri", size=11, color="18181B")
    thin_side = Side(style="thin", color="DCD5C8")
    cell_border = Border(left=thin_side, right=thin_side, top=thin_side, bottom=thin_side)

    total = len(pins)
    closed_count = sum(1 for p in pins if (p.get("status") or "").lower() in ("closed", "resolved"))
    open_count = sum(1 for p in pins if (p.get("status") or "").lower() in ("open", "assigned"))
    in_progress_count = sum(1 for p in pins if (p.get("status") or "").lower() == "in_progress")
    in_review_count = sum(1 for p in pins if "review" in (p.get("status") or "").lower())
    resolution_rate = round((closed_count / total) * 100, 1) if total > 0 else 0.0

    # ── Sheet 1: Project Overview ────────────────────────────────────────
    ws_overview = wb.active
    ws_overview.title = "Project Overview"
    ws_overview.append(["PunchList Pro — Project Deliverable Summary"])
    ws_overview["A1"].font = Font(name="Calibri", size=15, bold=True, color="D97706")
    ws_overview.append([])

    info_rows = [
        ("Project Name", project.get("name", "Project")),
        ("Project Code", project.get("code", "PRJ")),
        ("Client / Owner", project.get("client_name") or "—"),
        ("Site Address", project.get("address") or "—"),
        ("Status", (project.get("status") or "active").upper()),
        ("Target Completion", str(project.get("target_completion") or "—")[:10]),
        ("Exported At", datetime.now().strftime("%Y-%m-%d %H:%M")),
    ]
    ws_overview.append(["Field", "Value"])
    for cell in ws_overview[3]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")
    for label, val in info_rows:
        ws_overview.append([label, val])
        row = ws_overview[ws_overview.max_row]
        row[0].font = bold_font
        row[1].font = body_font
        for c in row:
            c.border = cell_border

    ws_overview.append([])
    ws_overview.append(["KPI Summary", "Count"])
    for cell in ws_overview[ws_overview.max_row]:
        cell.fill = header_fill
        cell.font = header_font
    kpi_rows = [
        ("Total Punch Items", total),
        ("Open / Assigned", open_count),
        ("In Progress", in_progress_count),
        ("In Review", in_review_count),
        ("Closed / Resolved", closed_count),
        ("Resolution Rate", f"{resolution_rate}%"),
        ("Total Blueprint Sheets", len(sheets)),
    ]
    for label, val in kpi_rows:
        ws_overview.append([label, val])
        row = ws_overview[ws_overview.max_row]
        row[0].font = bold_font
        row[1].font = body_font
        if label == "Resolution Rate":
            row[1].fill = amber_fill
        for c in row:
            c.border = cell_border

    ws_overview.column_dimensions["A"].width = 28
    ws_overview.column_dimensions["B"].width = 48

    # ── Sheet 2: Punch Items ─────────────────────────────────────────────
    ws_pins = wb.create_sheet(title="Punch Items")
    sheet_map = {s["id"]: s for s in sheets}
    pin_headers = [
        "Item #", "Title", "Status", "Priority", "Discipline",
        "Location / Room", "Assigned To", "Sheet Number", "Sheet Name",
        "X (%)", "Y (%)", "Due Date", "Created At", "Stamp Initials",
    ]
    ws_pins.append(pin_headers)
    ws_pins.freeze_panes = "A2"
    for cell in ws_pins[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")

    for idx, pin in enumerate(sorted(pins, key=lambda p: p.get("item_number", 0)), start=2):
        sheet = sheet_map.get(pin.get("sheet_id", ""), {})
        ws_pins.append([
            pin.get("item_number", ""),
            pin.get("title", ""),
            format_status_label(pin.get("status", "open")),
            (pin.get("priority") or "medium").upper(),
            (pin.get("discipline") or "architectural").capitalize(),
            pin.get("room_location") or pin.get("room") or "",
            pin.get("assigned_to_company") or pin.get("assignee") or "",
            sheet.get("sheet_number") or sheet.get("number") or "",
            sheet.get("name") or sheet.get("title") or "",
            pin.get("x_pct", ""),
            pin.get("y_pct", ""),
            str(pin.get("due_date") or "")[:10],
            str(pin.get("created_at") or "")[:10],
            pin.get("stamp_initials", ""),
        ])
        for cell in ws_pins[idx]:
            cell.font = body_font
            cell.border = cell_border
            if idx % 2 == 1:
                cell.fill = stripe_fill

    pin_widths = [10, 38, 18, 12, 16, 22, 24, 14, 26, 10, 10, 14, 14, 14]
    for i, w in enumerate(pin_widths, start=1):
        col_letter = ws_pins.cell(row=1, column=i).column_letter
        ws_pins.column_dimensions[col_letter].width = w

    # ── Sheet 3: Team & Assignments ──────────────────────────────────────
    ws_team = wb.create_sheet(title="Team & Assignments")
    team_headers = ["Name", "Email", "Role", "Company", "Assigned Items", "Open Items", "Closed Items"]
    ws_team.append(team_headers)
    ws_team.freeze_panes = "A2"
    for cell in ws_team[1]:
        cell.fill = header_fill
        cell.font = header_font
        cell.alignment = Alignment(horizontal="left", vertical="center")

    for idx, m in enumerate(members or [], start=2):
        uid = m.get("id")
        cid = m.get("company_id")
        assigned = [
            p for p in pins
            if (uid and p.get("assigned_to_user_id") == uid)
            or (cid and p.get("assigned_subcontractor_id") == cid)
        ]
        m_closed = sum(1 for p in assigned if (p.get("status") or "").lower() in ("closed", "resolved"))
        m_open = len(assigned) - m_closed
        ws_team.append([
            m.get("name", ""),
            m.get("email", ""),
            (m.get("role") or "").replace("_", " ").title(),
            m.get("company") or m.get("company_name") or "",
            len(assigned),
            m_open,
            m_closed,
        ])
        for cell in ws_team[idx]:
            cell.font = body_font
            cell.border = cell_border
            if idx % 2 == 1:
                cell.fill = stripe_fill

    for i, w in enumerate([24, 30, 22, 26, 16, 14, 14], start=1):
        col_letter = ws_team.cell(row=1, column=i).column_letter
        ws_team.column_dimensions[col_letter].width = w

    # ── Sheet 4: Blueprint Maps (Embedded PNGs with Pins Overlaid) ───────
    ws_maps = wb.create_sheet(title="Blueprint Maps")
    ws_maps.append(["Blueprint Sheet Pin Maps"])
    ws_maps["A1"].font = Font(name="Calibri", size=14, bold=True, color="D97706")
    ws_maps.column_dimensions["A"].width = 24
    ws_maps.column_dimensions["B"].width = 40
    ws_maps.column_dimensions["C"].width = 20

    if sheets:
        from openpyxl.drawing.image import Image as XLImage
        from PIL import Image as PILImage

        current_row = 3
        for sheet in sheets:
            sheet_pins = [p for p in pins if p.get("sheet_id") == sheet.get("id")]
            s_num = sheet.get("sheet_number") or sheet.get("number") or "Sheet"
            s_name = sheet.get("name") or sheet.get("title") or ""
            ws_maps.cell(row=current_row, column=1, value=s_num).font = bold_font
            ws_maps.cell(row=current_row, column=2, value=s_name).font = body_font
            ws_maps.cell(row=current_row, column=3, value=f"{len(sheet_pins)} pins").font = body_font

            png_bytes = _render_sheet_with_pins_png(sheet, sheet_pins, max_width=1000)
            pil_img = PILImage.open(io.BytesIO(png_bytes))
            xl_img = XLImage(io.BytesIO(png_bytes))
            xl_img.width = 760
            xl_img.height = max(240, int(760 * (pil_img.height / float(pil_img.width or 1))))
            ws_maps.add_image(xl_img, f"A{current_row + 1}")
            current_row += max(22, int(xl_img.height / 18) + 4)
    else:
        ws_maps.cell(row=3, column=1, value="No blueprint sheets uploaded for this project yet.").font = body_font

    out = io.BytesIO()
    wb.save(out)
    return out.getvalue()


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
