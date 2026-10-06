import assert from 'node:assert/strict';
import { lstatSync, readFileSync } from 'node:fs';
import test from 'node:test';
import { DEFAULT_MEMOS_CONFIG_PATH, parseMemosActivation, parseMemosConfig, parseMemosPublicConfig, resolveMemosConfigPath } from '../config.mjs';

test('plugin descriptor points to existing regular navigation and publisher entrypoints', () => {
  const descriptor = JSON.parse(readFileSync(new URL('../plugin.json', import.meta.url), 'utf8'));
  assert.equal(descriptor.entrypoints.site, 'apps/site/src/lib/site-plugins.ts');
  const repositoryRoot = new URL('../../../', import.meta.url);
  for (const entry of Object.values(descriptor.entrypoints)) {
    assert.equal(lstatSync(new URL(entry, repositoryRoot)).isFile(), true, entry);
  }
});

test('activation defaults disabled and preserves the optional contained config path', () => {
  assert.deepEqual(parseMemosActivation(), { enabled: false, configPath: DEFAULT_MEMOS_CONFIG_PATH });
  assert.deepEqual(parseMemosActivation({ enabled: true }), { enabled: true, configPath: DEFAULT_MEMOS_CONFIG_PATH });
  assert.equal(resolveMemosConfigPath('config/memos.toml', '/repository'), '/repository/config/memos.toml');
  for (const configPath of ['/private/config.toml', '../config.toml', 'config/../config.toml', 'a\\b.toml', 'config/config.json', 'config//file.toml', 'config/\u202e.toml']) assert.throws(() => parseMemosActivation({ configPath }));
  for (const enabled of ['true', 1, null]) assert.throws(() => parseMemosActivation({ enabled }));
  assert.throws(() => parseMemosActivation({ enabled: true, sourceRoot: '/private' }), /unsupported/);
});

test('public config describes only the reserved independent mount', () => {
  const parsed = parseMemosConfig();
  assert.deepEqual(parsed, { public: { route: '/memos/' } });
  assert.deepEqual(parseMemosPublicConfig({ public: { route: '/memos/' } }), parsed.public);
  assert.ok(Object.isFrozen(parsed));
  assert.ok(Object.isFrozen(parsed.public));
  for (const route of ['/memo/', '//memos/', '/memos', 'https://example.com/memos/', null]) assert.throws(() => parseMemosConfig({ public: { route } }));
  for (const key of ['writeOrigin', 'exportPath', 'consentVersion', 'sourceRoot', 'email', 'databasePath']) assert.throws(() => parseMemosConfig({ public: { [key]: 'private' } }), /unsupported/);
  for (const key of ['runtime', 'smtp', 'secretEnv', 'deployment']) assert.throws(() => parseMemosConfig({ [key]: {} }), /unsupported/);
});

test('configuration rejects accessors, symbols and non-plain input without evaluating secrets', () => {
  let calls = 0;
  const raw = {};
  Object.defineProperty(raw, 'public', { get() { calls += 1; return {}; } });
  assert.throws(() => parseMemosConfig(raw), /data property/);
  assert.equal(calls, 0);
  assert.throws(() => parseMemosConfig(Object.create({ public: {} })), /plain object/);
  assert.throws(() => parseMemosConfig({ [Symbol('secret')]: 'private' }), /unsupported/);
});
