import assert from 'node:assert/strict';
import { createHash, randomBytes } from 'node:crypto';
import { existsSync, linkSync, lstatSync, mkdirSync, unlinkSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { decodeReceipt } from '../publish-memos/src/history.mjs';
import { decodeUtf8, makeSafeDirectory, overlaps, readFile, safeDirectory, safeRelative, walkFiles } from '../publish-memos/src/files.mjs';

const require = createRequire(new URL('../publish-memos/package.json', import.meta.url));
const { parseDocument } = require('yaml');
const dependency = async (name) => import(pathToFileURL(require.resolve(name)).href);
const [{ unified }, { default: remarkParse }, { default: remarkGfm }] = await Promise.all(['unified', 'remark-parse', 'remark-gfm'].map(dependency));
const { parseFragment } = await dependency('parse5');
const parser = unified().use(remarkParse).use(remarkGfm);
const repo = fileURLToPath(new URL('../../', import.meta.url));
const ID = /^m_[A-Za-z0-9_-]{3,128}$/u;
const digest = (bytes) => createHash('sha256').update(bytes).digest('hex');
const fail = (message) => { throw new TypeError(`Memo documents: ${message}`); };
const json = (filename) => JSON.parse(decodeUtf8(readFile(path.dirname(filename), path.basename(filename))));
const utc = (value) => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value) || !Number.isFinite(Date.parse(value)) || new Date(value).toISOString() !== value) fail('expected a precise canonical UTC date.');
  return value;
};
const idFor = (value) => { if (typeof value !== 'string' || !ID.test(value)) fail('invalid stable identity.'); return value; };
const titleFor = (value) => {
  if (value !== undefined && (typeof value !== 'string' || !value.trim() || /\p{Cc}/u.test(value))) fail('title must be one safe nonempty line of text.');
  return value;
};
const textBody = (bytes) => {
  if (bytes.length > 128 * 1024) fail('body exceeds the 128 KiB limit.');
  const body = decodeUtf8(bytes);
  if (/[^\t\n\r\P{Cc}]/u.test(body) || /\p{Cs}/u.test(body)) fail('unsupported body control character.');
  return body;
};

export function parseDocumentSource(bytes, legacy = false) {
  if (bytes.length > 256 * 1024) fail('source exceeds the 256 KiB limit.');
  const text = decodeUtf8(bytes);
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)([\s\S]*)$/u.exec(text);
  if (!match) fail('missing leading metadata.');
  const yaml = parseDocument(match[1], { uniqueKeys: true, schema: 'core', version: '1.2', customTags: [] });
  if (yaml.errors.length || yaml.warnings.length) fail('invalid metadata.');
  let metadata;
  try { metadata = yaml.toJS({ maxAliasCount: 0 }); } catch { fail('metadata aliases are unsupported.'); }
  if (!metadata || typeof metadata !== 'object' || Array.isArray(metadata)) fail('metadata must be an object.');
  idFor(metadata.id);
  utc(metadata[legacy ? 'createdAt' : 'date']);
  if (typeof metadata.draft !== 'boolean') fail('draft must be boolean.');
  titleFor(metadata.title);
  if (legacy && Object.keys(metadata).sort().join(',') !== 'createdAt,draft,id') fail('unexpected legacy metadata.');
  textBody(Buffer.from(match[2]));
  return { metadata, body: match[2] };
}

function documentBytes(metadata, body) {
  titleFor(metadata.title);
  return Buffer.from(`---\nid: ${idFor(metadata.id)}\ndate: ${utc(metadata.date)}\ndraft: ${metadata.draft ? 'true' : 'false'}\n${metadata.title ? `title: ${JSON.stringify(metadata.title)}\n` : ''}---\n${body}`);
}

export function newDocument({ sourceRoot, name, now = new Date().toISOString() } = {}) {
  const root = sourceRoot ?? path.join(process.env.FIREFLY_CONTENT_ROOT ?? path.join(repo, 'content'), 'memos');
  const date = utc(now);
  const filename = name ?? `${date.slice(0, 10).replaceAll('-', '')}-${date.slice(11, 19).replaceAll(':', '')}.md`;
  if (typeof filename !== 'string' || filename.includes('/') || !filename.endsWith('.md') || filename.startsWith('.')) fail('new name must be a nonhidden Markdown filename.');
  safeRelative(filename);
  makeSafeDirectory(root);
  writeFileSync(path.join(safeDirectory(root), filename), documentBytes({ id: `m_${randomBytes(18).toString('base64url')}`, date, draft: true }, ''), { flag: 'wx', mode: 0o600 });
  return { created: 1, draft: true };
}

