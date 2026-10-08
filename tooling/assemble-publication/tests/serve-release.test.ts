import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import type { AddressInfo } from 'node:net';
import { createPublicationServer } from '../src/serve-release.js';
import { writeAccess } from './access-fixture.js';
import { pathToFileURL } from 'node:url';
import { publicationContractRoot } from '../src/plugins/memos.js';
const { writePluginAccess } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access-files.mjs')).href) as typeof import('../../../plugins/public-access-files.mjs');

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

test('integrated Memo routes serve only site-owned bytes regardless of retained legacy mount', async (t) => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-integrated-serving-'));
  t.after(() => rm(root, { recursive: true, force: true }));
  const legacy = path.join(root, 'legacy');
  await mkdir(legacy);
  await writeFile(path.join(legacy, 'index.html'), 'Retained legacy bytes');
  for (const comments of [false, true]) {
    const release = path.join(root, `release-${Number(comments)}`);
    await mkdir(path.join(release, 'pages/memos/m_fixture_entry'), { recursive: true });
    await mkdir(path.join(release, 'memos'));
    await writeFile(path.join(release, 'index.html'), 'Site');
    await writeFile(path.join(release, '404.html'), 'Missing');
    await writeFile(path.join(release, 'memos/index.html'), 'Site compatibility');
    await writeFile(path.join(release, 'pages/memos/index.html'), 'Site timeline');
    await writeFile(path.join(release, 'pages/memos/m_fixture_entry/index.html'), 'Complete entry');
    await writePluginAccess(release, { schemaVersion: 2, plugins: { comments: { enabled: comments } } });
    const server = await createPublicationServer({ releaseRoot: release, memoPublicRoot: legacy });
    server.listen(0, '127.0.0.1');
    await once(server, 'listening');
    const origin = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    try {
      for (const [route, text] of [['/memos/', 'Site compatibility'], ['/pages/memos/', 'Site timeline'], ['/pages/memos/m_fixture_entry/', 'Complete entry']]) {
        const response = await fetch(`${origin}${route}`);
        assert.equal(response.status, 200);
        assert.equal(await response.text(), text);
        assert.equal((await fetch(`${origin}${route}`, { method: 'POST' })).status, 405);
      }
      assert.equal((await fetch(`${origin}/memos/assets/style.css`)).status, 404);
      assert.equal((await fetch(`${origin}/v1/comments/submissions`, { method: 'POST' })).status, 404, 'static server never exposes a comments proxy');
    } finally {
      server.closeAllConnections();
      await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    }
  }
});
