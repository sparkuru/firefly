import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, renameSync, rmSync, symlinkSync, unlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { fileURLToPath } from 'node:url';
import { MAX_BODY_BYTES, decodePublicMemosExport } from '../../../plugins/memos/public.mjs';
import { buildCandidate, buildRollbackCandidate, decodeReceipt, newMemo, parseMemoSource, promoteCandidate, readCurrentHistory, validateCandidate } from '../src/index.mjs';

const date = '2026-10-06T00:00:00.000Z';
const note = (body = 'Hello **Markdown**.', { id = 'm_owner', createdAt = date, draft = false } = {}) => `---\nid: ${id}\ncreatedAt: ${createdAt}\ndraft: ${draft}\n---\n${body}`;
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'firefly-memo-core-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const sourceRoot = path.join(root, 'source');
  mkdirSync(sourceRoot);
  const deploymentRoot = path.join(root, 'deployment');
  let counter = 0;
  return { root, sourceRoot, deploymentRoot,
    write: (body, options) => writeFileSync(path.join(sourceRoot, 'note.md'), note(body, options)),
    build: (options = {}) => buildCandidate({ sourceRoot, outputRoot: path.join(root, `candidate-${++counter}`), displayName: 'Owner', generatedAt: date, ...options }),
    promote: (candidate) => promoteCandidate({ deploymentRoot, candidateRoot: candidate.candidateRoot, expectedBase: candidate.receipt.expectedBase })
  };
}
const publicHtml = (candidate) => readFileSync(path.join(candidate.candidateRoot, 'public/index.html'), 'utf8');

test('absent-only drafts use random stable identities; drafts never project identifiers or filenames', async (t) => {
  const f = fixture(t);
  const draft = newMemo({ sourceRoot: f.sourceRoot, name: '中文😀 草稿', now: date });
  assert.match(draft.id, /^m_[A-Za-z0-9_-]{24}$/u);
  assert.equal(draft.createdAt, date);
  const bytes = readFileSync(path.join(f.sourceRoot, draft.filename));
  assert.throws(() => newMemo({ sourceRoot: f.sourceRoot, name: '中文😀 草稿', now: date }), /EEXIST/);
  assert.deepEqual(readFileSync(path.join(f.sourceRoot, draft.filename)), bytes);
  const other = newMemo({ sourceRoot: f.sourceRoot, name: 'second' });
  assert.notEqual(other.id, draft.id);
  const empty = await f.build();
  assert.equal(empty.bundle.memos.length, 0);
  assert.match(publicHtml(empty), /No Memo has been published/);
  for (const value of [draft.id, draft.filename, other.id, 'draft', 'sourceRoot']) assert.ok(!publicHtml(empty).includes(value));
  for (const name of ['../escape', 'x/y', 'x\\y', '\ud800', 'x\u202e']) assert.throws(() => newMemo({ sourceRoot: f.sourceRoot, name }));
});

test('strict YAML, Unicode/control/byte bounds and duplicate draft IDs fail before output exists', async (t) => {
  const f = fixture(t);
  for (const source of ['Hello', note('', { draft: false }), note('x').replace('draft: false', 'draft: false\nemail: private'), note('x').replace('id: m_owner', 'id: m_owner\nid: m_other'), note('x').replace('draft: false', 'draft: no'), note('x').replace(date, '2026-02-30T00:00:00.000Z'), note('x').replace('id: m_owner', 'id: &id m_owner\ncreatedAtAlias: *id'), note('a'.repeat(MAX_BODY_BYTES + 1)), note('x\u202ey')]) {
    assert.throws(() => parseMemoSource(Buffer.from(source), 'Owner'));
  }
  assert.throws(() => parseMemoSource(Buffer.from([0xff]), 'Owner'));
  assert.throws(() => parseMemoSource(Buffer.concat([Buffer.from(note('')), Buffer.from([0xed, 0xa0, 0x80])]), 'Owner'));
  f.write('x');
  writeFileSync(path.join(f.sourceRoot, 'duplicate.md'), note('', { draft: true }));
  await assert.rejects(f.build(), /duplicate/);
  assert.ok(!existsSync(path.join(f.root, 'candidate-1')));
});

