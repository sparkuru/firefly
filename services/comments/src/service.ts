import { createHash, randomUUID } from 'node:crypto';

import {
  createOpaqueToken,
  EmailCipher,
  fingerprint,
  hashToken,
  type Secret
} from './crypto.js';
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  NotificationDeliveryError,
  RateLimitError,
  TokenError,
  ValidationError
} from './errors.js';
import type {
  CommentRepository,
  CommentStatus,
  Clock,
  ExportOptions,
  NotificationMessage,
  NotificationTransport,
  PublicComment,
  PublicExport,
  RepositoryAuditEvent,
  RouteCatalog,
  StoredComment,
  SubmitContext,
  SubmitOptions,
  SubmitResult,
  SubmissionInput,
  RouteCatalogInput
} from './types.js';
import {
  assertKnownPostPath,
  assertRequestSize,
  comparePublicComments,
  decodePublicExport,
  digestForExport,
  normalizeSubmission,
  toRouteCatalog
} from './validation.js';
import {
  ABUSE_RETENTION_MS,
  CONTROL_TTL_MS,
  DEFAULT_CONSENT_VERSION,
  VERIFICATION_TTL_MS
} from './types.js';

export type ModerationAction = 'approve' | 'reject' | 'quarantine' | 'spam' | 'delete';

export interface RateLimitOptions {
  windowMs?: number;
  maxByIp?: number;
  maxByEmail?: number;
  maxByPost?: number;
}

export interface CommentServiceOptions {
  repository: CommentRepository;
  routeCatalog: RouteCatalogInput;
  emailCipher: EmailCipher;
  verificationSecret: Secret;
  controlSecret?: Secret;
  abuseSecret?: Secret;
  consentVersion?: string;
  allowedOrigins?: ReadonlySet<string>;
  notificationTransport?: NotificationTransport;
  clock?: Clock;
  rateLimits?: RateLimitOptions;
}

export interface VerificationResult {
  publicId: string;
  postPath: string;
  status: 'pending';
  verifiedAt: string;
}

export interface ControlSummary {
  publicId: string;
  postPath: string;
  status: CommentStatus;
  canRequestDeletion: boolean;
}

export interface PublicQueueItem {
  id: string;
  postPath: string;
  parentId: string | null;
  displayName: string;
  homepage: string | null;
  body: string;
  createdAt: string;
  status: CommentStatus;
  verifiedAt: string | null;
  notifyReplies: boolean;
}

const DEFAULT_RATE_LIMITS: Required<RateLimitOptions> = {
  windowMs: 60 * 60 * 1000,
  maxByIp: 12,
  maxByEmail: 12,
  maxByPost: 100
};

export class CommentService {
  private readonly repository: CommentRepository;
  private readonly routeCatalog: RouteCatalog;
  private readonly emailCipher: EmailCipher;
  private readonly verificationSecret: Secret;
  private readonly controlSecret: Secret;
  private readonly abuseSecret: Secret;
  private readonly consentVersion: string;
  private readonly allowedOrigins: ReadonlySet<string>;
  private readonly notificationTransport: NotificationTransport;
  private readonly clock: Clock;
  private readonly rateLimiter: SlidingWindowRateLimiter;

  constructor(options: CommentServiceOptions) {
    this.repository = options.repository;
    this.routeCatalog = toRouteCatalog(options.routeCatalog);
    this.emailCipher = options.emailCipher;
    this.verificationSecret = options.verificationSecret;
    this.controlSecret = options.controlSecret ?? options.verificationSecret;
    this.abuseSecret = options.abuseSecret ?? options.verificationSecret;
    this.consentVersion = options.consentVersion ?? DEFAULT_CONSENT_VERSION;
    this.allowedOrigins = options.allowedOrigins ?? new Set<string>();
    this.notificationTransport = options.notificationTransport ?? new DiscardingNotificationTransport();
    this.clock = options.clock ?? { now: () => new Date() };
    this.rateLimiter = new SlidingWindowRateLimiter({ ...DEFAULT_RATE_LIMITS, ...options.rateLimits });
  }