function visit(node, callback) {
  callback(node);
  for (const child of node.children ?? []) visit(child, callback);
}

function destinationSpan(node, body) {
  const start = node.position.start.offset;
  const source = body.slice(start, node.position.end.offset);
  if (node.type === 'definition') {
    const match = /^ {0,3}\[[^\n]*?\]:\s*(?:<([^>\n]*)>|([^\s]+))/u.exec(source);
    if (!match) fail('unsupported reference definition.');
    const value = match[1] ?? match[2];
    const local = match[0].lastIndexOf(value);
    return [start + local, start + local + value.length];
  }
  if (source.startsWith('<') && source.endsWith('>')) return [start + 1, start + source.length - 1];
  if (!source.startsWith('[') && !source.startsWith('![')) fail('unsupported bare local destination.');
  let index = source.startsWith('!') ? 2 : 1;
  let brackets = 1;
  while (index < source.length && brackets) {
    if (source[index] === '\\') { index += 2; continue; }
    if (source[index] === '[') brackets += 1;
    if (source[index] === ']') brackets -= 1;
    index += 1;
  }
  if (source[index] !== '(') fail('unsupported inline destination.');
  index += 1;
  while (/\s/u.test(source[index] ?? '') && index < source.length) index += 1;
  if (source[index] === '<') {
    const close = source.indexOf('>', index + 1);
    if (close < 0) fail('unclosed destination.');
    return [start + index + 1, start + close];
  }
  const beginning = index;
  let nesting = 0;
  for (; index < source.length; index += 1) {
    if (source[index] === '\\') { index += 1; continue; }
    if (source[index] === '(') nesting += 1;
    else if (source[index] === ')') { if (!nesting) break; nesting -= 1; }
    else if (/\s/u.test(source[index]) && !nesting) break;
  }
  if (index === beginning) fail('empty destination.');
  return [start + beginning, start + index];
}

