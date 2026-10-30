import assert from 'node:assert/strict';
import { once } from 'node:events';
import { mkdir, mkdtemp, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test, { type TestContext } from 'node:test';
import type { AddressInfo } from 'node:net';
import { createPublicationServer } from '../src/serve-release.js';
import { writeAccess } from './access-fixture.js';
import { pathToFileURL } from 'node:url';
import { publicationContractRoot } from '../src/plugins/memos.js';
const { writePluginAccess } = await import(pathToFileURL(path.join(publicationContractRoot, 'plugins/public-access-files.mjs')).href) as typeof import('../../../plugins/public-access-files.mjs');

async function mediaServer(t: TestContext) {
  const release = await mkdtemp(path.join(os.tmpdir(), 'firefly-media-serving-'));
  const bytes = Buffer.from([0, 1, 2, 3, 128, 129, 250, 251, 254, 255]);
  await mkdir(path.join(release, 'lab/nerv'), { recursive: true });
  await writeFile(path.join(release, 'index.html'), '<h1>Site</h1>');
  await writeFile(path.join(release, '404.html'), '<h1>Site missing</h1>');
  await writeFile(path.join(release, 'lab/nerv/404.html'), '<h1>NERV missing</h1>');
  await writeFile(path.join(release, 'sample.mp4'), bytes);
  await writeFile(path.join(release, 'empty.mp4'), Buffer.alloc(0));
  await writePluginAccess(release, { schemaVersion: 2, plugins: { comments: { enabled: false } } });
  const server = await createPublicationServer({ releaseRoot: release });
  t.after(async () => {
    server.closeAllConnections();
    await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));
    await rm(release, { recursive: true, force: true });
  });
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  return { release, bytes, origin: `http://127.0.0.1:${(server.address() as AddressInfo).port}` };
}

test('static media and existing assets retain their MIME types and exact bytes', async (t) => {
  const { release, bytes, origin } = await mediaServer(t);
  const cases = [
    ['.png', 'image/png'], ['.svg', 'image/svg+xml'],
    ['.jpg', 'image/jpeg'], ['.jpeg', 'image/jpeg'], ['.gif', 'image/gif'],
    ['.webp', 'image/webp'], ['.avif', 'image/avif'], ['.JPG', 'image/jpeg'],
    ['.mp4', 'video/mp4'], ['.webm', 'video/webm'], ['.ogv', 'video/ogg'], ['.mov', 'video/quicktime'],
    ['.mp3', 'audio/mpeg'], ['.m4a', 'audio/mp4'], ['.ogg', 'audio/ogg'], ['.oga', 'audio/ogg'],
    ['.wav', 'audio/wav'], ['.flac', 'audio/flac'],
    ['.css', 'text/css; charset=utf-8'], ['.html', 'text/html; charset=utf-8'],
    ['.js', 'application/javascript; charset=utf-8'], ['.json', 'application/json'],
    ['.unknown', 'application/octet-stream']
  ];
  for (const [extension, contentType] of cases) {
    await writeFile(path.join(release, `asset${extension}`), bytes);
    const response = await fetch(`${origin}/asset${extension}`);
    assert.equal(response.status, 200, extension);
    assert.equal(response.headers.get('content-type'), contentType, extension);
    assert.equal(response.headers.get('content-length'), String(bytes.length), extension);
    assert.equal(response.headers.get('accept-ranges'), 'bytes', extension);
    assert.equal(response.headers.get('content-range'), null, extension);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes, extension);
  }
});

test('GET serves byte, open-ended and suffix ranges with clamped bounds', async (t) => {
  const { bytes, origin } = await mediaServer(t);
  for (const [range, start, end] of [
    ['bytes=0-3', 0, 3], ['bytes=4-', 4, 9], ['bytes=-3', 7, 9],
    ['bytes=8-100', 8, 9], ['bytes=-100', 0, 9],
    ['bytes=8-999999999999999999999999999999', 8, 9]
  ] as const) {
    const response = await fetch(`${origin}/sample.mp4`, { headers: { Range: range } });
    assert.equal(response.status, 206, range);
    assert.equal(response.headers.get('content-range'), `bytes ${start}-${end}/${bytes.length}`, range);
    assert.equal(response.headers.get('content-length'), String(end - start + 1), range);
    assert.equal(response.headers.get('content-type'), 'video/mp4', range);
    assert.equal(response.headers.get('accept-ranges'), 'bytes', range);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes.subarray(start, end + 1), range);
  }
});

