import assert from 'node:assert/strict';
import { mkdtemp, mkdir, readFile, writeFile, symlink, rm } from 'node:fs/promises';
import path from 'node:path';
import os from 'node:os';
import test from 'node:test';
import { memoSchema, postSchema } from '../src/lib/content-schema.mjs';
import { createMemoTimeIndex, nearestMemo } from '../src/lib/memo-time.mjs';
import { memoPreview } from '../src/build/memo-markdown.mjs';
import { memoAssetReferences, normalizeMemoAssetPath, publishMemoAssets } from '../src/build/memo-assets.mjs';
import { materializeContentWorkspace } from '../scripts/materialize-content.mjs';
import { resolveDocumentNavigation } from '../src/lib/document-navigation-composition.ts';
import { resolveDocumentContext } from '../src/lib/x-core-context.ts';
import { projectCanonicalRoute } from '../src/lib/canonical-route.mjs';

const minimal = { id: 'm_example', date: '2026-06-01T00:00:00.000Z', draft: false };
test('owned assets follow parsed public references, preserving encoded Unicode destinations', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-assets-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const output = path.join(root, 'output');
  const assets = path.join(root, 'assets');
  await mkdir(output); await mkdir(assets);
  await writeFile(path.join(assets, '图像.png'), 'synthetic image bytes');
  await writeFile(path.join(assets, '图像 two.png'), 'spaced image bytes');
  const html = '<img src="/pages/memos/assets/%E5%9B%BE%E5%83%8F.png"><img src="/pages/memos/assets/%E5%9B%BE%E5%83%8F%20two.png"><pre><code>src=&quot;/pages/memos/assets/private.png&quot;</code></pre>';
  assert.deepEqual([...memoAssetReferences(html)], ['图像.png', '图像 two.png']);
  assert.equal(normalizeMemoAssetPath('%E5%9B%BE%E5%83%8F.png'), '图像.png');
  assert.equal(normalizeMemoAssetPath('%E5%9B%BE%E5%83%8F%20two.png'), '图像 two.png');
  for (const unsafe of ['..%2fprivate.png', '%252e.png', '../private.png', 'a%00.png', 'a%7f.png', 'a%09.png']) assert.throws(() => normalizeMemoAssetPath(unsafe));
  await writeFile(path.join(output, 'index.html'), html);
  assert.deepEqual([...await publishMemoAssets(output, assets)], ['图像.png', '图像 two.png']);
  assert.equal(await readFile(path.join(output, 'pages/memos/assets/图像.png'), 'utf8'), 'synthetic image bytes');
  assert.equal(await readFile(path.join(output, 'pages/memos/assets/图像 two.png'), 'utf8'), 'spaced image bytes');
});
test('minimal Memo metadata shares policy and chronology without weakening ordinary articles', () => {
  const data = memoSchema.parse(minimal);
  assert.equal(data.title, undefined);
  assert.equal(data.description, undefined);
  assert.equal(data.layout, 'memo');
  assert.equal(data.presentation, 'memo');
  assert.deepEqual(data.access, { visibility: 'public' });
  assert.equal(postSchema.safeParse({ ...minimal, layout: 'post' }).success, false);
  for (const override of [{ draft: 'false' }, { id: '3' }, { date: 'invalid' }, { updated: '2025-01-01' }, { displayName: 'Owner' }, { access: { visibility: 'private' } }, { presentation: 'semantic' }]) assert.equal(memoSchema.safeParse({ ...minimal, ...override }).success, false);
  assert.deepEqual(memoSchema.parse({ ...minimal, firefly: { markers: ['featured', 'featured'] } }).firefly.markers, ['featured']);
  assert.deepEqual(resolveDocumentNavigation('memo', {}), { kind: 'none' });
  assert.throws(() => resolveDocumentNavigation('memo', { documentNavigation: { memo: { navigator: 'document-navigator' } } }), /native time navigation/u);
});

test('Memo routes/context derive stable opaque ID independently of filenames', () => {
  assert.equal(projectCanonicalRoute({ collection: 'memos', slug: 'm_example', relativePath: 'other.md' }), '/pages/memos/m_example/');
  assert.throws(() => projectCanonicalRoute({ collection: 'memos', slug: '../secret' }));
  const resolved = resolveDocumentContext({ path: '/app/apps/site/.generated-content/memos/other.md', data: { astro: { frontmatter: { ...minimal, layout: 'memo', presentation: 'memo' } } } });
  assert.equal(resolved.documentId, 'memos/other.md');
  assert.equal(resolved.route, '/pages/memos/m_example/');
  assert.equal(resolved.collection, 'memos');
});

