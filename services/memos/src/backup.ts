import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { backup, DatabaseSync } from 'node:sqlite';
import { MemoCrypto } from './crypto.js';
import { noSymlinks, privateDirectory, readRegular, reservePrivateFile } from './files.js';
import { MemoRepository, validateSchema } from './repository.js';
import { ServiceError } from './types.js';

interface SnapshotMetadata { revision: number; epoch: number; key_check: string }
interface Manifest { manifestVersion: 1; schemaVersion: 1; sha256: string; epoch: number; revision: number; keyId: string }
function checksum(bytes: Buffer): string { return createHash('sha256').update(bytes).digest('hex'); }
function validateSnapshot(file: string, crypto: MemoCrypto): SnapshotMetadata {
  readRegular(file, true);
  const db = new DatabaseSync(file, { readOnly: true });
  try {
    if (db.prepare('PRAGMA integrity_check').get()!.integrity_check !== 'ok' || db.prepare('PRAGMA foreign_key_check').all().length || db.prepare('PRAGMA user_version').get()!.user_version !== 1) throw new Error();
    validateSchema(db);
    const tables = db.prepare("SELECT name FROM sqlite_schema WHERE type = 'table' AND name NOT LIKE 'sqlite_%' ORDER BY name").all().map((row) => row.name).join(',');
    if (tables !== 'audit,metadata,outbox,rate_events,submissions') throw new Error();
    const metadata = db.prepare('SELECT epoch, revision, key_check FROM metadata WHERE singleton = 1').get() as unknown as SnapshotMetadata;
    if (!metadata || !Number.isSafeInteger(metadata.epoch) || metadata.epoch < 0 || !Number.isSafeInteger(metadata.revision) || metadata.revision < 0 || crypto.decrypt('key-check', 'service', metadata.key_check) !== crypto.hash('key-check', 'memos-v1')) throw new Error();
    db.prepare('SELECT id, display_name, body, created_at, created_ms, state, verified_at, consent_version, email_cipher, token_hash, expires_ms, dedupe_hash, ip_hash, mailbox_hash FROM submissions LIMIT 0').all();
    db.prepare('SELECT id, payload_cipher, state, expires_ms, next_ms, attempts, lease_id, lease_until_ms, error_code FROM outbox LIMIT 0').all();
    return metadata;
  } catch { throw new ServiceError(503, 'invalid_backup'); }
  finally { db.close(); }
}
function newPrivateDirectory(destination: string): string {
  const absolute = path.resolve(destination);
  noSymlinks(path.dirname(absolute));
  fs.mkdirSync(absolute, { mode: 0o700 });
  return privateDirectory(absolute);
}
export async function createBackup(repository: MemoRepository, destination: string): Promise<void> {
  const root = newPrivateDirectory(destination);
  try {
    const file = path.join(root, 'memos.sqlite');
    reservePrivateFile(file);
    await backup(repository.database, file);
    const metadata = validateSnapshot(file, repository.crypto);
    const manifest: Manifest = { manifestVersion: 1, schemaVersion: 1, sha256: checksum(readRegular(file, true)), epoch: metadata.epoch, revision: metadata.revision, keyId: repository.crypto.keyId };
    fs.writeFileSync(path.join(root, 'manifest.json'), `${JSON.stringify(manifest)}\n`, { flag: 'wx', mode: 0o600 });
  } catch (error) { fs.rmSync(root, { recursive: true }); throw error; }
}
export function restoreBackup(source: string, destination: string, crypto: MemoCrypto): void {
  const root = privateDirectory(source);
  const file = path.join(root, 'memos.sqlite');
  let manifest: Manifest;
  try {
    const raw = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readRegular(path.join(root, 'manifest.json'), true))) as Record<string, unknown>;
    if (Object.keys(raw).sort().join(',') !== 'epoch,keyId,manifestVersion,revision,schemaVersion,sha256' || raw.manifestVersion !== 1 || raw.schemaVersion !== 1 || typeof raw.sha256 !== 'string' || !/^[a-f0-9]{64}$/u.test(raw.sha256) || raw.keyId !== crypto.keyId || raw.sha256 !== checksum(readRegular(file, true))) throw new Error();
    const metadata = validateSnapshot(file, crypto);
    if (metadata.epoch !== raw.epoch || metadata.revision !== raw.revision) throw new Error();
    manifest = raw as unknown as Manifest;
  } catch { throw new ServiceError(503, 'invalid_backup'); }
  const target = newPrivateDirectory(destination);
  try {
    const targetFile = path.join(target, 'memos.sqlite');
    reservePrivateFile(targetFile);
    fs.writeFileSync(targetFile, readRegular(file, true));
    if (checksum(readRegular(targetFile, true)) !== manifest.sha256) throw new ServiceError(503, 'invalid_backup');
    validateSnapshot(targetFile, crypto);
  } catch (error) { fs.rmSync(target, { recursive: true }); throw error; }
}
