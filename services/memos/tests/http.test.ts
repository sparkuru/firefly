import assert from 'node:assert/strict';
import { request as httpRequest } from 'node:http';
import type { AddressInfo } from 'node:net';
import test from 'node:test';
import { adminRequest } from '../src/admin.js';
import { credentialHash } from '../src/crypto.js';
import { createMemoServer } from '../src/http.js';
import { publicContract } from '../src/contract.js';
import { fixture, input, origin, adminToken } from './helpers.js';

async function httpFixture() {
  const f = fixture(); const diagnostics: string[] = [];
  const server = createMemoServer(f.service, credentialHash(adminToken), (code) => diagnostics.push(code));
  await new Promise<void>((resolve) => server.listen(0, '127.0.0.1', resolve));
  const base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
  return { ...f, base, diagnostics, async close() { server.closeAllConnections(); await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve())); f.close(); } };
}

test('HTTP normal flow, exact DTO/export, no-store verification, generic rejection, Bearer admin and safe return link', async () => {
  const f = await httpFixture();
  try {
    const post = () => fetch(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.9' }, body: JSON.stringify(input) });
    const one = await post(); const two = await post(); assert.equal(one.status, 202); assert.equal(two.status, 202);
    assert.equal(await one.text(), await two.text());
    const id = f.repository.list().submissions[0]!.id; const token = f.token(id);
    const verified = await fetch(`${f.base}/v1/memos/verify/${token}`, { headers: { Host: 'untrusted.example' } });
    assert.equal(verified.status, 200); assert.equal(verified.headers.get('cache-control'), 'no-store'); assert.equal(verified.headers.get('referrer-policy'), 'no-referrer');
    const html = await verified.text(); assert.ok(html.includes('href="/memos/"')); assert.ok(!html.includes(token)); assert.ok(!html.includes('untrusted'));
    const replay = await fetch(`${f.base}/v1/memos/verify/${token}`); const absent = await fetch(`${f.base}/v1/memos/verify/${'a'.repeat(43)}`);
    assert.equal(replay.status, 400); assert.equal(await replay.text(), await absent.text());
    const unauthorized: Record<string, string>[] = [{}, { Authorization: 'Bearer invalid' }, { Authorization: `Bearer ${'x'.repeat(32)}` }];
    for (const headers of unauthorized) {
      const result = await fetch(`${f.base}/v1/memos/admin/submissions`, { headers }); assert.equal(result.status, 401); assert.ok(!(await result.text()).includes(id));
    }
    const auth = { Authorization: `Bearer ${adminToken}` };
    const list = await fetch(`${f.base}/v1/memos/admin/submissions`, { headers: auth });
    assert.equal(list.status, 200); assert.ok(!(await list.text()).includes(input.email));
    assert.equal((await fetch(`${f.base}/v1/memos/admin/submissions/${id}/approve`, { method: 'POST', headers: auth })).status, 200);
    const exported = await fetch(`${f.base}/v1/memos/admin/export`, { headers: auth }); assert.equal(publicContract.decodePublicMemosExport(await exported.text()).memos.length, 1);
    assert.equal((await fetch(`${f.base}/v1/memos`, { headers: auth })).status, 404);
    assert.equal((await fetch(`${f.base}/readyz`)).status, 200);
    assert.equal((await fetch(`${f.base}/healthz`)).status, 200);
    const cli = await adminRequest(['export'], { origin: f.base, token: adminToken }); assert.equal(publicContract.decodePublicMemosExport(cli).memos.length, 1);
    const cliList = await adminRequest(['list'], { origin: f.base, token: adminToken }); assert.ok(!cliList.includes(adminToken)); assert.ok(!cliList.includes(input.email));
  } finally { await f.close(); }
});

test('malformed/oversized/unsupported/unconsented/Unicode/form/origin inputs fail before any row, native form responses remain readable', async () => {
  const f = await httpFixture();
  try {
    const cases: Array<{ body: string | Buffer; type?: string; status: number; headers?: Record<string, string> }> = [
      { body: '{}', status: 400 }, { body: '{', status: 400 },
      { body: Buffer.from([0xff]), status: 400 },
      { body: 'x'.repeat(32769), status: 413 },
      { body: JSON.stringify(input), type: 'text/plain', status: 415 },
      { body: JSON.stringify(input), headers: { Origin: 'https://denied.example' }, status: 403 },
      ...[{ ...input, consent: '' }, { ...input, consentVersion: 'old' }, { ...input, honeypot: 'bot' }, { ...input, unknown: true }, { ...input, email: 'bad\r\n@example.com' }, { ...input, body: 'é'.repeat(4097) }, { ...input, displayName: 'a'.repeat(81) }, { ...input, body: '\ud800' }].map((value) => ({ body: JSON.stringify(value), status: 400 })),
      { body: 'displayName=Reader&displayName=Again', type: 'application/x-www-form-urlencoded', status: 400 },
      { body: 'displayName=%FF', type: 'application/x-www-form-urlencoded', status: 400 },
      { body: 'displayName=%ZZ', type: 'application/x-www-form-urlencoded', status: 400 }
    ];
    for (const item of cases) {
      const response = await fetch(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': item.type ?? 'application/json', ...item.headers }, body: typeof item.body === 'string' ? item.body : new Uint8Array(item.body) });
      assert.equal(response.status, item.status);
      const text = await response.text(); assert.ok(!text.includes(input.email)); assert.ok(!text.includes(adminToken));
      assert.equal(f.repository.list().submissions.length, 0);
    }
    const body = new URLSearchParams(input).toString();
    const form = await fetch(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded' }, body });
    assert.equal(form.status, 202); assert.ok((await form.text()).includes('<html'));
    const raw = await new Promise<number>((resolve, reject) => {
      const request = httpRequest(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json' } }, (response) => { response.resume(); response.on('end', () => resolve(response.statusCode!)); });
      request.on('error', reject); request.write('x'.repeat(16000)); request.end('x'.repeat(18000));
    });
    assert.equal(raw, 413);
    assert.ok(f.diagnostics.every((value) => /^[a-z_]+$/u.test(value)));
  } finally { await f.close(); }
});

test('untrusted forwarding headers cannot evade socket-IP limits, query bounds and conflicts use bounded status', async () => {
  const f = await httpFixture();
  try {
    for (let i = 0; i < 12; i += 1) {
      const response = await fetch(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': `192.0.2.${i}` }, body: JSON.stringify({ ...input, body: `memo ${i}`, email: `reader${i}@example.com` }) }); assert.equal(response.status, 202);
    }
    const limited = await fetch(`${f.base}/v1/memos/submissions`, { method: 'POST', headers: { Origin: origin, 'Content-Type': 'application/json', 'X-Forwarded-For': '192.0.2.200' }, body: JSON.stringify(input) }); assert.equal(limited.status, 429);
    const headers = { Authorization: `Bearer ${adminToken}` };
    for (const query of ['limit=101', 'limit=1&limit=2', 'cursor=..', 'unknown=x']) assert.equal((await fetch(`${f.base}/v1/memos/admin/submissions?${query}`, { headers })).status, 400);
    const id = f.repository.list().submissions[0]!.id;
    assert.equal((await fetch(`${f.base}/v1/memos/admin/submissions/${id}/approve`, { method: 'POST', headers })).status, 409);
  } finally { await f.close(); }
});

test('CLI refuses redirects, unsafe endpoint/credential argv, and unexpected HTTP responses without leaking credential', async () => {
  let calls = 0;
  const fake = (async (_url: unknown, options: RequestInit) => {
    calls += 1; assert.equal(options.redirect, 'manual'); assert.equal((options.headers as Record<string, string>).Authorization, `Bearer ${adminToken}`);
    return new Response('', { status: 302, headers: { Location: 'https://attacker.example' } });
  }) as typeof fetch;
  await assert.rejects(adminRequest(['list'], { origin: 'http://127.0.0.1:8788', token: adminToken, fetch: fake }), /admin_request_failed/);
  assert.equal(calls, 1);
  for (const args of [['list', '--token', adminToken], ['approve', 'm_example', adminToken], ['export', adminToken]]) await assert.rejects(adminRequest(args, { origin: 'http://127.0.0.1:8788', token: adminToken, fetch: fake }), /invalid_arguments/);
  for (const endpoint of ['http://example.com', 'https://user:secret@example.com', 'http://127.0.0.1:8788/path']) await assert.rejects(adminRequest(['list'], { origin: endpoint, token: adminToken, fetch: fake }), /invalid_admin_config/);
  assert.equal(calls, 1);
});

test('CLI validates exact moderation DTO/action responses, bounds raw bodies and rejects malformed UTF-8', async () => {
  const memo = { id: 'm_example', displayName: 'Reader', body: 'Text', createdAt: '2026-10-03T00:00:00.000Z', state: 'pending', verifiedAt: '2026-10-03T00:00:00.000Z' };
  const run = (action: string[], value: unknown) => adminRequest(action, { origin: 'http://127.0.0.1:8788', token: adminToken, fetch: (async () => new Response(JSON.stringify(value))) as typeof fetch });
  assert.deepEqual(JSON.parse(await run(['list'], { submissions: [memo], nextCursor: null })), { submissions: [memo], nextCursor: null });
  assert.deepEqual(JSON.parse(await run(['list'], { submissions: [{ ...memo, state: 'deleted', displayName: '', body: '', verifiedAt: null }], nextCursor: null })).submissions[0].body, '');
  assert.equal(await run(['approve', memo.id], { status: 'ok' }), '{"status":"ok"}\n');
  for (const value of [
    { submissions: [memo], nextCursor: null, email: input.email },
    { submissions: [{ ...memo, email: input.email }], nextCursor: null },
    { submissions: [{ ...memo, state: 'unknown' }], nextCursor: null },
    { submissions: [{ ...memo, verifiedAt: null }], nextCursor: null },
    { submissions: [memo, memo], nextCursor: null },
    { submissions: Array.from({ length: 101 }, () => memo), nextCursor: null },
    { submissions: [memo], nextCursor: Buffer.from('m_other').toString('base64url') },
    { submissions: [memo], nextCursor: '..' }
  ]) await assert.rejects(run(['list'], value), /invalid_admin_response/);
  for (const value of [{ status: 'ok', token: adminToken }, { status: 'private-error' }, 'not-json-object']) await assert.rejects(run(['approve', memo.id], value), /invalid_admin_response/);
  let cancelled = false;
  const stream = new ReadableStream<Uint8Array>({ start(controller) { controller.enqueue(new Uint8Array(8 * 1024 * 1024 + 1)); }, cancel() { cancelled = true; } });
  await assert.rejects(adminRequest(['list'], { origin: 'http://127.0.0.1:8788', token: adminToken, fetch: (async () => new Response(stream)) as typeof fetch }), /invalid_admin_response/);
  assert.equal(cancelled, true);
  await assert.rejects(adminRequest(['list'], { origin: 'http://127.0.0.1:8788', token: adminToken, fetch: (async () => new Response(new Uint8Array([0xff]))) as typeof fetch }), /invalid_admin_response/);
});
