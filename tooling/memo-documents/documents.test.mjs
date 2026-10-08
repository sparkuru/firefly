import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs, { existsSync, mkdtempSync, mkdirSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { syncBuiltinESMExports } from 'node:module';
import os from 'node:os';
import path from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import test from 'node:test';
import { decodeReceipt, hash } from '../publish-memos/src/history.mjs';
import { runCli } from './cli.mjs';
import { importCorpus, installCandidate, newDocument, parseDocumentSource, rebaseBody, validateCandidate } from './documents.mjs';

const digest = (value) => createHash('sha256').update(value).digest('hex');
function fixture(t) {
  const root = mkdtempSync(path.join(os.tmpdir(), 'memo-documents-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  for (const name of ['notes/assets/legacy', 'short', 'target/posts', 'target/pages']) mkdirSync(path.join(root, name), { recursive: true });
  const report = { included: 89, reports: [], manifest: [] };
  const mapping = [];
  const acceptedMemos = [];
  for (let index = 0; index < 89; index += 1) {
    const id = `m_note_${String(index).padStart(3, '0')}`;
    const date = '2022-01-01T01:02:03.000Z';
    const filename = `${id}.md`;
    const body = index === 0 ? '文\u200b本\r\n  code  \r\n\n![image](assets/legacy/image000.png)\n[next](/memos/#m_note_001)\n' : `Note ${index}\n`;
    const bytes = Buffer.from(`---\nid: ${id}\ncreatedAt: ${date}\ndraft: false\n---\n${body}`);
    writeFileSync(path.join(root, 'notes', filename), bytes);
    const record = { memoRef: `note_${index}`, id, filename, createdAt: date, sourceDigest: digest(bytes), sourceBytes: bytes.length, convertedBodyDigest: digest(Buffer.from(body)), convertedBodyBytes: Buffer.byteLength(body) };
    report.reports.push(record);
    report.manifest.push({ path: filename, bytes: bytes.length, digest: digest(bytes) });
    mapping.push({ id, memoRef: record.memoRef, createdAt: date, title: `Title ${index}` });
    acceptedMemos.push({ id, createdAt: date, digest: digest(`record${index}`) });
  }
  for (let index = 0; index < 211; index += 1) {
    const relative = `assets/legacy/image${String(index).padStart(3, '0')}.png`;
    const bytes = Buffer.from(`Synthetic asset ${index}`);
    writeFileSync(path.join(root, 'notes', relative), bytes);
    report.manifest.push({ path: relative, bytes: bytes.length, digest: digest(bytes) });
  }
  const database = path.join(root, 'ledger.sqlite');
  const db = new DatabaseSync(database);
  db.exec('CREATE TABLE run (dump_sha256 TEXT); CREATE TABLE comments (comment_ref TEXT, created INTEGER, body TEXT, document_ref TEXT);');
  db.prepare('INSERT INTO run VALUES (?)').run(digest('dump'));
  for (let index = 0; index < 180; index += 1) {
    const created = 1647000000 + index;
    const body = index === 0 ? '\n  同\u200b样\r\nText  \r\n' : index < 3 ? 'Duplicate\n' : `Short ${index}\n`;
    const local = new Date((created + 28800) * 1000).toISOString();
    const filename = `${local.slice(0, 10).replaceAll('-', '')}-${local.slice(11, 19).replaceAll(':', '')}.md`;
    writeFileSync(path.join(root, 'short', filename), body);
    db.prepare('INSERT INTO comments VALUES (?, ?, ?, ?)').run(`comment_${index}`, created, body, 'doc_example');
  }
  db.close();
  const payload = { schemaVersion: 1, sequence: 1, deletionFloor: 0, retiredIds: [], acceptedMemos: acceptedMemos.sort((a, b) => a.id.localeCompare(b.id)), exportDigest: digest('export'), expectedBase: null, inventory: [] };
  const receipt = decodeReceipt({ ...payload, digest: hash(payload) });
  const config = { notesRoot: path.join(root, 'notes'), conversionReport: path.join(root, 'conversion.json'), sourceMapping: path.join(root, 'mapping.json'), database, commentDocumentRef: 'doc_example', shortRoot: path.join(root, 'short'), outputRoot: path.join(root, 'candidate'), historyFiles: [path.join(root, 'receipt.json')], expectedDumpDigest: digest('dump') };
  for (const [filename, value] of [[config.conversionReport, report], [config.sourceMapping, mapping], [config.historyFiles[0], receipt]]) writeFileSync(filename, JSON.stringify(value));
  return { root, config, report };
}

test('new documents have minimal metadata and exclusive timestamp filenames', (t) => {
  const root = mkdtempSync(path.join(os.tmpdir(), 'memo-new-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const now = '2024-02-03T04:05:06.000Z';
  assert.deepEqual(newDocument({ sourceRoot: root, now }), { created: 1, draft: true });
  const bytes = readFileSync(path.join(root, '20240203-040506.md'));
  const { metadata, body } = parseDocumentSource(bytes);
  assert.deepEqual(Object.keys(metadata), ['id', 'date', 'draft']);
  assert.equal(metadata.draft, true);
  assert.equal(metadata.date, now);
  assert.equal(body, '');
  assert.throws(() => newDocument({ sourceRoot: root, now }), { code: 'EEXIST' });
  assert.equal(readFileSync(path.join(root, '20240203-040506.md')).equals(bytes), true);
  assert.throws(() => newDocument({ sourceRoot: root, name: '../escape.md' }), /filename/u);
});

test('parsed destinations rebase while code, CRLF and Unicode stay exact', () => {
  const body = '文\u200b本\r\n![caption](assets/a.png "Title")\r\n[next](/memos/#m_test_001)\n```md\n[x](/memos/#m_unknown)\n```\n`assets/a.png`\n<img src="assets/a.png">\n\n[ref]: <assets/a.png>\n';
  const result = rebaseBody(body, new Set(['m_test_001']), new Set(['assets/a.png']));
  assert.equal(result.patches.length, 4);
  assert.ok(result.body.includes('[next](/pages/memos/m_test_001/)'));
  assert.ok(result.body.includes('```md\n[x](/memos/#m_unknown)\n```'));
  assert.ok(result.body.includes('文\u200b本\r\n'));
  assert.ok(result.body.includes('<img src="/pages/memos/assets/a.png">'));
  assert.throws(() => rebaseBody('[x](/memos/#m_unknown)', new Set(), new Set()), /unknown/u);
  assert.throws(() => rebaseBody('![x](assets/missing.png)', new Set(), new Set()), /missing/u);
});

test('HTML rebasing changes parsed destinations without touching comments or attribute labels', () => {
  const source = '<!-- src="assets/a.png" -->\r\n' +
    '<img data-src="assets/a.png" alt=\'src="assets/a.png"\' SRC = "assets/a.png">\r\n' +
    '<a title="href=\'assets/a.png\'" href=assets/a.png>label</a>\r\n' +
    '<template><img src="assets/a.png"></template>\r\n';
  const result = rebaseBody(source, new Set(), new Set(['assets/a.png']));
  assert.equal(result.patches.length, 3);
  assert.equal(result.body, '<!-- src="assets/a.png" -->\r\n' +
    '<img data-src="assets/a.png" alt=\'src="assets/a.png"\' SRC = "/pages/memos/assets/a.png">\r\n' +
    '<a title="href=\'assets/a.png\'" href=/pages/memos/assets/a.png>label</a>\r\n' +
    '<template><img src="/pages/memos/assets/a.png"></template>\r\n');
  assert.equal(rebaseBody('<div data-src="assets/missing.png"></div><!-- href="/memos/#m_unknown" -->', new Set(), new Set()).body,
    '<div data-src="assets/missing.png"></div><!-- href="/memos/#m_unknown" -->');
  assert.equal(rebaseBody('<img src="assets/a.png?literal=&amp;copy;&amp;quote=&quot;">', new Set(), new Set(['assets/a.png'])).body,
    '<img src="/pages/memos/assets/a.png?literal=&amp;copy;&amp;quote=&quot;">');
});

test('owned URL decoding supports Unicode and spaces while rejecting encoded traversal', () => {
  const source = '![图](assets/%E5%9B%BE%20one.png?v=1#part)\n`assets/%E5%9B%BE%20one.png`';
  const result = rebaseBody(source, new Set(), new Set(['assets/图 one.png']));
  assert.equal(result.body, '![图](/pages/memos/assets/%E5%9B%BE%20one.png?v=1#part)\n`assets/%E5%9B%BE%20one.png`');
  for (const url of ['assets/%2e%2e/out.png', 'assets/a%2fb.png', 'assets/%252e%252e/out.png', 'assets/%zz.png']) {
    assert.throws(() => rebaseBody(`![x](${url})`, new Set(), new Set()), /path|URL|separator/u);
  }
});

test('source and body bounds and invalid titles fail without losing significant bytes', () => {
  const header = '---\nid: m_example\ndate: 2024-02-03T04:05:06.000Z\ndraft: true\n---\n';
  assert.equal(Buffer.byteLength(parseDocumentSource(Buffer.from(header + 'x'.repeat(128 * 1024))).body), 128 * 1024);
  assert.throws(() => parseDocumentSource(Buffer.from(header + 'x'.repeat(128 * 1024 + 1))), /body.*limit/u);
  assert.throws(() => parseDocumentSource(Buffer.alloc(256 * 1024 + 1)), /source.*limit/u);
  assert.throws(() => parseDocumentSource(Buffer.from(header.replace('draft: true', 'draft: true\ntitle: 42'))), /title/u);
});

test('full import validates 269 distinct identities, duplicate bodies and exact source bytes', async (t) => {
  const { config } = fixture(t);
  const imported = await importCorpus(config);
  assert.equal(imported.entries, 269);
  assert.equal(imported.assets, 211);
  assert.equal(imported.linkPatches, 2);
  const report = JSON.parse(readFileSync(path.join(config.outputRoot, 'migration.private.json')));
  const duplicates = report.correspondence.filter((record) => record.originalDigest === digest('Duplicate\n'));
  assert.equal(duplicates.length, 2);
  assert.notEqual(duplicates[0].id, duplicates[1].id);
  const oldestShort = report.correspondence.find((record) => record.sourceRef === 'comment_0');
  assert.equal(oldestShort.date, new Date(1647000000 * 1000).toISOString());
  const { body } = parseDocumentSource(readFileSync(path.join(config.outputRoot, 'workspace/memos', oldestShort.filename)));
  assert.equal(body, '\n  同\u200b样\r\nText  \r\n');
  assert.deepEqual(validateCandidate(config.outputRoot), imported);
});

test('source or database mismatch rejects before candidate writes', async (t) => {
  const { config } = fixture(t);
  writeFileSync(path.join(config.notesRoot, 'm_note_000.md'), 'changed');
  await assert.rejects(importCorpus(config), /manifest/u);
  assert.equal(readdirSync(path.dirname(config.outputRoot)).includes('candidate'), false);
});

test('import requires history and cannot revive a retired identity', async (t) => {
  const { config } = fixture(t);
  await assert.rejects(importCorpus({ ...config, historyFiles: [] }), /receipt/u);
  const payload = JSON.parse(readFileSync(config.historyFiles[0]));
  payload.retiredIds = ['m_note_000'];
  payload.acceptedMemos = payload.acceptedMemos.filter((item) => item.id !== 'm_note_000');
  delete payload.digest;
  writeFileSync(config.historyFiles[0], JSON.stringify({ ...payload, digest: hash(payload) }));
  await assert.rejects(importCorpus(config), /retired/u);
});

test('install preflight rejects conflicts before mutation and supports idempotent absent-only writes', async (t) => {
  const { config, root } = fixture(t);
  await importCorpus(config);
  const workspaceRoot = path.join(root, 'target');
  const options = { candidateRoot: config.outputRoot, workspaceRoot };
  assert.equal(installCandidate(options).pending, 480);
  assert.equal(readdirSync(workspaceRoot).includes('memos'), false);
  assert.equal(installCandidate({ ...options, apply: true }).installed, 480);
  assert.equal(installCandidate({ ...options, apply: true }).installed, 0);
  const conflicted = path.join(workspaceRoot, 'memos/m_note_000.md');
  writeFileSync(conflicted, readFileSync(conflicted).toString().replace('Title 0', 'User edit'));
  assert.throws(() => installCandidate({ ...options, apply: true }), /conflicts/u);
  assert.ok(readFileSync(conflicted, 'utf8').includes('User edit'));
});

test('candidate validation rejects self-consistent extra files and publication-changing metadata', async (t) => {
  const { config } = fixture(t);
  await importCorpus(config);
  const reportPath = path.join(config.outputRoot, 'migration.private.json');
  const originalReport = readFileSync(reportPath);
  const report = JSON.parse(originalReport);
  const extra = 'workspace/posts/extra.md';
  const extraBytes = Buffer.from('Unrelated document');
  writeFileSync(path.join(config.outputRoot, extra), extraBytes);
  report.manifest.push({ path: 'posts/extra.md', bytes: extraBytes.length, digest: digest(extraBytes) });
  writeFileSync(reportPath, JSON.stringify(report));
  assert.throws(() => validateCandidate(config.outputRoot), /inventory/u);
  rmSync(path.join(config.outputRoot, extra));
  writeFileSync(reportPath, originalReport);
  const sourcePath = path.join(config.outputRoot, 'workspace/memos/m_note_000.md');
  const bytes = Buffer.from(readFileSync(sourcePath, 'utf8').replace('draft: false', 'draft: false\naccess: { visibility: private, owner: fixture }'));
  writeFileSync(sourcePath, bytes);
  const changed = JSON.parse(originalReport);
  Object.assign(changed.manifest.find((item) => item.path === 'memos/m_note_000.md'), { bytes: bytes.length, digest: digest(bytes) });
  writeFileSync(reportPath, JSON.stringify(changed));
  assert.throws(() => validateCandidate(config.outputRoot), /metadata/u);
});

test('candidate validation replays only parsed URL transforms, not arbitrary declared edits', async (t) => {
  const { config } = fixture(t);
  await importCorpus(config);
  const reportPath = path.join(config.outputRoot, 'migration.private.json');
  const report = JSON.parse(readFileSync(reportPath));
  const sourcePath = path.join(config.outputRoot, 'workspace/memos/m_note_001.md');
  const bytes = Buffer.from(readFileSync(sourcePath, 'utf8').replace('Note 1\n', 'Changed\n'));
  writeFileSync(sourcePath, bytes);
  Object.assign(report.manifest.find((item) => item.path === 'memos/m_note_001.md'), { bytes: bytes.length, digest: digest(bytes) });
  Object.assign(report.correspondence.find((item) => item.id === 'm_note_001'), { convertedDigest: digest('Changed\n'), convertedBytes: 8, patches: [{ start: 0, end: 6, before: 'Note 1', after: 'Changed', reason: 'entry-route' }] });
  writeFileSync(reportPath, JSON.stringify(report));
  assert.throws(() => validateCandidate(config.outputRoot), /undeclared/u);
});

test('installation refuses dangling symlinks, symlink ancestors and an active install lock', async (t) => {
  const { config, root } = fixture(t);
  await importCorpus(config);
  const workspaceRoot = path.join(root, 'target');
  const options = { candidateRoot: config.outputRoot, workspaceRoot };
  symlinkSync(path.join(root, 'missing'), path.join(workspaceRoot, 'memos'));
  assert.throws(() => installCandidate(options), /symlink/u);
  rmSync(path.join(workspaceRoot, 'memos'));
  symlinkSync(workspaceRoot, path.join(root, 'linked-target'));
  assert.throws(() => installCandidate({ ...options, workspaceRoot: path.join(root, 'linked-target'), apply: true }), /symlink/u);
  writeFileSync(path.join(workspaceRoot, '.memo-install.lock'), 'existing lock');
  assert.throws(() => installCandidate({ ...options, apply: true }), { code: 'EEXIST' });
  assert.equal(readFileSync(path.join(workspaceRoot, '.memo-install.lock'), 'utf8'), 'existing lock');
  assert.equal(existsSync(path.join(workspaceRoot, 'memos')), false);
});

test('candidate change during installation cannot commit different bytes and leaves an exact partial journal', async (t) => {
  const { config, root } = fixture(t);
  await importCorpus(config);
  const workspaceRoot = path.join(root, 'target');
  const manifest = JSON.parse(readFileSync(path.join(config.outputRoot, 'migration.private.json'))).manifest;
  const [first, second] = manifest.map((item) => item.path.slice('memos/'.length));
  const firstBytes = readFileSync(path.join(config.outputRoot, 'workspace/memos', first));
  const originalLink = fs.linkSync;
  let commits = 0;
  fs.linkSync = (from, to) => {
    originalLink(from, to);
    commits += 1;
    if (commits === 1) writeFileSync(path.join(config.outputRoot, 'workspace/memos', second), 'changed after preflight');
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installCandidate({ candidateRoot: config.outputRoot, workspaceRoot, apply: true }), /candidate changed/u); }
  finally { fs.linkSync = originalLink; syncBuiltinESMExports(); }
  assert.equal(commits, 1);
  assert.equal(readFileSync(path.join(workspaceRoot, 'memos', first)).equals(firstBytes), true);
  assert.equal(existsSync(path.join(workspaceRoot, 'memos', second)), false);
  assert.equal(existsSync(path.join(workspaceRoot, '.memo-install.lock')), false);
  assert.equal(readdirSync(path.join(workspaceRoot, 'memos')).some((name) => name.startsWith('.memo-install-')), false);
  const journalName = readdirSync(config.outputRoot).find((name) => name.startsWith('install-'));
  assert.deepEqual(JSON.parse(readFileSync(path.join(config.outputRoot, journalName))).installed, [first]);
});

test('a racing user file is never replaced and failed installation releases its own lock', async (t) => {
  const { config, root } = fixture(t);
  await importCorpus(config);
  const workspaceRoot = path.join(root, 'target');
  const originalLink = fs.linkSync;
  let userFile;
  fs.linkSync = (from, to) => {
    userFile = to;
    writeFileSync(to, 'racing user file', { flag: 'wx' });
    originalLink(from, to);
  };
  syncBuiltinESMExports();
  try { assert.throws(() => installCandidate({ candidateRoot: config.outputRoot, workspaceRoot, apply: true }), { code: 'EEXIST' }); }
  finally { fs.linkSync = originalLink; syncBuiltinESMExports(); }
  assert.equal(readFileSync(userFile, 'utf8'), 'racing user file');
  assert.equal(existsSync(path.join(workspaceRoot, '.memo-install.lock')), false);
  const journalName = readdirSync(config.outputRoot).find((name) => name.startsWith('install-'));
  assert.deepEqual(JSON.parse(readFileSync(path.join(config.outputRoot, journalName))).installed, []);
});

test('CLI help and unknown arguments are explicit', async () => {
  assert.match(await runCli(['--help']), /new.*import.*validate.*install/u);
  await assert.rejects(runCli(['install', '--apply']), /candidate-root/u);
  await assert.rejects(runCli(['new', '--source-root', '/tmp', '--source-root', '/tmp']), /repeated/u);
});
