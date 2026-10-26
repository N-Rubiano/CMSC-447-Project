"""
database.py — Dual PostgreSQL / SQLite database engine using SQLAlchemy Core (sync).

Strategy:
  - If DATABASE_URL is set → use PostgreSQL via psycopg2 (synchronous)
  - Otherwise → SQLite fallback via sqlite3

All queries use SQLAlchemy text() or raw SQL strings executed through the engine.
We use synchronous SQLAlchemy (not async) for simplicity and compatibility with
python-socketio's event handlers and FastAPI's synchronous route handlers.
"""
import os
import json
import uuid
from decimal import Decimal
from pathlib import Path
from datetime import datetime, date, timezone
from contextlib import contextmanager

from sqlalchemy import create_engine, text, event
from sqlalchemy.orm import sessionmaker, Session

from .config import settings

# ---------------------------------------------------------------------------
# Engine creation
# ---------------------------------------------------------------------------

def _make_engine():
    url = settings.effective_database_url
    if settings.use_postgres:
        connect_args = {}
        if "supabase" in url or "pooler" in url or "sslmode=" in url:
            import ssl
            ssl_ctx = ssl.create_default_context()
            ssl_ctx.check_hostname = False
            ssl_ctx.verify_mode = ssl.CERT_NONE
            connect_args["ssl_context"] = ssl_ctx

        engine = create_engine(
            url,
            pool_size=10,
            max_overflow=20,
            pool_timeout=30,
            pool_recycle=1800,
            connect_args=connect_args,
            echo=(os.getenv("DEBUG_SQL", "false").lower() == "true"),
        )
    else:
        # SQLite – strip the async driver prefix if present
        sqlite_url = url.replace("sqlite+aiosqlite://", "sqlite://")
        engine = create_engine(
            sqlite_url,
            connect_args={"check_same_thread": False},
            echo=(os.getenv("DEBUG_SQL", "false").lower() == "true"),
        )
        # Enable WAL mode and foreign keys for SQLite
        @event.listens_for(engine, "connect")
        def set_sqlite_pragma(dbapi_conn, _):
            cursor = dbapi_conn.cursor()
            cursor.execute("PRAGMA journal_mode=WAL")
            cursor.execute("PRAGMA foreign_keys=ON")
            cursor.close()
    return engine


engine = _make_engine()
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
from sqlalchemy.orm import declarative_base
Base = declarative_base()


@contextmanager
def get_db():
    """Yield a SQLAlchemy Session; auto-commit on success, rollback on error."""
    db: Session = SessionLocal()
    try:
        yield db
        db.commit()
    except Exception:
        db.rollback()
        raise
    finally:
        db.close()


# ---------------------------------------------------------------------------
# Schema initialisation
# ---------------------------------------------------------------------------

