import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { writeAccess } from './access-fixture.js';
import { assemblePublication } from '../src/index.js';
import { decodeMemoMetadata } from '../src/plugins/memos.js';
import { publicationContractRoot } from '../src/plugins/memos.js';
import { pathToFileURL } from 'node:url';
const { writePluginAccess } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access-files.mjs')).href) as typeof import('../../../plugins/public-access-files.mjs');
const discovery = Object.freeze({ manifests: Object.freeze([]), catalog: Object.freeze([]) });
async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-blog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'apps/site/dist');
  await mkdir(path.join(site, 'lab'), { recursive: true });
  for (const file of ['index.html', '404.html', 'lab/index.html']) await writeFile(path.join(site, file), '<h1>Static blog</h1>');
  await writeAccess(site, { comments: false, memos: false });
  return { root, site, assemble: () => assemblePublication({ repositoryRoot: root, discovery }) };
}
test('blog assembly needs no Memo config/export and retains legacy floor as migration evidence', async (t) => {
  const f = await fixture(t);
  const first = await f.assemble();
  const manifest = JSON.parse(await readFile(path.join(f.root, 'artifacts/publication.json'), 'utf8'));
  manifest.memos = { enabled: true, schemaVersion: 1, sourceRevision: 'legacy', generatedAt: '2026-10-06T00:00:00.000Z', digest: 'a'.repeat(64), tombstoneEpoch: 7 };
  await writeFile(path.join(f.root, 'artifacts/publication.json'), JSON.stringify(manifest));
  const result = await f.assemble();
  assert.equal(result.memos.enabled, false);
  assert.equal(result.memos.tombstoneEpoch, 7);
  assert.deepEqual(result.inventory, first.inventory);
  assert.equal((await f.assemble()).memos.tombstoneEpoch, 7);
});
test('blog assembly rejects missing/corrupt/unsafe established legacy history', async (t) => {
  for (const kind of ['missing', 'corrupt', 'symlink']) {
    const f = await fixture(t);
    await f.assemble();
    const manifest = path.join(f.root, 'artifacts/publication.json');
    if (kind === 'missing') await rm(manifest);
    if (kind === 'corrupt') await writeFile(manifest, '{');
    if (kind === 'symlink') { await rm(manifest); await writeFile(path.join(f.root, 'outside.json'), '{}'); await symlink('../outside.json', manifest); }
    const priorBlog = await readFile(path.join(f.root, 'dist/index.html'));
    await assert.rejects(f.assemble());
    assert.deepEqual(await readFile(path.join(f.root, 'dist/index.html')), priorBlog);
  }
});
test('blog cannot own Memo output or retired stream markup', async (t) => {
  for (const file of ['memos/index.html', 'MEMOS/assets/index.html', '%6demos/index.html', 'ｍｅｍｏｓ/index.html', 'other.html']) {
    const f = await fixture(t);
    await mkdir(path.dirname(path.join(f.site, file)), { recursive: true });
    await writeFile(path.join(f.site, file), file === 'other.html' ? '<section class="memo-stream">Retired</section>' : '<h1>Collision</h1>');
    await assert.rejects(f.assemble(), /Memo namespace|retired Memo/u);
  }
});
test('legacy metadata refuses reset or malformed retained floors', () => {
  const base = { enabled: false, schemaVersion: 1, sourceRevision: 'empty', generatedAt: '1970-01-01T00:00:00.000Z', digest: null, tombstoneEpoch: 8 };
  assert.equal(decodeMemoMetadata(base).tombstoneEpoch, 8);
  for (const bad of [-1, -0, NaN, '8']) assert.throws(() => decodeMemoMetadata({ ...base, tombstoneEpoch: bad }));
});

test('integrated release inventories timeline/detail/assets and site compatibility together', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.site, 'plugins.public.v1.json'));
  await writePluginAccess(f.site, { schemaVersion: 2, plugins: { comments: { enabled: false } } });
  for (const [file, body] of [
    ['memos/index.html', '<a href="/pages/memos/">Memo</a>'],
    ['pages/memos/index.html', '<section data-memo-timeline>Timeline</section>'],
    ['pages/memos/m_fixture_entry/index.html', '<article data-memo-entry>Authored /home/fixture/example remains text.</article>'],
    ['pages/memos/assets/pixel.svg', '<svg xmlns="http://www.w3.org/2000/svg"></svg>']
  ]) {
    await mkdir(path.dirname(path.join(f.site, file!)), { recursive: true });
    await writeFile(path.join(f.site, file!), body!);
  }
  const result = await f.assemble();
  assert.equal(result.pluginAccess.schemaVersion, 2);
  assert.ok(result.inventory.includes('pages/memos/m_fixture_entry/index.html'));
  assert.ok(result.inventory.includes('pages/memos/assets/pixel.svg'));
  assert.ok(result.inventory.includes('plugins.public.v2.json'));
  assert.ok(!result.inventory.some((file) => file === 'plugin-access/memos.enabled'));
  const first = await readFile(path.join(f.root, 'dist/pages/memos/m_fixture_entry/index.html'));
  await f.assemble();
  assert.deepEqual(await readFile(path.join(f.root, 'dist/pages/memos/m_fixture_entry/index.html')), first);
  await writeFile(path.join(f.site, 'memos/memos.public.v2.json'), '{}');
  await assert.rejects(f.assemble(), /compatibility namespace/u);
});

test('integrated routes reject parsed retired submission surfaces without rejecting explanatory prose', async (t) => {
  const f = await fixture(t);
  await rm(path.join(f.site, 'plugins.public.v1.json'));
  await writePluginAccess(f.site, { schemaVersion: 2, plugins: { comments: { enabled: false } } });
  const file = path.join(f.site, 'pages/memos/index.html');
  await mkdir(path.dirname(file), { recursive: true });
  for (const html of [
    '<FORM CLASS = "memo-submission">Retired</FORM>',
    '<div class="card memo&#45;submission">Retired</div>',
    '<template><div DATA-MEMO-SUBMISSION = "true">Retired</div></template>',
    '<div data-memos-submission-form>Retired</div>'
  ]) {
    await writeFile(file, html);
    await assert.rejects(f.assemble(), /submission surface is forbidden/u);
  }
  await writeFile(file, '<p>data-memo-submission and memo-submission are retired labels.</p>');
  await f.assemble();
});
