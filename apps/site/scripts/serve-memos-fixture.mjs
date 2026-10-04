import { createServer } from 'node:http';
import path from 'node:path';
import { readContainedFile } from '../src/lib/contained-file.mjs';
import { memoFixtureRoot } from '../tests/memos-fixture.mjs';

const root = path.join(memoFixtureRoot, 'enabled');
const types = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.ico': 'image/x-icon', '.svg': 'image/svg+xml', '.xml': 'application/xml' };
export function createMemoFixtureServer(outputRoot = root) {
  return createServer((request, response) => {
    let relative;
    try {
      const url = new URL(request.url ?? '/', 'http://fixture.invalid');
      const pathname = decodeURIComponent(url.pathname);
      const candidate = path.resolve(outputRoot, `.${pathname}`, pathname.endsWith('/') ? 'index.html' : '');
      relative = path.relative(outputRoot, candidate);
      if (relative.startsWith('..') || path.isAbsolute(relative)) throw new Error('outside fixture');
    } catch {
      response.writeHead(400);
      response.end('Invalid request');
      return;
    }
    try {
      const bytes = readContainedFile(relative, outputRoot, 'memo fixture asset');
      response.writeHead(200, { 'Content-Type': types[path.extname(relative)] ?? 'application/octet-stream' });
      response.end(bytes);
    } catch { response.writeHead(404); response.end('Not found'); }
  });
}

if (process.argv[1] === import.meta.filename) createMemoFixtureServer().listen(4321, '0.0.0.0');