test('long Markdown sources and the 128 KiB UTF-8 body boundary survive strict candidate decoding unchanged', async (t) => {
  const f = fixture(t);
  assert.equal(MAX_BODY_BYTES, 128 * 1024);
  const longBody = `# Heading\n\n${'漢😀\n'.repeat(6000)}\n\`\`\`text\n e\u0301  \n\`\`\`\n`;
  const boundaryBody = '漢😀'.repeat(Math.floor(MAX_BODY_BYTES / 7)) + 'a'.repeat(MAX_BODY_BYTES % 7);
  assert.ok(Buffer.byteLength(note(longBody), 'utf8') > 32 * 1024);
  assert.equal(Buffer.byteLength(boundaryBody, 'utf8'), MAX_BODY_BYTES);
  for (const body of [longBody, boundaryBody]) {
    f.write(body);
    const candidate = await f.build();
    assert.equal(candidate.bundle.memos[0].body, body);
    const decoded = decodePublicMemosExport(readFileSync(path.join(candidate.candidateRoot, 'public/memos.public.v2.json')));
    assert.equal(decoded.memos[0].body, body);
    assert.equal((await validateCandidate(candidate.candidateRoot)).bundle.memos[0].body, body);
  }
  for (const body of [boundaryBody + 'a', 'a'.repeat(MAX_BODY_BYTES - 1) + '😀']) {
    f.write(body);
    await assert.rejects(f.build(), /UTF-8 bytes/u);
  }
  for (const candidate of ['candidate-3', 'candidate-4']) assert.ok(!existsSync(path.join(f.root, candidate)));
});

test('full source-file reads accept exactly 256 KiB and reject one more byte before candidate creation', async (t) => {
  for (const filename of ['note.md', '中文😀.md']) {
    const f = fixture(t);
    const base = note('Small body');
    const source = base.replace('---\n', `---\n# ${'x'.repeat(256 * 1024 - Buffer.byteLength(base, 'utf8') - 3)}\n`);
    assert.equal(Buffer.byteLength(source, 'utf8'), 256 * 1024);
    writeFileSync(path.join(f.sourceRoot, filename), source);
    assert.equal((await f.build()).bundle.memos[0].body, 'Small body');
    writeFileSync(path.join(f.sourceRoot, filename), source + ' ');
    await assert.rejects(f.build(), /bounded regular file|contained regular file/u);
    assert.ok(!existsSync(path.join(f.root, 'candidate-2')));
  }
});

test('draft bodies retain bounded whitespace, Unicode safety and public exclusion', async (t) => {
  const f = fixture(t);
  const whitespace = ' \t\n'.repeat(Math.floor(MAX_BODY_BYTES / 3)) + ' '.repeat(MAX_BODY_BYTES % 3);
  assert.equal(Buffer.byteLength(whitespace, 'utf8'), MAX_BODY_BYTES);
  for (const body of [whitespace, '漢😀'.repeat(Math.floor(MAX_BODY_BYTES / 7))]) {
    assert.equal(parseMemoSource(Buffer.from(note(body, { draft: true })), 'Owner').body, body);
    f.write(body, { draft: true });
    assert.deepEqual((await f.build()).bundle.memos, []);
  }
  for (const body of [whitespace + ' ', '\u00a0', '\u2028', '\u000b', 'x\u202ey', 'a'.repeat(MAX_BODY_BYTES + 1)]) {
    assert.throws(() => parseMemoSource(Buffer.from(note(body, { draft: true })), 'Owner'));
    f.write(body, { draft: true });
    await assert.rejects(f.build());
  }
});

test('basic Markdown is sanitized and rendered without execution or a browser runtime', async (t) => {
  const f = fixture(t);
  f.write('# Heading\n\nA **bold** and *emphasized* [link](https://example.com).\n\n- one\n- two\n\n| Key | Value |\n| --- | --- |\n| a | b |\n\n```mermaid\ngraph TD; e\u0301  \n```\n\n<script>privateScript()</script><style>privateStyle</style><img src="javascript:evil()" onerror="evil()">\n\n[unsafe](javascript:evil())\n\nlast  \nhard break\n');
  const candidate = await f.build();
  const html = publicHtml(candidate);
  for (const pattern of [/<h1>Heading<\/h1>/u, /<strong>bold<\/strong>/u, /<em>emphasized<\/em>/u, /<ul>/u, /<table>/u, /language-mermaid/u, /e\u0301  \n/u, /last<br>/u]) assert.match(html, pattern);
  for (const value of ['<script', '<style', 'onerror', 'javascript:', 'privateScript', 'privateStyle', 'data-mermaid', '<form']) assert.ok(!html.includes(value), value);
  assert.equal(candidate.bundle.memos[0].body.includes('e\u0301'), true);
  await validateCandidate(candidate.candidateRoot);
  for (const body of ['<script>hidden()</script>', '<!-- hidden -->', '<div></div>', '<img src="javascript:hidden()">']) { f.write(body); await assert.rejects(f.build(), /no visible content/); }
});

