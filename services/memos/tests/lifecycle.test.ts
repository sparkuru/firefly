import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { publicContract } from '../src/contract.js';
import { MemoCrypto } from '../src/crypto.js';
import { MemoRepository } from '../src/repository.js';
import { PRIVATE_RETENTION, RATE_WINDOW, VERIFICATION_TTL } from '../src/types.js';
import type { Action, State } from '../src/types.js';
import { fixture, crypto, input } from './helpers.js';

const throwsCode = (operation: () => unknown, code: string) => assert.throws(operation, (error: unknown) => error instanceof Error && error.message === code);

test('every moderation matrix edge preserves terminal states, idempotency and public metadata', () => {
  const matrix: Record<State, Record<Action, State | 'conflict'>> = {
    unverified: { approve: 'conflict', reject: 'rejected', delete: 'deleted' },
    expired: { approve: 'conflict', reject: 'rejected', delete: 'deleted' },
    pending: { approve: 'approved', reject: 'rejected', delete: 'deleted' },
    approved: { approve: 'approved', reject: 'rejected', delete: 'deleted' },
    rejected: { approve: 'conflict', reject: 'rejected', delete: 'deleted' },
    deleted: { approve: 'conflict', reject: 'conflict', delete: 'deleted' }
  };
  for (const state of Object.keys(matrix) as State[]) {
    for (const action of Object.keys(matrix[state]) as Action[]) {
      const f = fixture();
      try {
        const id = f.submit();
        if (state === 'expired') { f.advance(VERIFICATION_TTL); f.repository.maintain(); }
        if (state === 'pending' || state === 'approved') f.repository.verify(f.token(id));
        if (state === 'approved') f.repository.moderate(id, 'approve');
        if (state === 'rejected') f.repository.moderate(id, 'reject');
        if (state === 'deleted') f.repository.moderate(id, 'delete');
        const before = f.repository.export();
        const audits = f.repository.database.prepare('SELECT count(*) AS n FROM audit').get()!.n;
        const expected = matrix[state][action];
        if (expected === 'conflict') throwsCode(() => f.repository.moderate(id, action), 'invalid_transition');
        else f.repository.moderate(id, action);
        const after = f.repository.export();
        const changed = expected !== 'conflict' && expected !== state;
        assert.equal(f.repository.list().submissions[0]!.state, expected === 'conflict' ? state : expected);
        assert.equal(after.tombstoneEpoch, before.tombstoneEpoch + (changed && state === 'approved' ? 1 : 0));
        assert.equal(after.sourceRevision, changed && (state === 'approved' || expected === 'approved') ? `r_${Number(before.sourceRevision.slice(2)) + 1}` : before.sourceRevision);
        assert.equal(f.repository.database.prepare('SELECT count(*) AS n FROM audit').get()!.n, Number(audits) + (changed ? 1 : 0));
      } finally { f.close(); }
    }
  }
});

test('submission, verification and approval form separate private/public gates; export is exact immutable contract', async () => {
  const f = fixture();
  try {
    const id = f.submit();
    assert.equal(f.repository.list().submissions[0]!.state, 'unverified');
    assert.equal(f.repository.export().memos.length, 0);
    throwsCode(() => f.repository.moderate(id, 'approve'), 'invalid_transition');
    assert.deepEqual(await f.service.deliver(), { delivered: 1, failed: 0 });
    const token = f.messages[0]!.token;
    assert.equal(f.messages[0]!.to, input.email);
    f.repository.verify(token);
    throwsCode(() => f.repository.verify(token), 'invalid_token');
    assert.equal(f.repository.list().submissions[0]!.state, 'pending');
    assert.equal(f.repository.export().memos.length, 0);
    f.repository.moderate(id, 'approve');
    f.repository.moderate(id, 'approve');
    const exported = f.repository.export();
    assert.equal(exported.sourceRevision, 'r_1');
    assert.equal(exported.tombstoneEpoch, 0);
    assert.deepEqual(Object.keys(exported.memos[0]!), ['id', 'displayName', 'body', 'createdAt']);
    assert.equal(exported.memos[0]!.createdAt, '2026-10-03T00:00:00.000Z');
    assert.ok(Object.isFrozen(exported.memos[0]));
    const serialized = publicContract.serializePublicExport(exported);
    assert.deepEqual(publicContract.decodePublicMemosExport(serialized), exported);
    for (const privateValue of [input.email, token, 'ip_hash', 'email_cipher', 'approved']) assert.ok(!serialized.includes(privateValue));
    f.reopen();
    assert.deepEqual(f.repository.export(), exported);
  } finally { f.close(); }
});

