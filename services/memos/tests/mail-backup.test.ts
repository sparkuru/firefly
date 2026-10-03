import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { DatabaseSync } from 'node:sqlite';
import { fileURLToPath } from 'node:url';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { createBackup, restoreBackup } from '../src/backup.js';
import { MemoCrypto } from '../src/crypto.js';
import { MemoRepository } from '../src/repository.js';
import { MemoService } from '../src/service.js';
import { MAIL_LEASE, VERIFICATION_TTL } from '../src/types.js';
import { fixture, crypto, input, plugin } from './helpers.js';

test('mail retry retains encrypted payload across restart, then delivery clears it and records bounded status', async () => {
  const f = fixture();
  try {
    f.submit(); f.deliveryFails(true);
    assert.deepEqual(await f.service.deliver(), { delivered: 0, failed: 1 });
    const row = f.repository.database.prepare('SELECT * FROM outbox').get()!;
    assert.equal(row.attempts, 1); assert.equal(row.error_code, 'delivery_failed');
    assert.ok(typeof row.payload_cipher === 'string'); assert.ok(!JSON.stringify(row).includes('private-transport-transcript'));
    assert.deepEqual(await f.service.deliver(), { delivered: 0, failed: 0 });
    f.reopen(); f.deliveryFails(false); f.advance(30000);
    assert.deepEqual(await f.service.deliver(), { delivered: 1, failed: 0 });
    assert.equal(f.repository.database.prepare('SELECT payload_cipher FROM outbox').get()!.payload_cipher, null);
    assert.deepEqual(await f.service.deliver(), { delivered: 0, failed: 0 });
  } finally { f.close(); }
});

test('overlapping repositories honor claims; crashed lease retries same single-use token; stale receipt cannot replace newer lease', async () => {
  const f = fixture(); let other: MemoRepository | undefined;
  try {
    const id = f.submit(); const token = f.token(id);
    const first = f.repository.claim()!;
    other = new MemoRepository(f.database, crypto, { now: () => f.now });
    assert.equal(other.claim(), null);
    f.advance(MAIL_LEASE);
    const retry = other.claim()!; assert.equal(retry.id, id); assert.notEqual(retry.lease, first.lease);
    assert.equal((JSON.parse(crypto.decrypt('outbox', id, retry.payload)) as { token: string }).token, token);
    f.repository.finishMail(first, true);
    assert.equal(other.database.prepare('SELECT state FROM outbox').get()!.state, 'queued');
    other.finishMail(retry, true);
    f.repository.verify(token);
    assert.throws(() => f.repository.verify(token), /invalid_token/);
  } finally { other?.close(); f.close(); }
});

test('expired/cancelled mail is never delivered, unavailable transport never drains, finish failure leaves recoverable claim', async () => {
  const f = fixture();
  try {
    f.submit();
    const unavailable = new MemoService(f.repository, plugin, null);
    await assert.rejects(unavailable.deliver(), /delivery_unavailable/);
    f.fault('finish-mail'); await assert.rejects(f.service.deliver(), /injected/);
    assert.equal(f.messages.length, 1);
    assert.equal(f.repository.database.prepare('SELECT state FROM outbox').get()!.state, 'queued');
    f.fault(''); f.advance(MAIL_LEASE); await f.service.deliver();
    assert.equal(f.messages.length, 2); assert.equal(f.messages[0]!.token, f.messages[1]!.token);
    f.submit({ ...input, body: 'expires' }); f.advance(VERIFICATION_TTL);
    assert.deepEqual(await f.service.deliver(), { delivered: 0, failed: 0 });
    assert.equal(f.repository.database.prepare("SELECT count(*) AS n FROM outbox WHERE payload_cipher IS NOT NULL").get()!.n, 0);
  } finally { f.close(); }
});

