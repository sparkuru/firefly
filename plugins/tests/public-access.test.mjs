import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import test from 'node:test';
import {
  decodePluginAccess, enabledMarkerPaths, pluginAccessFromConfig, pluginForPublicPath,
  PLUGIN_IDS, PLUGIN_MARKER_ROOT, PLUGIN_PUBLIC_ROUTES, serializePluginAccess
} from '../public-access.mjs';

const state = (comments = false, memos = false) => ({ schemaVersion: 1, plugins: { comments: { enabled: comments }, memos: { enabled: memos } } });

test('all four activation states are exact frozen deterministic public projections', () => {
  for (const comments of [false, true]) for (const memos of [false, true]) {
    const value = state(comments, memos);
    const decoded = decodePluginAccess(value);
    assert.deepEqual(decoded, value);
    assert.ok(Object.isFrozen(decoded) && Object.isFrozen(decoded.plugins) && Object.isFrozen(decoded.plugins.comments));
    assert.deepEqual(enabledMarkerPaths(decoded), [comments && 'plugin-access/comments.enabled', memos && 'plugin-access/memos.enabled'].filter(Boolean));
    assert.equal(serializePluginAccess(decoded), serializePluginAccess({ plugins: { memos: { enabled: memos }, comments: { enabled: comments } }, schemaVersion: 1 }));
    assert.deepEqual(pluginAccessFromConfig({ plugins: { comments: { enabled: comments, configPath: 'private.toml' }, memos: { enabled: memos, configPath: 'private.toml' } } }), { schemaVersion: 2, plugins: { comments: { enabled: comments } } });
    assert.ok(!serializePluginAccess(decoded).includes('private'));
  }
});

test('integrated releases own Memo as documents and reject mixed plugin namespaces', () => {
  for (const enabled of [true, false]) {
    const access = decodePluginAccess({ schemaVersion: 2, plugins: { comments: { enabled } } });
    assert.equal(pluginForPublicPath('/memos/', access), null);
    assert.equal(pluginForPublicPath('/pages/memos/m_example/', access), null);
    assert.equal(pluginForPublicPath('/v1/comments/', access), 'comments');
    assert.deepEqual(enabledMarkerPaths(access), enabled ? ['plugin-access/comments.enabled'] : []);
    assert.throws(() => decodePluginAccess({ ...state(), schemaVersion: 2 }), /exactly/u);
  }
});

test('invalid and decorated activation cannot execute accessors or coerce booleans', () => {
  const invalid = [null, [], {}, { ...state(), schemaVersion: '1' }, { ...state(), extra: true },
    { ...state(), plugins: { ...state().plugins, unknown: { enabled: true } } },
    { ...state(), plugins: { memos: { enabled: false } } }];
  for (const enabled of ['false', 'true', 0, 1, null, undefined]) invalid.push({ ...state(), plugins: { comments: { enabled }, memos: { enabled: false } } });
  invalid.push({ ...state(), plugins: { comments: { enabled: false, configPath: 'x' }, memos: { enabled: false } } });
  let calls = 0;
  invalid.push({ ...state(), get plugins() { calls++; throw new Error('accessor ran'); } });
  invalid.push({ ...state(), plugins: { comments: { get enabled() { calls++; throw new Error('accessor ran'); } }, memos: { enabled: false } } });
  invalid.push(Object.assign(Object.create({ inherited: true }), state()));
  invalid.push(Object.defineProperty(state(), Symbol('extra'), { value: true }));
  for (const value of invalid) assert.throws(() => decodePluginAccess(value), /Invalid/u);
  assert.equal(calls, 0);
  assert.throws(() => pluginAccessFromConfig({ plugins: { ...state().plugins, unknown: {} } }), /exactly/u);
});

test('every tracked plugin manifest declares a public-access policy', async () => {
  const manifests = [];
  for (const entry of await readdir(new URL('../', import.meta.url), { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    try { manifests.push(JSON.parse(await readFile(new URL(`../${entry.name}/plugin.json`, import.meta.url), 'utf8')).id); }
    catch (error) { if (error.code !== 'ENOENT') throw error; }
  }
  assert.deepEqual(manifests.sort(), [...PLUGIN_IDS].sort());
  assert.deepEqual(PLUGIN_PUBLIC_ROUTES.map((route) => route.pluginId).sort(), manifests);
});

test('route ownership covers complete namespaces and normalized decoded paths', () => {
  for (const path of ['/memos', '/memos/', '/memos/index.html', '/memos/assets/image.png', '//memos//assets/', '/a/../memos/']) assert.equal(pluginForPublicPath(path), 'memos');
  for (const path of ['/v1/comments', '/v1/comments/', '/v1/comments/submissions', '/v1/comments/admin/export', '/v1/comments/control/x/delete']) assert.equal(pluginForPublicPath(path), 'comments');
  for (const path of ['/', '/posts/hello/', '/memos-other/', '/v1/comments-other', '/v1/memos/']) assert.equal(pluginForPublicPath(path), null);
  for (const path of ['memos', '/memos?x', '/memos#x', '/memos\\x', '/memos/\0']) assert.throws(() => pluginForPublicPath(path), /decoded/u);
});

test('each registered exact and prefix namespace has a container edge marker gate', async () => {
  const source = await readFile(new URL('../../nginx.conf', import.meta.url), 'utf8');
  const locations = [...source.matchAll(/location\s+(=|\^~)\s+(\S+)\s*\{/gu)];
  for (const route of PLUGIN_PUBLIC_ROUTES) {
    for (const [kind, ownedPath] of [['=', route.exact], ['^~', route.prefix]]) {
      const index = locations.findIndex((match) => match[1] === kind && match[2] === ownedPath);
      assert.notEqual(index, -1, `${route.pluginId} ${kind} ${ownedPath} must have an explicit Nginx location`);
      const body = source.slice(locations[index].index + locations[index][0].length, locations[index + 1]?.index ?? source.length);
      assert.ok(body.includes(`if (!-f /usr/share/nginx/html/${PLUGIN_MARKER_ROOT}/${route.pluginId}.enabled) { return 404; }`), `${route.pluginId} ${ownedPath} must close without its release marker`);
      assert.match(body, /open_file_cache off;/u, 'release-pointer changes must not cache prior activation');
    }
  }
});
