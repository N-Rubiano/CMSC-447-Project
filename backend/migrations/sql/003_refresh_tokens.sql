-- 003_refresh_tokens.sql
-- Store refresh tokens for long-lived sessions (alternative to Supabase for local auth)
CREATE TABLE IF NOT EXISTS refresh_tokens (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
    token_hash  TEXT NOT NULL UNIQUE,
    expires_at  TIMESTAMPTZ NOT NULL,
    revoked     BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_refresh_user ON refresh_tokens(user_id);
CREATE INDEX IF NOT EXISTS idx_refresh_hash ON refresh_tokens(token_hash)