  async submit(input: SubmissionInput, context: SubmitContext = {}, options: SubmitOptions = {}): Promise<SubmitResult> {
    assertRequestSize(input);
    const normalized = normalizeSubmission(input, {
      expectedConsentVersion: this.consentVersion,
      routeCatalog: this.routeCatalog
    });
    this.assertOrigin(context.origin);
    const parent = this.resolveParent(normalized.postPath, normalized.parentId);
    const now = this.now();
    const emailFingerprint = fingerprint(normalized.email, this.abuseSecret);
    const dedupeKey = this.dedupeKey(normalized, emailFingerprint, options.idempotencyKey);
    const existing = this.repository.findByDedupeKey(dedupeKey);
    if (existing) {
      return {
        publicId: existing.publicId,
        status: existing.status,
        verificationExpiresAt: existing.verificationExpiresAt ?? existing.createdAt,
        deduplicated: true
      };
    }
    this.rateLimiter.consume(
      [
        ...(context.ip ? [[`ip:${fingerprint(context.ip, this.abuseSecret)}`, 'ip'] as [string, string]] : []),
        [`email:${emailFingerprint}`, 'email'],
        [`post:${normalized.postPath}`, 'post']
      ],
      now
    );
    const verificationToken = createOpaqueToken('v_');
    const controlToken = createOpaqueToken('k_');
    const createdAt = now.toISOString();
    const verificationExpiresAt = new Date(now.getTime() + VERIFICATION_TTL_MS).toISOString();
    const controlExpiresAt = new Date(now.getTime() + CONTROL_TTL_MS).toISOString();
    const comment: StoredComment = {
      internalId: randomUUID(),
      publicId: `c_${createHash('sha256').update(randomUUID()).digest('base64url').slice(0, 22)}`,
      dedupeKey,
      postPath: normalized.postPath,
      parentInternalId: parent?.internalId ?? null,
      displayName: normalized.displayName,
      homepage: normalized.homepage,
      body: normalized.body,
      createdAt,
      updatedAt: createdAt,
      emailCiphertext: this.emailCipher.encrypt(normalized.email),
      emailFingerprint,
      verificationTokenHash: hashToken(verificationToken, this.verificationSecret),
      verificationExpiresAt,
      controlTokenHash: hashToken(controlToken, this.controlSecret),
      controlExpiresAt,
      status: 'unverified',
      verifiedAt: null,
      moderationVersion: 0,
      lastActionId: null,
      consentVersion: normalized.consentVersion,
      notifyReplies: normalized.notifyReplies,
      ipHash: context.ip ? fingerprint(context.ip, this.abuseSecret) : null,
      userAgentHash: context.userAgent ? fingerprint(context.userAgent.slice(0, 512), this.abuseSecret) : null,
      abuseRetentionAt: new Date(now.getTime() + ABUSE_RETENTION_MS).toISOString(),
      privateEmailRetentionAt: new Date(now.getTime() + ABUSE_RETENTION_MS).toISOString(),
      tombstoneEpoch: null
    };
    this.repository.create(comment);
    await this.sendNotification({
      kind: 'verification',
      to: normalized.email,
      publicId: comment.publicId,
      postPath: comment.postPath,
      token: verificationToken,
      controlToken
    });
    return { publicId: comment.publicId, status: 'unverified', verificationExpiresAt, deduplicated: false };
  }

  verify(token: string): VerificationResult {
    const comment = this.repository.findByVerificationTokenHash(hashToken(token, this.verificationSecret));
    if (!comment || comment.status !== 'unverified') {
      throw new TokenError();
    }
    const now = this.now();
    if (!comment.verificationExpiresAt || Date.parse(comment.verificationExpiresAt) <= now.getTime()) {
      comment.status = 'expired';
      comment.verificationTokenHash = null;
      comment.verificationExpiresAt = null;
      comment.updatedAt = now.toISOString();
      this.repository.save(comment);
      this.audit(comment, 'verify_expired', 'expired', now.toISOString());
      throw new TokenError();
    }
    comment.status = 'pending';
    comment.verifiedAt = now.toISOString();
    comment.verificationTokenHash = null;
    comment.verificationExpiresAt = null;
    comment.updatedAt = now.toISOString();
    this.repository.save(comment);
    this.audit(comment, 'verify', 'pending', now.toISOString(), 'unverified');
    return { publicId: comment.publicId, postPath: comment.postPath, status: 'pending', verifiedAt: comment.verifiedAt };
  }

  inspectControlToken(token: string): ControlSummary {
    const comment = this.findControlToken(token);
    return {
      publicId: comment.publicId,
      postPath: comment.postPath,
      status: comment.status,
      canRequestDeletion: comment.status !== 'deleted'
    };
  }

