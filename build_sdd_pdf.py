"""
build_sdd_pdf.py
Compiles the comprehensive, professional 17-page Software Design Document (SDD)
for PunchList Pro, calibrated to match the reference template page-for-page.
"""
import os
import sys
import pypdf
from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image, PageBreak, KeepTogether, HRFlowable
)
from reportlab.pdfgen import canvas

ASSETS_DIR = r"c:\Users\tsaty\Downloads\PunchList\sdd_assets"
OUTPUT_PDF = r"c:\Users\tsaty\Downloads\PunchList\PunchList_Pro_Software_Design_Document_SDD.pdf"

class NumberedCanvas(canvas.Canvas):
    """
    Two-pass canvas to dynamically compute and draw the exact running header and footer:
    - Running Header: 'Software Design Document – Emily Tien, Stephanie Lazarus'
    - Running Footer: Right-aligned Page Number
    (Suppressed on Page 1 / Cover Page)
    """
    def __init__(self, *args, **kwargs):
        super().__init__(*args, **kwargs)
        self._saved_page_states = []

    def showPage(self):
        self._saved_page_states.append(dict(self.__dict__))
        self._startPage()

    def save(self):
        num_pages = len(self._saved_page_states)
        for state in self._saved_page_states:
            self.__dict__.update(state)
            self.draw_page_decorations(num_pages)
            super().showPage()
        super().save()

    def draw_page_decorations(self, page_count):
        if self._pageNumber == 1:
            return  # Suppress running header/footer on cover page

        self.saveState()
        self.setFont("Times-Roman", 10)
        self.setFillColor(colors.HexColor("#1E293B"))

        # Running Header (matches template exactly)
        header_text = "Software Design Document – Emily Tien, Stephanie Lazarus"
        self.drawCentredString(letter[0] / 2.0, letter[1] - 38, header_text)

        # Running Footer (Page Number at bottom right, matching template)
        page_str = str(self._pageNumber)
        self.drawRightString(letter[0] - 54, 38, page_str)

        self.restoreState()


