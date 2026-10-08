import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { parseDocument, stringify } from 'yaml';
import { memoSchema } from '../src/lib/content-schema.mjs';

export function stageMemoSource(source, owner) {
  const match = /^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/u.exec(source);
  if (!match) throw new Error('Memo requires front matter: ' + owner);
  const parsed = parseDocument(match[1], { uniqueKeys: true });
  if (parsed.errors.length) throw new Error('Invalid Memo YAML: ' + owner);
  const data = memoSchema.safeParse(parsed.toJS());
  if (!data.success) throw new Error('Invalid Memo metadata: ' + owner + ' (' + data.error.issues.map((issue) => issue.path.join('.') + ': ' + issue.message).join('; ') + ')');
  const body = source.slice(match[0].length);
  if (/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(body)) throw new Error('Unsafe Memo body control: ' + owner);
  if (!body.trim() && !data.data.draft) throw new Error('Published Memo requires a body: ' + owner);
  return { id: data.data.id, data: data.data, markdown: '---\n' + stringify({ ...parsed.toJS(), layout: 'memo', presentation: 'memo' }) + '---\n' + body };
}

export const memoAggregateSource = (date = '2026-10-07T00:00:00.000Z') => [
  '---', 'title: Memos', 'description: Thoughts and notes along a shared timeline.',
  'date: ' + date, 'draft: false', 'slug: memos',
  'layout: timeline', 'presentation: memo', '---', '',
  'Thoughts and notes, found by moving through time.', '',
  '[Open the Memo timeline](/pages/memos/)', ''
].join('\n');

const allowedAssets = new Set(['.png', '.jpg', '.jpeg', '.gif', '.webp', '.avif', '.pdf', '.mp3', '.mp4', '.ogg']);
const safeAssetSegment = (value) => value.normalize('NFC') === value && !value.startsWith('.') && !/[\\/?#%\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/u.test(value);

export async function copyMemoAssets(sourceRoot, targetRoot) {
  const assets = path.join(sourceRoot, 'assets');
  const rootStat = await lstat(assets).catch((error) => { if (error.code === 'ENOENT') return null; throw error; });
  if (rootStat === null) return;
  if (!rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Memo assets require a regular contained directory.');
  const folded = new Set();
  const walk = async (directory, segments) => {
    const children = await readdir(directory, { withFileTypes: true });
    for (const child of children.sort((a, b) => a.name < b.name ? -1 : 1)) {
      if (!safeAssetSegment(child.name) || child.isSymbolicLink()) throw new Error('Unsafe Memo asset path.');
      const parts = [...segments, child.name];
      const key = parts.join('/').normalize('NFKC').toLowerCase().replaceAll('ß', 'ss').replaceAll('ς', 'σ');
      if (folded.has(key)) throw new Error('Memo asset path collision.');
      folded.add(key);
      const filename = path.join(directory, child.name);
      if (child.isDirectory()) { await walk(filename, parts); continue; }
      if (!child.isFile() || !allowedAssets.has(path.extname(child.name).toLowerCase())) throw new Error('Unsupported Memo asset type.');
      const before = await lstat(filename);
      const handle = await open(filename, constants.O_RDONLY | constants.O_NOFOLLOW);
      try {
        const current = await handle.stat();
        if (!current.isFile() || current.dev !== before.dev || current.ino !== before.ino) throw new Error('Memo asset changed during materialization.');
        const destination = path.join(targetRoot, 'assets', ...parts);
        await mkdir(path.dirname(destination), { recursive: true });
        await writeFile(destination, await handle.readFile());
      } finally { await handle.close(); }
    }
  };
  await walk(assets, []);
}