  requestDeletion(token: string): ControlSummary {
    const comment = this.findControlToken(token);
    const now = this.now().toISOString();
    const fromStatus = comment.status;
    if (comment.status !== 'deleted') {
      if (comment.status === 'approved') {
        comment.status = 'deletion_requested';
      } else {
        comment.status = 'deleted';
      }
      comment.controlTokenHash = null;
      comment.controlExpiresAt = null;
      comment.updatedAt = now;
      this.repository.save(comment);
      this.audit(comment, 'request_deletion', comment.status, now, fromStatus);
    }
    return {
      publicId: comment.publicId,
      postPath: comment.postPath,
      status: comment.status,
      canRequestDeletion: false
    };
  }

  async moderate(publicId: string, action: ModerationAction, actionId?: string): Promise<StoredComment> {
    const comment = this.repository.findByPublicId(publicId);
    if (!comment) {
      throw new NotFoundError();
    }
    if (actionId && comment.lastActionId === actionId) {
      return comment;
    }
    const now = this.now().toISOString();
    const previous = comment.status;
    const next = this.nextStatus(comment, action);
    if (next === comment.status) {
      if (actionId) {
        comment.lastActionId = actionId;
        comment.moderationVersion += 1;
        comment.updatedAt = now;
        this.repository.save(comment);
      }
      return comment;
    }
    if (action === 'approve') {
      this.assertApprovableReply(comment);
    }
    if (action === 'delete' && comment.status !== 'unverified' && comment.status !== 'pending' && comment.status !== 'expired') {
      if (comment.tombstoneEpoch === null) {
        comment.tombstoneEpoch = this.repository.incrementTombstoneEpoch();
      }
    }
    if (action !== 'approve' && comment.status === 'approved' && comment.tombstoneEpoch === null) {
      comment.tombstoneEpoch = this.repository.incrementTombstoneEpoch();
    }
    comment.status = next;
    comment.lastActionId = actionId ?? comment.lastActionId;
    comment.moderationVersion += 1;
    comment.updatedAt = now;
    if (action === 'delete') {
      comment.controlTokenHash = null;
      comment.controlExpiresAt = null;
      comment.verificationTokenHash = null;
      comment.verificationExpiresAt = null;
      comment.emailCiphertext = '';
      comment.emailFingerprint = '';
      comment.privateEmailRetentionAt = null;
    }
    this.repository.save(comment);
    this.audit(comment, action, next, now, previous, actionId ?? null);
    await this.sendModerationNotification(comment, action);
    return comment;
  }

  approve(publicId: string, actionId?: string): Promise<StoredComment> {
    return this.moderate(publicId, 'approve', actionId);
  }

  reject(publicId: string, actionId?: string): Promise<StoredComment> {
    return this.moderate(publicId, 'reject', actionId);
  }

  quarantine(publicId: string, actionId?: string): Promise<StoredComment> {
    return this.moderate(publicId, 'quarantine', actionId);
  }

  markSpam(publicId: string, actionId?: string): Promise<StoredComment> {
    return this.moderate(publicId, 'spam', actionId);
  }

  delete(publicId: string, actionId?: string): Promise<StoredComment> {
    return this.moderate(publicId, 'delete', actionId);
  }