def _pg_schema_sql() -> str:
    """Inline PostgreSQL-compatible DDL (no external file dependency)."""
    return """
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'contractor',
    parent_contractor_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone TEXT, email TEXT, license_number TEXT, trade TEXT,
    address TEXT, contact_person TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'sub_contractor',
    company TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone TEXT, avatar_url TEXT, password_hash TEXT,
    supabase_uid TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT, address TEXT, description TEXT, client_name TEXT,
    start_date TIMESTAMPTZ, target_completion TIMESTAMPTZ,
    gc_user_id TEXT, contractor_company_id TEXT,
    building_id TEXT, building_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT, company_name TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS sheets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    sheet_number TEXT NOT NULL,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL DEFAULT 'architectural',
    floor_level TEXT,
    version_number INTEGER DEFAULT 1,
    width_pts INTEGER DEFAULT 1200,
    height_pts INTEGER DEFAULT 800,
    file_path TEXT, image_path TEXT, image_url TEXT,
    file_name TEXT, page_index INTEGER DEFAULT 0, page_count INTEGER DEFAULT 1,
    version TEXT DEFAULT 'Rev 1', change_notes TEXT,
    scale_ratio TEXT DEFAULT '1/4" = 1''-0"',
    building_id TEXT, building_name TEXT,
    uploaded_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS sheet_versions (
    id TEXT PRIMARY KEY,
    sheet_id TEXT,
    project_id TEXT,
    version_number INTEGER NOT NULL,
    version_tag TEXT, version TEXT,
    file_name TEXT, file_path TEXT, image_path TEXT, image_url TEXT,
    file_size_bytes INTEGER,
    uploaded_by TEXT, change_summary TEXT, change_notes TEXT,
    is_current INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS pins (
    id TEXT PRIMARY KEY,
    sheet_id TEXT,
    project_id TEXT,
    item_number INTEGER NOT NULL,
    task_id TEXT, title TEXT NOT NULL, description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    discipline TEXT DEFAULT 'architectural',
    room_location TEXT, root_cause TEXT, stamp_initials TEXT, subcontractor_stamp TEXT,
    x_pct FLOAT, y_pct FLOAT,
    assigned_to_user_id TEXT, assigned_to_name TEXT,
    assigned_to_company TEXT, assigned_contractor_name TEXT,
    assigned_subcontractor_name TEXT,
    assigned_contractor_id TEXT, assigned_subcontractor_id TEXT,
    created_by_user_id TEXT, created_by_name TEXT,
    due_date TEXT, assignees TEXT DEFAULT '[]', watchers TEXT DEFAULT '[]',
    location TEXT, root_cause_detail TEXT, description_detail TEXT,
    start_date TEXT, end_date TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    closed_at TIMESTAMPTZ
);
CREATE TABLE IF NOT EXISTS pin_photos (
    id TEXT PRIMARY KEY,
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    url TEXT NOT NULL, type TEXT DEFAULT 'issue',
    caption TEXT, uploaded_by TEXT, uploaded_by_id TEXT, thumbnail_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    author_id TEXT, author_name TEXT,
    body TEXT NOT NULL, parent_id TEXT,
    char_count INTEGER, edited BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS markups (
    id TEXT PRIMARY KEY,
    sheet_id TEXT REFERENCES sheets(id) ON DELETE CASCADE,
    author_id TEXT, type TEXT NOT NULL,
    data TEXT, points_json TEXT,
    stroke_color TEXT DEFAULT '#DC2626', stroke_width INTEGER DEFAULT 4,
    fill_color TEXT, label TEXT, created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT, pin_id TEXT,
    user_id TEXT, user_name TEXT, user_role TEXT, user_company TEXT,
    action TEXT NOT NULL,
    old_value TEXT, new_value TEXT, details TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS subcontractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL, trade TEXT,
    contact_name TEXT, contact_email TEXT, contact_phone TEXT,
    initials TEXT, color TEXT DEFAULT '#EF4444',
    license_number TEXT, created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    file_type TEXT,
    category TEXT DEFAULT 'General',
    uploaded_by TEXT,
    uploaded_by_id TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_sheets_project_id ON sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_project_id ON pins(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_sheet_id ON pins(sheet_id);
CREATE INDEX IF NOT EXISTS idx_pin_photos_pin_id ON pin_photos(pin_id);
CREATE INDEX IF NOT EXISTS idx_comments_pin_id ON comments(pin_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
"""


