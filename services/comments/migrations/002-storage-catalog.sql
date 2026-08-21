CREATE TABLE IF NOT EXISTS plugin_registry (
  plugin_id TEXT PRIMARY KEY,
  version TEXT NOT NULL,
  enabled INTEGER NOT NULL DEFAULT 0,
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS plugin_storage_catalog (
  plugin_id TEXT PRIMARY KEY REFERENCES plugin_registry(plugin_id),
  dialect TEXT NOT NULL CHECK (dialect IN ('sqlite', 'mariadb', 'mysql')),
  relative_path TEXT NOT NULL,
  schema_version INTEGER NOT NULL CHECK (schema_version >= 0),
  lifecycle_state TEXT NOT NULL CHECK (lifecycle_state IN ('active', 'migrating', 'retired')),
  registered_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (plugin_id, relative_path)
);

CREATE INDEX IF NOT EXISTS plugin_storage_catalog_state_idx
  ON plugin_storage_catalog(lifecycle_state);
