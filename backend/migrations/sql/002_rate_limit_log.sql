-- 002_rate_limit_log.sql
-- Optional: persist rate-limit violations for forensics (use only if not using Redis)
CREATE TABLE IF NOT EXISTS rate_limit_log (
    id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::TEXT,
    ip          TEXT NOT NULL,
    path        TEXT NOT NULL,
    limit_type  TEXT NOT NULL DEFAULT 'api',
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_rll_ip ON rate_limit_log(ip);
CREATE INDEX IF NOT EXISTS idx_rll_created ON rate_limit_log(created_at)