def _sqlite_schema_sql() -> str:
    """SQLite-compatible DDL (no TIMESTAMPTZ, no JSONB, no IF NOT EXISTS issues)."""
    return """
CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    type TEXT NOT NULL DEFAULT 'contractor',
    parent_contractor_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone TEXT, email TEXT, license_number TEXT, trade TEXT,
    address TEXT, contact_person TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL DEFAULT 'sub_contractor',
    company TEXT,
    company_id TEXT REFERENCES companies(id) ON DELETE SET NULL,
    phone TEXT, avatar_url TEXT, password_hash TEXT,
    supabase_uid TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON users(supabase_uid);
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    code TEXT, address TEXT, description TEXT, client_name TEXT,
    start_date TEXT, target_completion TEXT,
    gc_user_id TEXT, contractor_company_id TEXT,
    building_id TEXT, building_name TEXT,
    status TEXT DEFAULT 'active',
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS project_members (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    user_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    role TEXT, company_name TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    UNIQUE (project_id, user_id)
);
CREATE TABLE IF NOT EXISTS sheets (
    id TEXT PRIMARY KEY,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    sheet_number TEXT NOT NULL,
    name TEXT NOT NULL,
    discipline TEXT NOT NULL DEFAULT 'architectural',
    floor_level TEXT,
    version_number INTEGER DEFAULT 1,
    width_pts INTEGER DEFAULT 1200,
    height_pts INTEGER DEFAULT 800,
    file_path TEXT, image_path TEXT, image_url TEXT,
    file_name TEXT, page_index INTEGER DEFAULT 0, page_count INTEGER DEFAULT 1,
    version TEXT DEFAULT 'Rev 1', change_notes TEXT,
    scale_ratio TEXT DEFAULT '1/4" = 1''-0"',
    building_id TEXT, building_name TEXT,
    uploaded_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS sheet_versions (
    id TEXT PRIMARY KEY,
    sheet_id TEXT REFERENCES sheets(id) ON DELETE CASCADE,
    project_id TEXT,
    version_number INTEGER NOT NULL,
    version_tag TEXT,
    version TEXT,
    file_name TEXT, file_path TEXT, image_path TEXT, image_url TEXT,
    file_size_bytes INTEGER,
    uploaded_by TEXT, change_summary TEXT, change_notes TEXT,
    is_current INTEGER DEFAULT 1,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pins (
    id TEXT PRIMARY KEY,
    sheet_id TEXT REFERENCES sheets(id) ON DELETE CASCADE,
    project_id TEXT REFERENCES projects(id) ON DELETE CASCADE,
    item_number INTEGER NOT NULL,
    task_id TEXT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT NOT NULL DEFAULT 'open',
    priority TEXT NOT NULL DEFAULT 'medium',
    discipline TEXT DEFAULT 'architectural',
    room_location TEXT, root_cause TEXT, stamp_initials TEXT,
    subcontractor_stamp TEXT,
    x_pct REAL, y_pct REAL,
    assigned_to_user_id TEXT, assigned_to_name TEXT,
    assigned_to_company TEXT, assigned_contractor_name TEXT,
    assigned_subcontractor_name TEXT,
    assigned_contractor_id TEXT, assigned_subcontractor_id TEXT,
    created_by_user_id TEXT, created_by_name TEXT,
    due_date TEXT,
    assignees TEXT DEFAULT '[]',
    watchers TEXT DEFAULT '[]',
    location TEXT,
    root_cause_detail TEXT, description_detail TEXT,
    start_date TEXT, end_date TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now')),
    closed_at TEXT
);
CREATE TABLE IF NOT EXISTS pin_photos (
    id TEXT PRIMARY KEY,
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    url TEXT NOT NULL,
    type TEXT DEFAULT 'issue',
    caption TEXT, uploaded_by TEXT, uploaded_by_id TEXT,
    thumbnail_url TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS comments (
    id TEXT PRIMARY KEY,
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    author_id TEXT, author_name TEXT,
    body TEXT NOT NULL,
    parent_id TEXT,
    char_count INTEGER,
    edited INTEGER DEFAULT 0,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS markups (
    id TEXT PRIMARY KEY,
    sheet_id TEXT REFERENCES sheets(id) ON DELETE CASCADE,
    author_id TEXT, type TEXT NOT NULL,
    data TEXT,
    points_json TEXT,
    stroke_color TEXT DEFAULT '#DC2626',
    stroke_width INTEGER DEFAULT 4,
    fill_color TEXT, label TEXT, created_by TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS pin_history (
    id TEXT PRIMARY KEY,
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    changed_by TEXT, old_status TEXT, new_status TEXT, comment TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS audit_logs (
    id TEXT PRIMARY KEY,
    project_id TEXT, pin_id TEXT,
    user_id TEXT, user_name TEXT, user_role TEXT, user_company TEXT,
    action TEXT NOT NULL,
    old_value TEXT, new_value TEXT, details TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS subcontractors (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    trade TEXT, contact_name TEXT, contact_email TEXT, contact_phone TEXT,
    initials TEXT, color TEXT DEFAULT '#EF4444',
    license_number TEXT, created_by TEXT,
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE TABLE IF NOT EXISTS documents (
    id TEXT PRIMARY KEY,
    project_id TEXT,
    name TEXT NOT NULL,
    file_name TEXT,
    file_path TEXT,
    file_url TEXT,
    file_size_bytes INTEGER,
    file_type TEXT,
    category TEXT DEFAULT 'General',
    uploaded_by TEXT,
    uploaded_by_id TEXT,
    created_at TEXT DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_sheets_project_id ON sheets(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_project_id ON pins(project_id);
CREATE INDEX IF NOT EXISTS idx_pins_sheet_id ON pins(sheet_id);
CREATE INDEX IF NOT EXISTS idx_pin_photos_pin_id ON pin_photos(pin_id);
CREATE INDEX IF NOT EXISTS idx_comments_pin_id ON comments(pin_id);
CREATE INDEX IF NOT EXISTS idx_markups_sheet_id ON markups(sheet_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_project_id ON audit_logs(project_id);
CREATE INDEX IF NOT EXISTS idx_documents_project_id ON documents(project_id);
"""


