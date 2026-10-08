import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { writePluginAccess } from '../../../plugins/public-access-files.mjs';
import { createPluginAccessIntegration } from '../src/build/plugin-access.mjs';
import { createMemoFixtureServer } from '../scripts/serve-memos-fixture.mjs';
import { prepareMemoFixture, repositoryRoot } from './memos-fixture.mjs';
import { loadSiteConfig } from '../src/lib/site-config.mjs';
import { pathToFileURL } from 'node:url';

const integrated = (comments = false) => ({ schemaVersion: 2, plugins: { comments: { enabled: comments } } });
const state = (comments = false, memos = false) => ({ schemaVersion: 1, plugins: { comments: { enabled: comments }, memos: { enabled: memos } } });
async function fixture(context) {
  const parent = path.join(repositoryRoot, '.firefly/plugin-access-tests');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'fixture-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  return root;
}

test('site producer uses the supplied frozen selected configuration and removes stale markers', async (context) => {
  const root = await fixture(context);
  await writePluginAccess(root, integrated(true));
  for (const enabled of [true, false, true]) {
    const selected = await prepareMemoFixture(root, { enabled });
    const config = loadSiteConfig(selected.configPath);
    const hook = createPluginAccessIntegration(config).hooks['astro:build:done'];
    await hook({ dir: pathToFileURL(`${root}/`) });
    const snapshot = JSON.parse(await readFile(path.join(root, 'plugins.public.v2.json'), 'utf8'));
    assert.deepEqual(snapshot, integrated());
    await assert.rejects(readFile(path.join(root, 'plugin-access/memos.enabled'), 'utf8'), { code: 'ENOENT' });
    await assert.rejects(readFile(path.join(root, 'plugins.public.v1.json'), 'utf8'), { code: 'ENOENT' });
  }
});

test('retained Memo content remains gated across all four states, before redirects and methods', async (context) => {
  const root = await fixture(context);
  const blog = path.join(root, 'blog');
  await mkdir(path.join(root, 'memo/public/assets'), { recursive: true });
  await mkdir(blog);
  await writeFile(path.join(blog, 'index.html'), '<h1>Ordinary blog</h1>');
  await writeFile(path.join(root, 'memo/public/index.html'), '<h1>Retained Memo</h1>');
  await writeFile(path.join(root, 'memo/public/memos.public.v2.json'), '{"retained":true}');
  await writeFile(path.join(root, 'memo/public/assets/style.css'), 'body {}');
  await writeFile(path.join(root, 'memo/receipt.json'), 'private history retained');
  const server = createMemoFixtureServer(blog, path.join(root, 'memo'));
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  context.after(() => new Promise((resolve) => server.close(resolve)));
  const origin = `http://127.0.0.1:${server.address().port}`;
  for (const [comments, memos] of [[false, false], [true, true], [true, false], [false, true], [false, false], [true, true]]) {
    await writePluginAccess(blog, state(comments, memos));
    for (const route of ['/memos', '/memos/', '//memos/', '/memos/index.html', '/memos/memos.public.v2.json', '/memos/assets/style.css', '/%6demos/assets/style.css']) {
      for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS']) {
        const response = await fetch(origin + route, { method, redirect: 'manual' });
        const expected = !memos ? 404 : !['GET', 'HEAD'].includes(method) ? 405 : route === '/memos' ? 301 : 200;
        assert.equal(response.status, expected, `${comments}/${memos} ${method} ${route}`);
        if (!memos) assert.equal(response.headers.get('cache-control'), 'no-cache, no-store');
        await response.arrayBuffer();
      }
    }
    if (!comments) for (const route of ['/v1/comments', '/v1/comments/submissions', '/v1/comments/admin/export']) {
      for (const method of ['GET', 'POST', 'OPTIONS']) {
        const response = await fetch(origin + route, { method });
        assert.equal(response.status, 404);
        await response.arrayBuffer();
      }
    }
    assert.equal(await (await fetch(origin)).text(), '<h1>Ordinary blog</h1>');
    assert.equal(await readFile(path.join(root, 'memo/receipt.json'), 'utf8'), 'private history retained');
  }
  await rm(path.join(blog, 'plugins.public.v1.json'));
  assert.equal((await fetch(`${origin}/memos`, { redirect: 'manual' })).status, 404);
});