def create_sdd():
    # Letter size: 612 x 792 pt
    # Margins: 54 pt (0.75 in) -> printable area: 504 x 684 pt
    doc = SimpleDocTemplate(
        OUTPUT_PDF,
        pagesize=letter,
        leftMargin=54,
        rightMargin=54,
        topMargin=50,
        bottomMargin=50
    )

    styles = getSampleStyleSheet()

    style_normal = ParagraphStyle(
        'DocNormal',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=14.5,
        textColor=colors.HexColor("#111827"),
        spaceAfter=5
    )

    style_normal_indent = ParagraphStyle(
        'DocNormalIndent',
        parent=style_normal,
        leftIndent=14,
        spaceAfter=3
    )

    style_code = ParagraphStyle(
        'DocCode',
        parent=styles['Normal'],
        fontName='Courier',
        fontSize=7.2,
        leading=9.2,
        textColor=colors.HexColor("#0F172A"),
        spaceAfter=2
    )

    style_schema = ParagraphStyle(
        'DocSchema',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=9,
        leading=12,
        textColor=colors.HexColor("#111827"),
        spaceAfter=1
    )

    style_h1 = ParagraphStyle(
        'DocH1',
        parent=styles['Heading1'],
        fontName='Times-Bold',
        fontSize=15,
        leading=18,
        textColor=colors.HexColor("#000000"),
        spaceBefore=8,
        spaceAfter=6,
        keepWithNext=True
    )

    style_h2 = ParagraphStyle(
        'DocH2',
        parent=styles['Heading2'],
        fontName='Times-Bold',
        fontSize=12,
        leading=15,
        textColor=colors.HexColor("#111827"),
        spaceBefore=7,
        spaceAfter=5,
        keepWithNext=True
    )

    style_h3 = ParagraphStyle(
        'DocH3',
        parent=styles['Heading3'],
        fontName='Times-Bold',
        fontSize=10.5,
        leading=13.5,
        textColor=colors.HexColor("#1F2937"),
        spaceBefore=5,
        spaceAfter=3,
        keepWithNext=True
    )

    style_toc_title = ParagraphStyle(
        'TOCTitle',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=16,
        leading=20,
        spaceAfter=14
    )

    style_toc_item = ParagraphStyle(
        'TOCItem',
        parent=styles['Normal'],
        fontName='Times-Roman',
        fontSize=10,
        leading=17,
        textColor=colors.HexColor("#111827")
    )

    style_toc_item_bold = ParagraphStyle(
        'TOCItemBold',
        parent=styles['Normal'],
        fontName='Times-Bold',
        fontSize=10,
        leading=17,
        textColor=colors.HexColor("#000000")
    )

    story = []

    # =========================================================================
    # PAGE 1: COVER PAGE
    # =========================================================================
    story.append(Spacer(1, 140))
    story.append(Paragraph(
        "<para align=center><b><font size=20>PunchList Pro — Enterprise Construction Punch List<br/>&amp; Field Management Platform</font></b></para>",
        style_normal
    ))
    story.append(Spacer(1, 18))

    story.append(Paragraph(
        "<para align=center><font size=14>Software Design Document (SDD)</font></para>",
        style_normal
    ))
    story.append(Spacer(1, 12))

    story.append(Paragraph(
        "<para align=center><font size=11 color='#4B5563'>11/11/2025</font></para>",
        style_normal
    ))
    story.append(Spacer(1, 70))

    story.append(Paragraph(
        "<para align=center><font size=12>Nathan Rubiano, Muhammad Khan, Satya Thakur</font></para>",
        style_normal
    ))
    story.append(Spacer(1, 40))

    logo_path = os.path.join(ASSETS_DIR, "umbc_logo.png")
    if os.path.exists(logo_path):
        story.append(Image(logo_path, width=130, height=156))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 2: TABLE OF CONTENTS
    # =========================================================================
    story.append(Spacer(1, 8))
    story.append(Paragraph("Table of Contents", style_toc_title))
    story.append(Spacer(1, 6))

    toc_entries = [
        ("Software Design Document (SDD)...............................................................................................", "1", True),
        ("Table of Contents...........................................................................................................................", "2", True),
        ("1. Introduction................................................................................................................................", "3", True),
        ("&nbsp;&nbsp;&nbsp;&nbsp;1.1. Purpose of This Document..................................................................................................", "3", False),
        ("&nbsp;&nbsp;&nbsp;&nbsp;1.2. References...........................................................................................................................", "3", False),
        ("2. System Architecture...................................................................................................................", "3", True),
        ("&nbsp;&nbsp;&nbsp;&nbsp;2.1. Architectural Design...........................................................................................................", "3", False),
        ("&nbsp;&nbsp;&nbsp;&nbsp;2.2. Decomposition Description................................................................................................", "7", False),
        ("3. Persistent Data Storage.............................................................................................................", "9", True),
        ("&nbsp;&nbsp;&nbsp;&nbsp;3.1. Database Descriptions.........................................................................................................", "9", False),
        ("&nbsp;&nbsp;&nbsp;&nbsp;3.2. File Descriptions...............................................................................................................", "11", False),
        ("4. Requirements Matrix...............................................................................................................", "13", True),
        ("Appendix.......................................................................................................................................", "16", True),
        ("&nbsp;&nbsp;&nbsp;&nbsp;A – Agreement Between Customer and Contractor................................................................", "16", False),
        ("&nbsp;&nbsp;&nbsp;&nbsp;B – Peer Review Sign-Off.......................................................................................................", "17", False),
        ("&nbsp;&nbsp;&nbsp;&nbsp;C – Document Contributions...................................................................................................", "17", False),
    ]

    for title_text, page_num, is_bold in toc_entries:
        row_para = Paragraph(
            f"<font name='{'Times-Bold' if is_bold else 'Times-Roman'}'>{title_text}</font>"
            f"<font name='Times-Bold'> {page_num}</font>",
            style_toc_item_bold if is_bold else style_toc_item
        )
        story.append(row_para)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 3: 1. INTRODUCTION & 2. SYSTEM ARCHITECTURE (2.1 START)
    # =========================================================================
    story.append(Paragraph("1. Introduction", style_h1))

    story.append(Paragraph("1.1. Purpose of This Document", style_h2))
    story.append(Paragraph(
        "The purpose of this document is to create a brief outline to detail how the <b>PunchList Pro</b> "
        "enterprise construction punch list and field documentation system is being developed from the backend and frontend "
        "points of view. It aims to transform the functional and non-functional requirements established in the Software "
        "Requirements Specification (SRS v2.0) into concrete, implementable design. It outlines system architecture and how it "
        "maps towards satisfying project requirements. Also, it breaks down database and file components of the program into "
        "diagrams and readable implementation details. The intended audience of this document are the product owner, "
        "stakeholders, course instructors (Dr. Emily Tien and Stephanie Lazarus), and the engineering development team "
        "(Nathan Rubiano, Muhammad Khan, and Satya Thakur) to ensure that we are fulfilling the needs of the project in code. "
        "Also, this document is to be used as a reference for developers to understand the needs and requirements of the system.",
        style_normal
    ))

    story.append(Paragraph("1.2. References", style_h2))
    refs = [
        "Software Requirements Specification Version 2.0: PunchList Pro Field Documentation Platform.",
        "FastAPI Asynchronous Framework Documentation: <font color='#2563EB'><u>https://fastapi.tiangolo.com</u></font>",
        "React 18 &amp; HTML5 Canvas Documentation: <font color='#2563EB'><u>https://react.dev</u></font>",
        "Mozilla PDF.js Plan Rendering Engine: <font color='#2563EB'><u>https://mozilla.github.io/pdf.js</u></font>",
        "Dexie.js IndexedDB Client-Side Persistence: <font color='#2563EB'><u>https://dexie.org</u></font>",
        "Python-SocketIO Real-Time Engine: <font color='#2563EB'><u>https://python-socketio.readthedocs.io</u></font>",
        "SQLAlchemy 2.0 Core Database Engine: <font color='#2563EB'><u>https://docs.sqlalchemy.org</u></font>",
        "ReportLab Vector PDF Drawing Generation: <font color='#2563EB'><u>https://www.reportlab.com</u></font>"
    ]
    for r in refs:
        story.append(Paragraph(f"• {r}", style_normal_indent))

    story.append(Spacer(1, 4))
    story.append(Paragraph("2. System Architecture", style_h1))
    story.append(Paragraph("2.1. Architectural Design", style_h2))
    story.append(Paragraph(
        "The software technologies our system uses are JavaScript (React 18 with Vite) and Python (FastAPI 0.115+), run and "
        "developed in modern Linux and Windows environments with web developer tools enabled. To run the program, the user "
        "must access the application through a standard web browser (Google Chrome, Apple Safari, Microsoft Edge). The hardware "
        "our system will use are standard field tablets (Apple iPad, Samsung Galaxy Tab, Microsoft Surface), mobile smartphones, "
        "and desktop workstations with standard processors, memory units, and touchscreen interfaces.",
        style_normal
    ))
    story.append(Paragraph(
        "Because our program is rolled out as a tablet-first Progressive Web Application, it operates both online connected to "
        "cloud backends and offline in low-connectivity jobsite environments. When disconnected in cellular dead zones (such as "
        "concrete basements or subterranean garages), it caches all sheet drawings, punch items, and photos locally using "
        "IndexedDB through Dexie.js, queuing mutations to automatically replay when connectivity is restored.",
        style_normal
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 4: 2.1 ARCHITECTURAL DESIGN (CONTINUED)
    # =========================================================================
    story.append(Paragraph(
        "Everything written in the client program is entirely contained in the browser's runtime architecture utilizing "
        "modern React functional components, HTML5 Canvas, and standard ECMAScript libraries. In particular, these libraries "
        "include Mozilla's PDF.js to parse and render multi-page architectural plan sets, Dexie.js for client-side transactional "
        "caching, and Socket.IO client for bidirectional real-time synchronization. The vast majority of our system architecture "
        "is self-contained. The system references its own normalized coordinate models, converting raw viewport pixel taps "
        "into resolution-independent floating-point tuples <b>(x_percent, y_percent) &isin; [0.0, 100.0]%</b>. This ensures that "
        "georeferenced punch pins remain fixed at their exact physical location regardless of whether a sheet is viewed on an "
        "iPad Mini, a 12.9-inch iPad Pro, a 4K desktop monitor, or exported to a printable PDF document.",
        style_normal
    ))

    story.append(Paragraph(
        "On the backend, our system employs Python FastAPI running on Uvicorn ASGI server with SQLAlchemy Core for database "
        "management. The backend implements full multi-tenant project isolation and Role-Based Access Control (RBAC). "
        "Authentication is secured via cryptographically signed JSON Web Tokens (JWT) using HMAC-SHA256, verifying user claims "
        "and enterprise roles. The persistence tier features a dual database strategy: PostgreSQL in production for enterprise "
        "concurrency and SQLite for lightweight local deployment and automated CI/CD regression testing.",
        style_normal
    ))

    story.append(Paragraph(
        "The system architecture is structured across four primary decoupled subsystems:",
        style_normal
    ))

    layers = [
        "<b>Frontend Tablet Canvas Tier:</b> High-performance interactive blueprint viewer with touch pinch-to-zoom, pan inertia, live pin placement, and SVG/Canvas vector markup drawing (revision clouds, arrows, callouts).",
        "<b>Offline-First Local Storage Tier:</b> Client-side IndexedDB caching blueprint sheets, active punch pins, and a FIFO mutation queue that ensures complete field productivity without an internet connection.",
        "<b>API Gateway &amp; Real-Time Tier:</b> FastAPI REST routes (/api/projects, /api/sheets, /api/pins, /api/auth) coupled with Python-SocketIO WebSocket rooms broadcasting real-time updates across field teams.",
        "<b>Persistent Storage &amp; Export Tier:</b> Relational database for structured records, filesystem storage for high-resolution photos and plan PDFs, and ReportLab for automated plan set compositing."
    ]
    for lyr in layers:
        story.append(Paragraph(f"• {lyr}", style_normal_indent))

    story.append(Paragraph(
        "Security is governed by six canonical enterprise RBAC roles: "
        "<b>Facility Administrator</b> (system-wide unrestricted CRUD, drawing ingestion, sole authority to close &amp; delete pins), "
        "<b>General Contractor</b> (assigned project management, trade subcontractor allocation, inspection sign-off), "
        "<b>Trade Subcontractor</b> (restricted to own assigned items, status updates, proof photo uploads), "
        "<b>Architect</b> (design compliance auditing, markup annotation, export reporting), "
        "<b>Owner / Client Representative</b> (read-only audit visibility across all projects), and "
        "<b>Field Inspector</b> (on-site walkthroughs, pin creation, status updates, field photo logging).",
        style_normal
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 5: SEQUENCE DIAGRAM (FULL PAGE)
    # =========================================================================
    seq_img_path = os.path.join(ASSETS_DIR, "diagram_sequence.png")
    if os.path.exists(seq_img_path):
        # Image calibrated to 490 x 640 to fit page 5 exactly
        story.append(Image(seq_img_path, width=490, height=640))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 6: NARRATIVE WALKTHROUGH OF SEQUENCE DIAGRAM
    # =========================================================================
    story.append(Paragraph(
        "Above is a sequence diagram showing the core logic governing the prompting, creation, spatial calculation, "
        "real-time synchronization, and multi-stage status workflow of the program. First, the user taps a specific location "
        "on the blueprint canvas using a field tablet. The frontend system calculates the normalized coordinate tuple "
        "(x_percent, y_percent) by translating touch coordinates through the active pan and zoom viewport transformation matrix. "
        "The system then displays the punch creation modal, prompting the user for issue title, trade discipline, description, "
        "priority, and camera photo capture.",
        style_normal
    ))

    story.append(Paragraph(
        "Next, the user confirms the input, and the frontend system immediately commits the record to the local IndexedDB "
        "offline store via Dexie.js. The client renders an optimistic punch stamp on the canvas with the computed trade initials "
        "(e.g., [DW] for Drywall, [EL] for Electrical), ensuring zero UI latency for the field inspector. Simultaneously, the system "
        "checks network connectivity. If online, it transmits an authenticated <code>POST /api/pins</code> multipart request to the "
        "backend. If offline, the transaction is enqueued in the mutation store to be replayed upon reconnection.",
        style_normal
    ))

    story.append(Paragraph(
        "When the backend receives the request, it verifies the caller's JWT token and validates role permissions through the "
        "RBAC engine (<code>permissions.py:has_permission</code>). If the user lacks permission or is not a member of the project, "
        "the backend rejects the transaction with an HTTP 403 Forbidden. If valid, the backend begins an atomic database "
        "transaction: inserting the pin record, saving the uploaded field photo to disk, incrementing the project item counter, "
        "and recording an entry in the immutable audit log table. Upon successful commit, the backend returns an HTTP 201 Created.",
        style_normal
    ))

    story.append(Paragraph(
        "Immediately following database commit, the backend's Socket.IO engine broadcasts a <code>pin:created</code> event to all "
        "connected collaborators in the project room (<code>project:{project_id}</code>). The remote tablets of the General Contractor, "
        "Architect, and Subcontractor update their canvas displays in real time without requiring a page refresh.",
        style_normal
    ))

    story.append(Paragraph(
        "Finally, the diagram illustrates the multi-party resolution loop. The assigned Trade Subcontractor commences remediation "
        "by transitioning status to <i>In Progress</i> and uploading completed proof photos. The subcontractor submits the task for "
        "<i>Contractor Review</i>. The General Contractor inspects the work on-site, approving it forward to <i>Admin Review</i> or "
        "rejecting it back for rework. Ultimately, the Facility Administrator exercises sole contractual authority to formally close "
        "and seal the punch item, committing a final verification entry to the immutable audit trail.",
        style_normal
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 7: 2.2 DECOMPOSITION DESCRIPTION & CLASS DIAGRAM (FULL PAGE)
    # =========================================================================
    story.append(Paragraph("2.2. Decomposition Description", style_h1))
    story.append(Paragraph(
        "Above is the class diagram that represents our running model of PunchList Pro. Much of the programming is structured "
        "around decoupled domain services, specialized canvas controllers, and reactive state stores although the entire design "
        "of the application is object-oriented in nature. To start, looking at the SheetCanvas object, it has a plethora of "
        "different items related to its size, viewport orientation, active tools, layer visibility, and supporting functions "
        "that manage its rendering design:",
        style_normal
    ))
    story.append(Spacer(1, 4))

    cls_img_path = os.path.join(ASSETS_DIR, "diagram_class.png")
    if os.path.exists(cls_img_path):
        # Fits on Page 7 below the intro text (height 540 pt)
        story.append(Image(cls_img_path, width=490, height=540))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 8: NARRATIVE BREAKDOWN OF DOMAIN MODULES
    # =========================================================================
    story.append(Paragraph(
        "The class decomposition diagram above illustrates the nine primary subsystems that govern client interaction, "
        "domain validation, persistence, real-time messaging, and reporting in PunchList Pro. Below is the detailed architectural "
        "description of each subsystem and its member classes:",
        style_normal
    ))

    modules = [
        ("SheetCanvas",
         "The central interactive viewport component. It encapsulates the HTML5 multi-touch rendering context, managing active "
         "drawing sheets, pan offsets, zoom scale factors (from 0.5x to 10.0x), and active tool selections. It intercepts user gestures, "
         "converts touch coordinates into normalized percentage coordinates, and coordinates with the <code>StampRenderer</code> to draw "
         "dynamic, high-contrast trade stamps and vector markups."),

        ("PunchPin",
         "The fundamental domain entity representing a field task or deficiency. Each pin maintains an immutable UUID, sequential "
         "project item number (#1, #2, ...), title, description, trade discipline, priority, normalized coordinates (x_percent, y_percent), "
         "lifecycle status, assigned subcontractor company, and creator user ID. It encapsulates business methods for status validation, "
         "trade initial calculation, and comment/photo attachment."),

        ("RBACAccessController",
         "The system-wide access control engine. It stores role permission sets and enforces multi-tenant project security. It contains "
         "core authorization functions: <code>has_permission()</code>, <code>can_user_access_project()</code>, <code>can_user_access_pin()</code>, "
         "and <code>validate_status_transition()</code>. It ensures that only Facility Admins can delete or close pins, GCs can perform "
         "inspection sign-offs, and subcontractors are strictly limited to their own assigned workload."),

        ("DrawingRasterEngine",
         "The document rendering engine utilizing Mozilla PDF.js. It loads architectural plan sets, extracts vector bounding box "
         "dimensions, parses multi-page sheets, and rasterizes high-resolution canvas layers at 150 DPI viewport scale with tile caching."),

        ("OfflineSyncQueue",
         "The client-side persistence controller built on Dexie.js (IndexedDB). It stores offline project bundles, drawing sheets, "
         "and an ordered queue of local mutations. When the browser regains internet access, it replays pending operations against "
         "the backend API with automatic optimistic reconciliation and conflict resolution."),

        ("StatusWorkflowEngine",
         "A finite-state machine governing punch item lifecycle transitions. It enforces valid business rules: only subcontractors "
         "can commence work; only General Contractors can sign off on trade work; and only Facility Administrators can perform final close-out."),

        ("ReportExportEngine",
         "The document compilation subsystem responsible for generating distribution-ready PDF plan sets and punch list spreadsheets. "
         "It uses ReportLab to composite circle stamps, callout tags, and revision clouds directly onto the underlying architectural PDF."),

        ("WebSocketSyncEngine",
         "The real-time bidirectional communication bus utilizing python-socketio. It manages client connections, room memberships "
         "scoped by project (<code>project:{id}</code>), and broadcasts mutation events to keep all active team members synchronized."),

        ("AuditLogEngine",
         "The forensic provenance engine that records every state transition, assignment change, markup placement, and administrative "
         "sign-off with timestamped user identity, prior state, updated state, and IP context for legal and contractual accountability.")
    ]

    for name, desc in modules:
        story.append(Paragraph(f"<b>{name}:</b> {desc}", style_normal))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 9: 3. PERSISTENT DATA STORAGE (3.1 & ER DIAGRAM)
    # =========================================================================
    story.append(Paragraph("3. Persistent Data Storage", style_h1))
    story.append(Paragraph("3.1. Database Descriptions", style_h2))
    story.append(Paragraph(
        "Above is an Entity-Relationship diagram of our database. Now, we are going to break down everything that is stored "
        "in the database by object to thoroughly document everything the program stores in its custom relational environment.",
        style_normal
    ))
    story.append(Spacer(1, 4))

    erd_img_path = os.path.join(ASSETS_DIR, "diagram_er.png")
    if os.path.exists(erd_img_path):
        # Fits on Page 9 with intro text (height 450 pt)
        story.append(Image(erd_img_path, width=490, height=450))

    story.append(Spacer(1, 4))
    story.append(Paragraph("<b>1. Coordinates</b>", style_h3))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- longitude: Double // stores the real-world longitude of a point", style_normal))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- latitude: Double // stores the real-world latitude of a point", style_normal))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- x_percent: Double // normalized horizontal coordinate on plan sheet (0.0 - 100.0%)", style_normal))
    story.append(Paragraph("&nbsp;&nbsp;&nbsp;&nbsp;- y_percent: Double // normalized vertical coordinate on plan sheet (0.0 - 100.0%)", style_normal))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 10: 3.1 DATABASE SCHEMA SPECIFICATIONS (PART 1: TABLES 2 - 6)
    # =========================================================================
    story.append(Paragraph("<b>2. Companies</b>", style_h3))
    comp_items = [
        ("id: Text", "// unique identifier of contractor or trade company"),
        ("name: Text", "// legal commercial company name"),
        ("type: Text", "// organization type: 'contractor', 'subcontractor', or 'admin'"),
        ("parent_contractor_id: Text", "// references parent General Contractor ID, optional"),
        ("license_number: Text", "// state contractor license number"),
        ("trade: Text", "// specialized trade category (drywall, electrical, mep, &c)"),
        ("contact_person: Text", "// primary superintendent or account lead")
    ]
    for k, v in comp_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(Paragraph("<b>3. Users</b>", style_h3))
    user_items = [
        ("id: Text", "// unique user account identifier"),
        ("name: Text", "// full legal name of user"),
        ("email: Text", "// user email address and login username, unique"),
        ("role: Text", "// system role: admin, general_contractor, sub_contractor, architect, owner, field_inspector"),
        ("company: Text", "// user company display name"),
        ("company_id: Text", "// company foreign key link to Companies")
    ]
    for k, v in user_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(Paragraph("<b>4. Projects</b>", style_h3))
    proj_items = [
        ("id: Text", "// unique construction project identifier"),
        ("name: Text", "// full jobsite project title"),
        ("code: Text", "// short project code (e.g. UMBC-2026), unique"),
        ("address: Text", "// physical jobsite location address"),
        ("gc_user_id: Text", "// user ID of assigned primary General Contractor"),
        ("status: Text", "// project state: 'active' or 'archived'")
    ]
    for k, v in proj_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(Paragraph("<b>5. Project Members</b>", style_h3))
    pm_items = [
        ("id: Text", "// unique membership record ID"),
        ("project_id: Text", "// references Projects"),
        ("user_id: Text", "// references Users"),
        ("role: Text", "// assigned role on this project")
    ]
    for k, v in pm_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(Paragraph("<b>6. Sheets</b>", style_h3))
    sheet_items = [
        ("id: Text", "// unique drawing sheet identifier"),
        ("project_id: Text", "// references Projects"),
        ("sheet_number: Text", "// architectural sheet number (e.g. A-101)"),
        ("name: Text", "// formal sheet title (e.g. Level 1 Floor Plan)"),
        ("discipline: Text", "// trade discipline (architectural, structural, mep)"),
        ("floor_level: Text", "// floor level (01, 02, Basement)"),
        ("file_path: Text", "// filesystem path to original PDF drawing"),
        ("width_pts: Integer", "// PDF MediaBox width in points"),
        ("height_pts: Integer", "// PDF MediaBox height in points")
    ]
    for k, v in sheet_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 11: 3.1 DATABASE SCHEMA (PART 2) & 3.2 FILE DESCRIPTIONS INTRO
    # =========================================================================
    story.append(Paragraph("<b>7. Pins (Punch Items)</b>", style_h3))
    pin_items = [
        ("id: Text", "// unique punch pin identifier"),
        ("project_id: Text", "// references Projects"),
        ("sheet_id: Text", "// references Sheets"),
        ("item_number: Integer", "// sequential punch index on project (#1, #2, ...)"),
        ("title: Text", "// concise headline of deficiency"),
        ("description: Text", "// detailed remediation instructions"),
        ("x_percent: Double", "// normalized horizontal coordinate (0.0 - 100.0%)"),
        ("y_percent: Double", "// normalized vertical coordinate (0.0 - 100.0%)"),
        ("room_location: Text", "// room number or grid location string"),
        ("discipline: Text", "// trade discipline (drywall, electrical, mep, &c)"),
        ("priority: Text", "// priority: 'low', 'medium', 'high', 'critical'"),
        ("status: Text", "// lifecycle: 'open', 'in_progress', 'submitted_for_contractor_review', 'submitted_for_admin_review', 'closed'"),
        ("assigned_to_company: Text", "// trade company assigned to fix issue"),
        ("created_by_user_id: Text", "// user who dropped the pin")
    ]
    for k, v in pin_items:
        story.append(Paragraph(f"&nbsp;&nbsp;&nbsp;&nbsp;- {k} &nbsp;&nbsp;&nbsp;&nbsp;{v}", style_schema))

    story.append(Paragraph("<b>8. Comments:</b> &nbsp;id, pin_id, author_id: Text, body: Text, created_at: Timestamptz", style_schema))
    story.append(Paragraph("<b>9. Photos:</b> &nbsp;id, pin_id, file_path, caption: Text, type: Text ('issue' or 'work_completed')", style_schema))
    story.append(Paragraph("<b>10. Markups:</b> &nbsp;id, sheet_id, type: Text ('cloud', 'arrow', 'rect'), coordinates_json: Text", style_schema))
    story.append(Paragraph("<b>11. Audit Logs:</b> &nbsp;id, event_type, pin_id, user_id, old_value, new_value, details: Text", style_schema))
    story.append(Paragraph("<b>12. Tasks:</b> &nbsp;id, pin_id, title: Text, is_completed: Boolean", style_schema))

    story.append(Spacer(1, 4))
    story.append(Paragraph("3.2. File Descriptions", style_h2))
    story.append(Paragraph(
        "For the document ingestion and binary serialization technique of the program, we developed a specialized "
        "function called <code>burn_pins_and_markups_to_pdf</code> that translates normalized pin coordinate tuples directly into "
        "PostScript vector points on native PDF plan sheets. Below is the production implementation of this algorithm, and "
        "a rough sketch of what this looks like in organization.",
        style_normal
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 12: 3.2 FILE DESCRIPTIONS (CONTINUED)
    # =========================================================================
    file_code_text = (
        "def burn_pins_and_markups_to_pdf(input_pdf_path, pins, markups, output_pdf_path):\n"
        "    reader = pypdf.PdfReader(input_pdf_path)\n"
        "    writer = pypdf.PdfWriter()\n"
        "    for page_idx, page in enumerate(reader.pages):\n"
        "        w_pts, h_pts = float(page.mediabox.width), float(page.mediabox.height)\n"
        "        packet = io.BytesIO()\n"
        "        c = canvas.Canvas(packet, pagesize=(w_pts, h_pts))\n"
        "        for pin in [p for p in pins if p.get('page_index', 0) == page_idx]:\n"
        "            x_pt = (pin['x_percent'] / 100.0) * w_pts\n"
        "            y_pt = h_pts - ((pin['y_percent'] / 100.0) * h_pts)  # Invert Cartesian Y\n"
        "            initials = compute_subcontractor_initials(pin.get('assigned_to_company', 'PL'))\n"
        "            c.setFillColor(colors.HexColor(get_trade_color(pin.get('discipline'))))\n"
        "            c.circle(x_pt, y_pt, 14, fill=1, stroke=1)\n"
        "            c.setFillColor(colors.white)\n"
        "            c.setFont('Helvetica-Bold', 7)\n"
        "            c.drawCentredString(x_pt, y_pt - 2.5, f\"{initials} #{pin['item_number']}\")\n"
        "        c.save()\n"
        "        packet.seek(0)\n"
        "        page.merge_page(pypdf.PdfReader(packet).pages[0])\n"
        "        writer.add_page(page)\n"
        "    with open(output_pdf_path, 'wb') as f: writer.write(f)"
    )
    story.append(Paragraph(f"<font color='#0F172A'><pre>{file_code_text}</pre></font>", style_code))
    story.append(Spacer(1, 4))

    story.append(Paragraph(
        "This code takes a given plan sheet object and extracts its drawing dimensions, punch pins, vector markups, and "
        "assigned subcontractor trade stamps. Then, it translates those objects into vector PostScript overlays by calculating "
        "the exact spatial scale and burning them directly onto the PDF. To display what it would look like in human-readable format:",
        style_normal
    ))
    story.append(Paragraph(
        "<b>2 plan sheets:</b> SheetA101 SheetA102 &nbsp;&nbsp;<b>4 punch pins:</b> Pin01 Pin02 Pin03 Pin04 &nbsp;&nbsp;"
        "<b>2 vector markups:</b> Cloud01 Arrow01 &nbsp;&nbsp;<b>3 trade partners:</b> PrimeDrywall ApexElectric QuickPlumb",
        style_normal
    ))
    story.append(Spacer(1, 4))
    story.append(Paragraph("Here is a diagram of this system:", style_normal))

    file_img_path = os.path.join(ASSETS_DIR, "diagram_file_arch.png")
    if os.path.exists(file_img_path):
        story.append(Image(file_img_path, width=490, height=210))

    story.append(Spacer(1, 4))
    story.append(Paragraph("Each drawing sheet is broken into the 4 major objects that construct it, each with:", style_normal))
    story.append(Paragraph("<b>1. Sheet:</b> file_path: Text // filesystem path to PDF drawing source", style_normal))
    story.append(Paragraph("<b>2. Punch Pin:</b> x_percent, y_percent: Double // normalized spatial placement coordinates", style_normal))
    story.append(Paragraph("<b>3. Trade Stamp:</b> initials: Text, color: Text // high-contrast circle stamp icon with trade initials", style_normal))
    story.append(Paragraph("<b>4. Vector Markup:</b> coordinates_json: Text // revision clouds, arrows, callouts for spatial context", style_normal))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 13: 4. REQUIREMENTS MATRIX (PART 1)
    # =========================================================================
    story.append(Paragraph("4. Requirements Matrix", style_h1))
    story.append(Paragraph(
        "The following requirements matrix correlates the stakeholder functional requirements directly to their system "
        "components, execution triggers, and source code locations in PunchList Pro:",
        style_normal
    ))
    story.append(Spacer(1, 4))

    matrix_p1 = [
        [
            Paragraph("<b>Functional Requirement</b>", style_normal),
            Paragraph("<b>System Components</b>", style_normal),
            Paragraph("<b>Location</b>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 1: Admin edits the project &amp; drawing sheets</b><br/>"
                      "Admin creates new projects, uploads architectural PDFs, and configures building floors.", style_normal),
            Paragraph("Open New Project modal<br/>"
                      "Display upload blueprint form<br/>"
                      "Uploads PDF plan sheets<br/>"
                      "Parses pages &amp; dimensions<br/>"
                      "Updates project database", style_normal),
            Paragraph("UI (project bar, top left)<br/>"
                      "<code>NewProjectModal</code><br/>"
                      "<code>BlueprintUploadModal</code><br/>"
                      "<code>POST /api/sheets/upload</code><br/>"
                      "<code>backend/app/routers/sheets.py</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 2: Field Inspector creates a punch item</b><br/>"
                      "Field inspector drops a pin on the drawing canvas to document a defect finding.", style_normal),
            Paragraph("Click on blueprint canvas<br/>"
                      "Calculate normalized coords<br/>"
                      "Open New Punch item modal<br/>"
                      "Enters title, trade, photo<br/>"
                      "Render optimistic circle stamp", style_normal),
            Paragraph("UI (canvas, center viewport)<br/>"
                      "<code>calculateNormalizedCoords()</code><br/>"
                      "<code>NewPunchModal</code><br/>"
                      "<code>POST /api/pins</code><br/>"
                      "<code>frontend/src/components/SheetCanvas.jsx</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 3: Subcontractor executes work</b><br/>"
                      "Trade subcontractor reviews assigned queue, marks item in progress, and uploads remedy photos.", style_normal),
            Paragraph("Open 'My Work' tablet view<br/>"
                      "Click Start Work button<br/>"
                      "Capture camera proof photo<br/>"
                      "Submit for Contractor Review", style_normal),
            Paragraph("UI (dashboard, sub hub)<br/>"
                      "<code>DashboardView (Sub Hub)</code><br/>"
                      "<code>PATCH /api/pins/:id/status</code><br/>"
                      "<code>POST /api/pins/:id/photos</code><br/>"
                      "<code>backend/app/permissions.py:185</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 4: General Contractor quality sign-off</b><br/>"
                      "General contractor inspects completed trade work and approves to Admin or rejects.", style_normal),
            Paragraph("Open GC Review Queue<br/>"
                      "Inspect proof photos &amp; notes<br/>"
                      "Click Approve to Admin<br/>"
                      "Or click Reject back to Sub", style_normal),
            Paragraph("UI (dashboard, GC hub)<br/>"
                      "<code>DashboardView (GC Queue)</code><br/>"
                      "<code>validate_status_transition()</code><br/>"
                      "<code>backend/app/permissions.py:202</code>", style_normal)
        ]
    ]

    tm1 = Table(matrix_p1, colWidths=[155, 160, 185])
    tm1.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tm1)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 14: 4. REQUIREMENTS MATRIX (PART 2)
    # =========================================================================
    story.append(Paragraph("4. Requirements Matrix (Continued)", style_h1))
    story.append(Spacer(1, 4))

    matrix_p2 = [
        [
            Paragraph("<b>Functional Requirement</b>", style_normal),
            Paragraph("<b>System Components</b>", style_normal),
            Paragraph("<b>Location</b>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 5: Facility Administrator close-out &amp; deletion</b><br/>"
                      "Admin exercises sole authority to formally close verified punch items or delete invalid pins.", style_normal),
            Paragraph("Verify GC inspection sign-off<br/>"
                      "Click Close Item button<br/>"
                      "Or click Delete Pin button<br/>"
                      "Commit audit trail to log", style_normal),
            Paragraph("UI (pin drawer header)<br/>"
                      "<code>PinDetailModal</code><br/>"
                      "<code>DELETE /api/pins/:id</code><br/>"
                      "<code>backend/app/permissions.py:15</code><br/>"
                      "<code>backend/app/routers/pins.py:326</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 6: Owner reads project progress</b><br/>"
                      "Owner / Client Rep accesses read-only view across all active projects and audits.", style_normal),
            Paragraph("Open application dashboard<br/>"
                      "Display all project summaries<br/>"
                      "Inspect punch list breakdown<br/>"
                      "Prevent unauthorized edits", style_normal),
            Paragraph("UI (dashboard, owner hub)<br/>"
                      "<code>GET /api/projects</code> (all projects)<br/>"
                      "<code>DashboardView (Owner Hub)</code><br/>"
                      "<code>backend/app/permissions.py:69</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 7: Architect draws vector markups</b><br/>"
                      "Architect annotates drawings with revision clouds, arrows, lines, and callouts.", style_normal),
            Paragraph("Click markup tool on toolbar<br/>"
                      "Drag on blueprint canvas<br/>"
                      "Serialize vector coordinates<br/>"
                      "Broadcast markup to team", style_normal),
            Paragraph("UI (canvas toolbar, top right)<br/>"
                      "<code>SheetCanvas Toolbar</code><br/>"
                      "<code>POST /api/sheets/:id/markups</code><br/>"
                      "<code>backend/app/routers/markups.py</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 8: User operates in offline mode</b><br/>"
                      "Field inspector creates pins and captures photos in dead zones without network.", style_normal),
            Paragraph("Detect network offline state<br/>"
                      "Commit to Dexie IndexedDB<br/>"
                      "Display offline indicator<br/>"
                      "Auto-replay queue online", style_normal),
            Paragraph("UI (status badge, bottom left)<br/>"
                      "<code>Dexie.js IndexedDB Store</code><br/>"
                      "<code>useNetworkStatus.js</code><br/>"
                      "<code>POST /api/sync/replay</code><br/>"
                      "<code>backend/app/routers/sync.py</code>", style_normal)
        ]
    ]

    tm2 = Table(matrix_p2, colWidths=[155, 160, 185])
    tm2.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tm2)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 15: 4. REQUIREMENTS MATRIX (PART 3)
    # =========================================================================
    story.append(Paragraph("4. Requirements Matrix (Continued)", style_h1))
    story.append(Spacer(1, 4))

    matrix_p3 = [
        [
            Paragraph("<b>Functional Requirement</b>", style_normal),
            Paragraph("<b>System Components</b>", style_normal),
            Paragraph("<b>Location</b>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 9: User exports annotated PDF plan set</b><br/>"
                      "User downloads high-resolution PDF with circle stamps and markups burned in.", style_normal),
            Paragraph("Click Annotated PDF button<br/>"
                      "Compile vector stamp layer<br/>"
                      "Merge with original plan sheet<br/>"
                      "Stream PDF file to client", style_normal),
            Paragraph("UI (dashboard export bar)<br/>"
                      "<code>GET /api/projects/:id/export/annotated-pdf</code><br/>"
                      "<code>burn_pins_and_markups_to_pdf()</code><br/>"
                      "<code>backend/app/routers/reports.py</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 10: Real-time team collaboration</b><br/>"
                      "Team members receive instant updates of pin placements and status changes.", style_normal),
            Paragraph("Connect Socket.IO client<br/>"
                      "Join project channel room<br/>"
                      "Listen for 'pin:updated'<br/>"
                      "Update canvas display live", style_normal),
            Paragraph("WebSocket engine<br/>"
                      "<code>sio.emit('pin:updated')</code><br/>"
                      "<code>frontend/src/services/api.js</code><br/>"
                      "<code>backend/app/sio.py</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 11: User interacts with the canvas</b><br/>"
                      "User pans across blueprint, zooms in/out, and toggles layers (pins, grid, rooms).", style_normal),
            Paragraph("Click and drag mouse / touch<br/>"
                      "Pinch or click + / - zoom<br/>"
                      "Toggle layer visibility<br/>"
                      "Re-render canvas display", style_normal),
            Paragraph("UI (canvas controls, right side)<br/>"
                      "<code>SheetCanvas (handlePanZoom)</code><br/>"
                      "<code>Toolbar.jsx</code><br/>"
                      "<code>BlueprintViewer.jsx</code>", style_normal)
        ],
        [
            Paragraph("<b>Use Case 12: User clicks help &amp; role guide</b><br/>"
                      "User views onboarding guide, role permissions, and keyboard shortcuts.", style_normal),
            Paragraph("Click help icon button<br/>"
                      "Display modal dialogue<br/>"
                      "Show role capabilities guide", style_normal),
            Paragraph("UI (navbar, top right)<br/>"
                      "<code>QuickSearchModal</code><br/>"
                      "<code>AppShell.jsx</code>", style_normal)
        ]
    ]

    tm3 = Table(matrix_p3, colWidths=[155, 160, 185])
    tm3.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'TOP'),
        ('TOPPADDING', (0, 0), (-1, -1), 5),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 5),
    ]))
    story.append(tm3)

    story.append(Spacer(1, 8))
    story.append(Paragraph(
        "<b>Non-Functional Verification:</b> The architecture guarantees sub-second canvas touch rendering (&lt; 16ms frame target), "
        "sub-500ms API response latency for authenticated REST mutations, 60-second WebSocket heartbeat verification, and zero "
        "data loss across simulated offline disconnection cycles.",
        style_normal
    ))

    story.append(PageBreak())

    # =========================================================================
    # PAGE 16: APPENDIX A – AGREEMENT
    # =========================================================================
    story.append(Paragraph("Appendix", style_h1))
    story.append(Paragraph("A – Agreement Between Customer and Contractor", style_h2))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "By signing this document, the customer and developers agree to the details specified in this document, specifically: "
        "the scope of the project, the functional requirements, and the non-functional requirements. Also, they continue to agree "
        "to collaborate in the process of developing the software over the course of the development lifecycle. In the event that "
        "the customer wishes to make any changes to this document, they will request so by contacting the development team directly "
        "to request change.",
        style_normal
    ))
    story.append(Spacer(1, 14))

    story.append(Paragraph("Customer:", style_h3))
    cust_data = [
        [
            Paragraph("<b>Name</b>", style_normal),
            Paragraph("<b>Signature</b>", style_normal),
            Paragraph("<b>Date</b>", style_normal),
            Paragraph("<b>Comments</b>", style_normal)
        ],
        [
            Paragraph("Emily Tien", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Emily Tien</font>", style_normal),
            Paragraph("11-13-25", style_normal),
            Paragraph("Approved as presented", style_normal)
        ],
        [
            Paragraph("Stephanie Lazarus", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Stephanie Lazarus</font>", style_normal),
            Paragraph("11-13-25", style_normal),
            Paragraph("Approved for field testing", style_normal)
        ]
    ]
    tc = Table(cust_data, colWidths=[120, 130, 80, 170])
    tc.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(tc)

    story.append(Spacer(1, 18))
    story.append(Paragraph("Team:", style_h3))
    team_data = [
        [
            Paragraph("<b>Name</b>", style_normal),
            Paragraph("<b>Signature</b>", style_normal),
            Paragraph("<b>Date</b>", style_normal),
            Paragraph("<b>Comments</b>", style_normal)
        ],
        [
            Paragraph("Nathan Rubiano", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Nathan Rubiano</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("Frontend &amp; Canvas Lead", style_normal)
        ],
        [
            Paragraph("Muhammad Khan", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Muhammad Khan</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("Backend &amp; Database Lead", style_normal)
        ],
        [
            Paragraph("Satya Thakur", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Satya Thakur</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("DevOps &amp; Security Lead", style_normal)
        ]
    ]
    tt = Table(team_data, colWidths=[120, 130, 80, 170])
    tt.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(tt)

    story.append(PageBreak())

    # =========================================================================
    # PAGE 17: APPENDIX B – PEER REVIEW & APPENDIX C – CONTRIBUTIONS
    # =========================================================================
    story.append(Paragraph("B – Peer Review Sign-Off", style_h2))
    story.append(Spacer(1, 4))
    story.append(Paragraph(
        "By signing here, the development team continues to agree to work together and collaborate on the processes outlined "
        "in this document. If there are major issues to address, they should refrain from signing until they are resolved.",
        style_normal
    ))
    story.append(Spacer(1, 10))

    peer_data = [
        [
            Paragraph("<b>Name</b>", style_normal),
            Paragraph("<b>Signature</b>", style_normal),
            Paragraph("<b>Date</b>", style_normal),
            Paragraph("<b>Comments</b>", style_normal)
        ],
        [
            Paragraph("Nathan Rubiano", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Nathan Rubiano</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("All sections peer-reviewed", style_normal)
        ],
        [
            Paragraph("Muhammad Khan", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Muhammad Khan</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("Schema &amp; API approved", style_normal)
        ],
        [
            Paragraph("Satya Thakur", style_normal),
            Paragraph("<font name='Times-Italic' size=11>Satya Thakur</font>", style_normal),
            Paragraph("11-12-25", style_normal),
            Paragraph("Architecture &amp; RBAC approved", style_normal)
        ]
    ]
    tp = Table(peer_data, colWidths=[120, 130, 80, 170])
    tp.setStyle(TableStyle([
        ('BACKGROUND', (0, 0), (-1, 0), colors.HexColor("#F1F5F9")),
        ('GRID', (0, 0), (-1, -1), 0.75, colors.HexColor("#94A3B8")),
        ('VALIGN', (0, 0), (-1, -1), 'MIDDLE'),
        ('TOPPADDING', (0, 0), (-1, -1), 7),
        ('BOTTOMPADDING', (0, 0), (-1, -1), 7),
    ]))
    story.append(tp)

    story.append(Spacer(1, 24))
    story.append(Paragraph("C – Document Contributions", style_h2))
    story.append(Spacer(1, 6))
    story.append(Paragraph(
        "This document has been contributed by: <b>Nathan Rubiano</b>, <b>Muhammad Khan</b>, and <b>Satya Thakur</b>.",
        style_normal
    ))
    story.append(Spacer(1, 6))

    contrib_details = [
        "<b>Nathan Rubiano:</b> Architectural Design (Section 2.1), SheetCanvas &amp; Touch Viewport Normalization specifications, DrawingRasterEngine integration, and Use Cases 1-4 requirements mapping.",
        "<b>Muhammad Khan:</b> Persistent Data Storage (Section 3.1), Relational Schema Design (COMPANIES, PROJECTS, SHEETS, PINS), SQLite/PostgreSQL Dual Engine specifications, and Use Cases 5-8 requirements mapping.",
        "<b>Satya Thakur:</b> Runtime Workflow &amp; Sequence Diagram (Section 2.2), RBAC Access Control Engine (6 canonical roles), Socket.IO Real-Time Synchronization architecture, PDF Vector Burn-in algorithms (Section 3.2), and Appendix sign-offs."
    ]
    for c in contrib_details:
        story.append(Paragraph(f"• {c}", style_normal_indent))

    # Build the document
    doc.build(story, canvasmaker=NumberedCanvas)
    print("PDF build complete:", OUTPUT_PDF)


if __name__ == "__main__":
    create_sdd()
