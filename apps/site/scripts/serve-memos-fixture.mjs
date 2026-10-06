import { createServer } from 'node:http';
import path from 'node:path';
import { readFile as readMemoFile } from '../../../tooling/publish-memos/src/files.mjs';
import { memoFixtureRoot } from '../tests/memos-fixture.mjs';
import { readPluginAccess } from '../../../plugins/public-access-files.mjs';
import { pluginForPublicPath } from '../../../plugins/public-access.mjs';
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml', '.json': 'application/json' };
export function createMemoFixtureServer(outputRoot = path.join(memoFixtureRoot, 'blog'), candidateRoot = path.join(memoFixtureRoot, 'memo'), emptyRoot = path.join(memoFixtureRoot, 'empty')) {
  return createServer(async (request, response) => {
    let pathname;
    try { pathname = decodeURIComponent(new URL(`http://fixture.invalid${request.url ?? '/'}`).pathname).replace(/\/{2,}/gu, '/'); }
    catch { response.writeHead(400); response.end('Invalid request'); return; }
    let plugin;
    try {
      plugin = pathname === '/fixture-empty/' ? 'memos' : pluginForPublicPath(pathname);
      if (plugin && !(await readPluginAccess(outputRoot)).plugins[plugin].enabled) {
        response.writeHead(404, { 'Cache-Control': 'no-cache, no-store' }); response.end('Not found'); return;
      }
    } catch {
      response.writeHead(404, { 'Cache-Control': 'no-cache, no-store' }); response.end('Not found'); return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) { response.writeHead(405); response.end(); return; }
    if (pathname === '/memos') { response.writeHead(301, { Location: '/memos/' }); response.end(); return; }
    const memo = pathname.startsWith('/memos/');
    let root = memo ? path.join(candidateRoot, 'public') : outputRoot;
    let relative = memo ? pathname.slice('/memos/'.length) : pathname.replace(/^\/+/, '');
    if (pathname === '/fixture-empty/') { root = path.join(emptyRoot, 'public'); relative = 'index.html'; }
    else if (pathname.endsWith('/')) relative += 'index.html';
    try {
      const bytes = readMemoFile(root, relative);
      response.writeHead(200, { 'Content-Type': types[path.extname(relative)] ?? 'application/octet-stream' });
      response.end(request.method === 'HEAD' ? undefined : bytes);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}
if (process.argv[1] === import.meta.filename) createMemoFixtureServer().listen(4321, '0.0.0.0');