test('backup/restore round trip contains queued mail, revision, epoch and rates; restore rejects overwrite/corruption/symlink/wrong keys', async () => {
  const f = fixture(); let restored: MemoRepository | undefined;
  try {
    const approved = f.submit(); f.repository.verify(f.token(approved)); f.repository.moderate(approved, 'approve'); f.repository.moderate(approved, 'reject');
    f.submit({ ...input, body: 'queued' });
    const expected = f.repository.export(); const backup = path.join(f.root, 'backup');
    await createBackup(f.repository, backup);
    assert.equal(fs.statSync(backup).mode & 0o777, 0o700);
    for (const file of ['memos.sqlite', 'manifest.json']) assert.equal(fs.statSync(path.join(backup, file)).mode & 0o777, 0o600);
    const destination = path.join(f.root, 'restored'); restoreBackup(backup, destination, crypto);
    restored = new MemoRepository(path.join(destination, 'memos.sqlite'), crypto, { now: () => f.now });
    assert.deepEqual(restored.export(), expected);
    assert.equal(restored.database.prepare("SELECT count(*) AS n FROM outbox WHERE state = 'queued'").get()!.n, 1);
    assert.equal(restored.database.prepare('SELECT count(*) AS n FROM rate_events').get()!.n, 2);
    assert.throws(() => restoreBackup(backup, destination, crypto));
    const wrong = new MemoCrypto(Buffer.alloc(32, 4), Buffer.alloc(32, 2), 'test');
    assert.throws(() => restoreBackup(backup, path.join(f.root, 'wrong'), wrong), /invalid_backup/);
    assert.ok(!fs.existsSync(path.join(f.root, 'wrong')));
    fs.symlinkSync(backup, path.join(f.root, 'link'));
    assert.throws(() => restoreBackup(path.join(f.root, 'link'), path.join(f.root, 'from-link'), crypto));
    const manifest = path.join(backup, 'manifest.json'); const original = fs.readFileSync(manifest);
    fs.writeFileSync(manifest, '{}');
    assert.throws(() => restoreBackup(backup, path.join(f.root, 'bad-manifest'), crypto), /invalid_backup/);
    fs.writeFileSync(manifest, original);
    const snapshotFile = path.join(backup, 'memos.sqlite');
    const validSnapshot = fs.readFileSync(snapshotFile);
    const corrupt = Buffer.from(validSnapshot); corrupt.fill(0, 0, 16);
    fs.writeFileSync(snapshotFile, corrupt);
    const alteredManifest = JSON.parse(original.toString('utf8')) as Record<string, unknown>;
    alteredManifest.sha256 = createHash('sha256').update(corrupt).digest('hex');
    fs.writeFileSync(manifest, JSON.stringify(alteredManifest));
    assert.throws(() => restoreBackup(backup, path.join(f.root, 'bad-integrity'), crypto), /invalid_backup/);
    assert.ok(!fs.existsSync(path.join(f.root, 'bad-integrity')));
    fs.writeFileSync(snapshotFile, validSnapshot); fs.writeFileSync(manifest, original);
    fs.appendFileSync(path.join(backup, 'memos.sqlite'), 'corruption');
    assert.throws(() => restoreBackup(backup, path.join(f.root, 'bad-checksum'), crypto), /invalid_backup/);
    assert.ok(!fs.existsSync(path.join(f.root, 'bad-checksum')));
    await assert.rejects(createBackup(f.repository, backup));
  } finally { restored?.close(); f.close(); }
});

test('export metadata and approved rows share one snapshot while another connection commits an approval', () => {
  const f = fixture(); let reader: MemoRepository | undefined;
  try {
    const id = f.submit(); f.repository.verify(f.token(id));
    let mutated = false;
    reader = new MemoRepository(f.database, crypto, { now: () => f.now, fault: (stage) => {
      if (stage === 'export-snapshot' && !mutated) { mutated = true; f.repository.moderate(id, 'approve'); }
    } });
    const snapshot = reader.export();
    assert.equal(snapshot.sourceRevision, 'r_0'); assert.equal(snapshot.memos.length, 0);
    const current = reader.export(); assert.equal(current.sourceRevision, 'r_1'); assert.equal(current.memos.length, 1);
  } finally { reader?.close(); f.close(); }
});

