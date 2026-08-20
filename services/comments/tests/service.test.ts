import { strict as assert } from 'node:assert';
import test from 'node:test';

import { ConflictError, TokenError } from '../src/index.js';
import { makeService, submitAndVerify } from './helpers.js';

test('verification is single-use and does not approve or export a comment', async () => {
  const { service, transport } = makeService();
  const result = await submitAndVerify(service, transport);
  assert.equal(service.getPrivateComment(result.publicId).status, 'pending');
  assert.equal((await service.exportPublic({ generatedAt: '2026-08-20T00:02:00.000Z' })).comments.length, 0);
  const verification = transport.messages.find((entry) => entry.publicId === result.publicId && entry.kind === 'verification');
  if (!verification?.token) {
    throw new Error('test verification token was not delivered');
  }
  const token = verification.token;
  assert.throws(() => service.verify(token), TokenError);
});

test('retries are idempotent and private fields stay out of the export', async () => {
  const { service, transport } = makeService();
  const input = {
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'same request',
    consentVersion: 'm51-v1',
    consent: 'accepted'
  };
  const first = await service.submit(input);
  const second = await service.submit(input);
  assert.equal(second.publicId, first.publicId);
  assert.equal(second.deduplicated, true);
  const verification = transport.messages.find((entry) => entry.publicId === first.publicId && entry.kind === 'verification');
  assert.ok(verification?.token);
  service.verify(verification.token);
  await service.approve(first.publicId, 'approve-1');
  const exported = await service.exportPublic({ sourceRevision: 'revision-1', generatedAt: '2026-08-20T00:00:00.000Z' });
  assert.equal(exported.comments.length, 1);
  assert.deepEqual(Object.keys(exported.comments[0]!).sort(), ['body', 'createdAt', 'displayName', 'id', 'parentId', 'postPath']);
  assert.doesNotMatch(JSON.stringify(exported), /reader@example\.test|emailCiphertext|verificationTokenHash|moderation/iu);
});

test('replies are one level deep and require an approved parent before approval/export', async () => {
  const { service, transport } = makeService();
  const parent = await submitAndVerify(service, transport, { body: 'parent' });
  await service.approve(parent.publicId);
  const reply = await submitAndVerify(service, transport, {
    displayName: 'Owner',
    email: 'owner@example.test',
    body: 'direct reply',
    parentId: parent.publicId
  });
  await service.approve(reply.publicId);
  const exported = await service.exportPublic({ generatedAt: '2026-08-20T00:00:00.000Z' });
  assert.deepEqual(new Set(exported.comments.map((comment) => comment.parentId)), new Set([null, parent.publicId]));
  await assert.rejects(() => service.submit({
    postPath: '/posts/main/first/',
    displayName: 'Nested',
    email: 'nested@example.test',
    body: 'not allowed',
    parentId: reply.publicId,
    consentVersion: 'm51-v1',
    consent: 'accepted'
  }), /repl(?:y|ies)|nested|parent/iu);
});

test('parent rejection and deletion prevent replies from becoming public', async () => {
  const { service, transport } = makeService();
  const parent = await submitAndVerify(service, transport, { body: 'parent' });
  await service.approve(parent.publicId);
  const reply = await submitAndVerify(service, transport, { body: 'reply', parentId: parent.publicId, email: 'reply@example.test' });
  await service.reject(parent.publicId);
  await assert.rejects(() => service.approve(reply.publicId), ConflictError);
  assert.equal((await service.exportPublic()).comments.length, 0);
  await service.delete(parent.publicId);
  const afterDelete = await service.exportPublic();
  assert.equal(afterDelete.comments.length, 0);
  assert.equal(afterDelete.tombstoneEpoch, 1);
});

test('retention expires unverified records and removes bounded private material', async () => {
  const { service, repository, clock } = makeService();
  const result = await service.submit({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'will expire',
    consentVersion: 'm51-v1',
    consent: 'accepted'
  }, { ip: '192.0.2.10', userAgent: 'test-agent' });
  clock.advance(31 * 24 * 60 * 60 * 1000);
  assert.equal(service.runRetention(), 1);
  const record = repository.findByPublicId(result.publicId);
  assert.equal(record?.status, 'expired');
  assert.equal(record?.ipHash, null);
  assert.equal(record?.emailCiphertext, '');
});

test('control tokens can request deletion, and owner deletion records a tombstone', async () => {
  const { service, transport } = makeService();
  const result = await submitAndVerify(service, transport, { body: 'control path' });
  await service.approve(result.publicId);
  const verification = transport.messages.find((entry) => entry.publicId === result.publicId && entry.kind === 'verification');
  if (!verification?.controlToken) {
    throw new Error('test control token was not delivered');
  }
  const controlToken = verification.controlToken;
  assert.equal(service.inspectControlToken(controlToken).status, 'approved');
  assert.equal(service.requestDeletion(controlToken).status, 'deletion_requested');
  assert.equal((await service.exportPublic()).comments.length, 0);
  await service.delete(result.publicId, 'delete-1');
  assert.equal((await service.exportPublic()).tombstoneEpoch, 1);
  assert.throws(() => service.inspectControlToken(controlToken), TokenError);
});
