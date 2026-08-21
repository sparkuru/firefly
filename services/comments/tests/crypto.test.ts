import { strict as assert } from 'node:assert';
import test from 'node:test';

import { EmailCipher, constantTimeEqual, createOpaqueToken, hashToken } from '../src/index.js';

test('private email encryption is authenticated and tokens are stored as keyed hashes', () => {
  const cipher = EmailCipher.random();
  const encrypted = cipher.encrypt('reader@example.test');
  assert.notEqual(encrypted, 'reader@example.test');
  assert.equal(cipher.decrypt(encrypted), 'reader@example.test');
  assert.notEqual(encrypted, cipher.encrypt('reader@example.test'));
  assert.throws(() => cipher.decrypt(`${encrypted.slice(0, -1)}x`));
  const token = createOpaqueToken('v_');
  assert.notEqual(token, hashToken(token, 'secret-0123456789012345'));
  assert.equal(constantTimeEqual('same', 'same'), true);
  assert.equal(constantTimeEqual('same', 'different'), false);
});

test('email encryption can consume a runtime-loaded environment without mutating process.env', () => {
  const cipher = EmailCipher.fromEnvironment('COMMENTS_EMAIL_KEY', {
    COMMENTS_EMAIL_KEY: '0000000000000000000000000000000000000000000000000000000000000000'
  });
  assert.equal(cipher.decrypt(cipher.encrypt('reader@example.test')), 'reader@example.test');
});
