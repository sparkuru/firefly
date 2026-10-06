import assert from 'node:assert/strict';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadSiteConfig, parseSiteConfig } from '../src/lib/site-config.mjs';
import { createMemoFixtureServer } from '../scripts/serve-memos-fixture.mjs';
import { prepareMemoFixture } from './memos-fixture.mjs';
test('enabled and disabled discovery never access Memo config or injected options', async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memos-discovery-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  for (const enabled of [false, true]) {
    const fixture = await prepareMemoFixture(root, { enabled });
    const loaded = loadSiteConfig(fixture.configPath);
    assert.equal(loaded.plugins.memos.enabled, enabled);
    assert.equal(Object.hasOwn(loaded, 'memos'), false);
    const { comments: _comments, plugins: _plugins, ...core } = loaded;
    const raw = { ...core, plugins: { memos: { enabled, configPath: 'config/unusable.toml' } } };
    const parsed = parseSiteConfig(raw, 'fixture', { get memosConfig() { throw new Error('Memo inputs must not be read'); } });
    assert.equal(parsed.plugins.memos.enabled, enabled);
    await writeFile(fixture.pluginPath, 'invalid TOML; private Memo input');
    assert.equal(loadSiteConfig(fixture.configPath).plugins.memos.enabled, enabled);
  }
});
test('combined fixture serves only public regular reads and survives malformed requests', async (context) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memos-server-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  await mkdir(path.join(root, 'public'));
  await writeFile(path.join(root, 'public/index.html'), '<h1>Independent Memo</h1>');
  await writeFile(path.join(root, 'receipt.json'), 'private history');
  await symlink('../receipt.json', path.join(root, 'public/linked.txt'));
  const server = createMemoFixtureServer(root, root);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [route, status] of [['/memos/%zz', 400], ['/memos/linked.txt', 404], ['/memos/receipt.json', 404], ['/memos/%2e%2e%2freceipt.json', 404]]) assert.equal((await fetch(origin + route)).status, status);
  assert.equal((await fetch(origin + '/memos/', { method: 'POST' })).status, 405);
  assert.equal(await (await fetch(origin + '/memos/')).text(), '<h1>Independent Memo</h1>');
});
