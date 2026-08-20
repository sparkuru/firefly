import { strict as assert } from 'node:assert';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  deliverNotificationOutbox,
  notificationIdFor,
  type NotificationDeliveryTransport,
  type NotificationMessage
} from '../src/index.js';
import { parseSmtpConfig, renderNotificationMessage, SmtpConfigurationError } from '../src/smtp.js';

const message: NotificationMessage = {
  kind: 'verification',
  to: 'reader@example.test',
  publicId: 'c_12345678',
  postPath: '/posts/main/first/',
  token: 'v_secret',
  controlToken: 'k_secret'
};

function smtpEnvironment(overrides: NodeJS.ProcessEnv = {}): NodeJS.ProcessEnv {
  return {
    COMMENTS_SMTP_HOST: 'smtp.zoho.test',
    COMMENTS_SMTP_PORT: '587',
    COMMENTS_SMTP_SECURE: 'false',
    COMMENTS_SMTP_USER: 'comments@example.test',
    COMMENTS_SMTP_PASSWORD: 'app-password',
    COMMENTS_SMTP_FROM: 'comments@example.test',
    COMMENTS_SMTP_FROM_NAME: 'Firefly comments',
    COMMENTS_PUBLIC_ORIGIN: 'https://comments.example.test',
    ...overrides
  };
}

test('notification IDs are stable and queued messages receive a private ID', async () => {
  const first = notificationIdFor(message);
  assert.equal(first, notificationIdFor({ ...message }));
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-notifications-'));
  const outboxPath = path.join(root, 'notifications.jsonl');
  const statePath = path.join(root, 'notifications.state.json');
  try {
    await writeFile(outboxPath, `${JSON.stringify(message)}\n`);
    const delivered: NotificationMessage[] = [];
    const transport: NotificationDeliveryTransport = { deliver: (value) => { delivered.push(value); } };
    assert.deepEqual(await deliverNotificationOutbox(outboxPath, statePath, transport), {
      queued: 1,
      delivered: 1,
      skipped: 0,
      failed: 0
    });
    assert.equal(delivered[0]?.publicId, message.publicId);
    assert.deepEqual(await deliverNotificationOutbox(outboxPath, statePath, transport), {
      queued: 1,
      delivered: 0,
      skipped: 1,
      failed: 0
    });
    assert.match(await readFile(statePath, 'utf8'), new RegExp(first));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('failed delivery is recorded without exposing message content in state', async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), 'firefly-notifications-'));
  const outboxPath = path.join(root, 'notifications.jsonl');
  const statePath = path.join(root, 'notifications.state.json');
  try {
    await writeFile(outboxPath, `${JSON.stringify(message)}\n`);
    const transport: NotificationDeliveryTransport = { deliver: async () => { throw new Error('fake SMTP failure'); } };
    const summary = await deliverNotificationOutbox(outboxPath, statePath, transport);
    assert.equal(summary.failed, 1);
    const state = await readFile(statePath, 'utf8');
    assert.doesNotMatch(state, /v_secret|reader@example\.test/u);
    assert.match(state, /Error/u);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test('SMTP configuration supports Zoho-compatible implicit TLS and STARTTLS modes', () => {
  const startTls = parseSmtpConfig(smtpEnvironment());
  assert.equal(startTls?.host, 'smtp.zoho.test');
  assert.equal(startTls?.port, 587);
  assert.equal(startTls?.secure, false);
  const implicitTls = parseSmtpConfig(smtpEnvironment({ COMMENTS_SMTP_PORT: '465', COMMENTS_SMTP_SECURE: 'true' }));
  assert.equal(implicitTls?.port, 465);
  assert.equal(implicitTls?.secure, true);
  assert.throws(() => parseSmtpConfig(smtpEnvironment({ COMMENTS_SMTP_SECURE: 'maybe' })), SmtpConfigurationError);
  assert.throws(() => parseSmtpConfig({ COMMENTS_SMTP_HOST: 'smtp.example.test' }), SmtpConfigurationError);
});

test('notification rendering keeps private links in mail content only', () => {
  const rendered = renderNotificationMessage(message, { notificationOrigin: 'https://comments.example.test' });
  assert.match(rendered.text, /\/v1\/verify\/v_secret/u);
  assert.match(rendered.text, /\/v1\/control\/k_secret/u);
  assert.doesNotMatch(JSON.stringify({ publicId: message.publicId, postPath: message.postPath }), /reader@example\.test|v_secret|k_secret/u);
});
