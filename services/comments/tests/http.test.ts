import { strict as assert } from 'node:assert';
import test from 'node:test';

import {
  CommentHttpMetrics,
  CommentService,
  createCommentHttpServer,
  createRouteCatalog,
  EmailCipher,
  escapePrometheusLabelValue,
  MemoryCommentRepository,
  MemoryNotificationTransport,
  listenCommentHttpServer,
  type CommentHttpRequestRecord
} from '../src/index.js';

test('HTTP exposes write, verification, control, health, and private admin boundaries', async (t) => {
  const transport = new MemoryNotificationTransport();
  const records: CommentHttpRequestRecord[] = [];
  const metrics = new CommentHttpMetrics();
  let nextRequestId = 0;
  let monotonicTime = 100;
  const service = new CommentService({
    repository: new MemoryCommentRepository(),
    routeCatalog: createRouteCatalog(['/posts/main/first/']),
    emailCipher: EmailCipher.random(),
    verificationSecret: 'verification-secret-0123456789',
    allowedOrigins: new Set(['https://site.example']),
    notificationTransport: transport,
    rateLimits: { maxByIp: 100, maxByEmail: 100, maxByPost: 100 }
  });
  const server = createCommentHttpServer(service, {
    allowedOrigins: new Set(['https://site.example']),
    adminToken: 'admin-token',
    logger: (record) => records.push(record),
    metrics,
    monotonicNow: () => {
      monotonicTime += 7;
      return monotonicTime;
    },
    requestIdFactory: () => `request-${++nextRequestId}`
  });
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
    const ready = await fetch(`${base}/readyz`);
    assert.equal(ready.status, 200);
    assert.deepEqual(await ready.json(), { ok: true, status: 'ready' });
    const oldSubmission = await fetch(`${base}/v1/submissions`, { method: 'POST' });
    assert.equal(oldSubmission.status, 404);
    const submission = await fetch(`${base}/v1/comments/submissions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Origin: 'https://site.example' },
      body: JSON.stringify({ postPath: '/posts/main/first/', displayName: 'Reader', email: 'reader@example.test', body: 'hello', consentVersion: 'm51-v1', consent: 'accepted', honeypot: '' })
    });
    assert.equal(submission.status, 202);
    assert.deepEqual(await submission.json(), { ok: true, message: 'Check your email to continue.' });
    const verification = transport.messages.find((entry) => entry.kind === 'verification');
    const verificationToken = verification?.token;
    const controlToken = verification?.controlToken;
    const publicId = verification?.publicId;
    assert.ok(verificationToken);
    assert.ok(controlToken);
    assert.ok(publicId);
    const oldVerification = await fetch(`${base}/v1/verify/${encodeURIComponent(verificationToken)}`);
    assert.equal(oldVerification.status, 404);
    const control = await fetch(`${base}/v1/comments/control/${encodeURIComponent(controlToken)}`);
    assert.equal(control.status, 200);
    const oldControl = await fetch(`${base}/v1/control/${encodeURIComponent(controlToken)}`);
    assert.equal(oldControl.status, 404);
    const verify = await fetch(`${base}/v1/comments/verify/${encodeURIComponent(verificationToken)}`);
    assert.equal(verify.status, 200);
    const oldControlDelete = await fetch(`${base}/v1/control/${encodeURIComponent(controlToken)}/delete`, { method: 'POST' });
    assert.equal(oldControlDelete.status, 404);
    const approve = await fetch(`${base}/v1/comments/admin/comments/${encodeURIComponent(publicId)}/approve`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(approve.status, 200);
    const oldModeration = await fetch(`${base}/v1/admin/comments/${encodeURIComponent(publicId)}/delete`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(oldModeration.status, 404);
    const oldExport = await fetch(`${base}/v1/admin/export`, { headers: { Authorization: 'Bearer admin-token' } });
    assert.equal(oldExport.status, 404);
    const exportResponse = await fetch(`${base}/v1/comments/admin/export?sourceRevision=route-test&generatedAt=2026-08-20T00:00:00.000Z`, {
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(exportResponse.status, 200);
    const exported = await exportResponse.json() as { comments: unknown[]; sourceRevision: string };
    assert.equal(exported.sourceRevision, 'route-test');
    assert.equal(exported.comments.length, 1);
    const publicRead = await fetch(`${base}/v1/comments`);
    assert.equal(publicRead.status, 404);
    const oldAdmin = await fetch(`${base}/v1/admin/comments`, { headers: { Authorization: 'Bearer admin-token' } });
    assert.equal(oldAdmin.status, 404);
    const unknownResource = await fetch(`${base}/v1/future`);
    assert.equal(unknownResource.status, 404);
    const sensitiveUnknown = await fetch(`${base}/not-a-route?email=reader%40example.test&token=private-token`);
    assert.equal(sensitiveUnknown.status, 404);
    const adminWithoutAuth = await fetch(`${base}/v1/comments/admin/comments`);
    assert.equal(adminWithoutAuth.status, 401);
    const adminWithAuth = await fetch(`${base}/v1/comments/admin/comments`, { headers: { Authorization: 'Bearer admin-token' } });
    assert.equal(adminWithAuth.status, 200);
    const deleteRequest = await fetch(`${base}/v1/comments/control/${encodeURIComponent(controlToken)}/delete`, { method: 'POST' });
    assert.equal(deleteRequest.status, 202);
    assert.equal((await deleteRequest.json() as { status: string }).status, 'deletion_requested');
    const deleteComment = await fetch(`${base}/v1/comments/admin/comments/${encodeURIComponent(publicId)}/delete`, {
      method: 'POST',
      headers: { Authorization: 'Bearer admin-token' }
    });
    assert.equal(deleteComment.status, 200);

    const metricsResponse = await fetch(`${base}/metrics`);
    assert.equal(metricsResponse.status, 200);
    assert.match(metricsResponse.headers.get('content-type') ?? '', /^text\/plain; version=0\.0\.4/u);
    const metricsText = await metricsResponse.text();
    assert.match(metricsText, /firefly_comments_http_requests_total/u);
    assert.doesNotMatch(metricsText, /route="metrics"/u);
    assert.doesNotMatch(metricsText, /reader@example\.test|private-token|admin-token/u);

    const metricsAfterScrape = await fetch(`${base}/metrics`);
    const metricsAfterScrapeText = await metricsAfterScrape.text();
    assert.match(metricsAfterScrapeText, /route="metrics"/u);

    const observedRoutes = new Set(records.map((record) => record.route));
    assert.deepEqual(observedRoutes, new Set([
      'liveness',
      'readiness',
      'metrics',
      'submission',
      'verification',
      'control',
      'admin_queue',
      'admin_export',
      'admin_moderation',
      'unknown'
    ]));
    assert.deepEqual(records[0], {
      requestId: 'request-1',
      method: 'GET',
      route: 'liveness',
      statusCode: 200,
      outcome: 'success',
      durationMs: 7
    });
    const failedUnknown = records.find((record) => record.route === 'unknown' && record.statusCode === 404);
    assert.ok(failedUnknown);
    assert.equal(failedUnknown.outcome, 'failure');
    assert.doesNotMatch(JSON.stringify(records), /reader@example\.test|private-token|admin-token/u);
  } finally {
    await new Promise<void>((resolve) => server.close(() => resolve()));
    service.close();
  }
});

test('HTTP readiness fails closed for dependency errors and after close', async (t) => {
  class FailingMetadataRepository extends MemoryCommentRepository {
    override getTombstoneEpoch(): number {
      throw new Error('private dependency detail');
    }
  }

  const makeService = (repository: MemoryCommentRepository): CommentService => new CommentService({
    repository,
    routeCatalog: createRouteCatalog(['/posts/main/first/']),
    emailCipher: EmailCipher.random(),
    verificationSecret: 'verification-secret-0123456789'
  });
  const failingService = makeService(new FailingMetadataRepository());
  const failingServer = createCommentHttpServer(failingService, { logger: () => {} });
  try {
    await listenCommentHttpServer(failingServer, 0, '127.0.0.1');
  } catch (error) {
    if (error instanceof Error && /EPERM|EACCES/iu.test(error.message)) {
      t.skip(`HTTP socket unavailable: ${error.message}`);
      return;
    }
    throw error;
  }
  const address = failingServer.address();
  assert.ok(address && typeof address !== 'string');
  const base = `http://127.0.0.1:${address.port}`;
  try {
    const notReady = await fetch(`${base}/readyz`);
    assert.equal(notReady.status, 503);
    assert.deepEqual(await notReady.json(), { ok: false, status: 'not_ready' });
    const health = await fetch(`${base}/healthz`);
    assert.equal(health.status, 200);
  } finally {
    await new Promise<void>((resolve) => failingServer.close(() => resolve()));
    failingService.close();
  }

  const closedService = makeService(new MemoryCommentRepository());
  const closedServer = createCommentHttpServer(closedService, { logger: () => {} });
  try {
    await listenCommentHttpServer(closedServer, 0, '127.0.0.1');
  } catch (error) {
    if (error instanceof Error && /EPERM|EACCES/iu.test(error.message)) {
      t.skip(`HTTP socket unavailable: ${error.message}`);
      return;
    }
    throw error;
  }
  const closedAddress = closedServer.address();
  assert.ok(closedAddress && typeof closedAddress !== 'string');
  const closedBase = `http://127.0.0.1:${closedAddress.port}`;
  try {
    closedService.close();
    const notReady = await fetch(`${closedBase}/readyz`);
    assert.equal(notReady.status, 503);
    assert.deepEqual(await notReady.json(), { ok: false, status: 'not_ready' });
    const health = await fetch(`${closedBase}/healthz`);
    assert.equal(health.status, 200);
  } finally {
    await new Promise<void>((resolve) => closedServer.close(() => resolve()));
    closedService.close();
  }
});

test('metrics collector sorts bounded samples and escapes label values', () => {
  const metrics = new CommentHttpMetrics();
  metrics.record({ requestId: 'second', method: 'POST', route: 'submission', statusCode: 202, outcome: 'success', durationMs: 12 });
  metrics.record({ requestId: 'first', method: 'GET', route: 'liveness', statusCode: 200, outcome: 'success', durationMs: -2 });
  const output = metrics.toPrometheus();
  assert.match(output, /method="GET",route="liveness",status_code="200",outcome="success"/u);
  assert.match(output, /method="POST",route="submission",status_code="202",outcome="success"/u);
  assert.ok(output.indexOf('route="liveness"') < output.indexOf('route="submission"'));
  assert.match(output, /duration_seconds_sum\{method="GET"[^}]+\} 0/u);
  assert.doesNotMatch(output, /requestId|request_id/u);
  assert.equal(escapePrometheusLabelValue('back\\slash"quote\nline'), 'back\\\\slash\\"quote\\nline');
});
