import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';
import { parseMemosActivation, parseMemosConfig, parseMemosPublicConfig, resolveMemosConfigPath } from '../config.mjs';

test('disabled activation and public defaults need no file, database, environment or export', () => {
  assert.deepEqual(parseMemosActivation(), { enabled: false, configPath: 'config/plugins/memos/config.toml' });
  assert.equal(parseMemosConfig().public.writeOrigin, null);
  assert.equal(resolveMemosConfigPath(undefined, '/repo'), '/repo/config/plugins/memos/config.toml');
  assert.throws(() => parseMemosConfig({}, 'fixture', { enabled: true }), /fixture.*writeOrigin/);
  assert.throws(() => parseMemosActivation({ enabled: 'false' }), /boolean/);
});

test('runtime values never enter public projection; complete result is immutable', () => {
  const value = { public: { writeOrigin: 'https://example.com/' }, runtime: { dataRoot: '/var/lib/memos', allowedOrigins: ['https://example.com'], secretEnv: { adminToken: 'MEMOS_ADMIN_TOKEN' } } };
  const parsed = parseMemosConfig(value, 'fixture', { enabled: true });
  assert.deepEqual(parseMemosPublicConfig(value), { writeOrigin: 'https://example.com', exportPath: 'artifacts/memos/memos.public.v1.json', consentVersion: 'memos-v1' });
  for (const object of [parsed, parsed.public, parsed.runtime, parsed.runtime.allowedOrigins, parsed.runtime.secretEnv]) assert.ok(Object.isFrozen(object));
  assert.ok(!JSON.stringify(parsed.public).includes('MEMOS_ADMIN_TOKEN'));
});

test('unknown/private values, unsafe paths, URLs and secret literals fail closed', () => {
  for (const value of [{ enabled: true }, { public: { email: 'private' } }, { runtime: { password: 'private' } }, { runtime: { secretEnv: { adminToken: 'a secret!' } } }, { runtime: { secretEnv: { password: 'SECRET' } } }]) assert.throws(() => parseMemosConfig(value), TypeError);
  for (const configPath of ['/tmp/config.toml', '../config.toml', 'a/../b.toml', 'a//b.toml', 'a\\b.toml', 'a/%2e.toml', 'a/.hidden.toml', 'a/b.json', 'a/\ud800.toml']) assert.throws(() => parseMemosActivation({ configPath }), TypeError);
  for (const writeOrigin of ['http://example.com', 'https://user:pass@example.com', 'https://example.com/path', 'https://example.com?x', 'https://example.com#', 'https:\\example.com', ' https://example.com']) assert.throws(() => parseMemosConfig({ public: { writeOrigin } }), TypeError);
  assert.throws(() => parseMemosConfig({ runtime: { dataRoot: '/var/../data' } }), TypeError);
  assert.throws(() => parseMemosConfig({ runtime: { allowedOrigins: ['https://example.com', 'https://example.com/'] } }), /unique/);
  const hidden = {}; Object.defineProperty(hidden, 'password', { value: 'private' });
  assert.throws(() => parseMemosConfig({ runtime: hidden }), TypeError);
  const accessor = {}; Object.defineProperty(accessor, 'enabled', { get() { assert.fail('getter invoked'); } });
  assert.throws(() => parseMemosActivation(accessor), /data property/);
});

test('tracked example parses through the same strict contract', async () => {
  const { parse } = await import('../../../apps/site/node_modules/smol-toml/dist/index.js');
  const example = parse(readFileSync(new URL('../../../config/plugins/memos/config.toml.example', import.meta.url), 'utf8'));
  assert.deepEqual(parseMemosPublicConfig(example), parseMemosConfig().public);
});

test('nonnullable public settings reject explicit null instead of defaulting', () => {
  for (const key of ['exportPath', 'consentVersion']) assert.throws(() => parseMemosConfig({ public: { [key]: null } }), TypeError);
  for (const writeOrigin of ['https://example.com/a/..', 'https://example.com/.', 'https:///example.com']) assert.throws(() => parseMemosConfig({ public: { writeOrigin } }), TypeError);
});
