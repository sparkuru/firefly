import { createHash } from 'node:crypto';
import { appendFile, chmod, mkdir, readFile, writeFile } from 'node:fs/promises';
import path from 'node:path';

import type { NotificationDeliveryTransport, NotificationKind, NotificationMessage, NotificationTransport } from './types.js';
import { isCanonicalCommentsPostRoute } from './validation.js';

const NOTIFICATION_KINDS = new Set<NotificationKind>(['verification', 'approved', 'rejected', 'reply']);
const notificationIdPattern = /^n_[a-f0-9]{32}$/u;
const publicIdPattern = /^c_[A-Za-z0-9_-]{3,128}$/u;
const emailPattern = /^[^\s<>@]+@[^\s<>@]+\.[^\s<>@]+$/u;
const verificationTokenPattern = /^v_[A-Za-z0-9_-]+$/u;
const controlTokenPattern = /^k_[A-Za-z0-9_-]+$/u;
const notificationKeys = new Set([
  'notificationId',
  'kind',
  'to',
  'publicId',
  'postPath',
  'token',
  'controlToken',
  'parentPublicId'
]);

export interface NotificationDeliveryState {
  readonly attempts: number;
  readonly deliveredAt?: string;
  readonly nextAttemptAt?: string;
  readonly lastError?: string;
}

export interface NotificationDeliverySummary {
  readonly queued: number;
  readonly delivered: number;
  readonly skipped: number;
  readonly failed: number;
}

export function notificationIdFor(message: NotificationMessage): string {
  if (message.notificationId !== undefined) {
    if (!notificationIdPattern.test(message.notificationId)) {
      throw new TypeError('notificationId has an invalid format.');
    }
    return message.notificationId;
  }
  const source = JSON.stringify({
    kind: message.kind,
    to: message.to,
    publicId: message.publicId,
    postPath: message.postPath,
    parentPublicId: message.parentPublicId
  });
  return `n_${createHash('sha256').update(source).digest('hex').slice(0, 32)}`;
}

export class FileNotificationTransport implements NotificationTransport {
  constructor(private readonly path: string) {}

  async send(message: NotificationMessage): Promise<void> {
    const queued = { ...message, notificationId: notificationIdFor(message) };
    await mkdir(path.dirname(this.path), { recursive: true, mode: 0o700 });
    await appendFile(this.path, `${JSON.stringify(queued)}\n`, { encoding: 'utf8', mode: 0o600 });
    await chmod(this.path, 0o600);
  }
}

export async function deliverNotificationOutbox(
  outboxPath: string,
  statePath: string,
  transport: NotificationDeliveryTransport
): Promise<NotificationDeliverySummary> {
  let raw: string;
  try {
    raw = await readFile(outboxPath, 'utf8');
  } catch (error) {
    if (isFileNotFound(error)) {
      return { queued: 0, delivered: 0, skipped: 0, failed: 0 };
    }
    throw error;
  }
  const messages = raw.split('\n').filter((line) => line.trim().length > 0).map((line, index) => decodeNotificationMessage(JSON.parse(line), `${outboxPath}:${index + 1}`));
  const state = await readDeliveryState(statePath);
  let delivered = 0;
  let skipped = 0;
  let failed = 0;
  for (const message of messages) {
    const notificationId = notificationIdFor(message);
    const previous = state[notificationId];
    if (previous?.deliveredAt !== undefined) {
      skipped += 1;
      continue;
    }
    if (previous?.nextAttemptAt !== undefined && Date.parse(previous.nextAttemptAt) > Date.now()) {
      skipped += 1;
      continue;
    }
    try {
      await transport.deliver(message);
      state[notificationId] = {
        attempts: (previous?.attempts ?? 0) + 1,
        deliveredAt: new Date().toISOString()
      };
      delivered += 1;
    } catch (error) {
      state[notificationId] = {
        attempts: (previous?.attempts ?? 0) + 1,
        lastError: error instanceof Error ? error.name : 'delivery_failed',
        nextAttemptAt: new Date(Date.now() + Math.min(6 * 60 * 60 * 1000, 1_000 * (2 ** Math.min(12, previous?.attempts ?? 0)))).toISOString()
      };
      failed += 1;
    }
    await writeDeliveryState(statePath, state);
  }
  return { queued: messages.length, delivered, skipped, failed };
}

async function readDeliveryState(path: string): Promise<Record<string, NotificationDeliveryState>> {
  let raw: string;
  try {
    raw = await readFile(path, 'utf8');
  } catch (error) {
    if (isFileNotFound(error)) return {};
    throw error;
  }
  const parsed: unknown = JSON.parse(raw);
  if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed)) {
    throw new TypeError('notification delivery state must be an object.');
  }
  return parsed as Record<string, NotificationDeliveryState>;
}

async function writeDeliveryState(path: string, state: Record<string, NotificationDeliveryState>): Promise<void> {
  await writeFile(path, `${JSON.stringify(state, null, 2)}\n`, { encoding: 'utf8', mode: 0o600 });
  await chmod(path, 0o600);
}

function decodeNotificationMessage(value: unknown, source: string): NotificationMessage {
  if (typeof value !== 'object' || value === null || Array.isArray(value)) {
    throw new TypeError(`${source}: notification must be an object.`);
  }
  const message = value as Record<string, unknown>;
  const unknownKey = Object.keys(message).find((key) => !notificationKeys.has(key));
  if (unknownKey !== undefined) {
    throw new TypeError(`${source}: notification field "${unknownKey}" is not allowed.`);
  }
  if (typeof message.kind !== 'string' || !NOTIFICATION_KINDS.has(message.kind as NotificationKind)) {
    throw new TypeError(`${source}: notification kind is invalid.`);
  }
  if (typeof message.to !== 'string' || !emailPattern.test(message.to)) {
    throw new TypeError(`${source}: notification recipient is invalid.`);
  }
  if (typeof message.publicId !== 'string' || !publicIdPattern.test(message.publicId)) {
    throw new TypeError(`${source}: notification public ID is invalid.`);
  }
  if (typeof message.postPath !== 'string' || !isCanonicalCommentsPostRoute(message.postPath)) {
    throw new TypeError(`${source}: notification post route is invalid.`);
  }
  if (message.notificationId !== undefined && (typeof message.notificationId !== 'string' || !notificationIdPattern.test(message.notificationId))) {
    throw new TypeError(`${source}: notification ID is invalid.`);
  }
  if (message.token !== undefined && (typeof message.token !== 'string' || !verificationTokenPattern.test(message.token))) {
    throw new TypeError(`${source}: notification token is invalid.`);
  }
  if (message.controlToken !== undefined && (typeof message.controlToken !== 'string' || !controlTokenPattern.test(message.controlToken))) {
    throw new TypeError(`${source}: notification control token is invalid.`);
  }
  if (message.parentPublicId !== undefined && (typeof message.parentPublicId !== 'string' || !publicIdPattern.test(message.parentPublicId))) {
    throw new TypeError(`${source}: notification parent public ID is invalid.`);
  }
  return message as unknown as NotificationMessage;
}

function isFileNotFound(error: unknown): boolean {
  return typeof error === 'object' && error !== null && 'code' in error && (error as { code?: unknown }).code === 'ENOENT';
}
