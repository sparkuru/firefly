import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadConfig, loadSecrets } from '../src/config.js';
import { normalizeSubmission } from '../src/validation.js';
import { MemoService } from '../src/service.js';
import { renderMail } from '../src/smtp.js';
import { fixture, adminToken, input, plugin } from './helpers.js';

test('strict secret-file parser rejects permission, symlink, duplicate/malformed entries and preserves literal explicit override', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-config-'));
  try {
    const file = path.join(root, 'secrets.env');
    fs.writeFileSync(file, 'MEMOS_ADMIN_TOKEN=literal-$(not-run)\nMEMOS_TOKEN_KEY=one\n', { mode: 0o600 });
    const env = loadSecrets({ MEMOS_SECRETS_FILE: file, MEMOS_TOKEN_KEY: 'explicit' });
    assert.equal(env.MEMOS_ADMIN_TOKEN, 'literal-$(not-run)'); assert.equal(env.MEMOS_TOKEN_KEY, 'explicit');
    fs.chmodSync(file, 0o644); assert.throws(() => loadSecrets({ MEMOS_SECRETS_FILE: file })); fs.chmodSync(file, 0o600);
    fs.symlinkSync(file, path.join(root, 'link')); assert.throws(() => loadSecrets({ MEMOS_SECRETS_FILE: path.join(root, 'link') }));
    for (const contents of ['A=one\nA=two', 'export A=x', 'A=', 'A=x\r', 'A=one\nBAD LINE', 'x=y']) { fs.writeFileSync(file, contents); assert.throws(() => loadSecrets({ MEMOS_SECRETS_FILE: file })); }
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('runtime enforces contained private database, real files, all keys, origins, SMTP and SQLite-only queue; defaults to loopback', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'memo-runtime-')); fs.mkdirSync(path.join(root, 'config'));
  try {
    const configFile = path.join(root, 'config', 'memos.toml'); const data = path.join(root, 'data');
    const write = (extra = '', origin = 'allowedOrigins = ["https://example.com"]') => fs.writeFileSync(configFile, `[runtime]\n${origin}\npublicOrigin = "https://example.com"\ndataRoot = "${data}"\n${extra}\n[runtime.smtp]\nhost = "smtp.example.com"\nuser = "login"\nfrom = "memos@example.com"\n`);
    write();
    const env = { MEMOS_CONFIG_PATH: 'config/memos.toml', MEMOS_ADMIN_TOKEN: adminToken, MEMOS_TOKEN_KEY: '02'.repeat(32), MEMOS_ENCRYPTION_KEY: '01'.repeat(32), MEMOS_SMTP_PASSWORD: 'dummy-local-test' };
    const config = loadConfig(env, root); assert.equal(config.bind, '127.0.0.1'); assert.equal(config.port, 8788); assert.equal(fs.statSync(data).mode & 0o777, 0o700);
    assert.equal(config.trustProxy, 'none');
    assert.equal(loadConfig({ ...env, MEMOS_TRUST_PROXY: 'loopback' }, root).trustProxy, 'loopback');
    for (const overrides of [{ MEMOS_TRUST_PROXY: '' }, { MEMOS_TRUST_PROXY: 'all' }, { MEMOS_TRUST_PROXY: 'loopback', MEMOS_BIND: '0.0.0.0' }]) assert.throws(() => loadConfig({ ...env, ...overrides }, root), /configuration_unavailable/u);
    for (const missing of ['MEMOS_ADMIN_TOKEN', 'MEMOS_TOKEN_KEY', 'MEMOS_ENCRYPTION_KEY', 'MEMOS_SMTP_PASSWORD'] as const) assert.throws(() => loadConfig({ ...env, [missing]: undefined }, root), /configuration_unavailable/);
    for (const extra of ['outboxPath = "/tmp/memo-outbox"', 'databasePath = "/tmp/outside.sqlite"']) { write(extra); assert.throws(() => loadConfig(env, root)); }
    write('', 'allowedOrigins = []'); assert.throws(() => loadConfig(env, root));
    write(); fs.chmodSync(data, 0o755); assert.throws(() => loadConfig(env, root)); fs.chmodSync(data, 0o700);
    const original = fs.readFileSync(configFile); fs.renameSync(configFile, `${configFile}.real`); fs.symlinkSync(`${configFile}.real`, configFile);
    assert.throws(() => loadConfig(env, root)); fs.unlinkSync(configFile); fs.writeFileSync(configFile, original);
    fs.symlinkSync(path.join(root, 'outside.sqlite'), path.join(data, 'memos.sqlite')); assert.throws(() => loadConfig(env, root));
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('normalization uses the pure contract for code points, UTF-8 bytes, canonical whitespace and unsafe characters', () => {
  const valid = normalizeSubmission({ ...input, displayName: '  Cafe\u0301\r\n', body: ' text\r\nmore ' }, 'memos-v1');
  assert.equal(valid.displayName, 'Café'); assert.equal(valid.body, 'text\nmore');
  assert.equal(normalizeSubmission({ ...input, body: 'é'.repeat(4096), displayName: '😀'.repeat(80) }, 'memos-v1').body.length, 4096);
  for (const body of ['é'.repeat(4097), '\ud800', 'a\u0000', 'a\u202e']) assert.throws(() => normalizeSubmission({ ...input, body }, 'memos-v1'), /invalid_input/);
  const accessor = { ...input }; Object.defineProperty(accessor, 'email', { get() { assert.fail('getter executed'); } });
  assert.throws(() => normalizeSubmission(accessor, 'memos-v1'), /invalid_input/);
});

test('readiness fails closed for unavailable delivery; rendered mail has configured origin and never contains visitor text', () => {
  const f = fixture();
  try {
    const unavailable = new MemoService(f.repository, plugin, null); assert.equal(unavailable.ready(), false);
    assert.throws(() => unavailable.submit(input, 'https://example.com', '192.0.2.1'), /service_unavailable/);
    assert.equal(f.repository.list().submissions.length, 0);
    const id = f.submit(); const token = f.token(id);
    const mail = renderMail({ id, token, to: input.email, publicOrigin: 'https://example.com' }, 'memos@example.com');
    assert.ok(mail.includes(`https://example.com/v1/memos/verify/${token}`)); assert.ok(!mail.includes(input.body)); assert.ok(!mail.includes(input.displayName));
    assert.throws(() => renderMail({ id, token, to: 'bad\r\nBcc: victim@example.com', publicOrigin: 'https://example.com' }, 'memos@example.com'));
    assert.throws(() => renderMail({ id, token, to: input.email, publicOrigin: 'http://example.com' }, 'memos@example.com'));
  } finally { f.close(); }
});
