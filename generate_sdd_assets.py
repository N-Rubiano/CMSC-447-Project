"""
generate_sdd_assets.py
Generates high-resolution diagrams and logos for the PunchList Pro Software Design Document (SDD).
"""
import os
from PIL import Image, ImageDraw, ImageFont

ASSETS_DIR = r"c:\Users\tsaty\Downloads\PunchList\sdd_assets"
os.makedirs(ASSETS_DIR, exist_ok=True)

def get_font(size=14, bold=False):
    font_names = [
        "arialbd.ttf" if bold else "arial.ttf",
        "calibrib.ttf" if bold else "calibri.ttf",
        "segoeuib.ttf" if bold else "segoeui.ttf",
        "timesbd.ttf" if bold else "times.ttf"
    ]
    for name in font_names:
        try:
            return ImageFont.truetype(name, size)
        except Exception:
            continue
    return ImageFont.load_default()

# ---------------------------------------------------------------------------
# 1. UMBC Shield Logo
# ---------------------------------------------------------------------------
def generate_umbc_shield():
    w, h = 400, 480
    im = Image.new("RGBA", (w, h), (255, 255, 255, 0))
    d = ImageDraw.Draw(im)

    # Shield boundary
    # Top flat with slight arch, curved sides going to bottom point
    shield_pts = [
        (60, 40), (340, 40),
        (340, 240),
        (200, 380),
        (60, 240)
    ]
    # Draw outer black shield
    d.polygon(shield_pts, fill="#000000", outline="#000000")

    # Inner shield boundary
    inner_pts = [
        (70, 50), (330, 50),
        (330, 235),
        (200, 365),
        (70, 235)
    ]
    d.polygon(inner_pts, fill="#FFFFFF", outline="#000000", width=3)

    # Center intersection at (200, 195)
    cx, cy = 200, 195
    # Quadrant 1 (Top-Left): Maryland Checkers (Black & Gold)
    # Draw gold background
    d.polygon([(72, 52), (198, 52), (198, cy), (72, cy)], fill="#F1B82D")
    # Black diagonal bars
    d.polygon([(72, 52), (120, 52), (72, 100)], fill="#000000")
    d.polygon([(140, 52), (198, 52), (198, 70), (90, cy), (72, cy), (72, 170)], fill="#000000")
    d.polygon([(198, 110), (198, 170), (145, cy), (120, cy)], fill="#000000")

    # Quadrant 2 (Top-Right): Red and White Crossland Cross
    d.polygon([(202, 52), (328, 52), (328, cy), (202, cy)], fill="#FFFFFF")
    # Red Cross
    red = "#C8102E"
    # vertical arm
    d.rectangle([250, 60, 280, cy - 10], fill=red)
    # horizontal arm
    d.rectangle([215, 105, 315, 140], fill=red)
    # cross bottony circles
    d.ellipse([257, 50, 273, 66], fill=red)
    d.ellipse([205, 114, 221, 131], fill=red)
    d.ellipse([309, 114, 325, 131], fill=red)

    # Quadrant 3 (Bottom-Left): Red & White Crossland
    d.polygon([(72, cy+2), (198, cy+2), (198, 360), (72, 235)], fill="#FFFFFF")
    d.rectangle([120, cy+10, 150, 320], fill=red)
    d.rectangle([85, cy+50, 185, cy+85], fill=red)
    d.ellipse([127, 315, 143, 331], fill=red)
    d.ellipse([75, cy+59, 91, cy+76], fill=red)

    # Quadrant 4 (Bottom-Right): Maryland Checkers (Gold & Black)
    d.polygon([(202, cy+2), (328, cy+2), (328, 235), (200, 360)], fill="#F1B82D")
    d.polygon([(202, cy+10), (202, cy+70), (260, cy+2), (202, cy+2)], fill="#000000")
    d.polygon([(202, cy+110), (280, cy+2), (328, cy+2), (328, cy+30), (202, 330)], fill="#000000")
    d.polygon([(250, 310), (328, 170), (328, 235)], fill="#000000")

    # Divider lines
    d.line([(200, 48), (200, 366)], fill="#000000", width=4)
    d.line([(70, cy), (330, cy)], fill="#000000", width=4)
    # Redraw outer border cleanly
    d.polygon(inner_pts, outline="#000000", width=4)

    # UMBC Text below shield
    f_umbc = get_font(42, bold=True)
    d.text((140, 400), "UMBC", fill="#000000", font=f_umbc)

    path = os.path.join(ASSETS_DIR, "umbc_logo.png")
    im.save(path)
    print("Saved:", path)
    return path

