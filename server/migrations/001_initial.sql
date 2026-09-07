-- AceArch PostgreSQL schema v001
-- Safe to run against a new Supabase PostgreSQL database.
-- This schema is used by the PostgreSQL application database.

CREATE TABLE IF NOT EXISTS schema_migrations (
    version TEXT PRIMARY KEY,
    applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    username TEXT NOT NULL,
    password_hash TEXT NOT NULL,
    created_at TEXT NOT NULL
);

-- Preserve case-insensitive username uniqueness in PostgreSQL:
-- uniqueness is enforced on LOWER(username).
CREATE UNIQUE INDEX IF NOT EXISTS users_username_lower_unique
    ON users (LOWER(username));

CREATE TABLE IF NOT EXISTS tasks (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    deadline TEXT,
    subject TEXT,
    created_at TEXT,
    priority TEXT,
    description TEXT,
    updated_at TEXT,
    completed_at TEXT,
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    color TEXT,
    created_at TEXT,
    schedule TEXT DEFAULT '[]',
    notes TEXT DEFAULT '[]',
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS settings (
    key TEXT NOT NULL,
    user_id TEXT NOT NULL,
    value TEXT,
    PRIMARY KEY (key, user_id)
);

CREATE TABLE IF NOT EXISTS notifications (
    id TEXT PRIMARY KEY,
    title TEXT,
    message TEXT,
    created_at TEXT,
    read BOOLEAN NOT NULL DEFAULT FALSE,
    notification_key TEXT,
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS calendar_items (
    id TEXT PRIMARY KEY,
    title TEXT,
    date TEXT,
    type TEXT,
    task_id TEXT,
    user_id TEXT
);

CREATE TABLE IF NOT EXISTS focus_sessions (
    id TEXT PRIMARY KEY,
    minutes INTEGER,
    date TEXT,
    completed_at TEXT,
    user_id TEXT
);

CREATE INDEX IF NOT EXISTS tasks_user_id_idx ON tasks (user_id);
CREATE INDEX IF NOT EXISTS subjects_user_id_idx ON subjects (user_id);
CREATE INDEX IF NOT EXISTS settings_user_id_idx ON settings (user_id);
CREATE INDEX IF NOT EXISTS notifications_user_id_idx ON notifications (user_id);
CREATE INDEX IF NOT EXISTS calendar_items_user_id_idx ON calendar_items (user_id);
CREATE INDEX IF NOT EXISTS focus_sessions_user_id_idx ON focus_sessions (user_id);

INSERT INTO schema_migrations (version)
VALUES ('001_initial')
ON CONFLICT (version) DO NOTHING;