def _run_migrations(conn):
    """Ensure all required columns exist on tables even if created by earlier schema versions."""
    if settings.use_postgres:
        pg_migrations = [
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS image_url TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS file_name TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS page_index INTEGER DEFAULT 0",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS page_count INTEGER DEFAULT 1",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS version TEXT DEFAULT 'Rev 1'",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS change_notes TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS uploaded_by TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS building_id TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS building_name TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS floor_level TEXT",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS scale_ratio TEXT DEFAULT '1/4\" = 1''-0\"'",
            "ALTER TABLE sheets ADD COLUMN IF NOT EXISTS version_number INTEGER DEFAULT 1",
            "ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS project_id TEXT",
            "ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS version TEXT",
            "ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS image_path TEXT",
            "ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS image_url TEXT",
            "ALTER TABLE sheet_versions ADD COLUMN IF NOT EXISTS change_notes TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS task_id TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS subcontractor_stamp TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS assigned_contractor_id TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS assigned_subcontractor_id TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS created_by_user_id TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS assignees TEXT DEFAULT '[]'",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS watchers TEXT DEFAULT '[]'",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS location TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS root_cause_detail TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS description_detail TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS start_date TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS end_date TEXT",
            "ALTER TABLE pins ADD COLUMN IF NOT EXISTS stamp_scale FLOAT DEFAULT 1.0",
            "ALTER TABLE pin_photos ADD COLUMN IF NOT EXISTS type TEXT DEFAULT 'issue'",
            "ALTER TABLE pin_photos ADD COLUMN IF NOT EXISTS uploaded_by_id TEXT",
            "ALTER TABLE pin_photos ADD COLUMN IF NOT EXISTS thumbnail_url TEXT",
            "ALTER TABLE comments ADD COLUMN IF NOT EXISTS char_count INTEGER",
            "ALTER TABLE comments ADD COLUMN IF NOT EXISTS edited BOOLEAN DEFAULT FALSE",
            "ALTER TABLE markups ADD COLUMN IF NOT EXISTS data TEXT",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_id TEXT",
            "ALTER TABLE projects ADD COLUMN IF NOT EXISTS building_name TEXT",
            # Users table schema synchronization & constraints
            "ALTER TABLE public.users DROP CONSTRAINT IF EXISTS ck_users_ck_users_auth_provider",
            "ALTER TABLE public.users ALTER COLUMN auth_provider SET DEFAULT 'local'",
            "ALTER TABLE public.users ALTER COLUMN email_verified SET DEFAULT true",
            "ALTER TABLE public.users ALTER COLUMN email_verified DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN full_name DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN auth_provider DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN mfa_enabled SET DEFAULT false",
            "ALTER TABLE public.users ALTER COLUMN mfa_enabled DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN is_org_admin SET DEFAULT false",
            "ALTER TABLE public.users ALTER COLUMN is_org_admin DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN is_active SET DEFAULT true",
            "ALTER TABLE public.users ALTER COLUMN is_active DROP NOT NULL",
            "ALTER TABLE public.users ALTER COLUMN org_id DROP NOT NULL",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS email TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'sub_contractor'",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS company_id TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS phone TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS avatar_url TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS password_hash TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW()",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW()",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS supabase_uid TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS presence TEXT DEFAULT 'active'",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS presence_text TEXT",
            "ALTER TABLE public.users ADD COLUMN IF NOT EXISTS expires_at TIMESTAMPTZ",
            "CREATE INDEX IF NOT EXISTS idx_users_supabase_uid ON public.users(supabase_uid)",
            # Sheets table schema synchronization
            "ALTER TABLE public.sheets ADD COLUMN IF NOT EXISTS name TEXT",
            "ALTER TABLE public.sheets ADD COLUMN IF NOT EXISTS sheet_number TEXT",
            "ALTER TABLE public.sheets ADD COLUMN IF NOT EXISTS discipline TEXT DEFAULT 'architectural'",
        ]
        for stmt in pg_migrations:
            try:
                conn.execute(text(stmt))
            except Exception as err:
                print(f"⚠️  Migration warning on [{stmt}]: {err}")


