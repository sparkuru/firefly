PRAGMA foreign_keys = ON;
PRAGMA journal_mode = WAL;
PRAGMA busy_timeout = 5000;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS service_metadata (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS comments (
  internal_id TEXT PRIMARY KEY,
  public_id TEXT NOT NULL UNIQUE,
  dedupe_key TEXT NOT NULL UNIQUE,
  post_path TEXT NOT NULL,
  parent_internal_id TEXT REFERENCES comments(internal_id),
  display_name TEXT NOT NULL,
  homepage TEXT,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  email_ciphertext TEXT NOT NULL,
  email_fingerprint TEXT NOT NULL,
  verification_token_hash TEXT UNIQUE,
  verification_expires_at TEXT,
  control_token_hash TEXT UNIQUE,
  control_expires_at TEXT,
  status TEXT NOT NULL,
  verified_at TEXT,
  moderation_version INTEGER NOT NULL DEFAULT 0,
  last_action_id TEXT,
  consent_version TEXT NOT NULL,
  notify_replies INTEGER NOT NULL DEFAULT 0,
  ip_hash TEXT,
  user_agent_hash TEXT,
  abuse_retention_at TEXT NOT NULL,
  private_email_retention_at TEXT,
  tombstone_epoch INTEGER
);

CREATE INDEX IF NOT EXISTS comments_status_created_idx
  ON comments(status, created_at);
CREATE INDEX IF NOT EXISTS comments_post_created_idx
  ON comments(post_path, created_at, public_id);
CREATE INDEX IF NOT EXISTS comments_verification_idx
  ON comments(verification_token_hash);
CREATE INDEX IF NOT EXISTS comments_control_idx
  ON comments(control_token_hash);

CREATE TABLE IF NOT EXISTS audit_events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  public_id TEXT NOT NULL,
  action TEXT NOT NULL,
  action_id TEXT,
  from_status TEXT,
  to_status TEXT NOT NULL,
  occurred_at TEXT NOT NULL
);

INSERT OR IGNORE INTO service_metadata(key, value)
VALUES ('tombstone_epoch', '0');