# ---------------------------------------------------------------------------
# 2. Sequence Diagram: Punch Pin Lifecycle & Real-Time Sync
# ---------------------------------------------------------------------------
def generate_sequence_diagram():
    w, h = 1800, 2400
    im = Image.new("RGB", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(im)

    f_title = get_font(32, bold=True)
    f_header = get_font(20, bold=True)
    f_label = get_font(18, bold=True)
    f_msg = get_font(16, bold=False)
    f_msg_bold = get_font(16, bold=True)
    f_note = get_font(15, bold=False)

    # Title box
    d.rectangle([50, 40, 550, 100], fill="#F8FAFC", outline="#334155", width=2)
    d.text((70, 55), "System Architecture Sequence Diagram", fill="#0F172A", font=f_title)

    # Actors and Lifelines (6 Lifelines)
    actors = [
        ("Field User /\nInspector", 170),
        ("Frontend UI\n(SheetCanvas)", 470),
        ("Offline Store\n(Dexie DB)", 770),
        ("FastAPI Backend\n(/api/pins)", 1070),
        ("RBAC Engine\n(permissions.py)", 1370),
        ("Database / SIO\n(Postgres + SIO)", 1650),
    ]

    top_y = 150
    bot_y = 2280

    for name, x in actors:
        # Actor box top
        d.rectangle([x-100, top_y, x+100, top_y+70], fill="#F1F5F9", outline="#0F172A", width=2)
        lines = name.split("\n")
        if len(lines) == 1:
            d.text((x-70, top_y+24), lines[0], fill="#0F172A", font=f_header)
        else:
            d.text((x-80, top_y+12), lines[0], fill="#0F172A", font=f_header)
            d.text((x-80, top_y+38), lines[1], fill="#475569", font=f_label)

        # Lifeline dash
        for ly in range(top_y+70, bot_y, 16):
            d.line([(x, ly), (x, ly+10)], fill="#94A3B8", width=2)

        # Actor box bottom
        d.rectangle([x-100, bot_y, x+100, bot_y+70], fill="#F1F5F9", outline="#0F172A", width=2)
        if len(lines) == 1:
            d.text((x-70, bot_y+24), lines[0], fill="#0F172A", font=f_header)
        else:
            d.text((x-80, bot_y+12), lines[0], fill="#0F172A", font=f_header)
            d.text((x-80, bot_y+38), lines[1], fill="#475569", font=f_label)

    # Helper function for drawing messages
    def draw_msg(y, x1, x2, label, is_return=False, note=""):
        # line
        if is_return:
            for lx in range(min(x1, x2), max(x1, x2), 12):
                d.line([(lx, y), (lx+7, y)], fill="#2563EB", width=2)
        else:
            d.line([(x1, y), (x2, y)], fill="#0F172A", width=2)

        # arrow head
        ah = 8
        if x2 > x1:
            d.polygon([(x2, y), (x2-ah, y-5), (x2-ah, y+5)], fill="#0F172A" if not is_return else "#2563EB")
        else:
            d.polygon([(x2, y), (x2+ah, y-5), (x2+ah, y+5)], fill="#0F172A" if not is_return else "#2563EB")

        # label text
        tx = (x1 + x2) // 2 - 140
        d.text((tx, y-22), label, fill="#0F172A" if not is_return else "#1D4ED8", font=f_msg)
        if note:
            d.text((tx, y+4), note, fill="#64748B", font=f_note)

    def draw_activation(x, y1, y2, color="#E2E8F0"):
        d.rectangle([x-12, y1, x+12, y2], fill=color, outline="#0F172A", width=2)

    def draw_frame(y1, y2, title, cond1="", split_y=0, cond2=""):
        d.rectangle([70, y1, 1730, y2], fill=None, outline="#475569", width=2)
        # title tag
        d.rectangle([70, y1, 220, y1+26], fill="#E2E8F0", outline="#475569", width=1)
        d.text((80, y1+4), title, fill="#0F172A", font=f_msg_bold)
        if cond1:
            d.text((90, y1+32), f"[{cond1}]", fill="#2563EB", font=f_msg_bold)
        if split_y:
            for sx in range(70, 1730, 14):
                d.line([(sx, split_y), (sx+8, split_y)], fill="#64748B", width=1)
            if cond2:
                d.text((90, split_y+10), f"[{cond2}]", fill="#DC2626", font=f_msg_bold)

    # ---------------- Phase 1: Tap Canvas & Pin Placement ----------------
    draw_activation(470, 270, 480)
    draw_msg(280, 170, 470, "1: tapCanvas(touch_x, touch_y)", note="User taps blueprint location on tablet")

    draw_msg(340, 470, 470, "2: calculateNormalizedCoords(x%, y%)", note="Map viewport transform -> (x_pct, y_pct)")
    d.line([(470, 340), (510, 340)], fill="#0F172A", width=2)
    d.line([(510, 340), (510, 370)], fill="#0F172A", width=2)
    d.line([(510, 370), (470, 370)], fill="#0F172A", width=2)
    d.polygon([(470, 370), (478, 365), (478, 375)], fill="#0F172A")

    draw_msg(420, 470, 170, "3: openNewPunchModal(coords, sheet_id)", is_return=True)
    draw_msg(470, 170, 470, "4: submitPunchItem(title, trade, photo, desc)")

    # ---------------- Phase 2: Local Cache & Offline Verification ---------
    draw_activation(770, 520, 680)
    draw_msg(530, 470, 770, "5: enqueueMutation({op: 'CREATE_PIN', data})")
    draw_msg(590, 770, 470, "6: return localPinId (optimistic render)", is_return=True)
    draw_msg(640, 470, 170, "7: renderOptimisticPinStamp([TradeInitials] #TEMPID)", is_return=True)

    # ---------------- Phase 3: Network Transmission & RBAC ----------------
    draw_frame(700, 1400, "alt: Network Connectivity", "Online / Sync Connection Active", 1120, "Offline / Cell Dead Zone")

    draw_activation(1070, 760, 1080)
    draw_msg(760, 470, 1070, "8: POST /api/pins (Bearer JWT, multipart payload)")
    draw_activation(1370, 810, 940)
    draw_msg(820, 1070, 1370, "9: has_permission(user, 'pin.create') & can_access_project()")
    draw_msg(900, 1370, 1070, "10: authorize_result (HTTP 200 / Scope Verified)", is_return=True)

    draw_activation(1650, 950, 1060)
    draw_msg(960, 1070, 1650, "11: SQL INSERT INTO pins, audit_logs (Atomic Tx)")
    draw_msg(1010, 1650, 1070, "12: Commit OK (pin_id='pin-082', item_no=24)", is_return=True)
    draw_msg(1060, 1070, 470, "13: 201 Created {pin_record, sync_timestamp}", is_return=True)

    # Offline branch
    draw_msg(1180, 470, 770, "14: persistToIndexedDB(queueStatus='PENDING_SYNC')")
    draw_msg(1240, 770, 470, "15: triggerSyncWhenOnlineEvent()", is_return=True)
    draw_msg(1320, 470, 170, "16: displayOfflineBanner('Stored Locally · Will Sync')", is_return=True)

    # ---------------- Phase 4: WebSocket Real-Time Broadcast --------------
    draw_activation(1650, 1440, 1600)
    draw_msg(1450, 1070, 1650, "17: sio.emit('pin:created', pin_data, room='project:proj-1')")
    draw_msg(1520, 1650, 470, "18: ws.on('pin:created') -> Broadcast to all connected clients", is_return=True)
    draw_msg(1580, 470, 170, "19: updateLiveCanvas(livePins, playHapticPing)", is_return=True)

    # ---------------- Phase 5: Multi-Role Status Workflow -----------------
    draw_frame(1640, 2220, "loop: Multi-Role Resolution & Sign-Off Cycle", "Subcontractor -> GC -> Facility Admin")

    draw_msg(1700, 170, 470, "20: subcommenceWork() -> PATCH /api/pins/:id/status ('in_progress')")
    draw_msg(1760, 470, 1070, "21: updatePinStatus(in_progress, proofPhoto)")
    draw_msg(1820, 1070, 1650, "22: UPDATE status='in_progress' & INSERT audit_log")
    draw_msg(1880, 170, 470, "23: subSubmitWork() -> PATCH /status ('submitted_for_contractor_review')")
    draw_msg(1940, 470, 1070, "24: contractorReviewApprove() -> ('submitted_for_admin_review')")
    draw_msg(2000, 1070, 1370, "25: validate_status_transition(GC, target='submitted_for_admin_review')")
    draw_msg(2060, 1370, 1070, "26: transitionValid: true", is_return=True)
    draw_msg(2120, 170, 1070, "27: adminClosePin() -> Sole Authority ('closed')")
    draw_msg(2170, 1070, 1650, "28: UPDATE status='closed', closed_at=NOW() & Audit Trail Burned")

    path = os.path.join(ASSETS_DIR, "diagram_sequence.png")
    im.save(path)
    print("Saved:", path)
    return path

# ---------------------------------------------------------------------------
# 3. Class / Module Decomposition Diagram
# ---------------------------------------------------------------------------
def generate_class_diagram():
    w, h = 1800, 2400
    im = Image.new("RGB", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(im)

    f_title = get_font(32, bold=True)
    f_cname = get_font(20, bold=True)
    f_body = get_font(15, bold=False)
    f_body_b = get_font(15, bold=True)
    f_tag = get_font(14, bold=True)

    # Title Box
    d.rectangle([50, 40, 550, 95], fill="#F8FAFC", outline="#334155", width=2)
    d.text((70, 52), "System Module Decomposition Diagram", fill="#0F172A", font=f_title)

    def draw_class(x, y, w_box, name, stereotype, attrs, methods, color="#EFF6FF", border="#1E40AF"):
        # Header
        h_head = 55
        d.rectangle([x, y, x+w_box, y+h_head], fill=color, outline=border, width=2)
        if stereotype:
            d.text((x + 15, y + 6), f"«{stereotype}»", fill="#64748B", font=f_tag)
            d.text((x + 15, y + 26), name, fill="#0F172A", font=f_cname)
        else:
            d.text((x + 15, y + 16), name, fill="#0F172A", font=f_cname)

        # Attributes section
        h_attr = len(attrs) * 22 + 16
        d.rectangle([x, y+h_head, x+w_box, y+h_head+h_attr], fill="#FFFFFF", outline=border, width=2)
        curr_y = y + h_head + 10
        for a in attrs:
            d.text((x + 12, curr_y), a, fill="#1E293B", font=f_body)
            curr_y += 22

        # Methods section
        h_meth = len(methods) * 22 + 16
        y_m = y + h_head + h_attr
        d.rectangle([x, y_m, x+w_box, y_m+h_meth], fill="#F8FAFC", outline=border, width=2)
        curr_y = y_m + 10
        for m in methods:
            d.text((x + 12, curr_y), m, fill="#0F172A", font=f_body)
            curr_y += 22

        return y_m + h_meth

    # 1. SheetViewerCanvas (Frontend Hub)
    draw_class(
        70, 140, 520, "SheetCanvas", "Frontend Component",
        [
            "- activeSheet: Sheet",
            "- pins: Array<PunchPin>",
            "- markups: Array<Markup>",
            "- zoom: Number = 1.0",
            "- panOffset: Point = {x, y}",
            "- selectedPinId: String | null",
            "- activeTool: ToolType = 'select'",
            "- isOffline: Boolean = false"
        ],
        [
            "+ handleCanvasClick(event: MouseEvent): void",
            "+ calculateNormalizedCoords(clientX, clientY): Coords",
            "+ renderPinsOnCanvas(ctx: CanvasRenderingContext2D): void",
            "+ renderVectorMarkups(ctx, markups): void",
            "+ zoomIn(): void | zoomOut(): void",
            "+ resetViewport(): void",
            "+ exportAnnotatedCanvasToBlob(): Promise<Blob>"
        ],
        color="#FEF3C7", border="#D97706"
    )

    # 2. PunchPin (Core Domain Model)
    draw_class(
        660, 140, 500, "PunchPin", "Domain Entity",
        [
            "- id: String [UUID]",
            "- project_id: String [FK]",
            "- sheet_id: String [FK]",
            "- item_number: Integer",
            "- title: String",
            "- description: String",
            "- x_percent: Double",
            "- y_percent: Double",
            "- status: PinStatus",
            "- priority: PriorityLevel",
            "- discipline: DisciplineType",
            "- assigned_to_company: String",
            "- created_by_user_id: String [FK]"
        ],
        [
            "+ getStampInitials(): String",
            "+ canTransitionTo(nextStatus, userRole): Boolean",
            "+ addComment(body: String, author: User): Comment",
            "+ attachPhoto(file: File, type: PhotoType): Photo",
            "+ toGeoJSON(): Object",
            "+ isOverdue(): Boolean"
        ],
        color="#EFF6FF", border="#2563EB"
    )

    # 3. RBACAccessController
    draw_class(
        1220, 140, 510, "RBACAccessController", "Security & Auth",
        [
            "+ ROLE_PERMISSIONS: Map<Role, Set<String>>",
            "+ ROLE_LABELS: Map<Role, String>",
            "- currentUser: UserPayload",
            "- activeProject: Project"
        ],
        [
            "+ hasPermission(user: User, perm: String): Boolean",
            "+ canAccessProject(user: User, projId: String): Boolean",
            "+ canAccessPin(user: User, pin: PunchPin): Boolean",
            "+ validateStatusTransition(user, pin, nextStatus): Result",
            "+ canClosePin(user: User): Boolean // Admin Sole",
            "+ canDeletePin(user: User): Boolean // Admin Sole",
            "+ canUploadBlueprints(user: User): Boolean"
        ],
        color="#FEE2E2", border="#DC2626"
    )

    # 4. DrawingRasterEngine (PDF.js Processing)
    draw_class(
        70, 720, 520, "DrawingRasterEngine", "PDF / Graphics Engine",
        [
            "- pdfDocument: PDFDocumentProxy",
            "- activePageNumber: Integer",
            "- baseScaleDPI: Integer = 150",
            "- tileCache: Map<TileKey, ImageBitmap>",
            "- originalDimensions: {widthPts, heightPts}"
        ],
        [
            "+ loadPDFDocument(url: String): Promise<PDFDoc>",
            "+ renderPageToCanvas(pageNum, canvas, scale): Promise",
            "+ extractVectorDimensions(pdfPage): BoundingBox",
            "+ generateThumbnail(width, height): Promise<String>",
            "+ invalidateTileCache(): void"
        ],
        color="#F3E8FF", border="#7C3AED"
    )

    # 5. OfflineSyncQueue (Dexie.js Offline Pipeline)
    draw_class(
        660, 720, 500, "OfflineSyncQueue", "Client Persistence",
        [
            "- db: DexieDatabase",
            "- pendingMutations: Table<MutationEntry>",
            "- cachedSheets: Table<SheetBlob>",
            "- cachedPins: Table<PunchPin>",
            "- isSyncing: Boolean = false"
        ],
        [
            "+ enqueueMutation(mutation: Mutation): Promise<Number>",
            "+ getPendingMutations(): Promise<Array<Mutation>>",
            "+ replaySyncQueue(apiClient: ApiClient): Promise<Report>",
            "+ resolveConflict(localRecord, remoteRecord): MergedRecord",
            "+ clearSyncedEntries(syncedIds: Array): Promise<void>"
        ],
        color="#DCFCE7", border="#16A34A"
    )

    # 6. StatusWorkflowEngine (State Machine)
    draw_class(
        1220, 720, 510, "StatusWorkflowEngine", "State Machine Service",
        [
            "+ STATE_OPEN: String = 'open'",
            "+ STATE_IN_PROGRESS: String = 'in_progress'",
            "+ STATE_GC_REVIEW: String = 'contractor_review'",
            "+ STATE_ADMIN_REVIEW: String = 'admin_review'",
            "+ STATE_CLOSED: String = 'closed'"
        ],
        [
            "+ getAllowedTransitions(role: UserRole, current: Status): Array",
            "+ executeTransition(pin: PunchPin, next: Status, user): Promise",
            "+ notifyAssignedParties(pin, transitionEvent): void",
            "+ logAuditEntry(pin, prev, curr, user): Promise<AuditLog>"
        ],
        color="#FEF3C7", border="#B45309"
    )

    # 7. ReportExportEngine (Annotated PDF & CSV Generator)
    draw_class(
        70, 1300, 520, "ReportExportEngine", "Reporting Subsystem",
        [
            "- reportType: 'annotated_pdf' | 'punch_summary_pdf' | 'csv'",
            "- targetProject: Project",
            "- filteredPins: Array<PunchPin>",
            "- drawingResolution: DPI = 300"
        ],
        [
            "+ generateAnnotatedPlanSetPDF(sheetId): Promise<FileStream>",
            "+ generateExecutivePunchReportPDF(projId): Promise<FileStream>",
            "+ exportCSVDataset(pins: Array): String",
            "+ burnPinsAndMarkupsToPDFPage(pageStream, pins, markups): Stream",
            "+ attachHighResPhotoEvidenceGrid(storyboardPins): void"
        ],
        color="#E0E7FF", border="#4338CA"
    )

    # 8. WebSocketSyncEngine (Socket.IO Client & Server)
    draw_class(
        660, 1300, 500, "WebSocketSyncEngine", "Real-Time Comms",
        [
            "- socket: SocketIOClient",
            "- activeRooms: Set<String>",
            "- heartbeatInterval: Timer",
            "- connectionState: 'connected' | 'reconnecting' | 'offline'"
        ],
        [
            "+ connect(authToken: String): void",
            "+ joinProjectRoom(projectId: String): void",
            "+ leaveProjectRoom(projectId: String): void",
            "+ broadcastPinCreated(pin: PunchPin): void",
            "+ broadcastPinUpdated(pin: PunchPin): void",
            "+ subscribeToEvents(eventMap: Object): void"
        ],
        color="#FFEDD5", border="#EA580C"
    )

    # 9. AuditLog & Provenance Engine
    draw_class(
        1220, 1300, 510, "AuditLogEngine", "Compliance & Forensics",
        [
            "- auditTable: Table<AuditEntry>",
            "- hashChain: SHA256Checksum",
            "- logQueue: Queue<AuditEvent>"
        ],
        [
            "+ recordEvent(eventType: String, pinId, user, diff): void",
            "+ getPinAuditHistory(pinId: String): Promise<Array<AuditLog>>",
            "+ exportImmutableAuditTrail(projId): Stream",
            "+ verifyAuditIntegrity(auditRecords): Boolean"
        ],
        color="#F1F5F9", border="#475569"
    )

    # Draw Association Lines & Connectors
    # SheetCanvas -> PunchPin
    d.line([(590, 240), (660, 240)], fill="#2563EB", width=3)
    d.polygon([(660, 240), (650, 235), (650, 245)], fill="#2563EB")
    d.text((605, 220), "1..*", fill="#0F172A", font=f_tag)

    # PunchPin -> RBAC
    d.line([(1160, 240), (1220, 240)], fill="#DC2626", width=3)
    d.polygon([(1220, 240), (1210, 235), (1210, 245)], fill="#DC2626")
    d.text((1170, 220), "validates", fill="#DC2626", font=f_tag)

    # SheetCanvas -> DrawingRasterEngine
    d.line([(330, 560), (330, 720)], fill="#7C3AED", width=3)
    d.polygon([(330, 720), (325, 710), (335, 710)], fill="#7C3AED")
    d.text((340, 630), "renders via", fill="#7C3AED", font=f_tag)

    # PunchPin -> OfflineSyncQueue
    d.line([(910, 590), (910, 720)], fill="#16A34A", width=3)
    d.polygon([(910, 720), (905, 710), (915, 710)], fill="#16A34A")
    d.text((920, 640), "caches in", fill="#16A34A", font=f_tag)

    # RBAC -> StatusWorkflowEngine
    d.line([(1475, 480), (1475, 720)], fill="#B45309", width=3)
    d.polygon([(1475, 720), (1470, 710), (1480, 710)], fill="#B45309")
    d.text((1485, 630), "governs", fill="#B45309", font=f_tag)

    # DrawingRasterEngine -> ReportExportEngine
    d.line([(330, 1140), (330, 1300)], fill="#4338CA", width=3)
    d.polygon([(330, 1300), (325, 1290), (335, 1290)], fill="#4338CA")
    d.text((340, 1210), "composites", fill="#4338CA", font=f_tag)

    # OfflineSyncQueue -> WebSocketSyncEngine
    d.line([(910, 1140), (910, 1300)], fill="#EA580C", width=3)
    d.polygon([(910, 1300), (905, 1290), (915, 1290)], fill="#EA580C")
    d.text((920, 1210), "flushes via", fill="#EA580C", font=f_tag)

    # StatusWorkflowEngine -> AuditLogEngine
    d.line([(1475, 1080), (1475, 1300)], fill="#475569", width=3)
    d.polygon([(1475, 1300), (1470, 1290), (1480, 1290)], fill="#475569")
    d.text((1485, 1210), "persists to", fill="#475569", font=f_tag)

    path = os.path.join(ASSETS_DIR, "diagram_class.png")
    im.save(path)
    print("Saved:", path)
    return path

# ---------------------------------------------------------------------------
# 4. Entity-Relationship Diagram (ERD)
# ---------------------------------------------------------------------------
def generate_erd_diagram():
    w, h = 1800, 2400
    im = Image.new("RGB", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(im)

    f_title = get_font(32, bold=True)
    f_tname = get_font(20, bold=True)
    f_fld = get_font(15, bold=False)
    f_fld_pk = get_font(15, bold=True)
    f_rel = get_font(13, bold=True)

    # Title Box
    d.rectangle([50, 40, 560, 95], fill="#F8FAFC", outline="#334155", width=2)
    d.text((70, 52), "Entity-Relationship (ER) Database Schema", fill="#0F172A", font=f_title)

    def draw_table(x, y, w_box, name, fields, color="#F8FAFC", border="#334155"):
        # Header
        h_head = 45
        d.rectangle([x, y, x+w_box, y+h_head], fill=color, outline=border, width=2)
        d.text((x + 15, y + 12), name, fill="#0F172A", font=f_tname)

        # Fields
        h_body = len(fields) * 22 + 14
        d.rectangle([x, y+h_head, x+w_box, y+h_head+h_body], fill="#FFFFFF", outline=border, width=2)
        curr_y = y + h_head + 8
        for f in fields:
            is_key = "PK" in f or "FK" in f
            col = "#B91C1C" if "PK" in f else ("#2563EB" if "FK" in f else "#334155")
            d.text((x + 12, curr_y), f, fill=col, font=f_fld_pk if is_key else f_fld)
            curr_y += 22
        return y + h_head + h_body

    # Column 1
    # COMPANIES
    draw_table(70, 140, 480, "COMPANIES", [
        "id: TEXT [PK]",
        "name: TEXT",
        "type: TEXT (contractor|sub|admin)",
        "parent_contractor_id: TEXT [FK]",
        "phone: TEXT",
        "email: TEXT",
        "license_number: TEXT",
        "trade: TEXT",
        "address: TEXT",
        "contact_person: TEXT",
        "created_at: TIMESTAMPTZ"
    ], color="#FEF3C7", border="#D97706")

    # USERS
    draw_table(70, 600, 480, "USERS", [
        "id: TEXT [PK]",
        "name: TEXT",
        "email: TEXT [UNIQUE]",
        "role: TEXT (6 RBAC Roles)",
        "company: TEXT",
        "company_id: TEXT [FK]",
        "phone: TEXT",
        "avatar_url: TEXT",
        "password_hash: TEXT",
        "supabase_uid: TEXT",
        "created_at: TIMESTAMPTZ",
        "updated_at: TIMESTAMPTZ"
    ], color="#EFF6FF", border="#2563EB")

    # Column 2
    # PROJECTS
    draw_table(660, 140, 480, "PROJECTS", [
        "id: TEXT [PK]",
        "name: TEXT",
        "code: TEXT [UNIQUE]",
        "address: TEXT",
        "description: TEXT",
        "client_name: TEXT",
        "start_date: TIMESTAMPTZ",
        "target_completion: TIMESTAMPTZ",
        "gc_user_id: TEXT [FK]",
        "contractor_company_id: TEXT [FK]",
        "building_id: TEXT",
        "building_name: TEXT",
        "status: TEXT (active|archived)",
        "created_at: TIMESTAMPTZ"
    ], color="#DCFCE7", border="#16A34A")

    # PROJECT_MEMBERS
    draw_table(660, 660, 480, "PROJECT_MEMBERS", [
        "id: TEXT [PK]",
        "project_id: TEXT [FK]",
        "user_id: TEXT [FK]",
        "role: TEXT",
        "company_name: TEXT",
        "created_at: TIMESTAMPTZ"
    ], color="#DCFCE7", border="#16A34A")

    # SHEETS
    draw_table(660, 980, 480, "SHEETS", [
        "id: TEXT [PK]",
        "project_id: TEXT [FK]",
        "sheet_number: TEXT",
        "name: TEXT",
        "discipline: TEXT (arch|struct|mep)",
        "floor_level: TEXT",
        "version_number: INTEGER",
        "file_path: TEXT",
        "image_path: TEXT",
        "width_pts: INTEGER",
        "height_pts: INTEGER",
        "scale_ratio: TEXT",
        "created_at: TIMESTAMPTZ"
    ], color="#F3E8FF", border="#7C3AED")

    # Column 3
    # PINS
    draw_table(1220, 140, 510, "PINS (Punch Items)", [
        "id: TEXT [PK]",
        "project_id: TEXT [FK]",
        "sheet_id: TEXT [FK]",
        "item_number: INTEGER",
        "title: TEXT",
        "description: TEXT",
        "x_percent: DOUBLE (0.0-100.0%)",
        "y_percent: DOUBLE (0.0-100.0%)",
        "room_location: TEXT",
        "discipline: TEXT",
        "priority: TEXT (low|medium|high|critical)",
        "status: TEXT (open|in_prog|rev|closed)",
        "assigned_subcontractor_id: TEXT [FK]",
        "assigned_to_company: TEXT",
        "assigned_to_user_id: TEXT [FK]",
        "created_by_user_id: TEXT [FK]",
        "created_at: TIMESTAMPTZ",
        "updated_at: TIMESTAMPTZ"
    ], color="#FFEDD5", border="#EA580C")

    # COMMENTS
    draw_table(1220, 800, 510, "COMMENTS", [
        "id: TEXT [PK]",
        "pin_id: TEXT [FK]",
        "author_id: TEXT [FK]",
        "body: TEXT",
        "parent_id: TEXT [FK]",
        "created_at: TIMESTAMPTZ"
    ], color="#EFF6FF", border="#2563EB")

    # PHOTOS
    draw_table(1220, 1080, 510, "PHOTOS", [
        "id: TEXT [PK]",
        "pin_id: TEXT [FK]",
        "file_path: TEXT",
        "thumbnail_path: TEXT",
        "caption: TEXT",
        "type: TEXT (issue|work_completed|signoff)",
        "uploaded_by: TEXT",
        "created_at: TIMESTAMPTZ"
    ], color="#FDF2F8", border="#DB2777")

    # Bottom Row: MARKUPS, AUDIT_LOGS, TASKS
    draw_table(70, 1600, 480, "MARKUPS (Vector Drawing)", [
        "id: TEXT [PK]",
        "sheet_id: TEXT [FK]",
        "type: TEXT (cloud|arrow|rect|line|callout)",
        "stroke_color: TEXT",
        "stroke_width: INTEGER",
        "fill_color: TEXT",
        "coordinates_json: JSONB",
        "created_by: TEXT [FK]",
        "created_at: TIMESTAMPTZ"
    ], color="#FEF3C7", border="#D97706")

    draw_table(660, 1600, 480, "AUDIT_LOGS (Forensic Trail)", [
        "id: TEXT [PK]",
        "event_type: TEXT (STATUS|ASSIGN|DELETE|CLOSE)",
        "project_id: TEXT [FK]",
        "pin_id: TEXT [FK]",
        "user_id: TEXT [FK]",
        "user_name: TEXT",
        "user_role: TEXT",
        "user_company: TEXT",
        "old_value: TEXT",
        "new_value: TEXT",
        "details: TEXT",
        "created_at: TIMESTAMPTZ"
    ], color="#F1F5F9", border="#475569")

    draw_table(1220, 1600, 510, "TASKS (Action Checklists)", [
        "id: TEXT [PK]",
        "pin_id: TEXT [FK]",
        "title: TEXT",
        "is_completed: BOOLEAN",
        "assigned_to: TEXT [FK]",
        "due_date: TIMESTAMPTZ",
        "created_at: TIMESTAMPTZ"
    ], color="#DCFCE7", border="#16A34A")

    # Connectors
    # COMPANIES -> USERS
    d.line([(310, 430), (310, 600)], fill="#2563EB", width=2)
    d.text((320, 500), "1 : N (Employees)", fill="#2563EB", font=f_rel)

    # PROJECTS -> SHEETS
    d.line([(900, 510), (900, 980)], fill="#7C3AED", width=2)
    d.text((910, 740), "1 : N (Drawings)", fill="#7C3AED", font=f_rel)

    # PROJECTS -> PROJECT_MEMBERS
    d.line([(760, 510), (760, 660)], fill="#16A34A", width=2)
    d.text((770, 570), "1 : N", fill="#16A34A", font=f_rel)

    # SHEETS -> PINS
    d.line([(1140, 1100), (1200, 1100), (1200, 450), (1220, 450)], fill="#EA580C", width=2)
    d.text((1150, 700), "1 : N (Pins)", fill="#EA580C", font=f_rel)

    # PINS -> COMMENTS
    d.line([(1475, 690), (1475, 800)], fill="#2563EB", width=2)
    d.text((1485, 740), "1 : N", fill="#2563EB", font=f_rel)

    # PINS -> PHOTOS
    d.line([(1560, 690), (1560, 1080)], fill="#DB2777", width=2)
    d.text((1570, 930), "1 : N", fill="#DB2777", font=f_rel)

    # PINS -> TASKS
    d.line([(1475, 1400), (1475, 1600)], fill="#16A34A", width=2)
    d.text((1485, 1490), "1 : N", fill="#16A34A", font=f_rel)

    # SHEETS -> MARKUPS
    d.line([(700, 1400), (700, 1550), (310, 1550), (310, 1600)], fill="#D97706", width=2)
    d.text((450, 1530), "1 : N (Vector Markups)", fill="#D97706", font=f_rel)

    # PINS -> AUDIT_LOGS
    d.line([(1220, 550), (1170, 550), (1170, 1550), (900, 1550), (900, 1600)], fill="#475569", width=2)
    d.text((1020, 1530), "1 : N (Provenance Trail)", fill="#475569", font=f_rel)

    path = os.path.join(ASSETS_DIR, "diagram_er.png")
    im.save(path)
    print("Saved:", path)
    return path

# ---------------------------------------------------------------------------
# 5. File Processing & Coordinate Normalization Diagram
# ---------------------------------------------------------------------------
def generate_file_arch_diagram():
    w, h = 1800, 900
    im = Image.new("RGB", (w, h), "#FFFFFF")
    d = ImageDraw.Draw(im)

    f_title = get_font(26, bold=True)
    f_bname = get_font(18, bold=True)
    f_body = get_font(14, bold=False)
    f_sub = get_font(13, bold=False)

    # Title
    d.rectangle([50, 30, 600, 75], fill="#F8FAFC", outline="#334155", width=2)
    d.text((70, 42), "Drawing Ingestion & Coordinate Normalization Engine", fill="#0F172A", font=f_title)

    steps = [
        ("1. Multi-Page PDF Ingestion", [
            "Architectural/MEP PDF Upload",
            "PDF.js Page Splitter & Parser",
            "Resolution Extraction (Width/Height Pts)",
            "Stored in /uploads/sheets/"
        ], 60, "#EFF6FF", "#2563EB"),

        ("2. Viewport Rasterization", [
            "Render Page to HTML5 Canvas",
            "150 DPI Vector Crisp Rasterization",
            "High-DPI Retina Scaling (window.devicePixelRatio)",
            "Dynamic Pan & Pinch-Zoom Transform"
        ], 480, "#FEF3C7", "#D97706"),

        ("3. Coordinate Normalization", [
            "x% = (clickX - panX) / (zoom * W) * 100",
            "y% = (clickY - panY) / (zoom * H) * 100",
            "Screen-Resolution Independent",
            "Rotational & Viewport Invariant"
        ], 900, "#DCFCE7", "#16A34A"),

        ("4. PDF Burn-In Export", [
            "ReportLab Canvas Compositor",
            "De-normalize (x%, y%) -> PDF Points",
            "Circle Stamp & Trade Initials Burned",
            "Vector Annotations Layer Burned In"
        ], 1320, "#F3E8FF", "#7C3AED"),
    ]

    for title, lines, x, bg, border in steps:
        d.rectangle([x, 120, x+380, 520], fill=bg, outline=border, width=2)
        d.rectangle([x, 120, x+380, 180], fill=border)
        d.text((x+15, 140), title, fill="#FFFFFF", font=f_bname)

        curr_y = 205
        for l in lines:
            d.text((x+20, curr_y), f"• {l}", fill="#0F172A", font=f_body)
            curr_y += 35

    # Arrows between boxes
    for x_arr in [440, 860, 1280]:
        d.line([(x_arr, 320), (x_arr+40, 320)], fill="#0F172A", width=4)
        d.polygon([(x_arr+40, 320), (x_arr+30, 310), (x_arr+30, 330)], fill="#0F172A")

    # Formula Callout at bottom
    d.rectangle([60, 560, 1700, 840], fill="#F8FAFC", outline="#475569", width=2)
    d.text((80, 580), "Mathematical Coordinate Transformation Invariant Model:", fill="#0F172A", font=f_bname)

    f_code = get_font(15, bold=False)
    math_text = (
        "Forward Coordinate Mapping (Tablet Screen Touch -> Normalized Spatial Tuple):\n"
        "   x_percent = clamp( ((touch_clientX - canvas_rect.left - pan_offsetX) / (base_width * current_zoom)) * 100.0, 0.0, 100.0 )\n"
        "   y_percent = clamp( ((touch_clientY - canvas_rect.top  - pan_offsetY) / (base_height * current_zoom)) * 100.0, 0.0, 100.0 )\n\n"
        "Inverse Reconstruction for PDF Export & Standard Vector Reader Burn-In:\n"
        "   pdf_point_x = (x_percent / 100.0) * pdf_media_box.width_points\n"
        "   pdf_point_y = pdf_media_box.height_points - ((y_percent / 100.0) * pdf_media_box.height_points)  // Invert Cartesians"
    )
    y_c = 620
    for line in math_text.split("\n"):
        d.text((90, y_c), line, fill="#1E293B", font=f_code)
        y_c += 26

    path = os.path.join(ASSETS_DIR, "diagram_file_arch.png")
    im.save(path)
    print("Saved:", path)
    return path

if __name__ == "__main__":
    generate_umbc_shield()
    generate_sequence_diagram()
    generate_class_diagram()
    generate_erd_diagram()
    generate_file_arch_diagram()
    print("All diagrams generated successfully!")