test('all approved removals increment epoch once; rejected cannot reopen and deleted is terminal and scrubbed', () => {
  for (const removal of ['reject', 'delete'] as const) {
    const f = fixture();
    try {
      const id = f.submit(); f.repository.verify(f.token(id)); f.repository.moderate(id, 'approve');
      f.repository.moderate(id, removal); f.repository.moderate(id, removal);
      assert.equal(f.repository.export().tombstoneEpoch, 1);
      assert.equal(f.repository.export().sourceRevision, 'r_2');
      assert.equal(f.repository.export().memos.length, 0);
      throwsCode(() => f.repository.moderate(id, 'approve'), 'invalid_transition');
      f.repository.moderate(id, 'delete');
      assert.equal(f.repository.export().tombstoneEpoch, 1);
      throwsCode(() => f.repository.moderate(id, 'reject'), 'invalid_transition');
      const row = f.repository.database.prepare('SELECT * FROM submissions WHERE id = ?').get(id)!;
      for (const key of ['email_cipher', 'token_hash', 'dedupe_hash', 'ip_hash', 'mailbox_hash', 'consent_version', 'verified_at']) assert.equal(row[key], null);
      assert.equal(row.display_name, ''); assert.equal(row.body, '');
      assert.equal(f.repository.database.prepare('SELECT count(*) AS n FROM rate_events').get()!.n, 0);
    } finally { f.close(); }
  }
});

test('reject/delete from unverified cancel mail and verification, expire never approves, unknown IDs fail', () => {
  for (const action of ['reject', 'delete'] as const) {
    const f = fixture();
    try {
      const id = f.submit(); const token = f.token(id); f.repository.moderate(id, action);
      throwsCode(() => f.repository.verify(token), 'invalid_token');
      assert.equal(f.repository.claim(), null);
      assert.equal(f.repository.database.prepare('SELECT payload_cipher FROM outbox').get()!.payload_cipher, null);
      throwsCode(() => f.repository.moderate('m_missing', 'approve'), 'not_found');
    } finally { f.close(); }
  }
  const f = fixture();
  try {
    const id = f.submit(); const token = f.token(id); f.advance(VERIFICATION_TTL); f.repository.maintain();
    throwsCode(() => f.repository.verify(token), 'invalid_token');
    throwsCode(() => f.repository.moderate(id, 'approve'), 'invalid_transition');
    assert.equal(f.repository.list().submissions[0]!.state, 'expired');
    f.repository.moderate(id, 'reject');
  } finally { f.close(); }
});

test('exact active duplicate creates no record/mail/rate; expiry permits new submission', () => {
  const f = fixture();
  try {
    f.submit(); f.submit();
    assert.equal(f.repository.list().submissions.length, 1);
    assert.equal(f.repository.database.prepare('SELECT count(*) AS n FROM outbox').get()!.n, 1);
    assert.equal(f.repository.database.prepare('SELECT count(*) AS n FROM rate_events').get()!.n, 1);
    f.advance(VERIFICATION_TTL); f.submit();
    assert.equal(f.repository.list().submissions.length, 2);
  } finally { f.close(); }
});

test('both rolling rate dimensions persist across restart and roll out at the hourly boundary', () => {
  for (const dimension of ['ip', 'mailbox']) {
    const f = fixture();
    try {
      for (let i = 0; i < 12; i += 1) f.submit({ ...input, body: `memo ${i}`, email: dimension === 'mailbox' ? input.email : `reader${i}@example.com` }, dimension === 'ip' ? '192.0.2.1' : `192.0.2.${i}`);
      f.reopen();
      throwsCode(() => f.submit({ ...input, body: 'new memo' }), 'rate_limited');
      assert.equal(f.repository.list().submissions.length, 12);
      f.advance(RATE_WINDOW); f.submit({ ...input, body: 'new memo' });
      assert.equal(f.repository.list().submissions.length, 13);
    } finally { f.close(); }
  }
});

test('failure injection rolls back acceptance, enqueue, verification, moderation, epoch and audit', () => {
  const f = fixture();
  try {
    for (const stage of ['submission', 'enqueue']) {
      f.fault(stage); assert.throws(() => f.submit(), /injected/);
      for (const table of ['submissions', 'outbox', 'rate_events', 'audit']) assert.equal(f.repository.database.prepare(`SELECT count(*) AS n FROM ${table}`).get()!.n, 0);
    }
    f.fault(''); const id = f.submit(); const token = f.token(id);
    f.fault('verify'); assert.throws(() => f.repository.verify(token), /injected/);
    assert.equal(f.repository.list().submissions[0]!.state, 'unverified');
    f.fault(''); f.repository.verify(token); f.repository.moderate(id, 'approve');
    const before = f.repository.export(); const audits = f.repository.database.prepare('SELECT count(*) AS n FROM audit').get()!.n;
    f.fault('moderate'); assert.throws(() => f.repository.moderate(id, 'reject'), /injected/);
    assert.deepEqual(f.repository.export(), before);
    assert.equal(f.repository.list().submissions[0]!.state, 'approved');
    assert.equal(f.repository.database.prepare('SELECT count(*) AS n FROM audit').get()!.n, audits);
    f.fault(''); f.repository.database.prepare('UPDATE metadata SET epoch = ?').run(Number.MAX_SAFE_INTEGER);
    throwsCode(() => f.repository.moderate(id, 'delete'), 'metadata_overflow');
    assert.equal(f.repository.list().submissions[0]!.state, 'approved');
  } finally { f.close(); }
});