export function rebaseBody(body, ids, assets) {
  const patches = [];
  const target = (url) => {
    if (url.startsWith('/memos/#')) {
      const id = url.slice('/memos/#'.length);
      if (!ids.has(id)) fail('unknown legacy entry destination.');
      return `/pages/memos/${id}/`;
    }
    const reference = url.startsWith('/memos/assets/') ? url.slice('/memos/'.length) : url.startsWith('./assets/') ? url.slice(2) : url;
    if (reference.startsWith('assets/')) {
      const [, pathname, suffix = ''] = /^([^?#]*)([?#][\s\S]*)?$/u.exec(reference);
      const parts = pathname.split('/').map((part) => {
        let decoded;
        try { decoded = decodeURIComponent(part); } catch { fail('malformed owned asset URL.'); }
        if (decoded.includes('/')) fail('encoded asset path separators are unsupported.');
        return decoded;
      });
      const relative = safeRelative(parts.join('/'));
      if (!assets.has(relative)) fail('missing owned asset.');
      return `/pages/memos/${parts.map((part) => encodeURIComponent(part).replace(/'/gu, '%27')).join('/')}${suffix}`;
    }
    return null;
  };
  visit(parser.parse(body), (node) => {
    if (['link', 'image', 'definition'].includes(node.type)) {
      const after = target(node.url);
      if (after) {
        const [start, end] = destinationSpan(node, body);
        patches.push({ start, end, before: body.slice(start, end), after, reason: after.includes('/assets/') ? 'asset-route' : 'entry-route' });
      }
    } else if (node.type === 'html') {
      // Source locations identify actual attributes while preserving comments,
      // labels, quote style and every non-destination byte in the authored HTML.
      const visitHtml = (element) => {
        for (const attribute of element.attrs ?? []) {
          if (attribute.prefix || !['href', 'src'].includes(attribute.name)) continue;
          const location = element.sourceCodeLocation?.attrs?.[attribute.name];
          if (!location) fail('HTML destination has no source location.');
          const source = node.value.slice(location.startOffset, location.endOffset);
          const equals = source.indexOf('=');
          if (equals < 0) continue;
          let beginning = equals + 1;
          while (/\s/u.test(source[beginning] ?? '') && beginning < source.length) beginning += 1;
          const quote = ['"', "'"].includes(source[beginning]) ? source[beginning++] : null;
          const end = quote ? source.length - 1 : source.length;
          const before = source.slice(beginning, end);
          const destination = target(attribute.value);
          if (!destination) continue;
          const after = destination.replaceAll('&', '&amp;').replaceAll('<', '&lt;').replaceAll('>', '&gt;')
            .replaceAll('"', '&quot;').replaceAll("'", '&#39;').replace(/\s/gu, (value) => `&#${value.codePointAt(0)};`);
          const start = node.position.start.offset + location.startOffset + beginning;
          patches.push({ start, end: start + before.length, before, after, reason: after.includes('/assets/') ? 'asset-route' : 'entry-route' });
        }
        for (const child of element.childNodes ?? []) visitHtml(child);
        if (element.content) visitHtml(element.content);
      };
      visitHtml(parseFragment(node.value, { sourceCodeLocationInfo: true }));
    }
  });
  patches.sort((a, b) => a.start - b.start);
  let position = 0;
  let converted = '';
  for (const patch of patches) {
    if (patch.start < position) fail('overlapping body transformations.');
    converted += body.slice(position, patch.start) + patch.after;
    position = patch.end;
  }
  converted += body.slice(position);
  const code = (value) => {
    const snippets = [];
    visit(parser.parse(value), (node) => { if (node.type === 'code' || node.type === 'inlineCode') snippets.push(value.slice(node.position.start.offset, node.position.end.offset)); });
    return snippets;
  };
  assert.deepEqual(code(converted), code(body), 'Code bytes must remain unchanged');
  return { body: converted, patches };
}

function inventory(root) {
  return walkFiles(root).map((relative) => {
    const bytes = readFile(root, relative);
    return { path: relative, bytes: bytes.length, digest: digest(bytes) };
  });
}

function assertInventory(root, manifest) {
  if (!Array.isArray(manifest)) fail('missing manifest.');
  assert.deepEqual(inventory(root), [...manifest].sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0), 'Exact manifest mismatch');
}

function writePrivate(root, relative, bytes) {
  const filename = path.join(root, safeRelative(relative));
  makeSafeDirectory(path.dirname(filename));
  writeFileSync(filename, bytes, { flag: 'wx', mode: 0o600 });
}

function assertSeparate(output, inputs) {
  if (inputs.some((input) => overlaps(output, input) || overlaps(input, output))) fail('input and output roots must not overlap.');
}

function snapshot(filename) {
  const stats = lstatSync(filename);
  if (!stats.isFile() || stats.isSymbolicLink()) fail('baseline input must be a regular file.');
  const bytes = readFile(path.dirname(filename), path.basename(filename));
  return { path: filename, bytes: bytes.length, digest: digest(bytes), device: stats.dev, inode: stats.ino, mode: stats.mode & 0o777, modified: stats.mtimeMs };
}

export async function importCorpus(config) {
  const { notesRoot, conversionReport, sourceMapping, database, commentDocumentRef, shortRoot, outputRoot, historyFiles, expectedDumpDigest } = config;
  if (!Array.isArray(historyFiles) || historyFiles.length === 0) fail('explicit retained receipt evidence is required.');
  const histories = historyFiles.map((filename) => decodeReceipt(json(filename)));
  const retired = new Set(histories.flatMap((history) => history.retiredIds));
  const accepted = new Map();
  for (const history of histories) for (const memo of history.acceptedMemos) {
    if (accepted.has(memo.id) && accepted.get(memo.id) !== memo.createdAt) fail('retained accepted dates disagree.');
    accepted.set(memo.id, memo.createdAt);
  }
  const report = json(conversionReport);
  const mapping = json(sourceMapping);
  assertInventory(notesRoot, report.manifest);
  const inputSnapshots = [database, conversionReport, sourceMapping, ...historyFiles, ...report.manifest.map((item) => path.join(notesRoot, item.path)), ...walkFiles(shortRoot).map((item) => path.join(shortRoot, item))].map(snapshot);
  if (report.included !== 89 || report.reports.length !== 89 || report.manifest.filter((item) => item.path.startsWith('assets/')).length !== 211) fail('retained corpus count mismatch.');
  const assets = new Set(report.manifest.filter((item) => item.path.startsWith('assets/')).map((item) => item.path));
  const notes = report.reports.map((record) => {
    const bytes = readFile(notesRoot, record.filename, 256 * 1024);
    const parsed = parseDocumentSource(bytes, true);
    if (digest(bytes) !== record.sourceDigest || bytes.length !== record.sourceBytes || digest(Buffer.from(parsed.body)) !== record.convertedBodyDigest || Buffer.byteLength(parsed.body) !== record.convertedBodyBytes) fail('retained note hash mismatch.');
    const source = mapping.find((item) => item.id === record.id);
    if (!source || source.memoRef !== record.memoRef || source.createdAt !== record.createdAt || parsed.metadata.id !== record.id || parsed.metadata.createdAt !== record.createdAt || parsed.metadata.draft !== false) fail('retained note correspondence mismatch.');
    return { origin: 'note', sourceRef: record.memoRef, filename: record.filename, id: record.id, date: record.createdAt, title: source.title, body: parsed.body, originalDigest: digest(Buffer.from(parsed.body)), inputDigest: digest(bytes) };
  });
  const { DatabaseSync } = await import('node:sqlite');
  const db = new DatabaseSync(database, { readOnly: true });
  let shortEntries;
  try {
    if (db.prepare('SELECT dump_sha256 FROM run').get()?.dump_sha256 !== expectedDumpDigest) fail('retained database baseline mismatch.');
    shortEntries = db.prepare('SELECT comment_ref, created, body FROM comments WHERE document_ref = ? ORDER BY created, comment_ref').all(commentDocumentRef);
  } finally { db.close(); }
  if (shortEntries.length !== 180) fail('historical entry count mismatch.');
  const shorts = shortEntries.map((row) => {
    if (!Number.isSafeInteger(row.created) || typeof row.body !== 'string' || !row.body.trim()) fail('invalid historical entry.');
    const date = new Date(row.created * 1000).toISOString();
    const local = new Date(row.created * 1000 + 8 * 3600 * 1000).toISOString();
    const filename = `${local.slice(0, 10).replaceAll('-', '')}-${local.slice(11, 19).replaceAll(':', '')}.md`;
    const bytes = readFile(shortRoot, filename, 256 * 1024);
    if (!bytes.equals(Buffer.from(row.body))) fail('historical body bytes disagree with retained database.');
    return { origin: 'short', sourceRef: row.comment_ref, filename, id: `m_${digest(`typecho-comment:${row.comment_ref}`)}`, date, body: textBody(bytes), originalDigest: digest(bytes), inputDigest: digest(bytes) };
  });
  if (walkFiles(shortRoot).length !== 180 || new Set(shorts.map((entry) => entry.filename)).size !== 180) fail('historical export inventory mismatch.');
  const entries = [...notes, ...shorts];
  const ids = new Set(entries.map((entry) => entry.id));
  if (ids.size !== 269 || new Set(entries.map((entry) => entry.filename)).size !== 269) fail('duplicate imported identities or filenames.');
  for (const entry of entries) {
    if (retired.has(entry.id)) fail('retired identity cannot be revived.');
    if (accepted.has(entry.id) && accepted.get(entry.id) !== entry.date) fail('accepted creation date is immutable.');
  }
  const output = path.resolve(outputRoot);
  assertSeparate(output, [notesRoot, shortRoot, database, conversionReport, sourceMapping, ...historyFiles]);
  if (existsSync(output)) fail('candidate output already exists.');
  // Validate all transforms before the first candidate write.
  const converted = entries.map((entry) => ({ ...entry, ...rebaseBody(entry.body, ids, assets) }));
  makeSafeDirectory(path.dirname(output));
  mkdirSync(output, { mode: 0o700 });
  for (const directory of ['workspace/posts', 'workspace/pages', 'workspace/memos']) makeSafeDirectory(path.join(output, directory));
  for (const entry of converted) writePrivate(output, `workspace/memos/${entry.filename}`, documentBytes({ id: entry.id, date: entry.date, draft: false, title: entry.title }, entry.body));
  for (const asset of assets) writePrivate(output, `workspace/memos/${asset}`, readFile(notesRoot, asset));
  const correspondence = converted.map(({ body, ...entry }) => ({ ...entry, convertedDigest: digest(Buffer.from(body)), convertedBytes: Buffer.byteLength(body) }));
  if (inputSnapshots.some((before) => JSON.stringify(snapshot(before.path)) !== JSON.stringify(before))) fail('an original input changed during import; preserve the failed candidate for inspection.');
  const payload = { schemaVersion: 1, count: entries.length, assets: assets.size, timezone: 'UTC+8', deletionFloor: Math.max(...histories.map((item) => item.deletionFloor)), historyDigests: histories.map((item) => item.digest), retiredIds: [...retired].sort(), inputSnapshots, correspondence, manifest: inventory(path.join(output, 'workspace')) };
  writePrivate(output, 'migration.private.json', `${JSON.stringify(payload, null, 2)}\n`);
  return validateCandidate(output);
}

export function validateCandidate(candidateRoot) {
  const root = safeDirectory(candidateRoot);
  const report = json(path.join(root, 'migration.private.json'));
  if (report.schemaVersion !== 1 || report.count !== 269 || report.assets !== 211 || report.correspondence.length !== 269) fail('invalid candidate report.');
  if (!Array.isArray(report.manifest) || report.manifest.length !== 480 ||
      report.manifest.filter((item) => /^memos\/[^/]+\.md$/u.test(item.path)).length !== 269 ||
      report.manifest.filter((item) => item.path.startsWith('memos/assets/')).length !== 211 ||
      !Array.isArray(report.retiredIds) || !Number.isSafeInteger(report.deletionFloor) || report.deletionFloor < 0) fail('candidate inventory or history mismatch.');
  const ids = new Set(report.correspondence.map((record) => idFor(record.id)));
  if (ids.size !== 269 || report.correspondence.filter((record) => record.origin === 'note').length !== 89 || report.correspondence.filter((record) => record.origin === 'short').length !== 180) fail('candidate origin correspondence mismatch.');
  const assets = new Set(report.manifest.filter((item) => item.path.startsWith('memos/assets/')).map((item) => item.path.slice('memos/'.length)));
  assertInventory(path.join(root, 'workspace'), report.manifest);
  const seen = new Set();
  for (const record of report.correspondence) {
    if (typeof record.filename !== 'string' || record.filename.includes('/') || !record.filename.endsWith('.md')) fail('candidate filename must be a direct Markdown source.');
    const bytes = readFile(path.join(root, 'workspace/memos'), record.filename);
    const parsed = parseDocumentSource(bytes);
    if (Object.keys(parsed.metadata).some((key) => !['id', 'date', 'draft', 'title'].includes(key)) || parsed.metadata.title !== record.title) fail('candidate metadata correspondence mismatch.');
    if (seen.has(parsed.metadata.id) || parsed.metadata.id !== record.id || parsed.metadata.date !== record.date || parsed.metadata.draft !== false || report.retiredIds.includes(record.id) || digest(Buffer.from(parsed.body)) !== record.convertedDigest || Buffer.byteLength(parsed.body) !== record.convertedBytes) fail('candidate record mismatch.');
    let original = parsed.body;
    let delta = record.patches.reduce((total, patch) => total + patch.after.length - patch.before.length, 0);
    for (const patch of [...record.patches].reverse()) {
      delta -= patch.after.length - patch.before.length;
      const offset = patch.start + delta;
      if (original.slice(offset, offset + patch.after.length) !== patch.after) fail('candidate patch correspondence mismatch.');
      original = original.slice(0, offset) + patch.before + original.slice(offset + patch.after.length);
    }
    if (digest(Buffer.from(original)) !== record.originalDigest) fail('candidate original body correspondence mismatch.');
    const forward = rebaseBody(original, ids, assets);
    if (forward.body !== parsed.body) fail('candidate body has an undeclared transformation.');
    assert.deepEqual(forward.patches, record.patches, 'Candidate link patch mismatch');
    seen.add(parsed.metadata.id);
  }
  return { entries: seen.size, assets: report.assets, changedBodies: report.correspondence.filter((item) => item.patches.length).length, linkPatches: report.correspondence.reduce((count, item) => count + item.patches.length, 0), privateReportDigest: digest(readFile(root, 'migration.private.json')) };
}

export function installCandidate({ candidateRoot, workspaceRoot, apply = false }) {
  validateCandidate(candidateRoot);
  const candidate = safeDirectory(path.join(candidateRoot, 'workspace/memos'));
  const workspace = safeDirectory(workspaceRoot);
  const target = path.join(workspace, 'memos');
  assertSeparate(candidate, [target]);
  let targetExists = true;
  try { lstatSync(target); } catch (error) {
    if (error.code !== 'ENOENT') throw error;
    targetExists = false;
  }
  const present = targetExists ? inventory(target) : [];
  const existingIds = new Map();
  for (const item of present.filter((item) => item.path.endsWith('.md') && !item.path.startsWith('assets/'))) {
    const { metadata } = parseDocumentSource(readFile(target, item.path));
    if (existingIds.has(metadata.id)) fail('duplicate target identities.');
    existingIds.set(metadata.id, item.path);
  }
  const report = json(path.join(safeDirectory(candidateRoot), 'migration.private.json'));
  const files = report.manifest.map((item) => ({ ...item, path: item.path.slice('memos/'.length) }));
  assertInventory(candidate, files);
  const unchanged = new Set();
  for (const file of files) {
    const existing = present.find((item) => item.path === file.path);
    if (existing && (existing.digest !== file.digest || existing.bytes !== file.bytes)) fail('existing target file conflicts; nothing installed.');
    if (existing) unchanged.add(file.path);
    if (file.path.endsWith('.md') && !file.path.startsWith('assets/')) {
      const { metadata } = parseDocumentSource(readFile(candidate, file.path));
      if (existingIds.has(metadata.id) && existingIds.get(metadata.id) !== file.path) fail('target identity conflicts; nothing installed.');
    }
  }
  const absent = files.filter((file) => !unchanged.has(file.path));
  if (!apply) return { checked: files.length, unchanged: unchanged.size, pending: absent.length, installed: 0 };
  const lock = path.join(workspace, '.memo-install.lock');
  writeFileSync(lock, '', { flag: 'wx', mode: 0o600 });
  const installed = [];
  try {
    // Recheck both trees under the exclusive install lock before any source write.
    assertInventory(candidate, files);
    assert.deepEqual(existsSync(target) ? inventory(target) : [], present, 'Target changed after preflight; nothing installed');
    makeSafeDirectory(target);
    for (const item of absent) {
      const filename = path.join(target, item.path);
      makeSafeDirectory(path.dirname(filename));
      const temporary = path.join(path.dirname(filename), `.memo-install-${randomBytes(12).toString('hex')}`);
      try {
        const bytes = readFile(candidate, item.path);
        if (bytes.length !== item.bytes || digest(bytes) !== item.digest) fail('candidate changed during installation; preserve the journal for inspection.');
        writeFileSync(temporary, bytes, { flag: 'wx', mode: 0o600 });
        // Hard-link commits a complete sibling file without replacing a racing user write.
        linkSync(temporary, filename);
        installed.push(item.path);
      } finally { if (existsSync(temporary)) unlinkSync(temporary); }
    }
    for (const item of files) {
      const bytes = readFile(target, item.path);
      if (digest(bytes) !== item.digest || bytes.length !== item.bytes) fail('post-install inventory mismatch.');
    }
  } finally {
    const journal = { schemaVersion: 1, expected: files, installed, unchanged: [...unchanged] };
    try { writePrivate(candidateRoot, `install-${Date.now()}-${randomBytes(6).toString('hex')}.private.json`, `${JSON.stringify(journal, null, 2)}\n`); }
    finally { unlinkSync(lock); }
  }
  return { checked: files.length, unchanged: unchanged.size, pending: 0, installed: installed.length };
}
