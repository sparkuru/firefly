import assert from 'node:assert/strict';
import fs from 'node:fs';
import { request } from 'node:http';
import { openRuntime } from '/app/services/memos/dist/src/runtime.js';
import { loadSecrets } from '/app/services/memos/dist/src/config.js';
import { createBackup, restoreBackup } from '/app/services/memos/dist/src/backup.js';

const root = '/fixture', origin = 'https://localhost:8443';
const token = loadSecrets(process.env).MEMOS_ADMIN_TOKEN;
const headers = { Authorization: `Bearer ${token}` };
const endpoint = 'http://127.0.0.1:8080';
const get = (path, options) => fetch(`${endpoint}${path}`, options);
const form = (index) => ({ displayName: 'Synthetic visitor', email: `runtime-private-${index}@example.invalid`, body: `Runtime note ${index}`, consentVersion: 'memos-v1', consent: 'accepted', honeypot: '' });
async function submit(index, localAddress) {
  const body = new URLSearchParams(form(index)).toString();
  return new Promise((resolve, reject) => {
    const req = request({ host: '127.0.0.1', port: 8080, localAddress, path: '/v1/memos/submissions', method: 'POST', headers: { Host: 'localhost:8443', Origin: origin, 'Content-Type': 'application/x-www-form-urlencoded', 'Content-Length': Buffer.byteLength(body), 'X-Real-IP': `192.0.2.${index}`, 'X-Forwarded-For': `192.0.2.${index}`, Forwarded: `for=192.0.2.${index}` } }, (res) => { res.resume(); res.on('end', () => resolve(res.statusCode)); });
    req.on('error', reject); req.end(body);
  });
}
function safeHeaders(response) {
  assert.equal(response.headers.get('cache-control'), 'no-store');
  assert.equal(response.headers.get('referrer-policy'), 'no-referrer');
  assert.equal(response.headers.get('content-security-policy'), "default-src 'none'; frame-ancestors 'none'; base-uri 'none'; form-action 'none'");
  assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
}
async function run(operation) {
  if (operation === 'absent') {
    const response = await get(`/v1/memos/verify/${'a'.repeat(43)}`); assert.equal(response.status, 502); safeHeaders(response);
    const unknown = await get('/v1/unknown'); assert.equal(unknown.status, 404); assert.equal(unknown.headers.get('cache-control'), 'no-store');
    assert.equal((await get('/v1/comments/unknown')).status, 502);
    return;
  }
  if (operation === 'proxy') {
    for (const path of ['/v1/memos/admin/submissions', '/v1/memos/admin/export']) { const response = await get(path); assert.equal(response.status, 401); safeHeaders(response); }
    const unknown = await get('/v1/memos/unknown'); assert.equal(unknown.status, 404); safeHeaders(unknown);
    assert.equal((await get('/v1/memos/healthz')).status, 404);
    assert.equal((await get('/v1/memos/submissions', { method: 'POST', headers: { Origin: 'https://denied.invalid', 'Content-Type': 'application/json' }, body: '{}' })).status, 403);
    for (let index = 0; index < 12; index++) assert.equal(await submit(index, '127.0.0.2'), 202);
    assert.equal(await submit(12, '127.0.0.2'), 429);
    assert.equal(await submit(13, '127.0.0.3'), 202);
    const { repository } = openRuntime();
    try {
      assert.equal(repository.database.prepare('SELECT count(*) n FROM rate_events').get().n, 13);
      const queued = repository.database.prepare("SELECT count(*) n FROM outbox WHERE state='queued' AND payload_cipher IS NOT NULL").get().n;
      assert.equal(queued, 13);
      fs.writeFileSync(`${root}/persist.json`, JSON.stringify({ rows: 13, queued, rates: 13 }), { mode: 0o600 });
    } finally { repository.close(); }
    return;
  }
  if (operation === 'persistence') {
    assert.equal(await submit(15, '127.0.0.2'), 429);
    const { repository } = openRuntime();
    try {
      const expected = JSON.parse(fs.readFileSync(`${root}/persist.json`, 'utf8'));
      assert.equal(repository.list(100).submissions.length, expected.rows);
      assert.equal(repository.database.prepare('SELECT count(*) n FROM rate_events').get().n, expected.rates);
      assert.equal(repository.database.prepare("SELECT count(*) n FROM outbox WHERE state='queued' AND payload_cipher IS NOT NULL").get().n, expected.queued);
      assert.equal(process.getuid(), Number(process.env.MEMOS_FIXTURE_UID ?? '1000'));
      assert.equal(fs.statSync('/var/lib/firefly-memos').mode & 0o777, 0o700);
      assert.equal(fs.statSync('/var/lib/firefly-memos/memos.sqlite').mode & 0o777, 0o600);
      for (const row of repository.list(100).submissions) repository.moderate(row.id, 'delete');
    } finally { repository.close(); }
    return;
  }
  if (operation === 'export') {
    const response = await get('/v1/memos/admin/export', { headers }); assert.equal(response.status, 200); safeHeaders(response);
    fs.writeFileSync(`${root}/export.json`, await response.text(), { mode: 0o600 }); return;
  }
  if (operation === 'approve') {
    const deadline = Date.now() + 65000;
    let mail = [];
    while (Date.now() < deadline) {
      mail = fs.existsSync(`${root}/mail.jsonl`) ? fs.readFileSync(`${root}/mail.jsonl`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse) : [];
      if (mail.length === 2) break;
      await new Promise((resolve) => setTimeout(resolve, 500));
    }
    assert.equal(mail.length, 2);
    const verification = mail.map((raw) => /https:\/\/localhost:8443(\/v1\/memos\/verify\/[A-Za-z0-9_-]{43})/u.exec(raw)?.[1]);
    for (const path of verification) { assert.ok(path); const response = await get(path); assert.equal(response.status, 200); safeHeaders(response); assert.ok((await response.text()).includes('waiting for owner review')); }
    const list = await get('/v1/memos/admin/submissions', { headers }); const rows = (await list.json()).submissions.filter((row) => row.state === 'pending');
    assert.equal(rows.length, 2);
    const before = await (await get('/v1/memos/admin/export', { headers })).json(); assert.equal(before.memos.length, 0);
    for (const row of rows) assert.equal((await get(`/v1/memos/admin/submissions/${row.id}/approve`, { method: 'POST', headers })).status, 200);
    const { repository } = openRuntime();
    try { await createBackup(repository, `${root}/old-backup`); } finally { repository.close(); }
    fs.writeFileSync(`${root}/approved-ids.json`, JSON.stringify(rows.map((row) => row.id)), { mode: 0o600 });
    const response = await get('/v1/memos/admin/export', { headers }); const text = await response.text();
    fs.writeFileSync(`${root}/export.json`, text, { mode: 0o600 });
    fs.writeFileSync(`${root}/approved-export.json`, text, { mode: 0o600 });
    return;
  }
  if (operation === 'delete') {
    const ids = JSON.parse(fs.readFileSync(`${root}/approved-ids.json`, 'utf8'));
    for (const id of ids) assert.equal((await get(`/v1/memos/admin/submissions/${id}/delete`, { method: 'POST', headers })).status, 200);
    const response = await get('/v1/memos/admin/export', { headers }); const text = await response.text(); const value = JSON.parse(text);
    assert.equal(value.memos.length, 0); assert.equal(value.tombstoneEpoch, 2);
    fs.writeFileSync(`${root}/export.json`, text, { mode: 0o600 }); return;
  }
  if (operation === 'restore') {
    const { config, repository } = openRuntime(); repository.close();
    restoreBackup(`${root}/old-backup`, `${root}/restored`, config.crypto);
    const { MemoRepository } = await import('/app/services/memos/dist/src/repository.js');
    const recovered = new MemoRepository(`${root}/restored/memos.sqlite`, config.crypto);
    try { const value = recovered.export(); assert.equal(value.tombstoneEpoch, 0); assert.equal(value.memos.length, 2); fs.writeFileSync(`${root}/export.json`, JSON.stringify(value), { mode: 0o600 }); }
    finally { recovered.close(); }
    return;
  }
  if (operation === 'privacy') {
    const privateValues = [token, loadSecrets(process.env).MEMOS_SMTP_PASSWORD, 'runtime-private-', 'native-private-', '/var/lib/firefly-memos', 'a'.repeat(43)];
    if (fs.existsSync(`${root}/mail.jsonl`)) for (const mail of fs.readFileSync(`${root}/mail.jsonl`, 'utf8').trim().split('\n').filter(Boolean).map(JSON.parse)) privateValues.push(/\/verify\/([A-Za-z0-9_-]{43})/u.exec(mail)?.[1]);
    for (const file of ['logs.txt', 'export.json']) {
      const bytes = fs.readFileSync(`${root}/${file}`, 'utf8');
      for (const value of privateValues.filter(Boolean)) assert.ok(!bytes.includes(value));
    }
    const scan = (directory) => {
      for (const file of fs.readdirSync(directory, { withFileTypes: true })) {
        const name = directory + '/' + file.name;
        if (file.isDirectory()) scan(name);
        else {
          assert.ok(file.isFile());
          const bytes = fs.readFileSync(name);
          for (const value of privateValues.filter(Boolean)) assert.ok(!bytes.includes(Buffer.from(value)));
        }
      }
    };
    for (const target of ['artifacts', 'dist']) scan('/publication/' + target);
    return;
  }
  throw new Error();
}
try { await run(process.argv[2]); process.stdout.write(`fixture:${process.argv[2]}_passed\n`); }
catch { process.stderr.write(`fixture:${process.argv[2]}_failed\n`); process.exitCode = 1; }
