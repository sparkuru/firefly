import { createReadStream } from 'node:fs';
import { stat } from 'node:fs/promises';
import { createServer } from 'node:http';
import path from 'node:path';

const repositoryRoot = path.resolve(import.meta.dirname, '../../../..');
const releaseRoot = path.join(repositoryRoot, 'dist');
const port = Number(process.env.PUBLICATION_PORT ?? '4322');
const types = new Map([
  ['.css', 'text/css; charset=utf-8'],
  ['.html', 'text/html; charset=utf-8'],
  ['.js', 'application/javascript; charset=utf-8'],
  ['.svg', 'image/svg+xml']
]);

createServer(async (request, response) => {
  const requestPath = new URL(request.url ?? '/', 'http://localhost').pathname;
  const relative = decodeURIComponent(requestPath).replace(/^\/+/, '');
  let target = path.join(releaseRoot, relative);
  if (!path.relative(releaseRoot, target).startsWith('..')) {
    try {
      const current = await stat(target);
      if (current.isDirectory()) {
        target = path.join(target, 'index.html');
      }
      const finalStats = await stat(target);
      if (finalStats.isFile()) {
        response.statusCode = 200;
        response.setHeader('Content-Type', types.get(path.extname(target)) ?? 'application/octet-stream');
        createReadStream(target).pipe(response);
        return;
      }
    } catch {
      // The mounted fallback below owns not-found behavior.
    }
  }
  const fallback = requestPath.startsWith('/lab/nerv/')
    ? path.join(releaseRoot, 'lab/nerv/404.html')
    : path.join(releaseRoot, '404.html');
  response.statusCode = 404;
  response.setHeader('Content-Type', 'text/html; charset=utf-8');
  createReadStream(fallback).pipe(response);
}).listen(port, '0.0.0.0', () => {
  process.stdout.write(`Publication server listening on ${port}\n`);
});
