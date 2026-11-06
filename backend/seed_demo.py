"""
seed_demo.py - PunchList Pro administrator seed
Single administrator: uw61778@umbc.edu / Thakur@531

Run from /backend:  python seed_demo.py
"""
import sys
sys.path.insert(0, ".")

import bcrypt
import uuid
from datetime import datetime, timezone
from app.database import execute_write, execute_one, execute_query, init_db

init_db()

NOW = datetime.now(timezone.utc).isoformat()
PW_HASH = bcrypt.hashpw(b"Thakur@531", bcrypt.gensalt(12)).decode()

# ── Clean up demo users ──
print("\n-- Cleaning demo users --")
demo_users = execute_query(
    "SELECT id, email FROM users WHERE email LIKE '%@punchlistpro.demo' OR email IN ('admin@punchlist.pro', 'gc@punchlist.pro', 'sub@punchlist.pro')"
)
for u in demo_users:
    uid = str(u['id'])
    execute_write("DELETE FROM project_members WHERE user_id = :uid", {"uid": uid})
    execute_write("DELETE FROM users WHERE id = :uid", {"uid": uid})
    print(f"  Removed demo user: {u['email']}")

# ── Admin Company ──
print("\n-- Admin Company --")
admin_company = {
    "id": "cmp-gc-1",
    "name": "UMBC Facility Operations",
    "type": "owner",
}
existing_comp = execute_one("SELECT id FROM companies WHERE id=:id", {"id": admin_company["id"]})
if existing_comp:
    execute_write("UPDATE companies SET name=:name, type=:type WHERE id=:id", admin_company)
    print(f"  Updated: {admin_company['name']}")
else:
    execute_write(
        "INSERT INTO companies (id, name, type, created_at) VALUES (:id, :name, :type, :now)",
        {**admin_company, "now": NOW}
    )
    print(f"  Created: {admin_company['name']}")

# ── Admin User ──
print("\n-- Admin User --")
admin_email = "uw61778@umbc.edu"
existing_admin = execute_one("SELECT id FROM users WHERE LOWER(email)=LOWER(:email)", {"email": admin_email})
if existing_admin:
    execute_write(
        """UPDATE users 
           SET name='Satya Thakur', role='admin', company='UMBC Facility Operations', company_id='cmp-gc-1',
               password_hash=:pw, status='active', must_reset_password=FALSE, updated_at=:now 
           WHERE LOWER(email)=LOWER(:email)""",
        {"pw": PW_HASH, "now": NOW, "email": admin_email}
    )
    print(f"  Updated admin [{admin_email}]")
else:
    admin_id = str(uuid.uuid4())
    execute_write(
        """INSERT INTO users (id, name, email, role, company, company_id, password_hash, status, must_reset_password, created_at, updated_at) 
           VALUES (:id, 'Satya Thakur', :email, 'admin', 'UMBC Facility Operations', 'cmp-gc-1', :pw, 'active', FALSE, :now, :now)""",
        {"id": admin_id, "email": admin_email, "pw": PW_HASH, "now": NOW}
    )
    print(f"  Created admin [{admin_email}]")

print("\nSeeding complete.")