  listQueue(): PublicQueueItem[] {
    const byInternal = new Map(this.repository.list().map((comment) => [comment.internalId, comment]));
    return [...byInternal.values()]
      .filter((comment) => comment.status === 'pending' || comment.status === 'deletion_requested')
      .sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.publicId.localeCompare(right.publicId))
      .map((comment) => ({
        id: comment.publicId,
        postPath: comment.postPath,
        parentId: comment.parentInternalId ? byInternal.get(comment.parentInternalId)?.publicId ?? null : null,
        displayName: comment.displayName,
        homepage: comment.homepage,
        body: comment.body,
        createdAt: comment.createdAt,
        status: comment.status,
        verifiedAt: comment.verifiedAt,
        notifyReplies: comment.notifyReplies
      }));
  }

  getPrivateComment(publicId: string): StoredComment {
    const comment = this.repository.findByPublicId(publicId);
    if (!comment) {
      throw new NotFoundError();
    }
    return comment;
  }

  async exportPublic(options: ExportOptions = {}): Promise<PublicExport> {
    const records = this.repository.list();
    const byInternal = new Map(records.map((comment) => [comment.internalId, comment]));
    const approved = records.filter((comment) => comment.status === 'approved');
    const publicByInternal = new Map(approved.map((comment) => [comment.internalId, comment]));
    const comments: PublicComment[] = [];
    for (const comment of approved) {
      assertKnownPostPath(comment.postPath, this.routeCatalog);
      let parentId: string | null = null;
      if (comment.parentInternalId) {
        const parent = byInternal.get(comment.parentInternalId);
        if (!parent || parent.status !== 'approved') {
          continue;
        }
        if (parent.parentInternalId) {
          throw new ValidationError('nested reply relationship cannot be exported.', 'invalid_public_export');
        }
        if (parent.postPath !== comment.postPath) {
          throw new ValidationError('reply and parent must use the same post route.', 'invalid_public_export');
        }
        if (!publicByInternal.has(parent.internalId)) {
          continue;
        }
        parentId = parent.publicId;
      }
      comments.push(toPublicComment(comment, parentId));
    }
    comments.sort(comparePublicComments);
    const generatedAt = normalizeGeneratedAt(options.generatedAt ?? this.clock.now());
    const sourceRevision = options.sourceRevision ?? createHash('sha256').update(JSON.stringify({
      tombstoneEpoch: this.repository.getTombstoneEpoch(),
      comments
    })).digest('hex').slice(0, 32);
    const result: PublicExport = {
      schemaVersion: 1,
      sourceRevision,
      generatedAt,
      tombstoneEpoch: this.repository.getTombstoneEpoch(),
      comments
    };
    result.digest = digestForExport(result);
    return decodePublicExport(result, this.routeCatalog);
  }

  runRetention(): number {
    return this.repository.purge(this.now().toISOString());
  }

  auditEvents(): RepositoryAuditEvent[] {
    return this.repository.listAuditEvents();
  }

  close(): void {
    this.repository.close();
  }

  private resolveParent(postPath: string, parentId: string | null): StoredComment | null {
    if (!parentId) {
      return null;
    }
    const parent = this.repository.findByPublicId(parentId);
    if (!parent || parent.postPath !== postPath || parent.status === 'deleted' || parent.status === 'rejected' || parent.status === 'quarantined' || parent.status === 'spam' || parent.status === 'expired' || parent.status === 'deletion_requested') {
      throw new ValidationError('parentId does not identify an eligible top-level comment.', 'invalid_parent');
    }
    if (parent.parentInternalId) {
      throw new ValidationError('replies to replies are not allowed.', 'nested_reply');
    }
    return parent;
  }

  private assertApprovableReply(comment: StoredComment): void {
    if (!comment.parentInternalId) {
      return;
    }
    const parent = this.repository.findByInternalId(comment.parentInternalId);
    if (!parent || parent.parentInternalId || parent.status !== 'approved' || parent.postPath !== comment.postPath) {
      throw new ConflictError('a reply can be approved only after its top-level parent is approved.');
    }
  }

  private nextStatus(comment: StoredComment, action: ModerationAction): CommentStatus {
    if (action === 'approve') {
      if (comment.status === 'approved') {
        return 'approved';
      }
      if (comment.status !== 'pending') {
        throw new ConflictError('only verified pending comments can be approved.');
      }
      return 'approved';
    }
    if (action === 'reject') {
      if (comment.status === 'rejected') {
        return 'rejected';
      }
      if (comment.status === 'deleted') {
        throw new ConflictError('deleted comments cannot be rejected.');
      }
      return 'rejected';
    }
    if (action === 'quarantine') {
      if (comment.status === 'quarantined') {
        return 'quarantined';
      }
      if (comment.status === 'deleted') {
        throw new ConflictError('deleted comments cannot be quarantined.');
      }
      return 'quarantined';
    }
    if (action === 'spam') {
      if (comment.status === 'spam') {
        return 'spam';
      }
      if (comment.status === 'deleted') {
        throw new ConflictError('deleted comments cannot be marked as spam.');
      }
      return 'spam';
    }
    if (comment.status === 'deleted') {
      return 'deleted';
    }
    return 'deleted';
  }

  private findControlToken(token: string): StoredComment {
    if (typeof token !== 'string' || !token.startsWith('k_')) {
      throw new TokenError();
    }
    const comment = this.repository.findByControlTokenHash(hashToken(token, this.controlSecret));
    if (!comment || !comment.controlExpiresAt || Date.parse(comment.controlExpiresAt) <= this.clock.now().getTime()) {
      throw new TokenError();
    }
    return comment;
  }

  private async sendModerationNotification(comment: StoredComment, action: ModerationAction): Promise<void> {
    if (action !== 'approve' && action !== 'reject') {
      return;
    }
    const email = this.decryptEmail(comment);
    if (email) {
      await this.sendNotification({ kind: action === 'approve' ? 'approved' : 'rejected', to: email, publicId: comment.publicId, postPath: comment.postPath });
    }
    if (action === 'approve' && comment.parentInternalId) {
      const parent = this.repository.findByInternalId(comment.parentInternalId);
      if (parent?.notifyReplies) {
        const parentEmail = this.decryptEmail(parent);
        if (parentEmail) {
          await this.sendNotification({ kind: 'reply', to: parentEmail, publicId: comment.publicId, postPath: comment.postPath, parentPublicId: parent.publicId });
        }
      }
    }
  }

  private async sendNotification(message: NotificationMessage): Promise<void> {
    try {
      await this.notificationTransport.send(message);
    } catch {
      throw new NotificationDeliveryError();
    }
  }

  private decryptEmail(comment: StoredComment): string | null {
    if (!comment.emailCiphertext) {
      return null;
    }
    return this.emailCipher.decrypt(comment.emailCiphertext);
  }

  private audit(comment: StoredComment, action: string, toStatus: CommentStatus, occurredAt: string, fromStatus: CommentStatus | null = null, actionId: string | null = null): void {
    this.repository.appendAudit({ publicId: comment.publicId, action, actionId, fromStatus, toStatus, occurredAt });
  }

  private dedupeKey(input: ReturnType<typeof normalizeSubmission>, emailFingerprint: string, idempotencyKey?: string): string {
    const source = idempotencyKey ? `key:${idempotencyKey}` : JSON.stringify({
      postPath: input.postPath,
      parentId: input.parentId,
      displayName: input.displayName,
      homepage: input.homepage,
      emailFingerprint,
      body: input.body,
      notifyReplies: input.notifyReplies,
      consentVersion: input.consentVersion
    });
    return createHash('sha256').update(source).digest('hex');
  }

  private assertOrigin(origin: string | undefined): void {
    if (this.allowedOrigins.size > 0 && (!origin || !this.allowedOrigins.has(origin))) {
      throw new ForbiddenError('submission origin is not allowed.');
    }
  }

  private now(): Date {
    const current = this.clock.now();
    if (!Number.isFinite(current.getTime())) {
      throw new Error('clock returned an invalid date.');
    }
    return new Date(current.getTime());
  }
}