def init_db():
    """Create tables if they don't exist, then seed demo data if empty."""
    global engine, SessionLocal
    try:
        with engine.connect() as conn:
            if settings.use_postgres:
                conn = conn.execution_options(isolation_level="AUTOCOMMIT")
                try:
                    tables = conn.execute(text("SELECT table_schema, table_name, table_type FROM information_schema.tables WHERE table_name = 'users'")).fetchall()
                    print(f"🔍 DB 'users' tables in Postgres: {tables}")
                    cols = conn.execute(text("SELECT table_schema, column_name FROM information_schema.columns WHERE table_name = 'users'")).fetchall()
                    print(f"🔍 DB 'users' columns: {cols}")
                except Exception as ex:
                    print(f"🔍 DB schema check notice: {ex}")

                ddl = _pg_schema_sql()
                if ddl:
                    for statement in ddl.split(";"):
                        stmt = statement.strip()
                        if stmt:
                            try:
                                conn.execute(text(stmt))
                            except Exception:
                                pass
                _run_migrations(conn)
            else:
                for stmt in _sqlite_schema_sql().split(";"):
                    s = stmt.strip()
                    if s:
                        conn.execute(text(s))
                conn.commit()
    except Exception as e:
        if settings.use_postgres:
            print(f"⚠️  PostgreSQL connection failed ({e}). Falling back to local SQLite engine...")
            settings.DATABASE_URL = ""
            db_path = Path(settings.SQLITE_PATH)
            db_path.parent.mkdir(parents=True, exist_ok=True)
            sqlite_url = f"sqlite:///{db_path.resolve()}"
            engine = create_engine(sqlite_url, connect_args={"check_same_thread": False})
            SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)
            with engine.connect() as conn:
                for stmt in _sqlite_schema_sql().split(";"):
                    s = stmt.strip()
                    if s:
                        conn.execute(text(s))
                conn.commit()
        else:
            raise

    _seed_demo_data()
    seed_demo_accounts()


