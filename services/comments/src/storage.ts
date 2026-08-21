import path from 'node:path';

export const DATABASE_DIALECTS = ['sqlite', 'mariadb', 'mysql'] as const;
export type DatabaseDialect = (typeof DATABASE_DIALECTS)[number];

export const STORAGE_LIFECYCLE_STATES = ['active', 'migrating', 'retired'] as const;
export type StorageLifecycleState = (typeof STORAGE_LIFECYCLE_STATES)[number];

export const DEFAULT_COMMENTS_DATA_ROOT = '/var/lib/firefly-comments';
export const CORE_DATABASE_FILENAME = 'core.db';

export interface StorageCatalogEntry {
  readonly pluginId: string;
  readonly dialect: DatabaseDialect;
  /** A slash-separated path relative to plugins/<pluginId>/ below the data root. */
  readonly relativePath: string;
  readonly schemaVersion: number;
  readonly lifecycleState: StorageLifecycleState;
}

export interface DatabaseStatement {
  run(...values: readonly unknown[]): unknown;
  get<T extends Record<string, unknown> = Record<string, unknown>>(...values: readonly unknown[]): T | undefined;
  all<T extends Record<string, unknown> = Record<string, unknown>>(...values: readonly unknown[]): T[];
}

export interface DatabaseConnection {
  exec(sql: string): void;
  prepare(sql: string): DatabaseStatement;
  close(): void;
}

export interface Migration {
  readonly version: number;
  readonly name: string;
  readonly sql: string;
}

export interface MigrationRunner {
  readonly migrations: readonly Migration[];
  apply(database: DatabaseConnection): void;
}

export interface IntegrityProvider {
  check(databasePath: string): void | Promise<void>;
}

export interface BackupRestoreProvider {
  backup(sourcePath: string, destinationPath: string): Promise<void>;
  restore(sourcePath: string, destinationPath: string): Promise<void>;
}

export class UnsupportedDatabaseDialectError extends Error {
  readonly dialect: DatabaseDialect;

  constructor(dialect: DatabaseDialect) {
    super(`The ${dialect} database dialect is a contract extension only; SQLite is the supported runtime dialect.`);
    this.name = 'UnsupportedDatabaseDialectError';
    this.dialect = dialect;
  }
}

export function assertSupportedRuntimeDialect(dialect: DatabaseDialect): void {
  if (dialect !== 'sqlite') {
    throw new UnsupportedDatabaseDialectError(dialect);
  }
}

export function isDatabaseDialect(value: unknown): value is DatabaseDialect {
  return typeof value === 'string' && (DATABASE_DIALECTS as readonly string[]).includes(value);
}

export function isStorageLifecycleState(value: unknown): value is StorageLifecycleState {
  return typeof value === 'string' && (STORAGE_LIFECYCLE_STATES as readonly string[]).includes(value);
}

export function normalizeStorageCatalogEntry(value: unknown): StorageCatalogEntry {
  if (!isRecord(value)) {
    throw new TypeError('storage catalog entry must be an object.');
  }
  const pluginId = value.pluginId;
  if (typeof pluginId !== 'string' || !/^[a-z][a-z0-9-]{0,62}$/u.test(pluginId)) {
    throw new TypeError('storage catalog pluginId must be a lowercase plugin identifier.');
  }
  const dialect = value.dialect;
  if (!isDatabaseDialect(dialect)) {
    throw new TypeError('storage catalog dialect is not supported.');
  }
  const relativePath = value.relativePath;
  if (!isSafeStoragePath(relativePath)) {
    throw new TypeError('storage catalog relativePath must stay inside the private data root and plugin storage root.');
  }
  const schemaVersion = value.schemaVersion;
  if (typeof schemaVersion !== 'number' || !Number.isSafeInteger(schemaVersion) || schemaVersion < 0) {
    throw new TypeError('storage catalog schemaVersion must be a non-negative integer.');
  }
  const lifecycleState = value.lifecycleState;
  if (!isStorageLifecycleState(lifecycleState)) {
    throw new TypeError('storage catalog lifecycleState is invalid.');
  }
  return Object.freeze({ pluginId, dialect, relativePath, schemaVersion, lifecycleState });
}

export function validateStorageCatalog(entries: readonly StorageCatalogEntry[]): readonly StorageCatalogEntry[] {
  const normalized = entries.map((entry) => normalizeStorageCatalogEntry(entry));
  const pluginIds = new Set<string>();
  const paths = new Set<string>();
  for (const entry of normalized) {
    if (pluginIds.has(entry.pluginId)) {
      throw new TypeError(`storage catalog contains duplicate pluginId: ${entry.pluginId}`);
    }
    const storagePath = `${entry.pluginId}/${entry.relativePath}`;
    if (paths.has(storagePath)) {
      throw new TypeError(`storage catalog contains duplicate path: ${storagePath}`);
    }
    pluginIds.add(entry.pluginId);
    paths.add(storagePath);
  }
  return Object.freeze(normalized);
}

export function resolvePluginStoragePath(dataRoot: string, entry: StorageCatalogEntry): string {
  const normalized = normalizeStorageCatalogEntry(entry);
  const pluginRoot = path.resolve(dataRoot, 'plugins', normalized.pluginId);
  const candidate = path.resolve(pluginRoot, ...normalized.relativePath.split('/'));
  if (candidate !== pluginRoot && !candidate.startsWith(`${pluginRoot}${path.sep}`)) {
    throw new TypeError('plugin storage path escapes the private data root.');
  }
  return candidate;
}

export function resolveCommentsDataRoot(
  env: Readonly<Record<string, string | undefined>> = process.env,
  databasePath?: string
): string {
  const configured = env.COMMENTS_DATA_ROOT?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  if (databasePath) {
    return path.dirname(path.resolve(databasePath));
  }
  return DEFAULT_COMMENTS_DATA_ROOT;
}

export function resolveCoreDatabasePath(
  env: Readonly<Record<string, string | undefined>> = process.env
): string {
  const configured = env.COMMENTS_DATABASE_PATH?.trim();
  if (configured) {
    return path.resolve(configured);
  }
  return path.join(resolveCommentsDataRoot(env), CORE_DATABASE_FILENAME);
}

export function sortMigrations(migrations: readonly Migration[]): readonly Migration[] {
  const sorted = [...migrations].sort((left, right) => left.version - right.version || left.name.localeCompare(right.name));
  const seen = new Set<number>();
  for (const migration of sorted) {
    if (!Number.isSafeInteger(migration.version) || migration.version < 1 || migration.name.length === 0 || migration.sql.trim().length === 0) {
      throw new TypeError('migration manifests require a positive version, name, and SQL body.');
    }
    if (seen.has(migration.version)) {
      throw new TypeError(`migration version ${migration.version} is declared more than once.`);
    }
    seen.add(migration.version);
  }
  return Object.freeze(sorted);
}

function isSafeStoragePath(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0 || value.startsWith('/') || value.includes('\\') || /[\u0000-\u001f\u007f\s]/u.test(value)) {
    return false;
  }
  return value.split('/').every((segment) => segment.length > 0 && segment !== '.' && segment !== '..' && /^[A-Za-z0-9][A-Za-z0-9._~-]*$/u.test(segment));
}

function isRecord(value: unknown): value is Record<string, unknown> {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}
