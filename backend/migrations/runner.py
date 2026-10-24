"""
migrations/runner.py  –  Sequential SQL migration runner.
Tracks applied migrations in a schema_migrations table.
Run:  cd backend && python -m migrations.runner
"""
import sys, os, glob, hashlib
sys.path.insert(0,".")
from app.database import execute_write, execute_one, execute_query, init_db

init_db()

# Ensure tracking table exists
execute_write("""
CREATE TABLE IF NOT EXISTS schema_migrations (
    version     TEXT PRIMARY KEY,
    filename    TEXT NOT NULL,
    checksum    TEXT NOT NULL,
    applied_at  TIMESTAMPTZ DEFAULT NOW()
)
""")

migrations_dir = os.path.join(os.path.dirname(__file__), "sql")
files = sorted(glob.glob(os.path.join(migrations_dir, "*.sql")))

print(f"\nFound {len(files)} migration file(s).")
applied = 0

for path in files:
    version = os.path.basename(path).split("_")[0]
    filename = os.path.basename(path)
    with open(path) as f:
        sql = f.read()
    checksum = hashlib.md5(sql.encode()).hexdigest()

    row = execute_one("SELECT version FROM schema_migrations WHERE version=:v", {"v": version})
    if row:
        print(f"  [skip] {filename} (already applied)")
        continue

    try:
        for stmt in sql.split(";"):
            stmt = stmt.strip()
            if stmt:
                execute_write(stmt)
        execute_write(
            "INSERT INTO schema_migrations(version,filename,checksum) VALUES(:v,:f,:c)",
            {"v":version,"f":filename,"c":checksum}
        )
        print(f"  [OK]   {filename}")
        applied += 1
    except Exception as e:
        print(f"  [FAIL] {filename}: {e}")
        sys.exit(1)

print(f"\nDone. {applied} migration(s) applied.")
