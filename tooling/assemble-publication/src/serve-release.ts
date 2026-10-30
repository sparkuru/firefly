import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readPluginAccess, pluginForPublicPath } from './plugins/access.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const { readFile: readMemoFile } = await import(pathToFileURL(path.join(repositoryRoot, 'tooling/publish-memos/src/files.mjs')).href) as { readFile: (root: string, relative: string) => Buffer };
const types = new Map([['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'], ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.png', 'image/png']]);
const mediaTypes = new Map([
  ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.gif', 'image/gif'],
  ['.webp', 'image/webp'], ['.avif', 'image/avif'],
  ['.mp4', 'video/mp4'], ['.webm', 'video/webm'], ['.ogv', 'video/ogg'], ['.mov', 'video/quicktime'],
  ['.mp3', 'audio/mpeg'], ['.m4a', 'audio/mp4'], ['.ogg', 'audio/ogg'], ['.oga', 'audio/ogg'],
  ['.wav', 'audio/wav'], ['.flac', 'audio/flac']
]);

type ByteRange = { start: number; end: number } | 'unsatisfiable' | undefined;

function selectByteRange(value: string | undefined, size: number): ByteRange {
  const match = value === undefined ? null : /^bytes=(\d*)-(\d*)$/iu.exec(value.trim());
  if (!match || (!match[1] && !match[2])) return undefined;

  const length = BigInt(size);
  const first = match[1] ? BigInt(match[1]) : undefined;
  const last = match[2] ? BigInt(match[2]) : undefined;
  if (first !== undefined && last !== undefined && last < first) return undefined;
  if (length === 0n || (first === undefined && last === 0n)) return 'unsatisfiable';
  if (first !== undefined && first >= length) return 'unsatisfiable';

  const start = first ?? (last! >= length ? 0n : length - last!);
  const end = first === undefined || last === undefined || last >= length ? length - 1n : last;
  return { start: Number(start), end: Number(end) };
}

export async function createPublicationServer(options: { releaseRoot: string; memoPublicRoot?: string }) {
  const releaseRoot = path.resolve(options.releaseRoot);
  const pluginAccess = await readPluginAccess(releaseRoot);
  const memoPublicRoot = options.memoPublicRoot;
  return createServer(async (request, response) => {
    let requestPath: string;
    try {
      const raw = request.url ?? '/';
      if (!raw.startsWith('/')) throw new Error('Expected an origin-form request target.');
      requestPath = path.posix.normalize(decodeURIComponent(new URL(`http://localhost${raw}`).pathname));
    }
    catch { response.writeHead(400); response.end('Invalid request'); return; }
    let plugin;
    try { plugin = pluginForPublicPath(requestPath, pluginAccess); }
    catch { response.writeHead(400); response.end('Invalid request'); return; }
    if (plugin !== null && (plugin === 'comments' || (pluginAccess.schemaVersion === 1 && !pluginAccess.plugins.memos.enabled))) {
      response.writeHead(404, { 'Cache-Control': 'no-cache, no-store', 'X-Content-Type-Options': 'nosniff' }); response.end(); return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405, { Allow: 'GET, HEAD', ...(plugin === 'memos' ? { 'Cache-Control': 'no-cache, no-store' } : {}) }); response.end(); return; }
    if (requestPath === '/memos') { response.writeHead(301, { Location: '/memos/', 'Cache-Control': 'no-cache, no-store' }); response.end(); return; }
    if (requestPath.startsWith('/memos/') && pluginAccess.schemaVersion === 1) {
      try {
        if (!memoPublicRoot) throw new Error('independent Memo mount not selected');
        const relative = requestPath.slice('/memos/'.length) || 'index.html';
        const bytes = readMemoFile(memoPublicRoot, relative);
        response.writeHead(200, { 'Content-Type': types.get(path.extname(relative)) ?? 'application/octet-stream', 'Cache-Control': 'no-cache, no-store', 'X-Content-Type-Options': 'nosniff' });
        response.end(request.method === 'HEAD' ? undefined : bytes);
      } catch { response.writeHead(404, { 'Cache-Control': 'no-cache, no-store' }); response.end('Memo static artifact unavailable'); }
      return;
    }
    let target = path.join(releaseRoot, requestPath.replace(/^\/+/, ''));
    if (!path.relative(releaseRoot, target).startsWith('..')) {
      try {
        if ((await stat(target)).isDirectory()) target = path.join(target, 'index.html');
        const file = await stat(target);
        if (file.isFile()) {
          const extension = path.extname(target).toLowerCase();
          const contentType = types.get(extension) ?? mediaTypes.get(extension) ?? 'application/octet-stream';
          // No validators are emitted here, so If-Range cannot be verified.
          const range = request.method === 'GET' && request.headers['if-range'] === undefined
            ? selectByteRange(request.headers.range, file.size) : undefined;
          if (range === 'unsatisfiable') {
            response.writeHead(416, {
              'Accept-Ranges': 'bytes',
              'Content-Range': `bytes */${file.size}`,
              'Content-Length': 0,
              'Content-Type': contentType
            });
            response.end();
            return;
          }
          const length = range ? range.end - range.start + 1 : file.size;
          response.writeHead(range ? 206 : 200, {
            'Accept-Ranges': 'bytes',
            'Content-Length': length,
            'Content-Type': contentType,
            ...(range ? { 'Content-Range': `bytes ${range.start}-${range.end}/${file.size}` } : {})
          });
          if (request.method === 'HEAD') response.end();
          else createReadStream(target, range).pipe(response);
          return;
        }
      } catch { /* The owning static fallback below handles a missing route. */ }
    }
    const fallback = requestPath.startsWith('/lab/nerv/') ? 'lab/nerv/404.html' : '404.html';
    response.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
    if (request.method === 'HEAD') response.end(); else createReadStream(path.join(releaseRoot, fallback)).pipe(response);
  });
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const server = await createPublicationServer({ releaseRoot: path.join(repositoryRoot, 'dist'), memoPublicRoot: process.env.FIREFLY_MEMOS_PUBLIC_ROOT });
  server.listen(Number(process.env.PUBLICATION_PORT ?? '4322'), process.env.PUBLICATION_HOST ?? '0.0.0.0', () => {
    process.stdout.write('Publication server ready; release-bound access validated and static reading available\n');
  });
}
