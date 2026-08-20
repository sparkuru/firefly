import { strict as assert } from 'node:assert';

import {
  CommentService,
  EmailCipher,
  MemoryCommentRepository,
  MemoryNotificationTransport,
  createRouteCatalog,
  type Clock,
  type SubmitResult
} from '../src/index.js';

export class FakeClock implements Clock {
  private current: Date;

  constructor(value = '2026-08-20T00:00:00.000Z') {
    this.current = new Date(value);
  }

  now(): Date {
    return new Date(this.current.getTime());
  }

  advance(milliseconds: number): void {
    this.current = new Date(this.current.getTime() + milliseconds);
  }
}

export function makeService(options: { repository?: MemoryCommentRepository; clock?: FakeClock } = {}): {
  service: CommentService;
  repository: MemoryCommentRepository;
  transport: MemoryNotificationTransport;
  clock: FakeClock;
} {
  const repository = options.repository ?? new MemoryCommentRepository();
  const clock = options.clock ?? new FakeClock();
  const transport = new MemoryNotificationTransport();
  const service = new CommentService({
    repository,
    routeCatalog: createRouteCatalog(['/posts/main/first/', '/posts/main/second/']),
    emailCipher: EmailCipher.random(),
    verificationSecret: 'verification-secret-0123456789',
    controlSecret: 'control-secret-0123456789',
    abuseSecret: 'abuse-secret-0123456789',
    notificationTransport: transport,
    clock,
    rateLimits: { maxByIp: 1000, maxByEmail: 1000, maxByPost: 1000 }
  });
  return { service, repository, transport, clock };
}

export async function submitAndVerify(service: CommentService, transport: MemoryNotificationTransport, overrides: Record<string, unknown> = {}): Promise<SubmitResult> {
  const result = await service.submit({
    postPath: '/posts/main/first/',
    displayName: 'Reader',
    email: 'reader@example.test',
    body: 'A plain-text comment.',
    consentVersion: 'm51-v1',
    consent: 'accepted',
    honeypot: '',
    ...overrides
  });
  const message = transport.messages.find((entry) => entry.publicId === result.publicId && entry.kind === 'verification');
  assert.ok(message?.token);
  service.verify(message.token);
  return result;
}
