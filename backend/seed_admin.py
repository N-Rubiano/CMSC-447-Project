"""One-off seed script: set known password hash on admin@punchlist.pro"""
import sys
sys.path.insert(0, ".")

import bcrypt
from app.database import execute_write, execute_one, execute_query, init_db

init_db()

users = execute_query("SELECT id, email, role FROM users")
print(f"Users in DB: {len(users)}")
for u in users[:10]:
    print(f"  - {u['email']}  [{u['role']}]")

# Upsert admin user
pw = bcrypt.hashpw(b"admin123", bcrypt.gensalt()).decode()
admin = execute_one("SELECT * FROM users WHERE LOWER(email)=LOWER('admin@punchlist.pro')")
if admin:
    execute_write("UPDATE users SET password_hash=:pw WHERE id=:id", {"pw": pw, "id": admin["id"]})
    print("\n✅ Updated password_hash for admin@punchlist.pro")
else:
    execute_write(
        """INSERT INTO users (id,name,email,role,company,company_id,password_hash,created_at,updated_at)
           VALUES ('usr-py-admin','Alex Morgan','admin@punchlist.pro','admin',
           'Apex Construction Group','cmp-gc-1',:pw,CURRENT_TIMESTAMP,CURRENT_TIMESTAMP)""",
        {"pw": pw},
    )
    print("\n✅ Inserted admin@punchlist.pro")

print("Done. Try: POST /api/auth/login  {email: admin@punchlist.pro, password: admin123}")