export class DiscardingNotificationTransport implements NotificationTransport {
  send(_message: NotificationMessage): void {}
}

export class MemoryNotificationTransport implements NotificationTransport {
  readonly messages: NotificationMessage[] = [];

  send(message: NotificationMessage): void {
    this.messages.push({ ...message });
  }
}

class SlidingWindowRateLimiter {
  private readonly entries = new Map<string, number[]>();
  private readonly options: Required<RateLimitOptions>;

  constructor(options: Required<RateLimitOptions>) {
    this.options = options;
  }

  consume(entries: Array<[string, string]>, now: Date): void {
    const nowMs = now.getTime();
    const limits = { ip: this.options.maxByIp, email: this.options.maxByEmail, post: this.options.maxByPost };
    entries.forEach(([key, kind]) => {
      if (!(kind in limits)) {
        return;
      }
      const limit = limits[kind as keyof typeof limits];
      const cutoff = nowMs - this.options.windowMs;
      const recent = (this.entries.get(key) ?? []).filter((timestamp) => timestamp > cutoff);
      if (recent.length >= limit) {
        const retryAfter = Math.max(1, Math.ceil((recent[0]! + this.options.windowMs - nowMs) / 1000));
        throw new RateLimitError(retryAfter);
      }
      recent.push(nowMs);
      this.entries.set(key, recent);
    });
  }
}

function toPublicComment(comment: StoredComment, parentId: string | null): PublicComment {
  return {
    id: comment.publicId,
    postPath: comment.postPath,
    parentId,
    displayName: comment.displayName,
    ...(comment.homepage ? { homepage: comment.homepage } : {}),
    body: comment.body,
    createdAt: comment.createdAt
  };
}

function normalizeGeneratedAt(value: Date | string): string {
  const date = typeof value === 'string' ? new Date(value) : value;
  if (!Number.isFinite(date.getTime())) {
    throw new ValidationError('generatedAt must be a valid timestamp.', 'invalid_public_export');
  }
  return date.toISOString();
}
