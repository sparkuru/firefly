import assert from 'node:assert/strict';
import test from 'node:test';

import {
  EMPTY_PUBLIC_COMMENTS_EXPORT,
  PublicCommentsContractError,
  commentsPostPathFromSiteHref,
  createPublicExport,
  createRouteCatalog,
  decodePublicCommentsExport,
  digestForExport,
  emptyPublicCommentsExport,
  serializePublicExport
} from '../public.mjs';

const postPath = '/posts/main/example/';
const timestamp = '2026-08-20T00:00:00.000Z';

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

function envelope(comments = []) {
  return {
    schemaVersion: 1,
    sourceRevision: 'fixture-revision',
    generatedAt: timestamp,
    tombstoneEpoch: 4,
    comments
  };
}

test('decodes the exact public allowlist into frozen, deterministic output', () => {
  const decoded = decodePublicCommentsExport(envelope([
    comment('c_87654321', { createdAt: '2026-08-20T00:00:02.000Z' }),
    comment('c_12345678', { homepage: 'https://example.test/' }),
    comment('c_abcdef12', { parentId: 'c_12345678', createdAt: '2026-08-20T00:00:01.000Z' })
  ]));

  assert.deepEqual(decoded.comments.map(({ id }) => id), ['c_12345678', 'c_abcdef12', 'c_87654321']);
  assert.equal(decoded.comments[0].homepage, 'https://example.test/');
  assert.ok(Object.isFrozen(decoded));
  assert.ok(Object.isFrozen(decoded.comments));
  assert.ok(Object.isFrozen(decoded.comments[0]));
  assert.equal(emptyPublicCommentsExport(), EMPTY_PUBLIC_COMMENTS_EXPORT);
});

test('rejects private and unknown fields without invoking accessors', () => {
  assert.throws(
    () => decodePublicCommentsExport({ ...envelope(), privateField: true }),
    /unknown field "privateField"/u
  );
  assert.throws(
    () => decodePublicCommentsExport(envelope([{ ...comment('c_private'), email: 'private@example.test' }])),
    /unknown field "email"/u
  );
  const withGetter = { ...envelope() };
  Object.defineProperty(withGetter, 'sourceRevision', { get() { throw new Error('accessed'); } });
  assert.throws(() => decodePublicCommentsExport(withGetter), PublicCommentsContractError);
});

test('rejects sparse, decorated, and accessor-backed comment arrays', () => {
  const sparse = new Array(1);
  assert.throws(() => decodePublicCommentsExport(envelope(sparse)), /dense/u);

  const decorated = [comment('c_decorated')];
  Object.defineProperty(decorated, 'map', { value: () => { throw new Error('invoked'); } });
  assert.throws(() => decodePublicCommentsExport(envelope(decorated)), /unexpected property/u);

  const accessor = [comment('c_accessor')];
  Object.defineProperty(accessor, '0', { get() { throw new Error('accessed'); } });
  assert.throws(() => decodePublicCommentsExport(envelope(accessor)), PublicCommentsContractError);

  const inherited = Object.setPrototypeOf([comment('c_inherited')], { __proto__: Array.prototype });
  assert.throws(() => decodePublicCommentsExport(envelope(inherited)), /plain dense array/u);
});

test('accepts canonical Unicode routes and rejects unsafe encodings', () => {
  const encodedRoute = '/posts/acg/%E5%A6%B9%E7%9B%B8%E9%9A%8F/';
  assert.equal(decodePublicCommentsExport(envelope([comment('c_encoded', { postPath: encodedRoute })])).comments[0].postPath, encodedRoute);
  assert.equal(commentsPostPathFromSiteHref('/posts/交流/萤火虫/'), '/posts/%E4%BA%A4%E6%B5%81/%E8%90%A4%E7%81%AB%E8%99%AB/');
  assert.equal(commentsPostPathFromSiteHref('/posts/main/example/'), '/posts/main/example/');

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
  for (const href of [
    '/posts/交流/%E8%90%A4火虫/',
    '/posts/交流/e\u0301/',
    '/posts/交流/../',
    '/posts/交流/萤 火虫/',
    '/posts/交流/萤\u200B火虫/',
    `/posts/交流/${String.fromCharCode(0xd800)}/`
  ]) {
    assert.equal(commentsPostPathFromSiteHref(href), null, href);
  }
});

test('checks malformed text, dates, parent relationships, and route catalogs', () => {
  const catalog = createRouteCatalog([postPath]);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_missing', { parentId: 'c_parent' })])), /missing parent/u);
  assert.throws(() => decodePublicCommentsExport(envelope([
    comment('c_parent'),
    comment('c_reply', { parentId: 'c_parent' }),
    comment('c_nested', { parentId: 'c_reply' })
  ])), /nested reply/u);
  assert.throws(() => decodePublicCommentsExport(envelope([
    comment('c_parent'),
    comment('c_other', { postPath: '/posts/other/post/', parentId: 'c_parent' })
  ])), /crosses post boundaries/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_stale', { postPath: '/posts/other/post/' })]), 'fixture', { routeCatalog: catalog }), /current public post catalog/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_bad', { body: '<b>unsafe</b>' })])), /plain text/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_bad', { displayName: 'Cafe\u0301' })])), /normalized NFC/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_bad', { homepage: 'http://example.test/' })])), /HTTPS/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_bad', { createdAt: '2026-08-20' })])), /canonical ISO/u);
  assert.throws(() => decodePublicCommentsExport(envelope([comment('c_same'), comment('c_same')])), /duplicate public comment ID/u);
});

test('verifies bare and prefixed digests and emits bare digests', () => {
  const value = envelope([
    comment('c_later', { createdAt: '2026-08-20T00:00:01.000Z' }),
    comment('c_earlier')
  ]);
  const digest = digestForExport(value);
  const decoded = decodePublicCommentsExport({ ...value, digest: `sha256:${digest}` });
  assert.equal(decoded.digest, digest);
  assert.equal(createPublicExport(value).digest, digest);
  assert.match(serializePublicExport(decoded), new RegExp(`"digest": "${digest}"`, 'u'));
  assert.throws(() => decodePublicCommentsExport({ ...value, digest: '0'.repeat(64) }), /digest does not match/u);
});

test('returns the immutable empty export for absent input', () => {
  assert.equal(decodePublicCommentsExport(), EMPTY_PUBLIC_COMMENTS_EXPORT);
  assert.equal(decodePublicCommentsExport(null), EMPTY_PUBLIC_COMMENTS_EXPORT);
  assert.deepEqual(EMPTY_PUBLIC_COMMENTS_EXPORT.comments, []);
});
