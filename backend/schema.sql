
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