test('referenced Unicode assets are contained, URI encoded and closed under inventory', async (t) => {
  const f = fixture(t);
  const assets = path.join(f.sourceRoot, 'assets');
  mkdirSync(assets);
  const image = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=', 'base64');
  writeFileSync(path.join(assets, '照片 😀.png'), image);
  writeFileSync(path.join(assets, 'unused.png'), image);
  f.write('![Photo](assets/照片%20😀.png)\n\n[Download](assets/照片%20😀.png)');
  const candidate = await f.build();
  assert.match(publicHtml(candidate), /\/memos\/assets\/media\/%E7%85%A7%E7%89%87%20%F0%9F%98%80\.png/u);
  assert.deepEqual(readFileSync(path.join(candidate.candidateRoot, 'public/assets/media/照片 😀.png')), image);
  assert.ok(!candidate.receipt.inventory.some((file) => file.path.includes('unused')));
  await validateCandidate(candidate.candidateRoot);
  writeFileSync(path.join(assets, 'invalid.png'), '<script>not an image</script>');
  f.write('![Broken](assets/invalid.png)');
  await assert.rejects(f.build(), /bytes do not match/);
  for (const body of ['![Missing](assets/missing.png)', '![Escape](assets/../outside.png)', '![Encoded escape](assets/%2e%2e/outside.png)', '![Remote](https://example.com/photo.png)', '![Active](assets/a.svg)', '![Root](/blog-image.png)']) { f.write(body); await assert.rejects(f.build()); }
  symlinkSync(path.join(assets, '照片 😀.png'), path.join(assets, 'symlink.png'));
  f.write('![Symlink](assets/symlink.png)');
  await assert.rejects(f.build(), /Symlink|symlink/u);
});

test('source filenames never become public and output cannot overlap source or blog roots', async (t) => {
  const f = fixture(t);
  f.write('Owner body');
  renameSync(path.join(f.sourceRoot, 'note.md'), path.join(f.sourceRoot, '中文😀.md'));
  const candidate = await f.build();
  assert.ok(!JSON.stringify(candidate.bundle).includes('中文😀.md'));
  await assert.rejects(f.build({ outputRoot: path.join(f.sourceRoot, 'output') }), /overlap/);
  const repo = fileURLToPath(new URL('../../../', import.meta.url));
  for (const outputRoot of [path.join(repo, 'dist/memos'), path.join(repo, 'artifacts/memos'), path.join(repo, 'tooling/unsafe-output'), path.join(repo, 'config/unsafe-output'), repo]) await assert.rejects(f.build({ outputRoot }), /independent \.firefly\/memos|blog source and release/);
  symlinkSync(path.join(f.sourceRoot, '中文😀.md'), path.join(f.sourceRoot, 'linked.md'));
  await assert.rejects(f.build(), /Symlink/);
});

test('receipt, DOM and exact inventory gates reject tampering, even a rehashed arbitrary HTML fragment', async (t) => {
  const f = fixture(t);
  f.write('Real **body**');
  const candidate = await f.build();
  const htmlPath = path.join(candidate.candidateRoot, 'public/index.html');
  const original = readFileSync(htmlPath);
  writeFileSync(htmlPath, original.toString().replace('Real', 'Different'));
  await assert.rejects(validateCandidate(candidate.candidateRoot), /inventory/);
  const receipt = JSON.parse(readFileSync(path.join(candidate.candidateRoot, 'receipt.json')));
  const bytes = readFileSync(htmlPath);
  const entry = receipt.inventory.find((file) => file.path === 'public/index.html');
  entry.bytes = bytes.length;
  entry.digest = createHash('sha256').update(bytes).digest('hex');
  delete receipt.digest;
  receipt.digest = createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
  writeFileSync(path.join(candidate.candidateRoot, 'receipt.json'), JSON.stringify(receipt));
  await assert.rejects(validateCandidate(candidate.candidateRoot), /canonical sanitized Markdown/);
  writeFileSync(htmlPath, original);
  writeFileSync(path.join(candidate.candidateRoot, 'private-extra.json'), '{}');
  await assert.rejects(validateCandidate(candidate.candidateRoot));
});

