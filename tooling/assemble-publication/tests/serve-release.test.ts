import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createPublicationServer } from '../src/serve-release.js';
import { writeAccess } from './access-fixture.js';

test('static server gates retained Memo bytes and unsupported comments before methods and redirects', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-plugin-serving-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const release = path.join(root, 'release');
  const memo = path.join(root, 'memo');
  await mkdir(release);
  await mkdir(path.join(memo, 'assets'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Blog</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Missing</h1>');
  await writeFile(path.join(memo, 'index.html'), '<h1>Retained Memo</h1>');
  await writeFile(path.join(memo, 'assets/style.css'), 'body{}');
  for (const comments of [false, true]) for (const memos of [false, true]) {
    await writeAccess(release, { comments, memos });
    const server = await createPublicationServer({ releaseRoot: release, memoPublicRoot: memo });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      assert.equal((await fetch(`${origin}/`)).status, 200);
      for (const route of ['/memos', '/memos/', '/memos/assets/style.css', '//memos/', '/v1/comments', '/v1/comments/submissions']) {
        for (const method of ['GET', 'HEAD', 'POST', 'OPTIONS']) {
          const response = await fetch(`${origin}${route}`, { method, redirect: 'manual' });
          const expected = route.startsWith('/v1/') || !memos ? 404 : ['POST', 'OPTIONS'].includes(method) ? 405 : route === '/memos' ? 301 : 200;
          assert.equal(response.status, expected, `${comments}/${memos} ${method} ${route}`);
          assert.match(response.headers.get('cache-control') ?? '', /no-store/u);
        }
      }
      assert.equal((await fetch(`${origin}/memos/receipt.json`)).status, 404);
      assert.equal((await fetch(`${origin}/memos/.private/state.json`)).status, 404);
      assert.equal((await fetch(`${origin}/memos/%3f`)).status, 400);
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
  await rm(path.join(release, 'plugins.public.v1.json'));
  await assert.rejects(createPublicationServer({ releaseRoot: release, memoPublicRoot: memo }), /rebuild/u);
});
