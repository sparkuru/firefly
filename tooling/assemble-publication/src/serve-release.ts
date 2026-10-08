import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { readPluginAccess, pluginForPublicPath } from './plugins/access.js';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const { readFile: readMemoFile } = await import(pathToFileURL(path.join(repositoryRoot, 'tooling/publish-memos/src/files.mjs')).href) as { readFile: (root: string, relative: string) => Buffer };
const types = new Map([['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'], ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json'], ['.svg', 'image/svg+xml'], ['.png', 'image/png']]);
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
        if ((await stat(target)).isFile()) {
          response.writeHead(200, { 'Content-Type': types.get(path.extname(target)) ?? 'application/octet-stream' });
          if (request.method === 'HEAD') response.end(); else createReadStream(target).pipe(response);
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
