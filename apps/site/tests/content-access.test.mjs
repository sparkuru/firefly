import assert from 'node:assert/strict';
import test from 'node:test';
import { GUEST_PRINCIPAL, projectContentForPrincipal } from '../src/lib/content-access.mjs';

function document(name, access, draft = false) {
  return Object.freeze({
    name,
    entry: Object.freeze({ data: Object.freeze({ access: Object.freeze(access), draft }) })
  });
}

test('content projection is draft-first and frozen for guest, user, and admin principals', () => {
  const publicDocument = document('public', { visibility: 'public' });
  const aliceDocument = document('alice', { visibility: 'private', owner: 'alice' });
  const bobDocument = document('bob', { visibility: 'private', owner: 'bob' });
  const draftPublic = document('draft-public', { visibility: 'public' }, true);
  const draftPrivate = document('draft-private', { visibility: 'private', owner: 'alice' }, true);
  const documents = Object.freeze([publicDocument, aliceDocument, bobDocument, draftPublic, draftPrivate]);

  assert.deepEqual(projectContentForPrincipal(documents, GUEST_PRINCIPAL), [publicDocument]);
  assert.deepEqual(projectContentForPrincipal(documents, Object.freeze({ kind: 'user', subject: 'alice' })), [
    publicDocument,
    aliceDocument
  ]);
  assert.deepEqual(projectContentForPrincipal(documents, Object.freeze({ kind: 'user', subject: 'carol' })), [publicDocument]);
  assert.deepEqual(projectContentForPrincipal(documents, Object.freeze({ kind: 'admin' })), [
    publicDocument,
    aliceDocument,
    bobDocument
  ]);
  assert.equal(Object.isFrozen(GUEST_PRINCIPAL), true);
  assert.equal(Object.isFrozen(projectContentForPrincipal(documents, GUEST_PRINCIPAL)), true);
});
