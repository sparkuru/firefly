import { chmodSync, mkdirSync, readFileSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

import { ConflictError, NotFoundError } from './errors.js';
import type { CommentRepository, RepositoryAuditEvent, StoredComment } from './types.js';
import {
  normalizeStorageCatalogEntry,
  resolvePluginStoragePath,
  sortMigrations,
  type Migration,
  type StorageCatalogEntry
} from './storage.js';

type DatabaseSync = import('node:sqlite').DatabaseSync;
type SqlValue = null | number | string;
type SqlRow = Record<string, unknown>;

const require = createRequire(import.meta.url);

const DEFAULT_MIGRATIONS_DIRECTORY = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../migrations');

export interface SqliteRepositoryOptions {
  readOnly?: boolean;
  dataRoot?: string;
  migrationsDirectory?: string;
}

export class SQLiteCommentRepository implements CommentRepository {
  private readonly database: DatabaseSync;
  private readonly dataRoot: string;
  private closed = false;

  constructor(databasePath: string, options: SqliteRepositoryOptions = {}) {
    const resolvedPath = path.resolve(databasePath);
    this.dataRoot = path.resolve(options.dataRoot ?? path.dirname(resolvedPath));
    this.database = openDatabase(resolvedPath, options.readOnly ?? false);
    if (!options.readOnly) {
      applySqliteMigrations(this.database, loadSqliteMigrations(options.migrationsDirectory ?? DEFAULT_MIGRATIONS_DIRECTORY));
      chmodSync(resolvedPath, 0o600);
    }
  }

  create(comment: StoredComment): void {
    try {
      this.database.prepare(`
        INSERT INTO comments (
          internal_id, public_id, dedupe_key, post_path, parent_internal_id,
          display_name, homepage, body, created_at, updated_at, email_ciphertext,
          email_fingerprint, verification_token_hash, verification_expires_at,
          control_token_hash, control_expires_at, status, verified_at,
          moderation_version, last_action_id, consent_version, notify_replies,
          ip_hash, user_agent_hash, abuse_retention_at, private_email_retention_at,
          tombstone_epoch
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(...commentValues(comment));
    } catch (error) {
      if (isConstraintError(error)) {
        throw new ConflictError('comment already exists.');
      }
      throw error;
    }
  }

  save(comment: StoredComment): void {
    const result = this.database.prepare(`
      UPDATE comments SET
        public_id = ?, dedupe_key = ?, post_path = ?, parent_internal_id = ?,
        display_name = ?, homepage = ?, body = ?, created_at = ?, updated_at = ?,
        email_ciphertext = ?, email_fingerprint = ?, verification_token_hash = ?,
        verification_expires_at = ?, control_token_hash = ?, control_expires_at = ?,
        status = ?, verified_at = ?, moderation_version = ?, last_action_id = ?,
        consent_version = ?, notify_replies = ?, ip_hash = ?, user_agent_hash = ?,
        abuse_retention_at = ?, private_email_retention_at = ?, tombstone_epoch = ?
      WHERE internal_id = ?
    `).run(
      ...commentValues(comment).slice(1),
      comment.internalId
    );
    if (result.changes === 0) {
      throw new NotFoundError();
    }
  }

  findByPublicId(publicId: string): StoredComment | null {
    return this.findOne('public_id = ?', publicId);
  }

  findByInternalId(internalId: string): StoredComment | null {
    return this.findOne('internal_id = ?', internalId);
  }

  findByDedupeKey(dedupeKey: string): StoredComment | null {
    return this.findOne('dedupe_key = ?', dedupeKey);
  }

  findByVerificationTokenHash(tokenHash: string): StoredComment | null {
    return this.findOne('verification_token_hash = ?', tokenHash);
  }

  findByControlTokenHash(tokenHash: string): StoredComment | null {
    return this.findOne('control_token_hash = ?', tokenHash);
  }

  list(): StoredComment[] {
    const rows = this.database.prepare('SELECT * FROM comments ORDER BY created_at ASC, public_id ASC').all();
    return rows.map((row) => toComment(row));
  }

  countRecentByPost(postPath: string, since: string): number {
    const row = this.database.prepare('SELECT COUNT(*) AS count FROM comments WHERE post_path = ? AND created_at >= ?').get(postPath, since);
    return toNumber((row as SqlRow | undefined)?.count);
  }

  getTombstoneEpoch(): number {
    const row = this.database.prepare("SELECT value FROM service_metadata WHERE key = 'tombstone_epoch'").get() as SqlRow | undefined;
    return Number(row?.value ?? 0);
  }

  incrementTombstoneEpoch(): number {
    this.database.exec('BEGIN IMMEDIATE');
    try {
      const next = this.getTombstoneEpoch() + 1;
      this.database.prepare("UPDATE service_metadata SET value = ? WHERE key = 'tombstone_epoch'").run(String(next));
      this.database.exec('COMMIT');
      return next;
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
  }

  appendAudit(event: RepositoryAuditEvent): void {
    this.database.prepare(`
      INSERT INTO audit_events(public_id, action, action_id, from_status, to_status, occurred_at)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(event.publicId, event.action, event.actionId, event.fromStatus, event.toStatus, event.occurredAt);
  }

  listAuditEvents(): RepositoryAuditEvent[] {
    const rows = this.database.prepare('SELECT public_id, action, action_id, from_status, to_status, occurred_at FROM audit_events ORDER BY id ASC').all();
    return rows.map((row) => {
      const value = row as SqlRow;
      return {
        publicId: toStringValue(value.public_id),
        action: toStringValue(value.action),
        actionId: nullableString(value.action_id),
        fromStatus: nullableStatus(value.from_status),
        toStatus: toStatus(value.to_status),
        occurredAt: toStringValue(value.occurred_at)
      };
    });
  }

  registerPluginStorage(entry: StorageCatalogEntry, pluginVersion = '0.1.0', now = new Date().toISOString()): void {
    const normalized = normalizeStorageCatalogEntry(entry);
    resolvePluginStoragePath(this.dataRoot, normalized);
    try {
      this.database.prepare(`
        INSERT OR IGNORE INTO plugin_registry(plugin_id, version, enabled, registered_at, updated_at)
        VALUES (?, ?, 0, ?, ?)
      `).run(normalized.pluginId, pluginVersion, now, now);
      this.database.prepare(`
        INSERT INTO plugin_storage_catalog(
          plugin_id, dialect, relative_path, schema_version, lifecycle_state, registered_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(normalized.pluginId, normalized.dialect, normalized.relativePath, normalized.schemaVersion, normalized.lifecycleState, now, now);
    } catch (error) {
      if (isConstraintError(error)) {
        throw new ConflictError('plugin storage catalog entry already exists.');
      }
      throw error;
    }
  }

  listPluginStorage(): StorageCatalogEntry[] {
    try {
      const rows = this.database.prepare(`
        SELECT plugin_id, dialect, relative_path, schema_version, lifecycle_state
        FROM plugin_storage_catalog
        ORDER BY plugin_id ASC
      `).all();
      return rows.map((row) => normalizeStorageCatalogEntry({
        pluginId: row.plugin_id,
        dialect: row.dialect,
        relativePath: row.relative_path,
        schemaVersion: toNumber(row.schema_version),
        lifecycleState: row.lifecycle_state
      }));
    } catch (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
  }

  listMigrationVersions(): number[] {
    try {
      const rows = this.database.prepare('SELECT version FROM schema_migrations ORDER BY version ASC').all();
      return rows.map((row) => toNumber(row.version));
    } catch (error) {
      if (isMissingTableError(error)) return [];
      throw error;
    }
  }

  updatePluginStorage(entry: StorageCatalogEntry, now = new Date().toISOString()): void {
    const normalized = normalizeStorageCatalogEntry(entry);
    resolvePluginStoragePath(this.dataRoot, normalized);
    const result = this.database.prepare(`
      UPDATE plugin_storage_catalog SET
        dialect = ?, relative_path = ?, schema_version = ?, lifecycle_state = ?, updated_at = ?
      WHERE plugin_id = ?
    `).run(normalized.dialect, normalized.relativePath, normalized.schemaVersion, normalized.lifecycleState, now, normalized.pluginId);
    if (result.changes === 0) {
      throw new NotFoundError();
    }
  }

  pluginStoragePath(entry: StorageCatalogEntry): string {
    return resolvePluginStoragePath(this.dataRoot, entry);
  }

  purge(now: string): number {
    const comments = this.list();
    let changed = 0;
    this.database.exec('BEGIN IMMEDIATE');
    try {
      for (const current of comments) {
        const comment = { ...current };
        let touched = false;
        if (comment.status === 'unverified' && comment.verificationExpiresAt && Date.parse(comment.verificationExpiresAt) <= Date.parse(now)) {
          comment.status = 'expired';
          comment.verificationTokenHash = null;
          comment.verificationExpiresAt = null;
          touched = true;
        }
        if (comment.ipHash && Date.parse(comment.abuseRetentionAt) <= Date.parse(now)) {
          comment.ipHash = null;
          comment.userAgentHash = null;
          touched = true;
        }
        if (comment.privateEmailRetentionAt && Date.parse(comment.privateEmailRetentionAt) <= Date.parse(now) && (!comment.notifyReplies || comment.status === 'rejected' || comment.status === 'quarantined' || comment.status === 'spam' || comment.status === 'expired' || comment.status === 'deletion_requested' || comment.status === 'deleted')) {
          comment.emailCiphertext = '';
          comment.emailFingerprint = '';
          comment.privateEmailRetentionAt = null;
          touched = true;
        }
        if (comment.status === 'deleted') {
          if (comment.displayName || comment.homepage || comment.body || comment.controlTokenHash || comment.controlExpiresAt || comment.verificationTokenHash || comment.verificationExpiresAt || comment.emailCiphertext || comment.emailFingerprint) {
            comment.displayName = '';
            comment.homepage = null;
            comment.body = '';
            comment.controlTokenHash = null;
            comment.controlExpiresAt = null;
            comment.verificationTokenHash = null;
            comment.verificationExpiresAt = null;
            comment.emailCiphertext = '';
            comment.emailFingerprint = '';
            touched = true;
          }
        }
        if (touched) {
          comment.updatedAt = now;
          this.save(comment);
          changed += 1;
        }
      }
      this.database.exec('COMMIT');
    } catch (error) {
      this.database.exec('ROLLBACK');
      throw error;
    }
    return changed;
  }

  close(): void {
    if (!this.closed) {
      this.database.close();
      this.closed = true;
    }
  }

  private findOne(where: string, value: string): StoredComment | null {
    const row = this.database.prepare(`SELECT * FROM comments WHERE ${where} LIMIT 1`).get(value);
    return row ? toComment(row) : null;
  }
}

export function hasNodeSqlite(): boolean {
  try {
    require('node:sqlite');
    return true;
  } catch {
    return false;
  }
}

function openDatabase(databasePath: string, readOnly: boolean): DatabaseSync {
  let sqlite: typeof import('node:sqlite');
  try {
    sqlite = require('node:sqlite') as typeof import('node:sqlite');
  } catch {
    throw new Error('SQLiteCommentRepository requires Node 22.13.0 or newer with node:sqlite.');
  }
  if (!readOnly) {
    mkdirSync(path.dirname(databasePath), { recursive: true, mode: 0o700 });
  }
  return new sqlite.DatabaseSync(databasePath, { readOnly, enableForeignKeyConstraints: true });
}

export function loadSqliteMigrations(migrationsDirectory = DEFAULT_MIGRATIONS_DIRECTORY): readonly Migration[] {
  const entries = readdirSync(migrationsDirectory, { withFileTypes: true })
    .filter((entry) => entry.isFile() && /^\d+-[^/]+\.sql$/u.test(entry.name))
    .map((entry) => {
      const match = entry.name.match(/^(\d+)-(.+)\.sql$/u);
      if (!match?.[1] || !match[2]) {
        throw new Error(`Invalid SQLite migration filename: ${entry.name}`);
      }
      return {
        version: Number(match[1]),
        name: match[2],
        sql: readFileSync(path.join(migrationsDirectory, entry.name), 'utf8')
      } satisfies Migration;
    });
  return sortMigrations(entries);
}

export function applySqliteMigrations(database: DatabaseSync, migrations: readonly Migration[]): void {
  const ordered = sortMigrations(migrations);
  for (const migration of ordered) {
    if (isMigrationApplied(database, migration.version)) continue;
    database.exec(migration.sql);
    database.prepare('INSERT OR IGNORE INTO schema_migrations(version, applied_at) VALUES (?, ?)').run(migration.version, new Date().toISOString());
  }
}

function isMigrationApplied(database: DatabaseSync, version: number): boolean {
  try {
    const row = database.prepare('SELECT 1 AS applied FROM schema_migrations WHERE version = ?').get(version) as SqlRow | undefined;
    return row?.applied === 1;
  } catch (error) {
    if (isMissingTableError(error)) return false;
    throw error;
  }
}

function commentValues(comment: StoredComment): SqlValue[] {
  return [
    comment.internalId,
    comment.publicId,
    comment.dedupeKey,
    comment.postPath,
    comment.parentInternalId,
    comment.displayName,
    comment.homepage,
    comment.body,
    comment.createdAt,
    comment.updatedAt,
    comment.emailCiphertext,
    comment.emailFingerprint,
    comment.verificationTokenHash,
    comment.verificationExpiresAt,
    comment.controlTokenHash,
    comment.controlExpiresAt,
    comment.status,
    comment.verifiedAt,
    comment.moderationVersion,
    comment.lastActionId,
    comment.consentVersion,
    comment.notifyReplies ? 1 : 0,
    comment.ipHash,
    comment.userAgentHash,
    comment.abuseRetentionAt,
    comment.privateEmailRetentionAt,
    comment.tombstoneEpoch
  ];
}

function toComment(row: Record<string, unknown>): StoredComment {
  return {
    internalId: toStringValue(row.internal_id),
    publicId: toStringValue(row.public_id),
    dedupeKey: toStringValue(row.dedupe_key),
    postPath: toStringValue(row.post_path),
    parentInternalId: nullableString(row.parent_internal_id),
    displayName: toStringValue(row.display_name),
    homepage: nullableString(row.homepage),
    body: toStringValue(row.body),
    createdAt: toStringValue(row.created_at),
    updatedAt: toStringValue(row.updated_at),
    emailCiphertext: toStringValue(row.email_ciphertext),
    emailFingerprint: toStringValue(row.email_fingerprint),
    verificationTokenHash: nullableString(row.verification_token_hash),
    verificationExpiresAt: nullableString(row.verification_expires_at),
    controlTokenHash: nullableString(row.control_token_hash),
    controlExpiresAt: nullableString(row.control_expires_at),
    status: toStatus(row.status),
    verifiedAt: nullableString(row.verified_at),
    moderationVersion: toNumber(row.moderation_version),
    lastActionId: nullableString(row.last_action_id),
    consentVersion: toStringValue(row.consent_version),
    notifyReplies: toNumber(row.notify_replies) === 1,
    ipHash: nullableString(row.ip_hash),
    userAgentHash: nullableString(row.user_agent_hash),
    abuseRetentionAt: toStringValue(row.abuse_retention_at),
    privateEmailRetentionAt: nullableString(row.private_email_retention_at),
    tombstoneEpoch: nullableNumber(row.tombstone_epoch)
  };
}

function toStringValue(value: unknown): string {
  if (typeof value !== 'string') {
    throw new Error('SQLite row contained a non-string value.');
  }
  return value;
}

function nullableString(value: unknown): string | null {
  return value === null || value === undefined ? null : toStringValue(value);
}

function nullableNumber(value: unknown): number | null {
  return value === null || value === undefined ? null : toNumber(value);
}

function toNumber(value: unknown): number {
  if (typeof value !== 'number' && typeof value !== 'bigint') {
    throw new Error('SQLite row contained a non-number value.');
  }
  return Number(value);
}

function nullableStatus(value: unknown): StoredComment['status'] | null {
  return value === null || value === undefined ? null : toStatus(value);
}

function toStatus(value: unknown): StoredComment['status'] {
  if (value === 'unverified' || value === 'pending' || value === 'approved' || value === 'rejected' || value === 'quarantined' || value === 'spam' || value === 'expired' || value === 'deletion_requested' || value === 'deleted') {
    return value;
  }
  throw new Error('SQLite row contained an unknown comment status.');
}

function isConstraintError(error: unknown): boolean {
  return error instanceof Error && /constraint|unique|foreign key/iu.test(error.message);
}

function isMissingTableError(error: unknown): boolean {
  return error instanceof Error && /no such table/iu.test(error.message);
}