test('publish, edit and withdraw advance one pointer and retained history; stale same-floor candidates fail', async (t) => {
  const f = fixture(t);
  f.write('First');
  assert.equal(await readCurrentHistory(f.deploymentRoot), null);
  const first = await f.build();
  const firstReceipt = await f.promote(first);
  assert.equal(firstReceipt.sequence, 1);
  const firstPointer = readlinkSync(path.join(f.deploymentRoot, 'current'));
  f.write('Edited');
  const second = await f.build({ history: firstReceipt });
  f.write('Racing other edit');
  const stale = await f.build({ history: firstReceipt });
  await f.promote(second);
  assert.equal(second.receipt.sequence, 2);
  assert.equal(second.receipt.deletionFloor, 0);
  assert.equal(second.bundle.memos[0].createdAt, first.bundle.memos[0].createdAt);
  await assert.rejects(f.promote(stale), /stale expected base/);
  assert.equal((await readCurrentHistory(f.deploymentRoot)).digest, second.receipt.digest);
  assert.ok(existsSync(path.join(f.deploymentRoot, firstPointer, 'public/index.html')));
  f.write('withdraw draft', { draft: true });
  const withdrawn = await f.build({ history: second.receipt });
  await f.promote(withdrawn);
  assert.equal(withdrawn.receipt.deletionFloor, 1);
  assert.deepEqual(withdrawn.receipt.retiredIds, ['m_owner']);
  f.write('Restored old workspace');
  await assert.rejects(f.build({ history: withdrawn.receipt }), /retired ID/);
  await assert.rejects(f.promote(first), /stale expected base/);
});

test('accepted creation times are immutable; missing/malformed established state fails closed', async (t) => {
  const f = fixture(t);
  f.write('First');
  const first = await f.build();
  await f.promote(first);
  f.write('Edited', { createdAt: '2025-01-01T00:00:00.000Z' });
  await assert.rejects(f.build({ history: first.receipt }), /createdAt is immutable/);
  f.write('Draft', { draft: true, createdAt: '2025-01-01T00:00:00.000Z' });
  await assert.rejects(f.build({ history: first.receipt }), /createdAt is immutable/);
  const current = path.join(f.deploymentRoot, 'current');
  const target = readlinkSync(current);
  unlinkSync(path.join(f.deploymentRoot, target, 'receipt.json'));
  await assert.rejects(readCurrentHistory(f.deploymentRoot));
  unlinkSync(current);
  await assert.rejects(readCurrentHistory(f.deploymentRoot), /missing established/);
  symlinkSync('../source', current);
  await assert.rejects(readCurrentHistory(f.deploymentRoot), /outside owned/);
  unlinkSync(current);
  rmSync(path.join(f.deploymentRoot, 'releases'), { recursive: true });
  await assert.rejects(readCurrentHistory(f.deploymentRoot), /missing established/);
  for (const value of [{}, { ...first.receipt, sequence: 0 }, { ...first.receipt, retiredIds: ['m_owner'] }, { ...first.receipt, expectedBase: 'a'.repeat(64) }]) assert.throws(() => decodeReceipt(value));
});

test('rollback is a new sequence and cannot resurrect removed content', async (t) => {
  const f = fixture(t);
  f.write('First');
  const first = await f.build();
  await f.promote(first);
  f.write('Edited');
  const second = await f.build({ history: first.receipt });
  await f.promote(second);
  const rollback = await buildRollbackCandidate({ priorCandidateRoot: first.candidateRoot, history: second.receipt, outputRoot: path.join(f.root, 'rollback'), generatedAt: date });
  assert.equal(rollback.receipt.sequence, 3);
  assert.equal(rollback.bundle.memos[0].body, 'First');
  await f.promote(rollback);
  unlinkSync(path.join(f.sourceRoot, 'note.md'));
  const removed = await f.build({ history: rollback.receipt });
  await f.promote(removed);
  await assert.rejects(buildRollbackCandidate({ priorCandidateRoot: first.candidateRoot, history: removed.receipt, outputRoot: path.join(f.root, 'forbidden-rollback') }), /retired/);
  assert.equal((await readCurrentHistory(f.deploymentRoot)).sequence, 4);
});

