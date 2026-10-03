CREATE TABLE metadata (
  singleton INTEGER PRIMARY KEY CHECK (singleton = 1),
  revision INTEGER NOT NULL CHECK (revision >= 0 AND revision <= 9007199254740991),
  epoch INTEGER NOT NULL CHECK (epoch >= 0 AND epoch <= 9007199254740991),
  key_check TEXT NOT NULL
) STRICT;
CREATE TABLE submissions (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  body TEXT NOT NULL,
  created_at TEXT NOT NULL,
  created_ms INTEGER NOT NULL,
  state TEXT NOT NULL CHECK (state IN ('unverified','expired','pending','approved','rejected','deleted')),
  verified_at TEXT,
  consent_version TEXT,
  email_cipher TEXT,
  token_hash TEXT UNIQUE,
  expires_ms INTEGER NOT NULL,
  dedupe_hash TEXT,
  ip_hash TEXT,
  mailbox_hash TEXT
) STRICT;
CREATE INDEX submissions_dedupe ON submissions(dedupe_hash, state, expires_ms);
CREATE TABLE rate_events (
  submission_id TEXT PRIMARY KEY REFERENCES submissions(id),
  accepted_ms INTEGER NOT NULL,
  ip_hash TEXT NOT NULL,
  mailbox_hash TEXT NOT NULL
) STRICT;
CREATE INDEX rates_time ON rate_events(accepted_ms);
CREATE TABLE outbox (
  id TEXT PRIMARY KEY REFERENCES submissions(id),
  payload_cipher TEXT,
  state TEXT NOT NULL CHECK (state IN ('queued','delivered','cancelled')),
  expires_ms INTEGER NOT NULL,
  next_ms INTEGER NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  lease_id TEXT,
  lease_until_ms INTEGER,
  error_code TEXT
) STRICT;
CREATE INDEX outbox_due ON outbox(state, next_ms);
CREATE TABLE audit (
  sequence INTEGER PRIMARY KEY,
  submission_id TEXT NOT NULL REFERENCES submissions(id),
  action TEXT NOT NULL,
  occurred_at TEXT NOT NULL
) STRICT;
PRAGMA user_version = 1;
