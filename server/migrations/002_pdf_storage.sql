-- AceArch PostgreSQL schema v002
-- Adds persistent PDF binary storage for cross-device access.
-- Safe to run against an existing AceArch Supabase database.

CREATE TABLE IF NOT EXISTS pdfs (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    subject_id TEXT NOT NULL,
    filename TEXT NOT NULL,
    mime_type TEXT NOT NULL DEFAULT 'application/pdf',
    size INTEGER NOT NULL DEFAULT 0,
    data BYTEA NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS pdfs_user_id_idx
    ON pdfs (user_id);

CREATE INDEX IF NOT EXISTS pdfs_subject_id_idx
    ON pdfs (subject_id);

INSERT INTO schema_migrations (version)
VALUES ('002_pdf_storage')
ON CONFLICT (version) DO NOTHING;
