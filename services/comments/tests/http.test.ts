import { strict as assert } from 'node:assert';
import test from 'node:test';

import { createCommentHttpServer, createRouteCatalog, EmailCipher, CommentService, MemoryCommentRepository, MemoryNotificationTransport, listenCommentHttpServer } from '../src/index.js';

test('HTTP exposes write, verification, control, health, and private admin boundaries', async (t) => {
  const transport = new MemoryNotificationTransport();
  const service = new CommentService({
    repository: new MemoryCommentRepository(),
    routeCatalog: createRouteCatalog(['/posts/main/first/']),
    emailCipher: EmailCipher.random(),
    verificationSecret: 'verification-secret-0123456789',
    allowedOrigins: new Set(['https://site.example']),
    notificationTransport: transport,
    rateLimits: { maxByIp: 100, maxByEmail: 100, maxByPost: 100 }
  });
  const server = createCommentHttpServer(service, { allowedOrigins: new Set(['https://site.example']), adminToken: 'admin-token' });
  try {
    await listenCommentHttpServer(server, 0, '127.0.0.1');
  } catch (error) {
    if (error instanceof Error && /EPERM|EACCES/iu.test(error.message)) {
      t.skip(`HTTP socket unavailable: ${error.message}`);
      return;
    }
    throw error;
  }
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
    assert.deepEqual(await health.json(), { ok: true, status: 'ok' });
    const submission = await fetch(`${base}/v1/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' },
      body: JSON.stringify({ postPath: '/posts/main/first/', displayName: 'Reader', email: 'reader@example.test', body: 'hello', consentVersion: 'm51-v1', consent: 'accepted', honeypot: '' })
    });
    assert.equal(submission.status, 202);
    assert.deepEqual(await submission.json(), { ok: true, message: 'Check your email to continue.' });
    const verification = transport.messages.find((entry) => entry.kind === 'verification');
    assert.ok(verification?.token);
    const publicRead = await fetch(`${base}/v1/comments`);
    assert.equal(publicRead.status, 404);
    const adminWithoutAuth = await fetch(`${base}/v1/admin/comments`);
    assert.equal(adminWithoutAuth.status, 401);
    const adminWithAuth = await fetch(`${base}/v1/admin/comments`, { headers: { Authorization: 'Bearer admin-token' } });
    assert.equal(adminWithAuth.status, 200);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    service.close();
  }
});
