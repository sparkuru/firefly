import { writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { parseDocument } from 'yaml';
import { exactObject } from '../../../plugins/memos/validation.mjs';
import { MAX_BODY_BYTES, normalizeBody, normalizeDisplayName, normalizePublicId, timestamp } from '../../../plugins/memos/public.mjs';
import { decodeUtf8, makeSafeDirectory, readFile, safeDirectory, safeRelative, walkFiles } from './files.mjs';

const fail = (message) => { throw new TypeError(`Invalid Memo source: ${message}`); };

export function parseMemoSource(bytes, displayName) {
  const text = decodeUtf8(bytes).replace(/\r\n?/gu, '\n');
  const match = /^---\n([\s\S]*?)\n---(?:\n|$)([\s\S]*)$/u.exec(text);
  if (!match) fail('expected leading YAML front matter.');
  const document = parseDocument(match[1], { uniqueKeys: true, version: '1.2', schema: 'core', customTags: [] });
  if (document.errors.length || document.warnings.length) fail('front matter must be strict YAML.');
  let metadata;
  try { metadata = document.toJS({ maxAliasCount: 0 }); } catch { fail('YAML aliases are unsupported.'); }
  exactObject(metadata, ['id', 'createdAt', 'draft'], ['id', 'createdAt', 'draft'], fail, 'front matter');
  const id = normalizePublicId(metadata.id);
  const createdAt = timestamp(metadata.createdAt, 'createdAt');
  if (typeof metadata.draft !== 'boolean') fail('draft must be boolean.');
  // Drafts receive the same safety/size checks, but their empty template is valid.
  const body = match[2];
  if (metadata.draft && !body.trim()) {
    if (Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES || /[^\t\n ]/u.test(body)) fail('empty draft must contain only bounded whitespace.');
  } else normalizeBody(body);
  return { id, createdAt, draft: metadata.draft, displayName: normalizeDisplayName(displayName), body };
}

export function readMemoSources(sourceRoot, displayName, acceptedMemos = []) {
  const root = safeDirectory(sourceRoot);
  const seen = new Set();
  const memos = [];
  for (const file of walkFiles(root)) {
    if (file === '.gitkeep' || file.startsWith('assets/')) continue;
    if (!file.endsWith('.md')) fail('source root contains an unsupported file; expected Markdown or assets/.');
    const memo = parseMemoSource(readFile(root, file, 256 * 1024), displayName);
    const accepted = acceptedMemos.find((previous) => previous.id === memo.id);
    if (accepted && accepted.createdAt !== memo.createdAt) fail('accepted createdAt is immutable, including drafts.');
    if (seen.has(memo.id)) fail('duplicate stable ID, including drafts.');
    seen.add(memo.id);
    if (!memo.draft) {
      const { draft: _draft, ...publicMemo } = memo;
      memos.push(publicMemo);
    }
  }
  return memos;
}

export function newMemo({ sourceRoot, name, now = new Date().toISOString() }) {
  if (typeof name !== 'string' || name.includes('/') || name.trim() !== name) fail('new name must be a safe filename.');
  const filename = safeRelative(name.endsWith('.md') ? name : `${name}.md`);
  makeSafeDirectory(sourceRoot);
  const root = safeDirectory(sourceRoot);
  const createdAt = timestamp(now, 'createdAt');
  const id = `m_${randomBytes(18).toString('base64url')}`;
  writeFileSync(path.join(root, filename), `---\nid: ${id}\ncreatedAt: ${createdAt}\ndraft: true\n---\n`, { flag: 'wx', mode: 0o600 });
  return { id, createdAt, filename };
}