test('unsatisfiable ranges return 416 and the complete resource length', async (t) => {
  const { bytes, origin } = await mediaServer(t);
  for (const [route, range, size] of [
    ['/sample.mp4', 'bytes=10-', bytes.length],
    ['/sample.mp4', 'bytes=999999999999999999999999999999-', bytes.length],
    ['/sample.mp4', 'bytes=-0', bytes.length],
    ['/empty.mp4', 'bytes=0-0', 0]
  ] as const) {
    const response = await fetch(`${origin}${route}`, { headers: { Range: range } });
    assert.equal(response.status, 416, `${route} ${range}`);
    assert.equal(response.headers.get('content-range'), `bytes */${size}`);
    assert.equal(response.headers.get('content-length'), '0');
    assert.equal(response.headers.get('accept-ranges'), 'bytes');
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
});

test('HEAD ignores Range and returns full resource headers without a body', async (t) => {
  const { bytes, origin } = await mediaServer(t);
  for (const range of ['bytes=0-3', 'bytes=10-', 'bytes=-0']) {
    const response = await fetch(`${origin}/sample.mp4`, { method: 'HEAD', headers: { Range: range } });
    assert.equal(response.status, 200, range);
    assert.equal(response.headers.get('content-type'), 'video/mp4');
    assert.equal(response.headers.get('content-length'), String(bytes.length));
    assert.equal(response.headers.get('content-range'), null);
    assert.equal((await response.arrayBuffer()).byteLength, 0);
  }
});

test('malformed, multiple and unverifiable If-Range requests receive full responses', async (t) => {
  const { bytes, origin } = await mediaServer(t);
  const cases: Record<string, string>[] = [
    { Range: 'bytes=-' }, { Range: 'bytes=garbage' }, { Range: 'items=0-3' },
    { Range: 'bytes=4-2' }, { Range: 'bytes=0-1,4-5' },
    { Range: 'bytes=0-3', 'If-Range': '"unverified-etag"' },
    { Range: 'bytes=10-', 'If-Range': 'Wed, 21 Oct 2015 07:28:00 GMT' }
  ];
  for (const headers of cases) {
    const response = await fetch(`${origin}/sample.mp4`, { headers });
    assert.equal(response.status, 200, JSON.stringify(headers));
    assert.equal(response.headers.get('content-length'), String(bytes.length));
    assert.equal(response.headers.get('content-range'), null);
    assert.deepEqual(Buffer.from(await response.arrayBuffer()), bytes);
  }
  const empty = await fetch(`${origin}/empty.mp4`);
  assert.equal(empty.status, 200);
  assert.equal(empty.headers.get('content-length'), '0');
  assert.equal((await empty.arrayBuffer()).byteLength, 0);
});

test('missing media retain the site and NERV 404 owners with Range headers', async (t) => {
  const { origin } = await mediaServer(t);
  for (const [route, content] of [
    ['/missing.mp4', '<h1>Site missing</h1>'],
    ['/lab/nerv/missing.mp4', '<h1>NERV missing</h1>']
  ]) {
    const response = await fetch(`${origin}${route}`, { headers: { Range: 'bytes=0-3' } });
    assert.equal(response.status, 404);
    assert.equal(response.headers.get('content-type'), 'text/html; charset=utf-8');
    assert.equal(response.headers.get('content-range'), null);
    assert.equal(await response.text(), content);
    const head = await fetch(`${origin}${route}`, { method: 'HEAD', headers: { Range: 'bytes=0-3' } });
    assert.equal(head.status, 404);
    assert.equal((await head.arrayBuffer()).byteLength, 0);
  }
});

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