test('restore CLI loads nondefault key ID from secret file and honors explicit environment override without runtime credentials', async () => {
  const f = fixture();
  try {
    f.submit(); const source = path.join(f.root, 'backup'); await createBackup(f.repository, source);
    const secrets = path.join(f.root, 'restore.env');
    fs.writeFileSync(secrets, `MEMOS_ENCRYPTION_KEY=${'01'.repeat(32)}\nMEMOS_TOKEN_KEY=${'02'.repeat(32)}\nMEMOS_ENCRYPTION_KEY_ID=test\n`, { mode: 0o600 });
    const operation = fileURLToPath(new URL('../src/operations.js', import.meta.url));
    const first = spawnSync(process.execPath, [operation, 'restore', source, path.join(f.root, 'from-file')], { env: { MEMOS_SECRETS_FILE: secrets }, encoding: 'utf8' });
    assert.equal(first.status, 0, first.stderr); assert.equal(first.stdout, 'memos:restore_complete\n');
    fs.writeFileSync(secrets, `MEMOS_ENCRYPTION_KEY=${'01'.repeat(32)}\nMEMOS_TOKEN_KEY=${'02'.repeat(32)}\nMEMOS_ENCRYPTION_KEY_ID=wrong\n`);
    const second = spawnSync(process.execPath, [operation, 'restore', source, path.join(f.root, 'from-env')], { env: { MEMOS_SECRETS_FILE: secrets, MEMOS_ENCRYPTION_KEY_ID: 'test' }, encoding: 'utf8' });
    assert.equal(second.status, 0, second.stderr);
    const wrong = spawnSync(process.execPath, [operation, 'restore', source, path.join(f.root, 'wrong-id')], { env: { MEMOS_SECRETS_FILE: secrets }, encoding: 'utf8' });
    assert.equal(wrong.status, 1); assert.ok(!fs.existsSync(path.join(f.root, 'wrong-id')));
    assert.ok(!wrong.stderr.includes('01'.repeat(32)));
  } finally { f.close(); }
});

test('backup/restore and startup reject altered schema even with valid checksum, key identity and integrity', async () => {
  for (const mutation of ['DROP INDEX rates_time', 'ALTER TABLE audit RENAME COLUMN action TO unexpected', 'CREATE TRIGGER unexpected AFTER INSERT ON submissions BEGIN DELETE FROM outbox; END']) {
    const f = fixture();
    try {
      f.submit(); const source = path.join(f.root, 'backup'); await createBackup(f.repository, source);
      const snapshot = path.join(source, 'memos.sqlite'); const db = new DatabaseSync(snapshot);
      db.exec(mutation); db.close();
      const manifestFile = path.join(source, 'manifest.json');
      const manifest = JSON.parse(fs.readFileSync(manifestFile, 'utf8')) as Record<string, unknown>;
      manifest.sha256 = createHash('sha256').update(fs.readFileSync(snapshot)).digest('hex');
      fs.writeFileSync(manifestFile, JSON.stringify(manifest));
      assert.throws(() => restoreBackup(source, path.join(f.root, 'restored'), crypto), /invalid_backup/);
      assert.ok(!fs.existsSync(path.join(f.root, 'restored')));
      assert.throws(() => new MemoRepository(snapshot, crypto), /schema_unavailable/);
      f.repository.database.exec(mutation);
      await assert.rejects(createBackup(f.repository, path.join(f.root, 'bad-backup')), /invalid_backup/);
      assert.ok(!fs.existsSync(path.join(f.root, 'bad-backup')));
    } finally { f.close(); }
  }
});
