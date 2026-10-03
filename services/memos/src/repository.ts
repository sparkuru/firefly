import fs from 'node:fs';
import { randomBytes } from 'node:crypto';
import { DatabaseSync } from 'node:sqlite';
import { publicContract } from './contract.js';
import { MemoCrypto } from './crypto.js';
import { requireRegular, reservePrivateFile } from './files.js';
import { MAIL_LEASE, PRIVATE_RETENTION, RATE_LIMIT, RATE_WINDOW, ServiceError, VERIFICATION_TTL, type Action, type ModerationMemo, type State, type Submission } from './types.js';
import { requireId } from './validation.js';
import type { PublicMemosExport } from '../../../plugins/memos/public.mjs';

interface SubmissionRow {
  id: string; display_name: string; body: string; created_at: string; created_ms: number;
  state: State; verified_at: string | null; consent_version: string | null;
  email_cipher: string | null; token_hash: string | null; expires_ms: number;
  dedupe_hash: string | null; ip_hash: string | null; mailbox_hash: string | null;
}
interface Metadata { revision: number; epoch: number; key_check: string }
export interface MailClaim { readonly id: string; readonly payload: string; readonly lease: string; readonly attempts: number; readonly expires: number }
export interface RepositoryOptions { readonly now?: () => number; readonly fault?: (stage: string) => void; readonly migration?: string }
export function validateSchema(database: DatabaseSync): void {
  const expected = new DatabaseSync(':memory:');
  try {
    expected.exec(fs.readFileSync(new URL('../../migrations/001-initial.sql', import.meta.url), 'utf8'));
    const query = "SELECT type, name, tbl_name, sql FROM sqlite_schema WHERE name NOT LIKE 'sqlite_%' ORDER BY name";
    if (JSON.stringify(database.prepare(query).all()) !== JSON.stringify(expected.prepare(query).all())) throw new ServiceError(503, 'schema_unavailable');
  } finally { expected.close(); }
}
export class MemoRepository {
  readonly database: DatabaseSync;
  private readonly now: () => number;
  private readonly fault: (stage: string) => void;
  constructor(readonly databasePath: string, readonly crypto: MemoCrypto, options: RepositoryOptions = {}) {
    this.now = options.now ?? Date.now;
    this.fault = options.fault ?? (() => {});
    if (!fs.existsSync(databasePath)) reservePrivateFile(databasePath);
    requireRegular(databasePath, true);
    this.database = new DatabaseSync(databasePath);
    try {
      this.database.exec('PRAGMA foreign_keys = ON; PRAGMA busy_timeout = 5000; PRAGMA journal_mode = WAL; PRAGMA secure_delete = ON;');
      const version = this.database.prepare('PRAGMA user_version').get()!.user_version;
      if (version === 0) {
        this.transaction(() => {
          this.database.exec(options.migration ?? fs.readFileSync(new URL('../../migrations/001-initial.sql', import.meta.url), 'utf8'));
          this.database.prepare('INSERT INTO metadata VALUES (1, 0, 0, ?)').run(crypto.encrypt('key-check', 'service', crypto.hash('key-check', 'memos-v1')));
          this.fault('migration');
        });
      } else if (version !== 1) throw new ServiceError(503, 'schema_unavailable');
      validateSchema(this.database);
      if (crypto.decrypt('key-check', 'service', this.metadata().key_check) !== crypto.hash('key-check', 'memos-v1')) throw new ServiceError(503, 'crypto_unavailable');
      this.metadata();
      this.maintain();
    } catch (error) { this.database.close(); throw error; }
  }
  close(): void { this.database.close(); }
  private transaction<T>(operation: () => T, write = true): T {
    this.database.exec(write ? 'BEGIN IMMEDIATE' : 'BEGIN');
    try { const result = operation(); this.database.exec('COMMIT'); return result; }
    catch (error) { this.database.exec('ROLLBACK'); throw error; }
  }
  private metadata(): Metadata {
    const row = this.database.prepare('SELECT revision, epoch, key_check FROM metadata WHERE singleton = 1').get() as unknown as Metadata;
    if (!row || !Number.isSafeInteger(row.epoch) || row.epoch < 0 || !Number.isSafeInteger(row.revision) || row.revision < 0) throw new ServiceError(503, 'metadata_unavailable');
    return row;
  }
  ready(): boolean {
    try { this.metadata(); return this.database.prepare('PRAGMA user_version').get()!.user_version === 1; } catch { return false; }
  }
  private audit(id: string, action: string, now: number): void {
    this.database.prepare('INSERT INTO audit(submission_id, action, occurred_at) VALUES (?, ?, ?)').run(id, action, new Date(now).toISOString());
  }
  accept(input: Submission, address: string): void {
    const now = this.now();
    const mailbox = this.crypto.hash('mailbox-rate', input.email);
    const ip = this.crypto.hash('ip-rate', address);
    const dedupe = this.crypto.hash('submission-dedupe', JSON.stringify([input.email, input.displayName, input.body, input.consentVersion]));
    this.transaction(() => {
      const duplicate = this.database.prepare("SELECT id FROM submissions WHERE dedupe_hash = ? AND state = 'unverified' AND expires_ms > ? LIMIT 1").get(dedupe, now);
      if (duplicate) return;
      const count = this.database.prepare('SELECT SUM(ip_hash = ?) AS ip, SUM(mailbox_hash = ?) AS mailbox FROM rate_events WHERE accepted_ms > ?').get(ip, mailbox, now - RATE_WINDOW)!;
      if (Number(count.ip ?? 0) >= RATE_LIMIT || Number(count.mailbox ?? 0) >= RATE_LIMIT) throw new ServiceError(429, 'rate_limited');
      const id = `m_${randomBytes(18).toString('base64url')}`;
      const token = this.crypto.token();
      const expires = now + VERIFICATION_TTL;
      this.database.prepare(`INSERT INTO submissions (id, display_name, body, created_at, created_ms, state, consent_version, email_cipher, token_hash, expires_ms, dedupe_hash, ip_hash, mailbox_hash)
        VALUES (?, ?, ?, ?, ?, 'unverified', ?, ?, ?, ?, ?, ?, ?)`).run(id, input.displayName, input.body, new Date(now).toISOString(), now, input.consentVersion, this.crypto.encrypt('email', id, input.email), this.crypto.hash('verification', token), expires, dedupe, ip, mailbox);
      this.fault('submission');
      this.database.prepare("INSERT INTO outbox(id, payload_cipher, state, expires_ms, next_ms) VALUES (?, ?, 'queued', ?, ?)").run(id, this.crypto.encrypt('outbox', id, JSON.stringify({ to: input.email, token })), expires, now);
      this.database.prepare('INSERT INTO rate_events VALUES (?, ?, ?, ?)').run(id, now, ip, mailbox);
      this.audit(id, 'submitted', now);
      this.fault('enqueue');
    });
  }
  verify(token: string): void {
    if (!/^[A-Za-z0-9_-]{43}$/u.test(token) || Buffer.from(token, 'base64url').toString('base64url') !== token) throw new ServiceError(400, 'invalid_token');
    const now = this.now();
    this.transaction(() => {
      const row = this.database.prepare("SELECT id FROM submissions WHERE token_hash = ? AND state = 'unverified' AND expires_ms > ?").get(this.crypto.hash('verification', token), now);
      if (!row || typeof row.id !== 'string') throw new ServiceError(400, 'invalid_token');
      this.database.prepare("UPDATE submissions SET state = 'pending', verified_at = ?, token_hash = NULL, dedupe_hash = NULL WHERE id = ?").run(new Date(now).toISOString(), row.id);
      this.cancelMail(row.id);
      this.audit(row.id, 'verified', now);
      this.fault('verify');
    });
  }
  private cancelMail(id: string): void {
    this.database.prepare("UPDATE outbox SET state = 'cancelled', payload_cipher = NULL, lease_id = NULL, lease_until_ms = NULL, error_code = NULL WHERE id = ? AND state = 'queued'").run(id);
  }
  moderate(id: string, action: Action): void {
    requireId(id);
    const now = this.now();
    this.transaction(() => {
      const row = this.database.prepare('SELECT * FROM submissions WHERE id = ?').get(id) as unknown as SubmissionRow | undefined;
      if (!row) throw new ServiceError(404, 'not_found');
      const target = action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'deleted';
      if (row.state === target) return;
      if (row.state === 'deleted' || (action === 'approve' && row.state !== 'pending')) throw new ServiceError(409, 'invalid_transition');
      if (row.state === 'approved' || target === 'approved') {
        const metadata = this.metadata();
        const epoch = metadata.epoch + (row.state === 'approved' ? 1 : 0);
        const revision = metadata.revision + 1;
        if (!Number.isSafeInteger(epoch) || !Number.isSafeInteger(revision)) throw new ServiceError(503, 'metadata_overflow');
        this.database.prepare('UPDATE metadata SET epoch = ?, revision = ? WHERE singleton = 1').run(epoch, revision);
      }
      this.database.prepare('UPDATE submissions SET state = ?, token_hash = NULL, dedupe_hash = NULL WHERE id = ?').run(target, id);
      if (target === 'deleted') {
        this.database.prepare("UPDATE submissions SET display_name = '', body = '', email_cipher = NULL, ip_hash = NULL, mailbox_hash = NULL, consent_version = NULL, verified_at = NULL WHERE id = ?").run(id);
        this.database.prepare('DELETE FROM rate_events WHERE submission_id = ?').run(id);
      }
      this.cancelMail(id);
      this.audit(id, action, now);
      this.fault('moderate');
    });
  }
  list(limit = 50, cursor?: string): { submissions: readonly ModerationMemo[]; nextCursor: string | null } {
    if (!Number.isInteger(limit) || limit < 1 || limit > 100) throw new ServiceError(400, 'invalid_input');
    let after = '';
    if (cursor !== undefined) {
      if (!/^[A-Za-z0-9_-]{1,256}$/u.test(cursor)) throw new ServiceError(400, 'invalid_input');
      after = Buffer.from(cursor, 'base64url').toString('utf8');
      if (Buffer.from(after).toString('base64url') !== cursor) throw new ServiceError(400, 'invalid_input');
      requireId(after);
    }
    const rows = this.database.prepare('SELECT id, display_name, body, created_at, state, verified_at FROM submissions WHERE id > ? ORDER BY id ASC LIMIT ?').all(after, limit + 1) as unknown as SubmissionRow[];
    const page = rows.slice(0, limit);
    return { submissions: page.map((row) => ({ id: row.id, displayName: row.display_name, body: row.body, createdAt: row.created_at, state: row.state, verifiedAt: row.verified_at })), nextCursor: rows.length > limit ? Buffer.from(page[page.length - 1]!.id).toString('base64url') : null };
  }
  export(): PublicMemosExport {
    return this.transaction(() => {
      const metadata = this.metadata();
      this.fault('export-snapshot');
      const rows = this.database.prepare("SELECT id, display_name, body, created_at FROM submissions WHERE state = 'approved'").all() as unknown as SubmissionRow[];
      return publicContract.createPublicExport({ schemaVersion: 1, sourceRevision: `r_${metadata.revision}`, generatedAt: new Date(this.now()).toISOString(), tombstoneEpoch: metadata.epoch, memos: rows.map((row) => ({ id: row.id, displayName: row.display_name, body: row.body, createdAt: row.created_at })) });
    }, false);
  }
  maintain(batch = 500): void {
    if (!Number.isInteger(batch) || batch < 1 || batch > 1000) throw new ServiceError(400, 'invalid_input');
    const now = this.now();
    this.transaction(() => {
      this.database.prepare("UPDATE submissions SET state = 'expired', token_hash = NULL, dedupe_hash = NULL WHERE id IN (SELECT id FROM submissions WHERE state = 'unverified' AND expires_ms <= ? LIMIT ?)").run(now, batch);
      this.database.prepare("UPDATE outbox SET state = 'cancelled', payload_cipher = NULL, lease_id = NULL, lease_until_ms = NULL, error_code = NULL WHERE id IN (SELECT id FROM outbox WHERE state = 'queued' AND expires_ms <= ? LIMIT ?)").run(now, batch);
      this.database.prepare('UPDATE submissions SET email_cipher = NULL, token_hash = NULL, dedupe_hash = NULL, ip_hash = NULL, mailbox_hash = NULL, consent_version = NULL WHERE id IN (SELECT id FROM submissions WHERE created_ms <= ? AND (email_cipher IS NOT NULL OR ip_hash IS NOT NULL OR mailbox_hash IS NOT NULL OR consent_version IS NOT NULL) LIMIT ?)').run(now - PRIVATE_RETENTION, batch);
      this.database.prepare('DELETE FROM rate_events WHERE submission_id IN (SELECT submission_id FROM rate_events WHERE accepted_ms <= ? LIMIT ?)').run(now - RATE_WINDOW, batch);
      this.fault('maintain');
    });
  }
  claim(): MailClaim | null {
    const now = this.now();
    return this.transaction(() => {
      const row = this.database.prepare("SELECT id, payload_cipher, attempts, expires_ms FROM outbox WHERE state = 'queued' AND next_ms <= ? AND expires_ms > ? AND (lease_until_ms IS NULL OR lease_until_ms <= ?) ORDER BY next_ms, id LIMIT 1").get(now, now, now);
      if (!row || typeof row.id !== 'string' || typeof row.payload_cipher !== 'string') return null;
      const lease = this.crypto.token();
      this.database.prepare('UPDATE outbox SET lease_id = ?, lease_until_ms = ? WHERE id = ?').run(lease, now + MAIL_LEASE, row.id);
      return { id: row.id, payload: row.payload_cipher, lease, attempts: Number(row.attempts), expires: Number(row.expires_ms) };
    });
  }
  finishMail(claim: MailClaim, delivered: boolean): void {
    this.transaction(() => {
      if (delivered) {
        this.database.prepare("UPDATE outbox SET state = 'delivered', payload_cipher = NULL, lease_id = NULL, lease_until_ms = NULL, error_code = NULL WHERE id = ? AND lease_id = ? AND state = 'queued'").run(claim.id, claim.lease);
      } else {
        const attempts = Math.min(claim.attempts + 1, 1000000);
        const next = Math.min(claim.expires, this.now() + Math.min(60 * 60 * 1000, 30000 * 2 ** Math.min(attempts - 1, 7)));
        this.database.prepare("UPDATE outbox SET attempts = ?, next_ms = ?, lease_id = NULL, lease_until_ms = NULL, error_code = 'delivery_failed' WHERE id = ? AND lease_id = ? AND state = 'queued'").run(attempts, next, claim.id, claim.lease);
      }
      this.fault('finish-mail');
    });
  }
}
