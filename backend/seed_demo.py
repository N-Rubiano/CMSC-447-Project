"""
seed_demo.py - PunchList Pro demo account seed
3 accounts, all password: Demo@2026!

Run from /backend:  python seed_demo.py
"""
import sys
sys.path.insert(0, ".")

import bcrypt
from datetime import datetime, timezone
from app.database import execute_write, execute_one, init_db

init_db()

NOW = datetime.now(timezone.utc).isoformat()
PW_HASH = bcrypt.hashpw(b"Demo@2026!", bcrypt.gensalt()).decode()

# ── Companies (no updated_at column in schema) ──
COMPANIES = [
    {"id": "cmp-demo-1", "name": "PunchList Pro Facility Management", "type": "owner"},
    {"id": "cmp-demo-2", "name": "Apex Construction Group",          "type": "general_contractor"},
    {"id": "cmp-demo-3", "name": "Prime Trade Solutions",            "type": "sub_contractor"},
    {"id": "cmp-demo-4", "name": "Studio Design Partners AIA",       "type": "architect"},
    {"id": "cmp-demo-5", "name": "Capital Assets Investment Group",   "type": "owner"},
    {"id": "cmp-demo-6", "name": "Field Quality Assurance Partners",  "type": "other"},
]
print("\n-- Companies --")
for c in COMPANIES:
    existing = execute_one("SELECT id FROM companies WHERE id=:id", {"id": c["id"]})
    if existing:
        execute_write("UPDATE companies SET name=:name, type=:type WHERE id=:id", c)
        print(f"  Updated: {c['name']}")
    else:
        execute_write(
            "INSERT INTO companies (id, name, type, created_at) VALUES (:id, :name, :type, :now)",
            {**c, "now": NOW}
        )
        print(f"  Created: {c['name']}")

# ── Users (All 6 RBAC Roles) ──
DEMO_USERS = [
    {
        "id": "usr-demo-admin",
        "name": "Facility Administrator",
        "email": "admin@punchlistpro.demo",
        "role": "admin",
        "company": "PunchList Pro Facility Management",
        "company_id": "cmp-demo-1"
    },
    {
        "id": "usr-demo-gc",
        "name": "General Contractor",
        "email": "contractor@punchlistpro.demo",
        "role": "general_contractor",
        "company": "Apex Construction Group",
        "company_id": "cmp-demo-2"
    },
    {
        "id": "usr-demo-sub",
        "name": "Trade Subcontractor",
        "email": "sub@punchlistpro.demo",
        "role": "sub_contractor",
        "company": "Prime Trade Solutions",
        "company_id": "cmp-demo-3"
    },
    {
        "id": "usr-demo-arch",
        "name": "Design Architect",
        "email": "architect@punchlistpro.demo",
        "role": "architect",
        "company": "Studio Design Partners AIA",
        "company_id": "cmp-demo-4"
    },
    {
        "id": "usr-demo-owner",
        "name": "Owner Representative",
        "email": "owner@punchlistpro.demo",
        "role": "owner",
        "company": "Capital Assets Investment Group",
        "company_id": "cmp-demo-5"
    },
    {
        "id": "usr-demo-inspector",
        "name": "Field Inspector",
        "email": "inspector@punchlistpro.demo",
        "role": "field_inspector",
        "company": "Field Quality Assurance Partners",
        "company_id": "cmp-demo-6"
    },
]
print("\n-- Users --")
for u in DEMO_USERS:
    existing = execute_one("SELECT id FROM users WHERE id=:id", {"id": u["id"]})
    if existing:
        execute_write(
            "UPDATE users SET name=:name, email=:email, role=:role, company=:company, company_id=:company_id, password_hash=:pw, updated_at=:now WHERE id=:id",
            {**u, "pw": PW_HASH, "now": NOW}
        )
        print(f"  Updated [{u['role']:20s}] {u['email']}")
    else:
        execute_write(
            "INSERT INTO users (id, name, email, role, company, company_id, password_hash, created_at, updated_at) VALUES (:id, :name, :email, :role, :company, :company_id, :pw, :now, :now)",
            {**u, "pw": PW_HASH, "now": NOW}
        )
        print(f"  Created [{u['role']:20s}] {u['email']}")

# ── Demo project membership ──
DEMO_PROJECT_ID = "proj-1"
try:
    proj = execute_one("SELECT id FROM projects WHERE id=:id", {"id": DEMO_PROJECT_ID})
    if proj:
        execute_write(
            "UPDATE projects SET gc_user_id=:gc, contractor_company_id=:cmp WHERE id=:id",
            {"gc": "usr-demo-gc", "cmp": "cmp-demo-2", "id": DEMO_PROJECT_ID}
        )
    MEMBER_ROLES = {
        "usr-demo-admin": "admin",
        "usr-demo-gc": "general_contractor",
        "usr-demo-sub": "sub_contractor",
        "usr-demo-arch": "architect",
        "usr-demo-owner": "owner",
        "usr-demo-inspector": "field_inspector",
    }
    for uid, role in MEMBER_ROLES.items():
        exists = execute_one("SELECT id FROM project_members WHERE project_id=:pid AND user_id=:uid", {"pid": DEMO_PROJECT_ID, "uid": uid})
        if not exists:
            import uuid
            execute_write(
                "INSERT INTO project_members (id, project_id, user_id, role, created_at) VALUES (:id, :pid, :uid, :role, :now)",
                {"id": f"pm-{uuid.uuid4().hex[:8]}", "pid": DEMO_PROJECT_ID, "uid": uid, "role": role, "now": NOW}
            )
    print("  All 6 RBAC users added as project members to proj-1")
except Exception as e:
    print(f"  Project/member seeding skipped: {e}")

print("""
+-------------------------------------------------------------------------+
|              PunchList Pro - All 6 RBAC Demo Accounts Created           |
+-------------------------------------------------------------------------+
| Role               | Email                         | Password           |
| Admin              | admin@punchlistpro.demo       | Demo@2026!         |
| General Contractor | contractor@punchlistpro.demo  | Demo@2026!         |
| Subcontractor      | sub@punchlistpro.demo         | Demo@2026!         |
| Architect          | architect@punchlistpro.demo   | Demo@2026!         |
| Owner / Client Rep | owner@punchlistpro.demo       | Demo@2026!         |
| Field Inspector    | inspector@punchlistpro.demo   | Demo@2026!         |
+-------------------------------------------------------------------------+
""")
