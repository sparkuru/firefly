import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { loadSiteConfig, parseSiteConfig } from '../src/lib/site-config.mjs';
import { loadMemoStream } from '../src/plugins/memos/index.mjs';
import { createMemoFixtureServer } from '../scripts/serve-memos-fixture.mjs';
import { memoExport, prepareMemoFixture, privateSentinels, repositoryRoot, siteRoot } from './memos-fixture.mjs';

test.before(() => mkdir(path.join(siteRoot, 'test-results'), { recursive: true }));

test('memo fixture server contains reads and survives malformed requests', async (context) => {
  const root = await mkdtemp(path.join(siteRoot, 'test-results/memos-server-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const outputRoot = path.join(root, 'output');
  await mkdir(outputRoot);
  await writeFile(path.join(outputRoot, 'index.html'), '<h1>Contained memo fixture</h1>');
  await writeFile(path.join(root, 'private.html'), 'fixture-external-private-sentinel');
  await symlink('../private.html', path.join(outputRoot, 'linked.html'));
  await symlink(root, path.join(outputRoot, 'linked-directory'));
  const server = createMemoFixtureServer(outputRoot);
  context.after(() => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve())));
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [pathname, status] of [
    ['/%', 400], ['/%2e%2e%2fprivate.html', 400], ['/%00', 404],
    ['/linked.html', 404], ['/linked-directory/private.html', 404], ['/missing.html', 404]
  ]) {
    const response = await fetch(`${origin}${pathname}`);
    assert.equal(response.status, status, pathname);
    assert.ok(!(await response.text()).includes('fixture-external-private-sentinel'));
  }
  const response = await fetch(`${origin}/`);
  assert.equal(response.status, 200);
  assert.equal(response.headers.get('content-type'), 'text/html');
  assert.equal(await response.text(), '<h1>Contained memo fixture</h1>');
});

test('memo loading projects immutable public data and skips all disabled inputs', async (context) => {
  const root = await mkdtemp(path.join(siteRoot, 'test-results/memos-unit-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root);
  const config = loadSiteConfig(fixture.configPath);
  const data = loadMemoStream(config, { exportPath: fixture.exportRelative });
  assert.deepEqual(Object.keys(config.memos), ['writeOrigin', 'exportPath', 'consentVersion']);
  for (const value of privateSentinels) assert.ok(!JSON.stringify(config).includes(value));
  assert.ok(Object.isFrozen(data));
  assert.ok(Object.isFrozen(data.public));
  assert.ok(Object.isFrozen(data.envelope.memos[0]));
  const empty = memoExport([]);
  await writeFile(fixture.exportPath, JSON.stringify(empty));
  assert.equal(loadMemoStream(config, { exportPath: fixture.exportRelative }).envelope.memos.length, 0);
  const disabled = await prepareMemoFixture(root, { enabled: false });
  await writeFile(disabled.pluginPath, 'not TOML');
  await rm(disabled.exportPath);
  const disabledConfig = loadSiteConfig(disabled.configPath);
  assert.equal(loadMemoStream(disabledConfig, { get exportPath() { throw new Error('must not resolve'); } }), null);
  assert.equal(parseSiteConfig(disabledConfigWithoutProjection(disabledConfig), 'fixture', { get memosConfig() { throw new Error('must not read'); } }).memos.writeOrigin, null);
});

function disabledConfigWithoutProjection(config) {
  const { comments: _comments, memos: _memos, ...raw } = config;
  return raw;
}

test('enabled memo adapter and prebuild gates reject unsafe files and wire bytes', async (context) => {
  const root = await mkdtemp(path.join(siteRoot, 'test-results/memos-negative-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root);
  const config = loadSiteConfig(fixture.configPath);
  const valid = memoExport();
  for (const bytes of [
    '{', Buffer.from([0xff]),
    JSON.stringify({ ...valid, digest: '0'.repeat(64) }),
    JSON.stringify({ ...valid, memos: [...valid.memos].reverse() }),
    JSON.stringify({ ...valid, memos: [{ ...valid.memos[0], email: privateSentinels[0] }, valid.memos[1]] })
  ]) {
    await writeFile(fixture.exportPath, bytes);
    assert.throws(() => loadMemoStream(config, { exportPath: fixture.exportRelative }));
    const result = spawnSync(process.execPath, ['scripts/validate-memos-build.mjs'], { cwd: siteRoot, encoding: 'utf8', env: { ...process.env, FIREFLY_SITE_CONFIG_PATH: fixture.configRelative, FIREFLY_MEMOS_EXPORT: fixture.exportRelative } });
    assert.notEqual(result.status, 0);
    for (const value of privateSentinels) assert.ok(!`${result.stdout}${result.stderr}`.includes(value));
  }
  await rm(fixture.exportPath);
  assert.throws(() => loadMemoStream(config, { exportPath: fixture.exportRelative }));
  await mkdir(fixture.exportPath);
  assert.throws(() => loadMemoStream(config, { exportPath: fixture.exportRelative }));
  await rm(fixture.exportPath, { recursive: true });
  const fifo = spawnSync('mkfifo', [fixture.exportPath]);
  assert.equal(fifo.status, 0);
  assert.throws(() => loadMemoStream(config, { exportPath: fixture.exportRelative }));
  await rm(fixture.exportPath);
  await writeFile(path.join(root, 'real.json'), JSON.stringify(valid));
  await symlink('real.json', fixture.exportPath);
  assert.throws(() => loadMemoStream(config, { exportPath: fixture.exportRelative }));
  await symlink(root, path.join(root, 'linked'));
  assert.throws(() => loadMemoStream(config, { exportPath: `${path.relative(repositoryRoot, root)}/linked/real.json` }));
  for (const value of ['/tmp/export.json', '../escape.json', 'apps//export.json', ' apps/export.json', 'apps/export.toml']) {
    assert.throws(() => loadMemoStream(config, { exportPath: value }));
  }
  await rm(fixture.pluginPath);
  await symlink('missing.toml', fixture.pluginPath);
  assert.throws(() => loadSiteConfig(fixture.configPath), /memo configuration/u);
  await rm(fixture.pluginPath);
  await mkdir(fixture.pluginPath);
  assert.throws(() => loadSiteConfig(fixture.configPath), /memo configuration/u);
  const outside = await mkdtemp(path.join(os.tmpdir(), 'memo-outside-'));
  context.after(() => rm(outside, { recursive: true, force: true }));
  await symlink(outside, path.join(root, 'outside'));
  assert.throws(() => loadMemoStream(config, { exportPath: `${path.relative(repositoryRoot, root)}/outside/memos.json` }));
});
