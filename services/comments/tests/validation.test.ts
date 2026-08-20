import { strict as assert } from 'node:assert';
import test from 'node:test';

import {
  ExportValidationError,
  ValidationError,
  createRouteCatalog,
  decodePublicExport,
  digestForExport,
  normalizeSubmission,
  serializePublicExport
} from '../src/index.js';

const catalog = createRouteCatalog(['/posts/main/first/']);

test('normalizes bounded submission fields and applies safe defaults', () => {
  const value = normalizeSubmission({
    postPath: '/posts/main/first/',
    displayName: '  Cafe\u0301  ',
    email: 'Reader@Example.TEST',
    body: ' first line\r\nsecond line ',
    consentVersion: 'm51-v1',
    consent: 'accepted'
  }, { routeCatalog: catalog });
  assert.deepEqual(value, {
    postPath: '/posts/main/first/',
    parentId: null,
    displayName: 'Café',
    homepage: null,
    email: 'reader@example.test',
    body: 'first line\nsecond line',
    notifyReplies: false,
    consentVersion: 'm51-v1'
  });
});

test('rejects unknown fields, stale routes, unsafe links, and honeypots', () => {
  assert.throws(() => normalizeSubmission({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'ok',
    consentVersion: 'm51-v1'
  }, { routeCatalog: catalog }), /consent must be explicitly accepted/u);
  assert.throws(() => normalizeSubmission({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'ok',
    consentVersion: 'm51-v1',
    consent: 'accepted',
    privateField: 'must not pass'
  }, { routeCatalog: catalog }), ValidationError);
  assert.throws(() => normalizeSubmission({
    postPath: '/posts/main/missing/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'ok',
    consentVersion: 'm51-v1',
    consent: 'accepted'
  }, { routeCatalog: catalog }), ValidationError);
  assert.throws(() => normalizeSubmission({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'visit https://example.test',
    consentVersion: 'm51-v1',
    consent: 'accepted'
  }, { routeCatalog: catalog }), ValidationError);
  assert.throws(() => normalizeSubmission({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'ok',
    consentVersion: 'm51-v1',
    consent: 'accepted',
    honeypot: 'filled'
  }, { routeCatalog: catalog }), ValidationError);
});

test('decodes only allowlisted public export fields and checks parent relationships', () => {
  const value = {
    schemaVersion: 1,
    sourceRevision: 'revision-1',
    generatedAt: '2026-08-20T00:00:00.000Z',
    tombstoneEpoch: 2,
    comments: [
      {
        id: 'c_top',
        postPath: '/posts/main/first/',
        parentId: null,
        displayName: 'Reader',
        body: 'top',
        createdAt: '2026-08-20T00:00:00.000Z'
      },
      {
        id: 'c_reply',
        postPath: '/posts/main/first/',
        parentId: 'c_top',
        displayName: 'Owner',
        homepage: 'https://example.test/',
        body: 'reply',
        createdAt: '2026-08-20T00:01:00.000Z'
      }
    ]
  } as const;
  const decoded = decodePublicExport({ ...value, digest: digestForExport(value) }, catalog);
  assert.equal(decoded.comments[1]?.parentId, 'c_top');
  assert.match(serializePublicExport(decoded), /"digest"/u);
  assert.throws(() => decodePublicExport({ ...value, privateEmail: 'leak@example.test' }, catalog), ExportValidationError);
  assert.throws(() => decodePublicExport({ ...value, comments: [...value.comments, value.comments[0]] }, catalog), ExportValidationError);
  assert.throws(() => decodePublicExport({ ...value, comments: [{ ...value.comments[1], parentId: 'c_missing' }, value.comments[0]] }, catalog), ExportValidationError);
});

test('rejects stale, non-NFC, malformed, and unsafe public records', () => {
  const base = {
    schemaVersion: 1,
    sourceRevision: 'revision-1',
    generatedAt: '2026-08-20T00:00:00.000Z',
    tombstoneEpoch: 0,
    comments: [{
      id: 'c_top',
      postPath: '/posts/main/old/',
      parentId: null,
      displayName: 'Reader',
      body: 'ok',
      createdAt: '2026-08-20T00:00:00.000Z'
    }]
  };
  assert.throws(() => decodePublicExport(base, catalog), ExportValidationError);
  assert.throws(() => decodePublicExport({ ...base, comments: [{ ...base.comments[0], displayName: 'Cafe\u0301' }] }, createRouteCatalog(['/posts/main/old/'])), ExportValidationError);
  assert.throws(() => decodePublicExport({ ...base, comments: [{ ...base.comments[0], body: '<b>unsafe</b>' }] }, createRouteCatalog(['/posts/main/old/'])), ExportValidationError);
});
