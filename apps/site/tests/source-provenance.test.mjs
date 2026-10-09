import assert from 'node:assert/strict';
import { mkdir, mkdtemp, readFile, rm, symlink, utimes, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { materializeContentWorkspace } from '../scripts/materialize-content.mjs';
import { readSourceProvenance, SOURCE_PROVENANCE_FILENAME } from '../src/lib/source-provenance.mjs';

async function fixture(t) {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-provenance-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'content');
  const targetRoot = path.join(root, 'stage');
  await mkdir(path.join(sourceRoot, 'posts'), { recursive: true });
  await mkdir(path.join(sourceRoot, 'pages'), { recursive: true });
  return { root, sourceRoot, targetRoot };
}

test('provenance preserves full authored UTF-8 bytes across normalization and linked identity', async t => {
  const { root, sourceRoot, targetRoot } = await fixture(t);
  const bytes = Buffer.from('\uFEFF---\r\ntitle: Unicode\r\n---\r\n# 中文 😀\r\n', 'utf8');
  const external = path.join(root, 'linked.md');
  await writeFile(external, bytes);
  await symlink(external, path.join(sourceRoot, 'posts/virtual.md'));
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  assert.deepEqual(await readSourceProvenance('posts', 'virtual.md', { root: targetRoot }), {
    kind: 'authored', sourceByteLength: bytes.length
  });
  assert.notEqual((await readFile(path.join(targetRoot, 'posts/virtual.md'))).length, bytes.length);
  const sidecar = await readFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), 'utf8');
  assert.doesNotMatch(sidecar, new RegExp(root));
  const generated = await readSourceProvenance('pages', 'memos.md', { root: targetRoot });
  assert.equal(generated.kind, 'generated');
  assert.equal(generated.sourceByteLength, (await readFile(path.join(targetRoot, 'pages/memos.md'))).length);
});

test('fresh provenance changes with original bytes even when staged Markdown is unchanged', async t => {
  const { root, sourceRoot, targetRoot } = await fixture(t);
  const source = path.join(sourceRoot, 'posts/same.md');
  const first = '## 中文 😀\n';
  const second = `---\n---\n${first}`;
  const fixed = new Date('2026-01-01T00:00:00Z');
  await writeFile(source, first);
  await utimes(source, fixed, fixed);
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  const staged = await readFile(path.join(targetRoot, 'posts/same.md'), 'utf8');
  assert.equal((await readSourceProvenance('posts', 'same.md', { root: targetRoot })).sourceByteLength, Buffer.byteLength(first));
  await writeFile(source, second);
  await utimes(source, fixed, fixed);
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  assert.equal(await readFile(path.join(targetRoot, 'posts/same.md'), 'utf8'), staged);
  assert.equal((await readSourceProvenance('posts', 'same.md', { root: targetRoot })).sourceByteLength, Buffer.byteLength(second));
  const priorProvenance = await readFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME));
  const rejected = `${second}\nA different candidate with additional 中文 bytes.\n`;
  await writeFile(source, rejected);
  await assert.rejects(materializeContentWorkspace({ sourceRoot, targetRoot, beforePromote: () => { throw new Error('fixture promotion failure'); } }));
  assert.equal(await readFile(path.join(targetRoot, 'posts/same.md'), 'utf8'), staged);
  assert.deepEqual(await readFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME)), priorProvenance);
  assert.equal((await readSourceProvenance('posts', 'same.md', { root: targetRoot })).sourceByteLength, Buffer.byteLength(second));
  assert.equal(await readFile(source, 'utf8'), rejected);
  const outside = path.join(root, 'outside.md');
  await writeFile(outside, 'Not a scanned source.\n');
  await assert.rejects(materializeContentWorkspace({ sourceRoot, targetRoot, beforeCopy: async () => {
    await rm(source);
    await symlink(outside, source);
  } }), /source changed during materialization/iu);
  assert.equal(await readFile(path.join(targetRoot, 'posts/same.md'), 'utf8'), staged);
  assert.deepEqual(await readFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME)), priorProvenance);
  await rm(source);
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  await assert.rejects(readSourceProvenance('posts', 'same.md', { root: targetRoot }), /Missing.*record/u);
  assert.deepEqual(JSON.parse(await readFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), 'utf8')).records, {});
  await assert.rejects(readFile(path.join(targetRoot, 'posts/same.md')), /ENOENT/u);
});