test('lock, candidate failure and refused transition preserve the active public and private pair', async (t) => {
  const f = fixture(t);
  f.write('First');
  const first = await f.build();
  await f.promote(first);
  f.write('Second');
  const second = await f.build({ history: first.receipt });
  const pointer = readlinkSync(path.join(f.deploymentRoot, 'current'));
  mkdirSync(path.join(f.deploymentRoot, '.publish-lock'));
  await assert.rejects(f.promote(second), /EEXIST/);
  rmSync(path.join(f.deploymentRoot, '.publish-lock'), { recursive: true });
  assert.equal(readlinkSync(path.join(f.deploymentRoot, 'current')), pointer);
  writeFileSync(path.join(second.candidateRoot, 'public/extra.txt'), 'private');
  await assert.rejects(f.promote(second));
  assert.equal(readlinkSync(path.join(f.deploymentRoot, 'current')), pointer);
  assert.equal((await readCurrentHistory(f.deploymentRoot)).digest, first.receipt.digest);
  assert.equal(lstatSync(path.join(f.deploymentRoot, pointer, 'receipt.json')).mode & 0o777, 0o600);
  assert.equal(lstatSync(path.join(f.deploymentRoot, pointer, 'public/index.html')).mode & 0o777, 0o644);
  assert.equal(lstatSync(path.join(f.deploymentRoot, pointer)).mode & 0o777, 0o755);
});

test('candidate creation rejects symlink parents and exact tree checks reject empty injected directories', async (t) => {
  const f = fixture(t);
  f.write('First');
  const external = path.join(f.root, 'external');
  mkdirSync(external);
  symlinkSync(external, path.join(f.root, 'linked'));
  await assert.rejects(f.build({ outputRoot: path.join(f.root, 'linked', 'not-created', 'candidate') }), /without symlinks/);
  assert.ok(!existsSync(path.join(external, 'not-created')));
  const candidate = await f.build();
  mkdirSync(path.join(candidate.candidateRoot, 'injected-empty'));
  await assert.rejects(validateCandidate(candidate.candidateRoot), /Empty candidate/);
  symlinkSync(path.join(f.root, 'missing'), path.join(f.root, 'dangling'));
  await assert.rejects(readCurrentHistory(path.join(f.root, 'dangling')), /without symlinks/);
});

test('bootstrap explicitly preserves inherited legacy deletion floors without synthesizing/resetting history', async (t) => {
  const f = fixture(t);
  f.write('First');
  const first = await f.build({ initialDeletionFloor: 7 });
  assert.equal(first.receipt.deletionFloor, 7);
  assert.equal(first.bundle.tombstoneEpoch, 7);
  assert.equal(first.receipt.expectedBase, null);
  await assert.rejects(f.promote(first), /floor does not match/);
  await promoteCandidate({ deploymentRoot: f.deploymentRoot, candidateRoot: first.candidateRoot, expectedBase: null, initialDeletionFloor: 7 });
  f.write('Edited');
  const edited = await f.build({ history: first.receipt });
  await f.promote(edited);
  assert.equal(edited.receipt.deletionFloor, 7);
  await assert.rejects(f.build({ history: edited.receipt, initialDeletionFloor: 1 }), /cannot override established/);
  for (const initialDeletionFloor of [-1, -0, 1.5, Number.MAX_SAFE_INTEGER + 1, '7']) await assert.rejects(f.build({ initialDeletionFloor }));
});

test('legacy CLI provides explicit recovery and refuses retired creation/push paths', async (t) => {
  const f = fixture(t);
  const cli = fileURLToPath(new URL('../src/cli.mjs', import.meta.url));
  const run = (...args) => spawnSync(process.execPath, [cli, ...args], { encoding: 'utf8' });
  const draft = run('new', 'cli-note', '--source-root', f.sourceRoot);
  assert.notEqual(draft.status, 0);
  assert.match(draft.stderr, /memo-documents\/cli.mjs new/u);
  f.write('Sensitive source body');
  const output = path.join(f.root, 'cli-candidate');
  const built = run('build', '--source-root', f.sourceRoot, '--output-root', output, '--display-name', 'Owner');
  assert.equal(built.status, 0, built.stderr);
  assert.ok(!built.stdout.includes('Sensitive source body'));
  assert.equal(run('validate', '--candidate-root', output).status, 0);
  assert.equal(run('state', '--deployment-root', f.deploymentRoot).stdout.trim(), 'null');
  assert.equal(run('promote', '--candidate-root', output, '--deployment-root', f.deploymentRoot, '--expected-base', 'null').status, 0);
  assert.equal(JSON.parse(run('state', '--deployment-root', f.deploymentRoot).stdout).sequence, 1);
  for (const args of [['publish'], ['state'], ['state', '--unknown', 'x'], ['new', '../escape', '--source-root', f.sourceRoot], ['promote', '--candidate-root', output, '--deployment-root', f.deploymentRoot]]) assert.notEqual(run(...args).status, 0);
});
