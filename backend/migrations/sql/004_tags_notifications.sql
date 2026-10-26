-- 004_tags_and_notifications.sql
CREATE TABLE IF NOT EXISTS tags (
    id   TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    color TEXT DEFAULT '#78716C'
);
CREATE TABLE IF NOT EXISTS pin_tags (
    pin_id TEXT REFERENCES pins(id) ON DELETE CASCADE,
    tag_id TEXT REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (pin_id, tag_id)
);
CREATE TABLE IF NOT EXISTS notifications (
    id          TEXT PRIMARY KEY,
    user_id     TEXT REFERENCES users(id) ON DELETE CASCADE,
    type        TEXT NOT NULL,
    title       TEXT NOT NULL,
    body        TEXT,
    link        TEXT,
    read        BOOLEAN DEFAULT FALSE,
    created_at  TIMESTAMPTZ DEFAULT NOW()
);
CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, read)