test('authored aggregate and Memo source retain their original bytes rather than generated or transformed sizes', async t => {
  const { sourceRoot, targetRoot } = await fixture(t);
  const aggregate = Buffer.from('---\ntitle: Authored Memo index\ndescription: Synthetic aggregate\ndate: 2026-01-01\ndraft: false\nlayout: timeline\npresentation: memo\n---\n# 中文 aggregate 😀\n');
  const memo = Buffer.from('---\nid: m_provenance\ndate: 2026-01-01T00:00:00Z\ndraft: false\n---\n# Original Memo 中文 😀\n');
  await mkdir(path.join(sourceRoot, 'memos'));
  await writeFile(path.join(sourceRoot, 'pages/memos.md'), aggregate);
  await writeFile(path.join(sourceRoot, 'memos/original.md'), memo);
  await materializeContentWorkspace({ sourceRoot, targetRoot });
  assert.deepEqual(await readSourceProvenance('pages', 'memos.md', { root: targetRoot }), { kind: 'authored', sourceByteLength: aggregate.length });
  assert.deepEqual(await readSourceProvenance('memos', 'original.md', { root: targetRoot }), { kind: 'authored', sourceByteLength: memo.length });
  assert.notEqual((await readFile(path.join(targetRoot, 'pages/memos.md'))).length, aggregate.length);
  assert.notEqual((await readFile(path.join(targetRoot, 'memos/original.md'))).length, memo.length);
  assert.deepEqual(await readFile(path.join(sourceRoot, 'pages/memos.md')), aggregate);
  assert.deepEqual(await readFile(path.join(sourceRoot, 'memos/original.md')), memo);
});

test('trusted provenance rejects missing, unsafe or malformed data without a staged-size substitute', async t => {
  const { targetRoot } = await fixture(t);
  await mkdir(path.join(targetRoot, 'posts'), { recursive: true });
  await assert.rejects(readSourceProvenance('posts', 'missing.md', { root: targetRoot }), /Missing or invalid/u);
  await assert.rejects(readSourceProvenance('posts', '../outside.md', { root: targetRoot }), /Invalid.*identity/u);
  for (const record of [{ kind: 'authored', sourceByteLength: -1 }, { kind: 'authored', sourceByteLength: 2.5 }, { kind: 'authored', sourceByteLength: Number.MAX_SAFE_INTEGER + 1 }, { kind: 'authored', sourceByteLength: null }, { kind: 'authored', sourceByteLength: '1' }, { kind: 'authored' }, { kind: 'unknown', sourceByteLength: 1 }, { kind: 'authored', sourceByteLength: 1, sourcePath: '/private' }]) {
    await writeFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), JSON.stringify({ version: 1, records: { 'safe.md': record } }));
    await assert.rejects(readSourceProvenance('posts', 'safe.md', { root: targetRoot }), /Invalid.*record/u);
  }
  for (const snapshot of [null, [], { version: 2, records: {} }, { version: 1, records: [] }, { version: 1, records: {}, extra: true }]) {
    await writeFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), JSON.stringify(snapshot));
    await assert.rejects(readSourceProvenance('posts', 'safe.md', { root: targetRoot }), /Invalid.*snapshot/u);
  }
  for (const identity of ['../outside.md', 'nested//unsafe.md', 'percent%20.md', 'e\u0301.md']) {
    await writeFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), JSON.stringify({ version: 1, records: { [identity]: { kind: 'authored', sourceByteLength: 1 } } }));
    await assert.rejects(readSourceProvenance('posts', 'safe.md', { root: targetRoot }), /Invalid.*record/u);
  }
  await writeFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), JSON.stringify({ version: 1, records: {} }));
  await assert.rejects(readSourceProvenance('posts', 'safe.md', { root: targetRoot }), /Missing.*record/u);
  await writeFile(path.join(targetRoot, 'posts', SOURCE_PROVENANCE_FILENAME), '{');
  await assert.rejects(readSourceProvenance('posts', 'safe.md', { root: targetRoot }), /Missing or invalid/u);
});