test('retention cleans encrypted identity and abuse fields without changing approved/pending public text', () => {
  const f = fixture();
  try {
    const id = f.submit(); f.repository.verify(f.token(id)); f.repository.moderate(id, 'approve');
    const pending = f.submit({ ...input, body: 'Pending private text' }); f.repository.verify(f.token(pending));
    const before = f.repository.export(); f.advance(PRIVATE_RETENTION); f.reopen();
    const row = f.repository.database.prepare('SELECT * FROM submissions WHERE id = ?').get(id)!;
    for (const key of ['email_cipher', 'token_hash', 'dedupe_hash', 'ip_hash', 'mailbox_hash', 'consent_version']) assert.equal(row[key], null);
    assert.equal(row.body, input.body); assert.equal(row.state, 'approved');
    const pendingRow = f.repository.database.prepare('SELECT state, body, email_cipher FROM submissions WHERE id = ?').get(pending)!;
    assert.equal(pendingRow.state, 'pending'); assert.equal(pendingRow.body, 'Pending private text'); assert.equal(pendingRow.email_cipher, null);
    const after = f.repository.export();
    assert.equal(after.sourceRevision, before.sourceRevision); assert.equal(after.tombstoneEpoch, before.tombstoneEpoch); assert.deepEqual(after.memos, before.memos);
  } finally { f.close(); }
});

test('encrypted-at-rest email/token absent from database and WAL; ciphertext binds purpose and row; both wrong keys fail restart', () => {
  const f = fixture();
  try {
    const id = f.submit(); const token = f.token(id);
    for (const file of [f.database, `${f.database}-wal`]) {
      const contents = fs.readFileSync(file); assert.ok(!contents.includes(Buffer.from(input.email))); assert.ok(!contents.includes(Buffer.from(token)));
    }
    const cipher = crypto.encrypt('email', id, input.email);
    assert.equal(crypto.decrypt('email', id, cipher), input.email);
    throwsCode(() => crypto.decrypt('outbox', id, cipher), 'crypto_unavailable');
    throwsCode(() => crypto.decrypt('email', 'm_other', cipher), 'crypto_unavailable');
    const envelope = JSON.parse(cipher) as Record<string, unknown>; envelope.tag = Buffer.alloc(16).toString('base64url');
    throwsCode(() => crypto.decrypt('email', id, JSON.stringify(envelope)), 'crypto_unavailable');
    for (const keys of [[Buffer.alloc(32, 3), Buffer.alloc(32, 2)], [Buffer.alloc(32, 1), Buffer.alloc(32, 3)]]) {
      throwsCode(() => new MemoRepository(f.database, new MemoCrypto(keys[0]!, keys[1]!, 'test')), 'crypto_unavailable');
    }
    f.reopen(); assert.equal(f.repository.list().submissions.length, 1);
  } finally { f.close(); }
});

test('failed migration remains schema zero and can be migrated later', () => {
  const f = fixture();
  try {
    const candidate = `${f.root}/fresh.sqlite`;
    assert.throws(() => new MemoRepository(candidate, crypto, { fault: (stage) => { if (stage === 'migration') throw new Error('injected'); } }), /injected/);
    const repo = new MemoRepository(candidate, crypto); assert.ok(repo.ready()); repo.close();
    const bad = `${f.root}/bad.sqlite`;
    assert.throws(() => new MemoRepository(bad, crypto, { migration: 'CREATE TABLE partial(id TEXT); invalid SQL;' }));
    const fresh = new MemoRepository(bad, crypto); assert.ok(fresh.ready()); fresh.close();
  } finally { f.close(); }
});

test('opaque pagination is bounded and never projects raw private columns', () => {
  const f = fixture();
  try {
    for (let i = 0; i < 5; i += 1) f.submit({ ...input, body: `memo ${i}` });
    const ids: string[] = []; let cursor: string | undefined;
    do { const page = f.repository.list(2, cursor); ids.push(...page.submissions.map((row) => row.id)); cursor = page.nextCursor ?? undefined; } while (cursor);
    assert.equal(new Set(ids).size, 5);
    for (const limit of [0, 101, 1.5]) throwsCode(() => f.repository.list(limit), 'invalid_input');
    throwsCode(() => f.repository.list(50, '..'), 'invalid_input');
    assert.deepEqual(Object.keys(f.repository.list().submissions[0]!), ['id', 'displayName', 'body', 'createdAt', 'state', 'verifiedAt']);
  } finally { f.close(); }
});