def seed_demo_accounts():
    """
    Seed canonical demo accounts for all 6 roles into the users table.
    These are regular persistent user rows without auto-expiration.
    An administrator can delete any of these accounts at any time via the API or Team UI.
    """
    import bcrypt as _bcrypt

    def _hash(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()

    now_dt = datetime.now(timezone.utc)
    now_iso = now_dt.isoformat()
    is_pg = settings.use_postgres

    # Ensure demo companies exist
    upsert_company = (
        "INSERT INTO companies (id,name,type,trade,created_at) VALUES (:id,:name,:type,:trade,:now) ON CONFLICT (id) DO NOTHING"
        if is_pg else
        "INSERT OR IGNORE INTO companies (id,name,type,trade,created_at) VALUES (:id,:name,:type,:trade,:now)"
    )
    demo_companies = [
        {"id": "cmp-gc-1", "name": "Apex Construction Group", "type": "contractor", "trade": "General Contractor", "now": now_iso},
        {"id": "cmp-sub-1", "name": "Apex Mechanical", "type": "subcontractor", "trade": "Mechanical & HVAC", "now": now_iso},
        {"id": "cmp-sub-2", "name": "Studio Design Arc", "type": "contractor", "trade": "Architecture", "now": now_iso},
        {"id": "cmp-sub-3", "name": "Capital Asset Group", "type": "owner", "trade": "Owner / Facility", "now": now_iso},
        {"id": "cmp-sub-4", "name": "City QA Inspections", "type": "contractor", "trade": "Field Inspection", "now": now_iso},
    ]
    for c in demo_companies:
        try:
            execute_write(upsert_company, c)
        except Exception as e:
            print(f"⚠️  Company upsert notice: {e}")

    demo_users = [
        {
            "id": "00000000-0000-0000-0000-000000000001",
            "name": "Admin",
            "email": "admin@punchlistpro.demo",
            "role": "admin",
            "company": "Apex Construction Group",
            "company_id": "cmp-gc-1",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000002",
            "name": "Alex Morgan",
            "email": "admin@punchlist.pro",
            "role": "admin",
            "company": "Apex Construction Group",
            "company_id": "cmp-gc-1",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000003",
            "name": "Contractor",
            "email": "contractor@punchlistpro.demo",
            "role": "general_contractor",
            "company": "Apex Construction Group",
            "company_id": "cmp-gc-1",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000004",
            "name": "Subcontractor",
            "email": "sub@punchlistpro.demo",
            "role": "sub_contractor",
            "company": "Apex Mechanical",
            "company_id": "cmp-sub-1",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000005",
            "name": "Architect",
            "email": "architect@punchlistpro.demo",
            "role": "architect",
            "company": "Studio Design Arc",
            "company_id": "cmp-sub-2",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000006",
            "name": "Owner Rep",
            "email": "owner@punchlistpro.demo",
            "role": "owner",
            "company": "Capital Asset Group",
            "company_id": "cmp-sub-3",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
        {
            "id": "00000000-0000-0000-0000-000000000007",
            "name": "Field Inspector",
            "email": "inspector@punchlistpro.demo",
            "role": "field_inspector",
            "company": "City QA Inspections",
            "company_id": "cmp-sub-4",
            "pw": _hash("Demo@2026!"),
            "now": now_iso,
        },
    ]

    table_name = "public.users" if settings.use_postgres else "users"
    for u in demo_users:
        try:
            # Respect admin deletion: if admin previously deleted this user, do not resurrect
            was_deleted = execute_one(
                "SELECT id FROM audit_logs WHERE action IN ('USER_DELETED', 'MEMBER_REMOVED') AND details LIKE :pattern",
                {"pattern": f"%{u['email']}%"}
            )
            if was_deleted:
                continue

            existing = execute_one(
                f"SELECT id, name, email FROM {table_name} WHERE LOWER(email) = LOWER(:email)",
                {"email": u["email"]}
            )
            if not existing:
                execute_write(
                    f"INSERT INTO {table_name} (id,name,email,role,company,company_id,password_hash,created_at,updated_at) "
                    "VALUES (:id,:name,:email,:role,:company,:company_id,:pw,:now,:now)",
                    u
                )
                print(f"✅ Seeded persistent demo account: {u['email']} ({u['role']})")
        except Exception as e:
            print(f"⚠️  Failed to seed demo account {u['email']}: {e}")

    print("✅ All demo user accounts active in database (admin can delete at will).")


# ---------------------------------------------------------------------------
# Helper: run a raw SQL query and return rows as list[dict]
# ---------------------------------------------------------------------------

def _clean_db_value(v):
    if isinstance(v, Decimal):
        return float(v)
    if isinstance(v, (datetime, date)):
        return v.isoformat()
    if isinstance(v, uuid.UUID):
        return str(v)
    return v


def _row_to_dict(row) -> dict:
    """Convert a SQLAlchemy Row to a plain dict with JSON-serializable types."""
    if hasattr(row, "_mapping"):
        d = dict(row._mapping)
    else:
        d = dict(row)
    return {k: _clean_db_value(v) for k, v in d.items()}


def execute_query(sql: str, params: dict | None = None) -> list[dict]:
    """Execute a SELECT and return rows as list[dict]."""
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        return [_row_to_dict(r) for r in result]


def execute_one(sql: str, params: dict | None = None) -> dict | None:
    """Execute a SELECT and return first row as dict or None."""
    rows = execute_query(sql, params)
    return rows[0] if rows else None


def execute_write(sql: str, params: dict | None = None) -> int:
    """Execute an INSERT/UPDATE/DELETE; return rowcount."""
    with engine.connect() as conn:
        result = conn.execute(text(sql), params or {})
        conn.commit()
        return result.rowcount


def execute_write_many(statements: list[tuple[str, dict]]):
    """Execute multiple write statements in a single transaction."""
    with engine.connect() as conn:
        for sql, params in statements:
            conn.execute(text(sql), params or {})
        conn.commit()


# ---------------------------------------------------------------------------
# Audit log helper
# ---------------------------------------------------------------------------

def add_audit_log(
    action: str,
    *,
    project_id: str | None = None,
    pin_id: str | None = None,
    user_id: str = "system",
    user_name: str = "System",
    user_role: str = "admin",
    user_company: str | None = None,
    old_value: str | None = None,
    new_value: str | None = None,
    details: str | None = None,
):
    log_id = f"audit-{uuid.uuid4().hex[:12]}"
    now = datetime.now(timezone.utc).isoformat()
    if settings.use_postgres:
        execute_write(
            """INSERT INTO audit_logs (id, project_id, pin_id, user_id, user_name, user_role, user_company,
               action, old_value, new_value, details, created_at)
               VALUES (:id,:project_id,:pin_id,:user_id,:user_name,:user_role,:user_company,
               :action,:old_value,:new_value,:details,:created_at)
               ON CONFLICT (id) DO NOTHING""",
            dict(id=log_id, project_id=project_id, pin_id=pin_id, user_id=user_id,
                 user_name=user_name, user_role=user_role, user_company=user_company,
                 action=action, old_value=str(old_value) if old_value is not None else None,
                 new_value=str(new_value) if new_value is not None else None,
                 details=details, created_at=now),
        )
    else:
        execute_write(
            """INSERT OR IGNORE INTO audit_logs (id, project_id, pin_id, user_id, user_name, user_role,
               user_company, action, old_value, new_value, details, created_at)
               VALUES (:id,:project_id,:pin_id,:user_id,:user_name,:user_role,:user_company,
               :action,:old_value,:new_value,:details,:created_at)""",
            dict(id=log_id, project_id=project_id, pin_id=pin_id, user_id=user_id,
                 user_name=user_name, user_role=user_role, user_company=user_company,
                 action=action, old_value=str(old_value) if old_value is not None else None,
                 new_value=str(new_value) if new_value is not None else None,
                 details=details, created_at=now),
        )


def get_audit_logs(project_id: str | None = None, pin_id: str | None = None) -> list[dict]:
    if project_id and pin_id:
        sql = "SELECT * FROM audit_logs WHERE project_id=:project_id AND pin_id=:pin_id ORDER BY created_at DESC"
        return execute_query(sql, {"project_id": project_id, "pin_id": pin_id})
    if project_id:
        return execute_query(
            "SELECT * FROM audit_logs WHERE project_id=:project_id ORDER BY created_at DESC",
            {"project_id": project_id},
        )
    if pin_id:
        return execute_query(
            "SELECT * FROM audit_logs WHERE pin_id=:pin_id ORDER BY created_at DESC",
            {"pin_id": pin_id},
        )
    return execute_query("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT 200")


# ---------------------------------------------------------------------------
# Demo seed data (mirrors the Node.js in-memory seed)
# ---------------------------------------------------------------------------

def _seed_demo_data():
    """Insert demo users and companies only if the users table is empty."""
    existing = execute_one("SELECT COUNT(*) as cnt FROM users")
    if existing and int(existing.get("cnt", 0)) > 0:
        return

    import bcrypt as _bcrypt

    def _hash(pw: str) -> str:
        return _bcrypt.hashpw(pw.encode(), _bcrypt.gensalt()).decode()

    now = datetime.now(timezone.utc).isoformat()
    is_pg = settings.use_postgres
    upsert_company = (
        "INSERT INTO companies (id,name,type,trade,created_at) VALUES (:id,:name,:type,:trade,:now) ON CONFLICT (id) DO NOTHING"
        if is_pg else
        "INSERT OR IGNORE INTO companies (id,name,type,trade,created_at) VALUES (:id,:name,:type,:trade,:now)"
    )
    upsert_user = (
        "INSERT INTO users (id,name,email,role,company,company_id,password_hash,created_at,updated_at) VALUES (:id,:name,:email,:role,:company,:company_id,:pw,:now,:now) ON CONFLICT (id) DO NOTHING"
        if is_pg else
        "INSERT OR IGNORE INTO users (id,name,email,role,company,company_id,password_hash,created_at,updated_at) VALUES (:id,:name,:email,:role,:company,:company_id,:pw,:now,:now)"
    )

    upsert_project = (
        "INSERT INTO projects (id,name,code,address,status,created_at) VALUES (:id,:name,:code,:address,:status,:now) ON CONFLICT (id) DO NOTHING"
        if is_pg else
        "INSERT OR IGNORE INTO projects (id,name,code,address,status,created_at) VALUES (:id,:name,:code,:address,:status,:now)"
    )

    companies = [
        {"id": "cmp-gc-1", "name": "Apex Construction Group", "type": "contractor", "trade": "General Contractor", "now": now},
        {"id": "cmp-sub-1", "name": "Metro Plumbing", "type": "subcontractor", "trade": "Plumbing", "now": now},
        {"id": "cmp-sub-2", "name": "Apex Concrete", "type": "subcontractor", "trade": "Concrete", "now": now},
        {"id": "cmp-sub-3", "name": "Summit Electric", "type": "subcontractor", "trade": "Electrical", "now": now},
    ]
    users = [
        {"id": "usr-1", "name": "Alex Morgan", "email": "admin@punchlist.pro", "role": "admin", "company": "Apex Construction Group", "company_id": "cmp-gc-1", "pw": _hash("admin123"), "now": now},
        {"id": "usr-2", "name": "Jordan Rivera", "email": "gc@punchlist.pro", "role": "general_contractor", "company": "Apex Construction Group", "company_id": "cmp-gc-1", "pw": _hash("gc123"), "now": now},
        {"id": "usr-3", "name": "Sam Chen", "email": "sub@punchlist.pro", "role": "sub_contractor", "company": "Metro Plumbing", "company_id": "cmp-sub-1", "pw": _hash("sub123"), "now": now},
    ]
    projects = [
        {"id": "proj-1", "name": "UMBC Campus & Harbor Point", "code": "UMBC-2026", "address": "1000 Hilltop Circle, Baltimore, MD 21250", "status": "active", "now": now},
        {"id": "proj-2", "name": "Apex Innovation Center", "code": "AIC-2026", "address": "100 Technology Square, Cambridge, MA 02139", "status": "active", "now": now},
    ]

    try:
        for c in companies:
            execute_write(upsert_company, c)
        for u in users:
            execute_write(upsert_user, u)
        for p in projects:
            execute_write(upsert_project, p)
        print("✅ Demo seed data inserted.")
    except Exception as e:
        print(f"⚠️  Seed skipped or partial: {e}")

