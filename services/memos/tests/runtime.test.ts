import assert from 'node:assert/strict';
import { request } from 'node:http';
import type { IncomingMessage } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { canonicalAddress, clientAddress, proxyTrust } from '../src/address.js';
import { createMemoServer } from '../src/http.js';
import { credentialHash } from '../src/crypto.js';
import { startDeliveryWorker } from '../src/worker.js';
import { fixture, input, origin, adminToken } from './helpers.js';

test('proxy policy is opt-in and canonicalizes IPv4, IPv6 and mapped addresses', () => {
  assert.equal(proxyTrust(undefined, '0.0.0.0'), 'none');
  assert.equal(proxyTrust('loopback', '::1'), 'loopback');
  for (const mode of ['', 'all', 'true']) assert.throws(() => proxyTrust(mode, '127.0.0.1'));
  assert.throws(() => proxyTrust('loopback', '0.0.0.0'));
  assert.equal(canonicalAddress('::ffff:192.0.2.1'), '192.0.2.1');
  assert.equal(canonicalAddress('::ffff:c000:201'), '192.0.2.1');
  assert.equal(canonicalAddress('2001:0DB8:0000::1'), '2001:db8::1');
  for (const value of ['192.0.2.1:80', '[::1]', '::1%lo', '192.0.2.1,192.0.2.2', ' 192.0.2.1', 'unknown']) assert.throws(() => canonicalAddress(value));
  const fake = { socket: { remoteAddress: '192.0.2.1', localAddress: '127.0.0.1' }, rawHeaders: ['X-Real-IP', '192.0.2.2'] } as unknown as IncomingMessage;
  assert.equal(clientAddress(fake), '192.0.2.1');
  assert.throws(() => clientAddress(fake, 'loopback'));
});

test('real HTTP loopback trust rejects malformed/duplicate headers before writes and preserves distinct canonical rates', async () => {
  const f = fixture();
  const server = createMemoServer(f.service, credentialHash(adminToken), undefined, 'loopback');
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const port = (server.address() as AddressInfo).port;
  const post = (headers: string[], index: number): Promise<number> => new Promise((resolve, reject) => {
    const body = JSON.stringify({ ...input, body: `memo ${index}`, email: `reader${index}@example.com` });
    const req = request({ host: '127.0.0.1', port, path: '/v1/memos/submissions', method: 'POST', headers: ['Host', 'private.invalid', 'Origin', origin, 'Content-Type', 'application/json', 'Content-Length', String(Buffer.byteLength(body)), ...headers] }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode!)); });
    req.on('error', reject); req.end(body);
  });
  try {
    for (const headers of [[], ['X-Real-IP', 'bad'], ['X-Real-IP', '::1:xyz'], ['X-Real-IP', '192.0.2.1, 192.0.2.2'], ['X-Real-IP', '192.0.2.1', 'x-real-ip', '192.0.2.1']]) assert.equal(await post(headers, 0), 400);
    assert.equal(f.repository.list().submissions.length, 0);
    for (let index = 0; index < 12; index += 1) assert.equal(await post(['X-Real-IP', index % 2 ? '::ffff:c000:201' : '192.0.2.1', 'Forwarded', 'for=bad', 'X-Forwarded-For', 'bad'], index), 202);
    assert.equal(await post(['X-Real-IP', '::ffff:192.0.2.1'], 12), 429);
    assert.equal(await post(['X-Real-IP', '192.0.2.2'], 13), 202);
    f.reopen();
    assert.throws(() => f.service.submit({ ...input, body: 'after restart', email: 'restart@example.com' }, origin, '192.0.2.1'), /rate_limited/u);
  } finally { server.closeAllConnections(); await new Promise<void>((resolve) => server.close(() => resolve())); f.close(); }
});

test('worker bounds drains, skips overlapping ticks, recovers errors and closes after outstanding work', async () => {
  let tick = () => {}; let cancelled = false; let calls = 0; let closed = false;
  let release = () => {}; const diagnostic: string[] = [];
  const worker = startDeliveryWorker({
    schedule(callback, interval) { assert.equal(interval, 15000); tick = callback; return () => { cancelled = true; }; },
    async deliver(limit) { assert.equal(limit, 1); calls += 1; if (calls === 1) throw new Error('private-token-recipient-transcript'); await new Promise<void>((resolve) => { release = resolve; }); return { delivered: 1, failed: 0 }; },
    close() { closed = true; }, diagnostic: (code) => diagnostic.push(code)
  });
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(diagnostic, ['worker_failed']);
  tick(); tick(); await new Promise((resolve) => setImmediate(resolve)); assert.equal(calls, 2);
  const stopped = worker.stop(); assert.equal(cancelled, true); assert.equal(closed, false);
  tick(); assert.equal(calls, 2); release(); await stopped;
  assert.equal(closed, true); assert.deepEqual(diagnostic, ['worker_failed', 'worker_delivered']);
  await worker.stop();
});

test('scheduled delivery uses existing encrypted claims and force-stop lease recovery', async () => {
  const f = fixture(); let tick = () => {};
  try {
    const id = f.submit();
    const claim = f.repository.claim(); assert.ok(claim);
    f.reopen();
    assert.equal(f.repository.claim(), null);
    f.advance(300001);
    const worker = startDeliveryWorker({ deliver: (limit) => f.service.deliver(limit), close() {}, schedule(callback) { tick = callback; return () => {}; } });
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(f.messages.length, 1); assert.equal(f.messages[0]!.id, id);
    tick(); await worker.stop(); assert.equal(f.messages.length, 1);
    assert.equal(f.repository.database.prepare('SELECT payload_cipher FROM outbox WHERE id = ?').get(id)!.payload_cipher, null);
  } finally { f.close(); }
});

test('worker recovers a synchronous delivery failure on the next scheduled tick', async () => {
  let tick = () => {}; let calls = 0; let closed = 0;
  const diagnostics: string[] = [];
  const worker = startDeliveryWorker({
    schedule(callback) { tick = callback; return () => {}; },
    deliver() {
      calls += 1;
      if (calls === 1) throw new Error('private transport failure');
      return Promise.resolve({ delivered: 1, failed: 0 });
    },
    close() { closed += 1; }, diagnostic: (code) => diagnostics.push(code)
  });
  await new Promise((resolve) => setImmediate(resolve));
  tick(); tick();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(calls, 2);
  assert.deepEqual(diagnostics, ['worker_failed', 'worker_delivered']);
  await worker.stop(); await worker.stop();
  assert.equal(closed, 1);
});
