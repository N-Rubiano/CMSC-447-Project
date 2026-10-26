"""
create_sqlite_db.py — Generates a fully initialized, self-contained SQLite database
file ('punchlist.db') adhering to the complete ER diagram specification in diagrams.md.
"""
import os
import sqlite3
import bcrypt
import uuid
from pathlib import Path
from datetime import datetime, timezone

def generate_database():
    base_dir = Path(__file__).parent
    data_dir = base_dir / "data"
    data_dir.mkdir(parents=True, exist_ok=True)
    
    db_path = data_dir / "punchlist.db"
    root_db_path = base_dir.parent / "punchlist.db"
    schema_sql_path = base_dir / "schema.sql"
    root_schema_sql_path = base_dir.parent / "schema.sql"

    print(f"Creating SQLite database at: {db_path}")

    # Remove existing db if clean generation is desired
    if db_path.exists():
        try:
            db_path.unlink()
        except Exception:
            pass

    conn = sqlite3.connect(str(db_path))
    conn.execute("PRAGMA journal_mode=WAL;")
    conn.execute("PRAGMA foreign_keys=ON;")
    cursor = conn.cursor()

    full_schema_ddl = """
-- ==============================================================================
-- PunchList Pro — SQLite Master Database Schema
-- Matches ER Diagram specification in diagrams.md
-- ==============================================================================

-- 1. COMPANIES
CREATE TABLE IF NOT EXISTS companies (
    id                   TEXT PRIMARY KEY,
    name                 TEXT NOT NULL,
    type                 TEXT NOT NULL DEFAULT 'contractor', -- owner | general_contractor | sub_contractor
    parent_contractor_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone                TEXT,
    email                TEXT,
    license_number       TEXT,
    trade                TEXT,
    address              TEXT,
    contact_person       TEXT,
    created_at           TEXT DEFAULT (datetime('now')),
    updated_at           TEXT DEFAULT (datetime('now'))
);

-- 2. USERS
CREATE TABLE IF NOT EXISTS users (
    id            TEXT PRIMARY KEY,
    name          TEXT NOT NULL,
    email         TEXT UNIQUE NOT NULL,
    role          TEXT NOT NULL DEFAULT 'sub_contractor', -- admin | general_contractor | sub_contractor
    company       TEXT,
    company_id    TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone         TEXT,
    avatar_url    TEXT,
    password_hash TEXT,
    supabase_uid  TEXT,
    presence      TEXT DEFAULT 'active',
    presence_text TEXT,
    created_at    TEXT DEFAULT (datetime('now')),
    updated_at    TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- 3. PROJECTS
CREATE TABLE IF NOT EXISTS projects (
    id                     TEXT PRIMARY KEY,
    name                   TEXT NOT NULL,
    code                   TEXT,
    address                TEXT,
    description            TEXT,
    client_name            TEXT,
    start_date             TEXT,
    target_completion      TEXT,
    gc_user_id             TEXT REFERENCES users(id) ON DELETE SET NULL,
    contractor_company_id  TEXT REFERENCES companies(id) ON DELETE SET NULL,
    building_id            TEXT,
    building_name          TEXT,
    status                 TEXT DEFAULT 'active', -- active | completed | archived
    created_at             TEXT DEFAULT (datetime('now')),
    updated_at             TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);

-- 4. PROJECT MEMBERS (Junction table)
CREATE TABLE IF NOT EXISTS project_members (
    id           TEXT PRIMARY KEY,
    project_id   TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id      TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role         TEXT,
    company_name TEXT,
    created_at   TEXT DEFAULT (datetime('now')),
    updated_at   TEXT DEFAULT (datetime('now')),
    UNIQUE (project_id, user_id)
);
CREATE INDEX IF NOT EXISTS idx_project_members_project ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user ON project_members(user_id);

-- 5. SHEETS (Architectural / Engineering Drawings)
CREATE TABLE IF NOT EXISTS sheets (
    id             TEXT PRIMARY KEY,
    project_id     TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    sheet_number   TEXT NOT NULL,
    name           TEXT NOT NULL,
    discipline     TEXT NOT NULL DEFAULT 'architectural', -- architectural | structural | mechanical | electrical | plumbing | fire_protection
    floor_level    TEXT,
    version_number INTEGER DEFAULT 1,
    width_pts      INTEGER DEFAULT 1200,
    height_pts     INTEGER DEFAULT 800,
    file_path      TEXT,
    image_path     TEXT,
    image_url      TEXT,
    file_name      TEXT,
    page_index     INTEGER DEFAULT 0,
    page_count     INTEGER DEFAULT 1,
    version        TEXT DEFAULT 'Rev 1',
    change_notes   TEXT,
    scale_ratio    TEXT DEFAULT '1/4" = 1''-0"',
    building_id    TEXT,
    building_name  TEXT,
    uploaded_by    TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sheets_project_id ON sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_sheets_discipline ON sheets(discipline);

-- 6. SHEET VERSIONS
CREATE TABLE IF NOT EXISTS sheet_versions (
    id              TEXT PRIMARY KEY,
    sheet_id        TEXT NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    version_number  INTEGER NOT NULL,
    version_tag     TEXT,
    version         TEXT,
    file_name       TEXT,
    file_path       TEXT,
    image_path      TEXT,
    image_url       TEXT,
    file_size_bytes INTEGER,
    uploaded_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    change_summary  TEXT,
    change_notes    TEXT,
    is_current      INTEGER DEFAULT 1,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sheet_versions_sheet ON sheet_versions(sheet_id);

-- 7. PINS (Punch List Items)
CREATE TABLE IF NOT EXISTS pins (
    id                          TEXT PRIMARY KEY,
    sheet_id                    TEXT NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    project_id                  TEXT NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    item_number                 INTEGER NOT NULL,
    task_id                     TEXT,
    title                       TEXT NOT NULL,
    description                 TEXT,
    status                      TEXT NOT NULL DEFAULT 'open', -- open | pending_review | in_progress | ready_for_inspection | resolved | closed
    priority                    TEXT NOT NULL DEFAULT 'medium', -- low | medium | high | critical
    discipline                  TEXT DEFAULT 'architectural',
    room_location               TEXT,
    root_cause                  TEXT,
    stamp_initials              TEXT,
    subcontractor_stamp         TEXT,
    stamp_scale                 REAL DEFAULT 1.0,
    x_pct                       REAL NOT NULL,
    y_pct                       REAL NOT NULL,
    assigned_to_user_id         TEXT REFERENCES users(id) ON DELETE SET NULL,
    assigned_to_name            TEXT,
    assigned_to_company         TEXT,
    assigned_contractor_name    TEXT,
    assigned_subcontractor_name TEXT,
    assigned_contractor_id      TEXT REFERENCES companies(id) ON DELETE SET NULL,
    assigned_subcontractor_id   TEXT REFERENCES companies(id) ON DELETE SET NULL,
    created_by_user_id          TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_by_name             TEXT,
    due_date                    TEXT,
    assignees                   TEXT DEFAULT '[]',
    watchers                    TEXT DEFAULT '[]',
    location                    TEXT,
    root_cause_detail           TEXT,
    description_detail          TEXT,
    start_date                  TEXT,
    end_date                    TEXT,
    created_at                  TEXT DEFAULT (datetime('now')),
    updated_at                  TEXT DEFAULT (datetime('now')),
    closed_at                   TEXT
);
CREATE INDEX IF NOT EXISTS idx_pins_project_id ON pins(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_sheet_id ON pins(sheet_id);
CREATE INDEX IF NOT EXISTS idx_pins_status ON pins(status);
CREATE INDEX IF NOT EXISTS idx_pins_priority ON pins(priority);

-- 8. PIN PHOTOS
CREATE TABLE IF NOT EXISTS pin_photos (
    id             TEXT PRIMARY KEY,
    pin_id         TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    url            TEXT NOT NULL,
    type           TEXT DEFAULT 'issue', -- issue | completion | progress
    caption        TEXT,
    uploaded_by    TEXT,
    uploaded_by_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    thumbnail_url  TEXT,
    created_at     TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pin_photos_pin_id ON pin_photos(pin_id);

-- 9. COMMENTS
CREATE TABLE IF NOT EXISTS comments (
    id          TEXT PRIMARY KEY,
    pin_id      TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    author_id   TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT,
    body        TEXT NOT NULL,
    parent_id   TEXT REFERENCES comments(id) ON DELETE CASCADE,
    char_count  INTEGER,
    edited      INTEGER DEFAULT 0,
    created_at  TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_comments_pin_id ON comments(pin_id);

-- 10. MARKUPS (Blueprint annotations, shapes, measurements)
CREATE TABLE IF NOT EXISTS markups (
    id           TEXT PRIMARY KEY,
    sheet_id     TEXT NOT NULL REFERENCES sheets(id) ON DELETE CASCADE,
    author_id    TEXT REFERENCES users(id) ON DELETE SET NULL,
    type         TEXT NOT NULL, -- pen | arrow | rectangle | cloud | text | measurement
    data         TEXT,
    points_json  TEXT,
    stroke_color TEXT DEFAULT '#DC2626',
    stroke_width INTEGER DEFAULT 4,
    fill_color   TEXT,
    label        TEXT,
    created_by   TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_markups_sheet_id ON markups(sheet_id);

-- 11. PIN HISTORY (State transitions & trade signoffs)
CREATE TABLE IF NOT EXISTS pin_history (
    id         TEXT PRIMARY KEY,
    pin_id     TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    old_status TEXT,
    new_status TEXT,
    comment    TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_pin_history_pin ON pin_history(pin_id);

-- 12. AUDIT LOGS (Immutable field audit trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id           TEXT PRIMARY KEY,
    project_id   TEXT REFERENCES projects(id) ON DELETE CASCADE,
    pin_id       TEXT REFERENCES pins(id) ON DELETE SET NULL,
    user_id      TEXT,
    user_name    TEXT,
    user_role    TEXT,
    user_company TEXT,
    action       TEXT NOT NULL,
    old_value    TEXT,
    new_value    TEXT,
    details      TEXT,
    created_at   TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);

-- 13. SUBCONTRACTORS (Trade directory & stamp palette)
CREATE TABLE IF NOT EXISTS subcontractors (
    id             TEXT PRIMARY KEY,
    name           TEXT NOT NULL,
    trade          TEXT,
    contact_name   TEXT,
    contact_email  TEXT,
    contact_phone  TEXT,
    initials       TEXT,
    color          TEXT DEFAULT '#EF4444',
    license_number TEXT,
    created_by     TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at     TEXT DEFAULT (datetime('now')),
    updated_at     TEXT DEFAULT (datetime('now'))
);

-- 14. DOCUMENTS (Specifications, RFIs, Submittals, Warranties)
CREATE TABLE IF NOT EXISTS documents (
    id              TEXT PRIMARY KEY,
    project_id      TEXT REFERENCES projects(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    file_name       TEXT,
    file_path       TEXT,
    file_url        TEXT,
    file_size_bytes INTEGER,
    file_type       TEXT,
    category        TEXT DEFAULT 'General',
    uploaded_by     TEXT,
    uploaded_by_id  TEXT REFERENCES users(id) ON DELETE SET NULL,
    created_at      TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);

-- 15. TAGS & PIN TAGS
CREATE TABLE IF NOT EXISTS tags (
    id    TEXT PRIMARY KEY,
    name  TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#78716C'
);

CREATE TABLE IF NOT EXISTS pin_tags (
    pin_id TEXT NOT NULL REFERENCES pins(id) ON DELETE CASCADE,
    tag_id TEXT NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (pin_id, tag_id)
);

-- 16. NOTIFICATIONS
CREATE TABLE IF NOT EXISTS notifications (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    type       TEXT NOT NULL,
    title      TEXT NOT NULL,
    body       TEXT,
    link       TEXT,
    read       INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, read);

-- 17. RATE LIMIT LOG (Security forensics)
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id         TEXT PRIMARY KEY,
    ip         TEXT NOT NULL,
    path       TEXT NOT NULL,
    limit_type TEXT NOT NULL DEFAULT 'api',
    created_at TEXT DEFAULT (datetime('now'))
);

-- 18. REFRESH TOKENS (Session longevity)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id         TEXT PRIMARY KEY,
    user_id    TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    token_hash TEXT NOT NULL UNIQUE,
    expires_at TEXT NOT NULL,
    revoked    INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
"""

    cursor.executescript(full_schema_ddl)
    print("Schema DDL executed successfully.")

    # ── Seed Initial Data ──────────────────────────────────────────
    now = datetime.now(timezone.utc).isoformat()
    pw_hash = bcrypt.hashpw(b"Demo@2026!", bcrypt.gensalt()).decode()

    # 1. Companies
    companies = [
        ("cmp-demo-1", "PunchList Pro Construction Ops", "owner", None, "555-0100", "ops@punchlistpro.demo", "LIC-MD-99201", "Developer / Owner", "1000 Hilltop Circle, Baltimore, MD", "Satya Thakur", now, now),
        ("cmp-demo-2", "Apex Construction General Contracting", "general_contractor", None, "555-0200", "contact@apexcon.demo", "LIC-GC-44812", "General Contractor", "200 Pratt St, Baltimore, MD", "Nathan Rubiano", now, now),
        ("cmp-demo-3", "Prime Trade Solutions", "sub_contractor", "cmp-demo-2", "555-0300", "trade@primetrade.demo", "LIC-SUB-11928", "Electrical & Mechanical", "450 Light St, Baltimore, MD", "Muhammad Khan", now, now),
        ("cmp-trade-el", "VoltMaster Electrical Contractors", "sub_contractor", "cmp-demo-2", "555-0301", "info@voltmaster.demo", "LIC-EL-30041", "Electrical", "Baltimore, MD", "Jim Vance", now, now),
        ("cmp-trade-mp", "Cascade Mechanical & Plumbing", "sub_contractor", "cmp-demo-2", "555-0302", "service@cascademp.demo", "LIC-MP-88219", "Mechanical / Plumbing", "Columbia, MD", "Sarah Lin", now, now),
        ("cmp-trade-dw", "Precision Drywall & Acoustical", "sub_contractor", "cmp-demo-2", "555-0303", "bids@precisiondw.demo", "LIC-DW-77210", "Drywall / Finishing", "Towson, MD", "Carlos Reyes", now, now)
    ]
    cursor.executemany("""
        INSERT INTO companies (id, name, type, parent_contractor_id, phone, email, license_number, trade, address, contact_person, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, companies)

    # 2. Users (3 Demo accounts + team members)
    users = [
        ("usr-demo-admin", "Admin", "admin@punchlistpro.demo", "admin", "PunchList Pro Construction Ops", "cmp-demo-1", "555-0101", "/avatars/admin.jpg", pw_hash, None, "active", "On Site - Level 4", now, now),
        ("usr-demo-gc", "Contractor", "contractor@punchlistpro.demo", "general_contractor", "Apex Construction General Contracting", "cmp-demo-2", "555-0201", "/avatars/gc.jpg", pw_hash, None, "active", "Supervising Core & Shell", now, now),
        ("usr-demo-sub", "Sub-Contractor", "sub@punchlistpro.demo", "sub_contractor", "Prime Trade Solutions", "cmp-demo-3", "555-0301", "/avatars/sub.jpg", pw_hash, None, "active", "Running Conduit L2", now, now),
    ]
    cursor.executemany("""
        INSERT INTO users (id, name, email, role, company, company_id, phone, avatar_url, password_hash, supabase_uid, presence, presence_text, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, users)

    # 3. Projects
    projects = [
        ("proj-demo-1", "Harbor Point Tower 2", "HPT2", "1310 Point Street, Baltimore, MD 21231", "32-story mixed-use commercial and luxury residential tower with 4-level subterranean parking.", "Harbor Point Ventures LLC", "2025-06-01", "2027-04-30", "usr-demo-gc", "cmp-demo-2", "bld-hpt-02", "Tower Two", "active", now, now),
        ("proj-demo-2", "UMBC Interdisciplinary Life Sciences", "ILSB", "1000 Hilltop Circle, Catonsville, MD 21250", "Four-story academic research facility with wet labs, active learning classrooms, and vivarium.", "University of Maryland, Baltimore County", "2025-01-15", "2026-11-30", "usr-demo-gc", "cmp-demo-2", "bld-ilsb-01", "ILSB Main", "active", now, now)
    ]
    cursor.executemany("""
        INSERT INTO projects (id, name, code, address, description, client_name, start_date, target_completion, gc_user_id, contractor_company_id, building_id, building_name, status, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, projects)

    # 4. Project Members
    members = [
        ("pm-1", "proj-demo-1", "usr-demo-admin", "admin", "PunchList Pro Construction Ops", now, now),
        ("pm-2", "proj-demo-1", "usr-demo-gc", "general_contractor", "Apex Construction General Contracting", now, now),
        ("pm-3", "proj-demo-1", "usr-demo-sub", "sub_contractor", "Prime Trade Solutions", now, now),
        ("pm-4", "proj-demo-2", "usr-demo-admin", "admin", "PunchList Pro Construction Ops", now, now),
        ("pm-5", "proj-demo-2", "usr-demo-gc", "general_contractor", "Apex Construction General Contracting", now, now),
    ]
    cursor.executemany("""
        INSERT INTO project_members (id, project_id, user_id, role, company_name, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?)
    """, members)

    # 5. Sheets
    sheets = [
        ("sht-101", "proj-demo-1", "A-101", "Level 1 Architectural Floor Plan", "architectural", "Level 1", 1, 1920, 1080, "/blueprints/a101.pdf", "/blueprints/a101.png", "/blueprints/a101.png", "A-101_Rev1.pdf", 0, 1, "Rev 1", "Issued for Construction IFC", "1/4\" = 1'-0\"", "bld-hpt-02", "Tower Two", "usr-demo-admin", now, now),
        ("sht-102", "proj-demo-1", "M-201", "Level 2 HVAC & Mechanical Ductwork", "mechanical", "Level 2", 2, 1920, 1080, "/blueprints/m201.pdf", "/blueprints/m201.png", "/blueprints/m201.png", "M-201_Rev2.pdf", 0, 1, "Rev 2", "Coordination with plumbing risers", "1/4\" = 1'-0\"", "bld-hpt-02", "Tower Two", "usr-demo-gc", now, now),
        ("sht-103", "proj-demo-1", "E-301", "Level 3 Electrical Power & Lighting", "electrical", "Level 3", 1, 1920, 1080, "/blueprints/e301.pdf", "/blueprints/e301.png", "/blueprints/e301.png", "E-301_Rev1.pdf", 0, 1, "Rev 1", "Circuiting and home run tags added", "1/4\" = 1'-0\"", "bld-hpt-02", "Tower Two", "usr-demo-gc", now, now)
    ]
    cursor.executemany("""
        INSERT INTO sheets (id, project_id, sheet_number, name, discipline, floor_level, version_number, width_pts, height_pts, file_path, image_path, image_url, file_name, page_index, page_count, version, change_notes, scale_ratio, building_id, building_name, uploaded_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sheets)

    # 6. Sheet Versions
    sheet_versions = [
        ("sv-101-1", "sht-101", "proj-demo-1", 1, "v1.0", "Rev 1", "A-101_Rev1.pdf", "/blueprints/a101.pdf", "/blueprints/a101.png", "/blueprints/a101.png", 4200000, "usr-demo-admin", "Initial IFC issue", "Initial IFC issue", 1, now),
        ("sv-102-1", "sht-102", "proj-demo-1", 1, "v1.0", "Rev 1", "M-201_Rev1.pdf", "/blueprints/m201_v1.pdf", "/blueprints/m201.png", "/blueprints/m201.png", 3900000, "usr-demo-gc", "Initial coordination", "Initial coordination", 0, now),
        ("sv-102-2", "sht-102", "proj-demo-1", 2, "v2.0", "Rev 2", "M-201_Rev2.pdf", "/blueprints/m201.pdf", "/blueprints/m201.png", "/blueprints/m201.png", 4100000, "usr-demo-gc", "Rerouted supply ducts around shear wall", "Rerouted supply ducts around shear wall", 1, now),
    ]
    cursor.executemany("""
        INSERT INTO sheet_versions (id, sheet_id, project_id, version_number, version_tag, version, file_name, file_path, image_path, image_url, file_size_bytes, uploaded_by, change_summary, change_notes, is_current, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, sheet_versions)

    # 7. Pins (Punch items)
    pins = [
        ("pin-001", "sht-101", "proj-demo-1", 101, "PUNCH-101", "Fire damper actuator linkage disconnected", "FD-104 damper fails to trip in simulated supervisory cycle. Requires access hatch panel removal and linkage adjustment.", "open", "critical", "mechanical", "Room 104 - Mechanical Chase", "Installer error", "FD", "CASCADE-MP", 1.0, 34.2, 45.8, "usr-demo-sub", "Sub-Contractor", "Prime Trade Solutions", "Apex Construction General Contracting", "Prime Trade Solutions", "cmp-demo-2", "cmp-demo-3", "usr-demo-admin", "Admin", "2026-10-15", "[\"usr-demo-sub\"]", "[\"usr-demo-admin\",\"usr-demo-gc\"]", "North Chase / Grid C-4", "Defective linkage clamp", "Tested during pre-commissioning walkthrough", "2026-10-01", "2026-10-15", now, now, None),
        ("pin-002", "sht-101", "proj-demo-1", 102, "PUNCH-102", "Missing tamper switch seal on OS&Y valve", "Valve OSY-02 on main wet sprinkler riser lacks UL listed supervisory tamper switch seal and wire connection.", "in_progress", "high", "fire_protection", "Room 102 - Sprinkler Service", "Material delay", "FP", "VALV-SEAL", 1.0, 22.8, 68.4, "usr-demo-sub", "Sub-Contractor", "Prime Trade Solutions", "Apex Construction General Contracting", "Prime Trade Solutions", "cmp-demo-2", "cmp-demo-3", "usr-demo-admin", "Admin", "2026-10-18", "[\"usr-demo-sub\"]", "[\"usr-demo-admin\"]", "South Utility / Grid A-2", "Awaiting factory harness part", "Electrician scheduled for wire run", "2026-10-02", "2026-10-18", now, now, None),
        ("pin-003", "sht-101", "proj-demo-1", 103, "PUNCH-103", "Drywall corner bead damaged at elevator lobby", "Impact damage to external metal corner bead outside Elevator #3. Tape cracked, mud gouged ~18 inches above finished floor.", "pending_review", "medium", "architectural", "Elevator Lobby 1-A", "Trade damage", "DW", "PRECISION-DW", 1.0, 62.5, 38.1, "usr-demo-sub", "Sub-Contractor", "Prime Trade Solutions", "Apex Construction General Contracting", "Prime Trade Solutions", "cmp-demo-2", "cmp-demo-3", "usr-demo-gc", "Contractor", "2026-10-12", "[\"usr-demo-sub\"]", "[\"usr-demo-gc\"]", "Grid F-8 Lobby Column", "Scaffolding collision during lighting install", "Re-taped and first coat mud applied. Needs sand and paint.", "2026-10-01", "2026-10-12", now, now, None),
        ("pin-004", "sht-101", "proj-demo-1", 104, "PUNCH-104", "Emergency exit signage luminaire unpowered", "Exit sign above Door 108B does not illuminate on battery backup test cycle.", "resolved", "high", "electrical", "Corridor 108 South", "Wiring fault", "EL", "VOLTMASTER", 1.0, 78.4, 82.0, "usr-demo-sub", "Sub-Contractor", "Prime Trade Solutions", "Apex Construction General Contracting", "Prime Trade Solutions", "cmp-demo-2", "cmp-demo-3", "usr-demo-admin", "Admin", "2026-10-08", "[\"usr-demo-sub\"]", "[\"usr-demo-admin\",\"usr-demo-gc\"]", "Door 108B Header", "Neutral wire loose in J-box", "Repaired connection, battery backup verified 90-min test.", "2026-09-28", "2026-10-08", now, now, now)
    ]
    cursor.executemany("""
        INSERT INTO pins (id, sheet_id, project_id, item_number, task_id, title, description, status, priority, discipline, room_location, root_cause, stamp_initials, subcontractor_stamp, stamp_scale, x_pct, y_pct, assigned_to_user_id, assigned_to_name, assigned_to_company, assigned_contractor_name, assigned_subcontractor_name, assigned_contractor_id, assigned_subcontractor_id, created_by_user_id, created_by_name, due_date, assignees, watchers, location, root_cause_detail, description_detail, start_date, end_date, created_at, updated_at, closed_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, pins)

    # 8. Pin Photos
    photos = [
        ("photo-001", "pin-001", "/uploads/photos/damper_linkage_defect.jpg", "issue", "Disconnected linkage rod at FD-104 actuator shaft", "Admin", "usr-demo-admin", "/uploads/photos/damper_linkage_thumb.jpg", now),
        ("photo-002", "pin-003", "/uploads/photos/drywall_corner_bead_dent.jpg", "issue", "Gouged corner bead outside Elevator #3", "Contractor", "usr-demo-gc", "/uploads/photos/drywall_thumb.jpg", now),
        ("photo-003", "pin-004", "/uploads/photos/exit_sign_repaired.jpg", "completion", "Illuminated exit luminaire verified on 24V emergency feed", "Sub-Contractor", "usr-demo-sub", "/uploads/photos/exit_thumb.jpg", now)
    ]
    cursor.executemany("""
        INSERT INTO pin_photos (id, pin_id, url, type, caption, uploaded_by, uploaded_by_id, thumbnail_url, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, photos)

    # 9. Comments
    comments = [
        ("comm-001", "pin-001", "usr-demo-admin", "Admin", "Checked with mechanical engineer: linkage must be torqued to 45 in-lb per manufacturer spec.", None, 85, 0, now),
        ("comm-002", "pin-001", "usr-demo-sub", "Sub-Contractor", "Understood. Technician scheduled tomorrow morning at 08:00 with torque wrench and replacement shear pin.", "comm-001", 112, 0, now),
        ("comm-003", "pin-003", "usr-demo-gc", "Contractor", "Painter is on site Friday to feather edge and match existing Eggshell warm gray.", None, 82, 0, now)
    ]
    cursor.executemany("""
        INSERT INTO comments (id, pin_id, author_id, author_name, body, parent_id, char_count, edited, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, comments)

    # 10. Subcontractors
    subcontractors = [
        ("sub-01", "VoltMaster Electrical", "Electrical", "Jim Vance", "jim@voltmaster.demo", "555-0301", "VM", "#D97706", "LIC-EL-30041", "usr-demo-admin", now, now),
        ("sub-02", "Cascade Mechanical & Plumbing", "Mechanical / Plumbing", "Sarah Lin", "sarah@cascademp.demo", "555-0302", "CMP", "#0284C7", "LIC-MP-88219", "usr-demo-admin", now, now),
        ("sub-03", "Precision Drywall & Acoustical", "Drywall", "Carlos Reyes", "carlos@precisiondw.demo", "555-0303", "PDA", "#EA580C", "LIC-DW-77210", "usr-demo-admin", now, now),
        ("sub-04", "Shield Fire Protection Systems", "Fire Protection", "Marcus Brody", "marcus@shieldfp.demo", "555-0304", "SFP", "#DC2626", "LIC-FP-99014", "usr-demo-admin", now, now),
        ("sub-05", "Apex Structural Steel & Iron", "Structural", "David Chen", "david@apexsteel.demo", "555-0305", "ASI", "#7C3AED", "LIC-ST-44109", "usr-demo-admin", now, now)
    ]
    cursor.executemany("""
        INSERT INTO subcontractors (id, name, trade, contact_name, contact_email, contact_phone, initials, color, license_number, created_by, created_at, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, subcontractors)

    # 11. Documents
    docs = [
        ("doc-01", "proj-demo-1", "Structural Core Specifications Div 03", "Div03_Concrete_Spec_RevC.pdf", "/documents/div03_spec.pdf", "/documents/div03_spec.pdf", 8450000, "pdf", "Specifications", "Admin", "usr-demo-admin", now),
        ("doc-02", "proj-demo-1", "Fire Marshall Inspection Approval Certificate", "HarborPoint_Ph1_LifeSafety_Signoff.pdf", "/documents/signoff.pdf", "/documents/signoff.pdf", 1240000, "pdf", "Certificates", "Contractor", "usr-demo-gc", now),
        ("doc-03", "proj-demo-1", "HVAC Commissioning Matrix & Balance Report", "TAB_AirWaterBalance_Report.xlsx", "/documents/tab_report.xlsx", "/documents/tab_report.xlsx", 3100000, "xlsx", "Submittals", "Sub-Contractor", "usr-demo-sub", now)
    ]
    cursor.executemany("""
        INSERT INTO documents (id, project_id, name, file_name, file_path, file_url, file_size_bytes, file_type, category, uploaded_by, uploaded_by_id, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, docs)

    # 12. Tags & Pin Tags
    tags = [
        ("tag-life-safety", "Life Safety", "#DC2626"),
        ("tag-pre-drywall", "Pre-Drywall Inspection", "#D97706"),
        ("tag-architectural", "Finish Grade", "#4F46E5"),
        ("tag-urgent", "Superintendent Hold", "#DC2626"),
    ]
    cursor.executemany("INSERT INTO tags (id, name, color) VALUES (?, ?, ?)", tags)

    pin_tags = [
        ("pin-001", "tag-life-safety"),
        ("pin-001", "tag-urgent"),
        ("pin-002", "tag-life-safety"),
        ("pin-003", "tag-architectural"),
        ("pin-004", "tag-life-safety"),
    ]
    cursor.executemany("INSERT INTO pin_tags (pin_id, tag_id) VALUES (?, ?)", pin_tags)

    # 13. Audit logs
    audit_entries = [
        ("audit-init-01", "proj-demo-1", "pin-001", "usr-demo-admin", "Admin", "admin", "PunchList Pro Construction Ops", "Created Pin", None, "PUNCH-101", "Identified fire damper linkage fault during floor scan", now),
        ("audit-init-02", "proj-demo-1", "pin-003", "usr-demo-gc", "Contractor", "general_contractor", "Apex Construction General Contracting", "Status Changed", "open", "pending_review", "Trade finished drywall patching, ready for superintendent inspection", now),
        ("audit-init-03", "proj-demo-1", "pin-004", "usr-demo-sub", "Sub-Contractor", "sub_contractor", "Prime Trade Solutions", "Closed Pin", "in_progress", "resolved", "Electrician verified emergency backup illumination", now)
    ]
    cursor.executemany("""
        INSERT INTO audit_logs (id, project_id, pin_id, user_id, user_name, user_role, user_company, action, old_value, new_value, details, created_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    """, audit_entries)

    conn.commit()
    conn.close()
    print("Seeding completed successfully.")

    # Write schema.sql
    with open(schema_sql_path, "w", encoding="utf-8") as f:
        f.write(full_schema_ddl)
    print(f"Exported DDL to {schema_sql_path}")

    with open(root_schema_sql_path, "w", encoding="utf-8") as f:
        f.write(full_schema_ddl)
    print(f"Exported DDL to {root_schema_sql_path}")

    # Copy database file to root as well for immediate access
    import shutil
    shutil.copy2(db_path, root_db_path)
    print(f"Copied .db file to workspace root: {root_db_path}")

if __name__ == "__main__":
    generate_database()
