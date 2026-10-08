import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { buildMemoFixture, prepareMemoDocumentSources } from '../scripts/prepare-memos-fixture.mjs';
import { prepareMemoFixture, repositoryRoot } from './memos-fixture.mjs';
import { readPluginAccess } from '../../../plugins/public-access-files.mjs';
async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(root, entry.name), relative)); else result.push(relative);
  }
  return result;
}
test('Memo-only workspace publishes projected full routes and referenced assets with compact home', async (context) => {
  const parent = path.join(repositoryRoot, '.firefly/memos');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'integrated-build-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root, { enabled: false });
  const sourceRoot = await prepareMemoDocumentSources(root);
  await rm(path.join(sourceRoot, 'posts/start.md'));
  const output = path.join(root, 'output');
  const result = buildMemoFixture({ ...fixture, sourceRoot }, output);
  assert.equal(result.status, 0, result.stdout + result.stderr);
  const inventory = await files(output);
  assert.equal(inventory.filter((item) => /^pages\/memos\/m_[^/]+\/index.html$/u.test(item)).length, 20);
  assert.deepEqual(inventory.filter((item) => item.startsWith('pages/memos/assets/')).sort(), ['pages/memos/assets/pixel.png', 'pages/memos/assets/图像.png']);
  const feed = await readFile(path.join(output, 'pages/memos/index.html'), 'utf8');
  const home = await readFile(path.join(output, 'index.html'), 'utf8');
  assert.match(feed, /id="m_fixture_middle"/u);
  assert.doesNotMatch(home, /data-memo-entry|A brief entry, fully readable|MemoTimeline/u);
  assert.match(home, /Open the Memo timeline/u);
  for (const filename of inventory.filter((item) => /\.(?:html|js|json|xml)$/u.test(item))) {
    const text = await readFile(path.join(output, filename), 'utf8');
    assert.doesNotMatch(text, /MEMO_FIXTURE_PRIVATE_INPUT|m_fixture_private|m_fixture_draft/u);
  }
  assert.match(await readFile(path.join(output, 'posts/index.html'), 'utf8'), /No public documents/u);
});
test('deprecated Memo flags do not control integrated document routes with optional Memo sources absent', async (context) => {
  const parent = path.join(repositoryRoot, '.firefly/memos');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'blog-build-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  for (const enabled of [true, false]) {
    const fixture = await prepareMemoFixture(root, { enabled });
    await writeFile(fixture.pluginPath, 'unusable TOML MEMO_FIXTURE_PRIVATE_INPUT');
    const output = path.join(root, enabled ? 'enabled' : 'disabled');
    const result = buildMemoFixture(fixture, output, { FIREFLY_MEMOS_EXPORT: '/missing/legacy/export.json' });
    assert.equal(result.status, 0, `${result.stdout}\n${result.stderr}`);
    const inventory = await files(output);
    assert.deepEqual(await readPluginAccess(output), { schemaVersion: 2, plugins: { comments: { enabled: false } } });
    assert.deepEqual(inventory.filter((file) => file.toLowerCase().startsWith('memos/')), ['memos/index.html']);
    await access(path.join(output, 'pages/memos/index.html'));
    const home = await readFile(path.join(output, 'index.html'), 'utf8');
    const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
    assert.equal(home.includes('href="/memos/"'), false);
    assert.equal(home.includes('href="/pages/memos/"'), true);
    assert.equal(sitemap.includes('https://site.fixture.invalid/pages/memos/'), true);
    for (const file of inventory.filter((item) => /\.(html|js|css|json|xml)$/u.test(item))) assert.ok(!(await readFile(path.join(output, file), 'utf8')).includes('MEMO_FIXTURE_PRIVATE_INPUT'));
  }
});
test('a warm build withdraws the last Memo and post without retaining cached public records', async (context) => {
  const parent = path.join(repositoryRoot, '.firefly/memos');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'warm-withdrawal-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root, { enabled: false });
  const sourceRoot = await prepareMemoDocumentSources(root, { mode: 'single' });
  await writeFile(path.join(sourceRoot, 'memos/assets/retained.png'), Buffer.from([1, 2, 3]));
  const selected = { ...fixture, sourceRoot };
  const output = path.join(root, 'output');
  const before = buildMemoFixture(selected, output);
  assert.equal(before.status, 0, before.stdout + before.stderr);
  const priorDetails = (await files(output)).filter((name) => /^pages\/memos\/m_[^/]+\/index\.html$/u.test(name));
  assert.equal(priorDetails.length, 1);
  await access(path.join(output, 'posts/start/index.html'));
  await rm(path.join(sourceRoot, 'memos/recent.md'));
  await rm(path.join(sourceRoot, 'posts/start.md'));
  const after = buildMemoFixture(selected, output, {}, { force: false });
  assert.equal(after.status, 0, after.stdout + after.stderr);
  const inventory = await files(output);
  assert.deepEqual(inventory.filter((name) => /^pages\/memos\/m_[^/]+\/index\.html$/u.test(name)), []);
  assert.equal(inventory.includes('posts/start/index.html'), false);
  await access(path.join(sourceRoot, 'memos/assets/retained.png'));
  assert.equal(inventory.some((name) => name.startsWith('pages/memos/assets/')), false);
  assert.match(await readFile(path.join(output, 'pages/memos/index.html'), 'utf8'), /No Memo entries have been published yet/u);
  assert.match(await readFile(path.join(output, 'posts/index.html'), 'utf8'), /No public documents/u);
  const compatibility = await readFile(path.join(output, 'memos/index.html'), 'utf8');
  assert.doesNotMatch(compatibility, /m_fixture_recent/u);
});
test('plugin public routes and activation artifact namespaces stay reserved while disabled', async (context) => {
  const parent = path.join(repositoryRoot, '.firefly/memos');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'route-reservation-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root, { enabled: false });
  const content = path.join(root, 'blog-source');
  await mkdir(path.join(content, 'pages'), { recursive: true });
  await mkdir(path.join(content, 'posts'), { recursive: true });
  for (const route of ['/memos/', '/MEMOS/assets/', '/v1/comments/', '/v1/comments/admin/', '/plugin-access/', '/plugins.public.v1.json/', '/plugins.public.v2.json/', '/pages/memos/m_fixture_collision/']) {
    await writeFile(path.join(content, 'pages/collision.md'), `---\ntitle: Route collision\nslug: collision\ndate: 2026-10-06\ndescription: Reserved route fixture.\ndraft: false\nlayout: page\naliases:\n  - ${route}\n---\nSynthetic collision.\n`);
    const result = buildMemoFixture(fixture, path.join(root, 'collision'), { FIREFLY_CONTENT_ROOT: content });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Route collision (?:between (?:legacy Memo namespace|comments public namespace|plugin activation artifact namespace) and alias|with reserved Memo namespace: alias)/u);
  }
});
