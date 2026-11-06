-- Migration: 005_user_onboarding_lifecycle.sql
-- Adds status, approval, invitation, and first-login credential tracking to users

ALTER TABLE users ADD COLUMN IF NOT EXISTS status TEXT DEFAULT 'active';
ALTER TABLE users ADD COLUMN IF NOT EXISTS trade TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invited_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_token TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS invitation_expires_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS must_reset_password BOOLEAN DEFAULT FALSE;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_by TEXT;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejected_at TIMESTAMPTZ;
ALTER TABLE users ADD COLUMN IF NOT EXISTS rejection_reason TEXT;

CREATE INDEX IF NOT EXISTS idx_users_status ON users(status);
CREATE INDEX IF NOT EXISTS idx_users_invitation_token ON users(invitation_token);