test('CLI checks a release independently and compares selected flags before no-build sync', async (context) => {
  const root = await fixture(context);
  const selected = await prepareMemoFixture(root, { enabled: true });
  const release = path.join(root, 'release');
  await mkdir(release);
  await writePluginAccess(release, integrated());
  const cli = path.join(repositoryRoot, 'apps/site/scripts/plugin-access.mjs');
  const env = { ...process.env, FIREFLY_SITE_CONFIG_PATH: selected.configRelative };
  const run = (args, overrides = {}) => spawnSync(process.execPath, [cli, ...args], { cwd: root, env: { ...env, ...overrides }, encoding: 'utf8' });
  for (const args of [['current'], ['check', '--release-root', release], ['compare', '--release-root', path.relative(repositoryRoot, release)]]) {
    const result = run(args);
    assert.equal(result.status, 0, result.stderr);
    assert.deepEqual(JSON.parse(result.stdout), integrated());
  }
  const independent = run(['check', '--release-root', release], { FIREFLY_SITE_CONFIG_PATH: 'config/absent.toml' });
  assert.equal(independent.status, 0, independent.stderr);
  await prepareMemoFixture(root, { enabled: false });
  assert.equal(run(['compare', '--release-root', release]).status, 0, 'Deprecated Memo flag has no new release effect.');
  await writePluginAccess(release, integrated(true));
  const stale = run(['compare', '--release-root', release]);
  assert.notEqual(stale.status, 0);
  assert.equal(stale.stdout, '');
  assert.match(stale.stderr, /without --no-build/u);
  const retainedRoot = path.join(root, 'retained-v1');
  await mkdir(retainedRoot);
  await writePluginAccess(retainedRoot, state(false, true));
  const retained = run(['check', '--release-root', retainedRoot]);
  assert.equal(retained.status, 0);
  assert.deepEqual(JSON.parse(retained.stdout), state(false, true));
  assert.notEqual(run(['compare', '--release-root', retainedRoot]).status, 0, 'Retained v1 ownership cannot be reinterpreted as integrated.');
  for (const args of [['current', '--release-root', release], ['check', '--expected-comments-origin', 'https://site.fixture.invalid'], ['compare', '--release-root'], ['current', '--unknown', 'value']]) assert.notEqual(run(args).status, 0);
});

test('CLI blocks enabled comments outside the owner managed origin while false needs no runtime', async (context) => {
  const root = await fixture(context);
  const selected = await prepareMemoFixture(root, { enabled: false });
  await mkdir(path.join(root, 'config/plugins/comments'), { recursive: true });
  await writeFile(path.join(root, 'config/plugins/comments/config.toml'), '[public]\nwriteOrigin = "https://comments.fixture.invalid"\nexportPath = "artifacts/comments/comments.public.v1.json"\nconsentVersion = "fixture-v1"\n');
  const source = await readFile(selected.configPath, 'utf8');
  await writeFile(selected.configPath, source.replace(/(\[plugins\.comments\][\s\S]*?enabled = )false/u, '$1true'));
  const cli = path.join(repositoryRoot, 'apps/site/scripts/plugin-access.mjs');
  const run = (origin) => spawnSync(process.execPath, [cli, 'current', '--expected-comments-origin', origin], { cwd: root, env: { ...process.env, FIREFLY_SITE_CONFIG_PATH: selected.configRelative }, encoding: 'utf8' });
  assert.equal(run('https://comments.fixture.invalid').status, 0);
  const mismatch = run('https://site.fixture.invalid');
  assert.notEqual(mismatch.status, 0);
  assert.equal(mismatch.stdout, '');
  assert.match(mismatch.stderr, /outside this managed deployment/u);
  assert.notEqual(run('http://comments.fixture.invalid').status, 0);
  await writeFile(selected.configPath, source);
  assert.equal(run('https://site.fixture.invalid').status, 0);
});
