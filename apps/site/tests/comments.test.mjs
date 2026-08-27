import assert from 'node:assert/strict';
import test from 'node:test';
import {
  commentsPostPathFromSiteHref,
  decodePublicCommentsExport,
  loadCommentsForPosts
} from '../src/lib/comments.mjs';

const postPath = '/posts/main/example/';
const timestamp = '2026-08-20T00:00:00.000Z';

function envelope(comments = []) {
  return {
    schemaVersion: 1,
    sourceRevision: 'fixture-revision',
    generatedAt: timestamp,
    tombstoneEpoch: 4,
    comments
  };
}

function comment(id, overrides = {}) {
  return {
    id,
    postPath,
    parentId: null,
    displayName: 'Reader',
    body: 'A first line.\nA second line.',
    createdAt: timestamp,
    ...overrides
  };
}

test('public comments decode into deterministic top-level and direct-reply records', () => {
  const decoded = decodePublicCommentsExport(envelope([
    comment('c_87654321', { createdAt: '2026-08-20T00:00:02.000Z' }),
    comment('c_12345678', { homepage: 'https://example.test/' }),
    comment('c_abcdef12', { parentId: 'c_12345678', createdAt: '2026-08-20T00:00:01.000Z' })
  ]));

  assert.deepEqual(decoded.comments.map(({ id }) => id), ['c_12345678', 'c_abcdef12', 'c_87654321']);
  assert.equal(decoded.comments[0].homepage, 'https://example.test/');
  assert.ok(Object.isFrozen(decoded));
  assert.ok(Object.isFrozen(decoded.comments));
});

test('public comments accept canonical UTF-8 percent-encoded post routes', () => {
  const encodedRoute = '/posts/acg/%E5%A6%B9%E7%9B%B8%E9%9A%8F/';
  const decoded = decodePublicCommentsExport(envelope([comment('c_encoded', { postPath: encodedRoute })]));
  assert.equal(decoded.comments[0].postPath, encodedRoute);

  for (const route of [
    '/posts/acg/%E5%A6%B9%ZZ/',
    '/posts/acg/%2E%2E/',
    '/posts/acg/%2F/',
    '/posts/acg/%00/',
    '/posts/acg/%E2%80%A8/',
    '/posts/acg/%C3%A9%20title/',
    '/posts/acg/%41/'
  ]) {
    assert.throws(() => decodePublicCommentsExport(envelope([comment('c_encoded', { postPath: route })])), /canonical \/posts/u, route);
  }
});

test('site Unicode href conversion preserves the raw public route boundary', () => {
  const href = '/posts/交流/萤火虫/';
  assert.equal(
    commentsPostPathFromSiteHref(href),
    '/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/'
  );
  assert.equal(commentsPostPathFromSiteHref('/posts/main/example/'), '/posts/main/example/');

  for (const unsafe of [
    '/posts/交流/%E8%90%A4%E7%81%AB%E8%99%AB/',
    '/posts/交流/萤火虫?draft/',
    '/posts/交流/萤火虫#reply/',
    '/posts/交流/e\u0301/',
    '/posts/交流/../',
    '/posts/交流/.private/',
    '/posts/交流/萤 火虫/',
    '/posts/交流/萤\u200B火虫/',
    `/posts/交流/${String.fromCharCode(0xd800)}/`,
    '/posts/交流/萤火虫!/'
  ]) {
    assert.equal(commentsPostPathFromSiteHref(unsafe), null, unsafe);
  }
});

test('site grouping resolves encoded Unicode comments under the raw href', () => {
  const rawHref = '/posts/交流/萤火虫/';
  const posts = [{ href: rawHref }, { href: '/posts/main/other/' }];
  const config = {
    enabled: true,
    writeOrigin: 'https://comments.example.test',
    exportPath: 'apps/site/tests/fixtures/comments-unicode.json',
    consentVersion: 'm51-v1'
  };
  const grouped = loadCommentsForPosts(posts, config);

  assert.equal(grouped.get(rawHref)?.[0]?.postPath, '/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/');
  assert.equal(grouped.get(rawHref)?.[0]?.body, 'A sanitized Unicode route comment.');
  assert.deepEqual(grouped.get('/posts/main/other/'), []);
  assert.equal(grouped.has('/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/'), false);
  assert.throws(
    () => loadCommentsForPosts([{ href: '/posts/main/unsafe!/' }], config),
    /cannot be represented by the comments protocol/u
  );
  assert.deepEqual(
    loadCommentsForPosts([{ href: '/posts/main/unsafe!/' }], config, false).get('/posts/main/unsafe!/'),
    []
  );
});

test('site grouping rejects stale post routes and preserves empty canonical groups', () => {
  const posts = [{ href: postPath }, { href: '/posts/main/other/' }];
  const config = { enabled: true, writeOrigin: 'https://comments.example.test', exportPath: 'artifacts/comments/comments.public.v1.json', consentVersion: 'm51-v1' };
  const grouped = loadCommentsForPosts(posts, config);
  assert.deepEqual(grouped.get('/posts/main/other/'), []);

  assert.throws(
    () => loadCommentsForPosts(posts, { ...config, exportPath: 'apps/site/tests/fixtures/comments-stale-route.json' }),
    /non-public post route/u
  );
});

test('decoder rejects private fields, unknown fields, duplicates, nesting, and unsafe URLs', () => {
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_12345678', { email: 'private@example.test' })])), /unknown field "email"/u);
  assert.throws(() => decodePublicCommentsExport({ ...envelope(), extra: true }), /unknown field "extra"/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_12345678'), comment('c_12345678')])), /duplicate public comment ID/u);
  assert.throws(() => decodePublicCommentsExport(envelope([
    comment('c_12345678'),
    comment('c_abcdef12', { parentId: 'c_12345678' }),
    comment('c_deadbeef', { parentId: 'c_abcdef12' })
  ])), /nested reply/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_12345678', { homepage: 'http://example.test' })])), /HTTPS/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_12345678', { postPath: '/posts/.hidden/' })])), /canonical \/posts/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_12345678', { body: '<b>unsafe HTML</b>' })])), /bounded plain text/u);
  assert.throws(() => decodePublicCommentsExport({ ...envelope(), digest: '0'.repeat(64) }), /digest does not match/u);
});
