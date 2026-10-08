import { parse } from 'parse5';
import { constants } from 'node:fs';
import { lstat, mkdir, open, readdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const stageAssets = fileURLToPath(new URL('../../.generated-content/memos/assets/', import.meta.url));
const prefix = '/pages/memos/assets/';

export function normalizeMemoAssetPath(relative) {
  try {
    relative = relative.split('/').map((part) => { const decoded = decodeURIComponent(part); if (/[\\/%]/u.test(decoded)) throw new Error(); return decoded; }).join('/');
  } catch { throw new Error('Malformed Memo asset URL.'); }
  if (!relative || relative.split('/').some((part) => !part || part.startsWith('.') || /[\\%?#\p{Cc}\p{Cf}\p{Cs}\u2028\u2029]/u.test(part) || part.normalize('NFC') !== part)) throw new Error('Unsafe Memo asset reference.');
  return relative;
}

async function assetBytes(relative, root = stageAssets) {
  relative = normalizeMemoAssetPath(relative);
  let current = root;
  for (const part of relative.split('/')) {
    current = path.join(current, part);
    const stat = await lstat(current).catch(() => null);
    if (!stat || stat.isSymbolicLink()) throw new Error('Missing or unsafe contained Memo asset.');
  }
  const handle = await open(current, constants.O_RDONLY | constants.O_NOFOLLOW);
  try {
    if (!(await handle.stat()).isFile()) throw new Error('Memo asset is not a regular file.');
    return await handle.readFile();
  } finally { await handle.close(); }
}

export function memoAssetReferences(html) {
  const references = new Set();
  const visit = (node) => {
    for (const attribute of node.attrs ?? []) {
      if (!['src', 'href'].includes(attribute.name) || !attribute.value.startsWith(prefix)) continue;
      references.add(normalizeMemoAssetPath(attribute.value.slice(prefix.length).split(/[?#]/u)[0]));
    }
    for (const child of node.childNodes ?? []) visit(child);
    if (node.content) visit(node.content);
  };
  visit(parse(html));
  return references;
}

export async function publishMemoAssets(output, root = stageAssets) {
  const assets = new Set();
  const scan = async (directory) => {
    for (const child of await readdir(directory, { withFileTypes: true })) {
      const filename = path.join(directory, child.name);
      if (child.isDirectory()) await scan(filename);
      else if (child.isFile() && child.name.endsWith('.html')) {
        const handle = await open(filename, 'r');
        try { for (const asset of memoAssetReferences(await handle.readFile('utf8'))) assets.add(asset); }
        finally { await handle.close(); }
      }
    }
  };
  await scan(output);
  for (const relative of assets) {
    const bytes = await assetBytes(relative, root);
    const destination = path.join(output, 'pages/memos/assets', relative);
    await mkdir(path.dirname(destination), { recursive: true });
    await writeFile(destination, bytes);
  }
  return assets;
}

export async function memoAssetDimensions(reference) {
  if (!reference.startsWith(prefix)) return null;
  const relative = reference.slice(prefix.length).split(/[?#]/u)[0];
  const bytes = await assetBytes(relative);
  if (bytes.length >= 24 && bytes.subarray(0, 8).equals(Buffer.from([137,80,78,71,13,10,26,10]))) return { width: bytes.readUInt32BE(16), height: bytes.readUInt32BE(20) };
  if (bytes[0] === 255 && bytes[1] === 216) {
    let offset = 2;
    while (offset + 8 < bytes.length) {
      if (bytes[offset] !== 255) break;
      const marker = bytes[offset + 1];
      const length = bytes.readUInt16BE(offset + 2);
      if ([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)) return { width: bytes.readUInt16BE(offset + 7), height: bytes.readUInt16BE(offset + 5) };
      if (length < 2) break;
      offset += length + 2;
    }
  }
  return null;
}

export function createMemoAssetsIntegration() {
  return {
    name: 'firefly-memo-assets',
    hooks: {
      'astro:build:done': async ({ dir }) => { await publishMemoAssets(fileURLToPath(dir)); },
      'astro:server:setup': ({ server }) => {
        server.middlewares.use(async (request, response, next) => {
          if (!request.url?.startsWith(prefix)) return next();
          try {
            const relative = request.url.slice(prefix.length).split(/[?#]/u)[0];
            const bytes = await assetBytes(relative);
            const ext = path.extname(relative).toLowerCase();
            const mime = { '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp', '.pdf': 'application/pdf' }[ext] ?? 'application/octet-stream';
            response.setHeader('Content-Type', mime);
            response.end(bytes);
          } catch { response.statusCode = 404; response.end('Not found'); }
        });
      }
    }
  };
}
