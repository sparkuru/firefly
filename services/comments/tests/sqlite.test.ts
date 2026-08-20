import { strict as assert } from 'node:assert';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import test from 'node:test';

import { CommentService, EmailCipher, MemoryNotificationTransport, SQLiteCommentRepository, createRouteCatalog, hasNodeSqlite } from '../src/index.js';

test('SQLite repository uses the Node 22 DatabaseSync adapter', { skip: !hasNodeSqlite() }, async () => {
  const directory = await mkdtemp(join(tmpdir(), 'firefly-comments-'));
  const databasePath = join(directory, 'comments.sqlite');
  const repository = new SQLiteCommentRepository(databasePath);
  const transport = new MemoryNotificationTransport();
  const service = new CommentService({
    repository,
    routeCatalog: createRouteCatalog(['/posts/main/first/']),
    emailCipher: EmailCipher.random(),
    verificationSecret: 'verification-secret-0123456789',
    notificationTransport: transport,
    rateLimits: { maxByIp: 100, maxByEmail: 100, maxByPost: 100 }
  });
  try {
    const result = await service.submit({ postPath: '/posts/main/first/', displayName: 'Reader', email: 'reader@example.test', body: 'sqlite', consentVersion: 'm51-v1', consent: 'accepted' });
    const message = transport.messages.find((entry) => entry.publicId === result.publicId);
    assert.ok(message?.token);
    service.verify(message.token);
    await service.approve(result.publicId);
    assert.equal((await service.exportPublic()).comments[0]?.body, 'sqlite');
  } finally {
    service.close();
    await rm(directory, { recursive: true, force: true });
  }
});
