-- 001_initial_schema.sql
-- Base schema: companies, users, projects, sheets, pins, comments, etc.
-- This mirrors the inline DDL in database.py but versioned for repeatable deploys.

ALTER TABLE projects ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE companies ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE project_members ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id)
