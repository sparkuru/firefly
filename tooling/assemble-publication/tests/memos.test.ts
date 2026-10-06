import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { assemblePublication } from '../src/index.js';
import { decodeMemoMetadata } from '../src/plugins/memos.js';
const discovery = Object.freeze({ manifests: Object.freeze([]), catalog: Object.freeze([]) });
async function fixture(t: test.TestContext) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-blog-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const site = path.join(root, 'apps/site/dist');
  await mkdir(path.join(site, 'lab'), { recursive: true });
  for (const file of ['index.html', '404.html', 'lab/index.html']) await writeFile(path.join(site, file), '<h1>Static blog</h1>');
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
