import assert from 'node:assert/strict';
import { access, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import path from 'node:path';
import test from 'node:test';
import { buildMemoFixture } from '../scripts/prepare-memos-fixture.mjs';
import { prepareMemoFixture, repositoryRoot } from './memos-fixture.mjs';
async function files(root, prefix = '') {
  const result = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) result.push(...await files(path.join(root, entry.name), relative)); else result.push(relative);
  }
  return result;
}
test('blog enabled and disabled builds have discovery only with Memo inputs unavailable', async (context) => {
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
    assert.ok(!inventory.some((file) => file.toLowerCase().startsWith('memos/')));
    await assert.rejects(access(path.join(output, 'memos/index.html')));
    const home = await readFile(path.join(output, 'index.html'), 'utf8');
    const sitemap = await readFile(path.join(output, 'sitemap.xml'), 'utf8');
    assert.equal(home.includes('href="/memos/"'), enabled);
    assert.equal(sitemap.includes('https://site.fixture.invalid/memos/'), enabled);
    for (const file of inventory.filter((item) => /\.(html|js|css|json|xml)$/u.test(item))) assert.ok(!(await readFile(path.join(output, file), 'utf8')).includes('MEMO_FIXTURE_PRIVATE_INPUT'));
  }
});
test('the complete independent Memo namespace stays reserved while discovery is hidden', async (context) => {
  const parent = path.join(repositoryRoot, '.firefly/memos');
  await mkdir(parent, { recursive: true });
  const root = await mkdtemp(path.join(parent, 'route-reservation-'));
  context.after(() => rm(root, { recursive: true, force: true }));
  const fixture = await prepareMemoFixture(root, { enabled: false });
  const content = path.join(root, 'blog-source');
  await mkdir(path.join(content, 'pages'), { recursive: true });
  await mkdir(path.join(content, 'posts'), { recursive: true });
  for (const route of ['/memos/', '/MEMOS/assets/']) {
    await writeFile(path.join(content, 'pages/collision.md'), `---\ntitle: Route collision\nslug: collision\ndate: 2026-10-06\ndescription: Reserved route fixture.\ndraft: false\nlayout: page\naliases:\n  - ${route}\n---\nSynthetic collision.\n`);
    const result = buildMemoFixture(fixture, path.join(root, 'collision'), { FIREFLY_CONTENT_ROOT: content });
    assert.notEqual(result.status, 0);
    assert.match(`${result.stdout}${result.stderr}`, /Route collision between independent Memo namespace and alias/u);
  }
});