test('time mapping gives occupied months equal space independently of counts/gaps', () => {
  const index = createMemoTimeIndex([
    { id: 'm_june_b', date: '2026-06-01T00:00:00Z' }, { id: 'm_june_a', date: '2026-06-01T00:00:00Z' },
    { id: 'm_old', date: '2022-03-01T00:00:00Z' }, { id: 'm_may', date: '2026-05-31T16:00:00Z' }
  ]);
  assert.deepEqual(index.months.map(({ key }) => key), ['2026-06', '2022-03']);
  assert.deepEqual(index.entries.map(({ id }) => id), ['m_june_a', 'm_june_b', 'm_may', 'm_old']);
  assert.deepEqual(index.months.map(({ start, end }) => end - start), [0.5, 0.5]);
  assert.equal(nearestMemo(index, -100), 0);
  assert.equal(nearestMemo(index, 100), 3);
  assert.equal(nearestMemo(createMemoTimeIndex([]), 0), -1);
  assert.equal(nearestMemo(createMemoTimeIndex([{ id: 'm_only', date: '2024-01-01' }]), 0.9), 0);
  assert.throws(() => createMemoTimeIndex([{ id: 'm_same', date: '2024-01-01' }, { id: 'm_same', date: '2025-01-01' }]), /Duplicate/u);
});

test('preview clips sanitized AST into balanced HTML and scopes footnote identities', () => {
  const tree = { type: 'root', children: [{ type: 'element', tagName: 'p', properties: { id: 'note' }, children: [{ type: 'element', tagName: 'a', properties: { href: '#target' }, children: [{ type: 'text', value: '😀'.repeat(600) }] }] }] };
  const result = memoPreview(tree, 'm_example', '/pages/memos/m_example/');
  assert.equal(result.truncated, true);
  assert.match(result.html, /id="m_example--note"/u);
  assert.match(result.html, /href="\/pages\/memos\/m_example\/#target"/u);
  assert.match(result.html, /<\/a><\/p>$/u);
  assert.equal([...result.html.match(/>(😀+)</u)[1]].length, 500);
  assert.equal(tree.children[0].properties.id, 'note');
});

test('preview bounds logical code lines across highlighting spans without editing the body', () => {
  const code = Array.from({ length: 30 }, (_, index) => 'line ' + (index + 1)).join('\n');
  const tree = { type: 'root', children: [{ type: 'element', tagName: 'pre', properties: {}, children: [{ type: 'element', tagName: 'code', properties: {}, children: [
    { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: code }] },
    { type: 'element', tagName: 'span', properties: {}, children: [{ type: 'text', value: 'hidden following token' }] }
  ] }] }] };
  const result = memoPreview(tree, 'm_lines', '/pages/memos/m_lines/');
  assert.equal(result.truncated, true);
  assert.match(result.html, /line 12<\/span><\/code><\/pre>$/u);
  assert.doesNotMatch(result.html, /line 13|hidden following token/u);
  assert.equal(tree.children[0].children[0].children[0].children[0].value, code);
  const media = memoPreview({ type: 'root', children: [
    { type: 'element', tagName: 'p', properties: {}, children: [{ type: 'text', value: 'a'.repeat(500) }] },
    { type: 'element', tagName: 'img', properties: { src: '/pages/memos/assets/pixel.png' }, children: [] }
  ] }, 'm_media', '/pages/memos/m_media/');
  assert.equal(media.truncated, true, 'Omitted media still needs a full-entry affordance.');
});

test('optional Memo root, generated aggregate, byte-preserved body and asset isolation', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-memo-documents-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const source = path.join(root, 'source');
  const target = path.join(root, 'stage');
  await mkdir(path.join(source, 'posts'), { recursive: true });
  await mkdir(path.join(source, 'pages'), { recursive: true });
  assert.deepEqual((await materializeContentWorkspace({ sourceRoot: source, targetRoot: target })).memos, []);
  assert.match(await readFile(path.join(target, 'pages/memos.md'), 'utf8'), /layout: timeline\npresentation: memo/u);
  await mkdir(path.join(source, 'memos/assets'), { recursive: true });
  const body = 'verse first\r\nverse second\u200b\r\n\r\n    indented code\r\n';
  const sourceMarkdown = '---\nid: m_example\ndate: 2026-06-01T00:00:00.000Z\ndraft: false\n---\n' + body;
  await writeFile(path.join(source, 'memos/one.md'), sourceMarkdown);
  await writeFile(path.join(source, 'memos/assets/pixel.png'), Buffer.from([1, 2, 3]));
  await writeFile(path.join(source, 'memos/assets/图像 two.png'), Buffer.from([4, 5, 6]));
  await materializeContentWorkspace({ sourceRoot: source, targetRoot: target });
  assert.deepEqual(await readFile(path.join(target, 'memos/assets/图像 two.png')), Buffer.from([4, 5, 6]));
  const staged = await readFile(path.join(target, 'memos/one.md'), 'utf8');
  assert.equal(staged.slice(staged.indexOf('---\n', 4) + 4), body);
  assert.equal(await readFile(path.join(source, 'memos/one.md'), 'utf8'), sourceMarkdown);
  await writeFile(path.join(source, 'memos/two.md'), sourceMarkdown);
  await assert.rejects(materializeContentWorkspace({ sourceRoot: source, targetRoot: target }), /Duplicate Memo ID/u);
  await rm(path.join(source, 'memos/two.md'));
  await symlink(path.join(root, 'external.png'), path.join(source, 'memos/assets/escape.png'));
  await writeFile(path.join(root, 'external.png'), 'external');
  await assert.rejects(materializeContentWorkspace({ sourceRoot: source, targetRoot: target }), /not Markdown|Unsafe Memo asset/u);
});
