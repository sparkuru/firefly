export const PUBLIC_EXPORT_SCHEMA_VERSION = 1 as const;
export const DEFAULT_CONSENT_VERSION = 'm51-v1' as const;
export const VERIFICATION_TTL_MS = 24 * 60 * 60 * 1000;
export const CONTROL_TTL_MS = 90 * 24 * 60 * 60 * 1000;
export const ABUSE_RETENTION_MS = 30 * 24 * 60 * 60 * 1000;
export const MAX_DISPLAY_NAME_CODE_POINTS = 80;
export const MAX_BODY_BYTES = 8 * 1024;
export const MAX_REQUEST_BYTES = 32 * 1024;

export const COMMENT_STATUSES = [
  'unverified',
  'pending',
  'approved',
  'rejected',
  'quarantined',
  'spam',
  'expired',
  'deletion_requested',
  'deleted'
] as const;

export type CommentStatus = (typeof COMMENT_STATUSES)[number];

export interface SubmissionInput {
  postPath: string;
  parentId?: string | null;
  displayName: string;
  homepage?: string;
  email: string;
  body: string;
  notifyReplies?: boolean;
  consentVersion: string;
  consent?: string;
  honeypot?: string;
}

export interface NormalizedSubmission {
  postPath: string;
  parentId: string | null;
  displayName: string;
  homepage: string | null;
  email: string;
  body: string;
  notifyReplies: boolean;
  consentVersion: string;
}

export interface SubmitContext {
  ip?: string;
  userAgent?: string;
  origin?: string;
}

export interface SubmitOptions {
  idempotencyKey?: string;
}

export interface SubmitResult {
  publicId: string;
  status: CommentStatus;
  verificationExpiresAt: string;
  deduplicated: boolean;
}

export interface StoredComment {
  internalId: string;
  publicId: string;
  dedupeKey: string;
  postPath: string;
  parentInternalId: string | null;
  displayName: string;
  homepage: string | null;
  body: string;
  createdAt: string;
  updatedAt: string;
  emailCiphertext: string;
  emailFingerprint: string;
  verificationTokenHash: string | null;
  verificationExpiresAt: string | null;
  controlTokenHash: string | null;
  controlExpiresAt: string | null;
  status: CommentStatus;
  verifiedAt: string | null;
  moderationVersion: number;
  lastActionId: string | null;
  consentVersion: string;
  notifyReplies: boolean;
  ipHash: string | null;
  userAgentHash: string | null;
  abuseRetentionAt: string;
  privateEmailRetentionAt: string | null;
  tombstoneEpoch: number | null;
}

export interface RepositoryAuditEvent {
  publicId: string;
  action: string;
  actionId: string | null;
  fromStatus: CommentStatus | null;
  toStatus: CommentStatus;
  occurredAt: string;
}

export interface CommentRepository {
  create(comment: StoredComment): void;
  save(comment: StoredComment): void;
  findByPublicId(publicId: string): StoredComment | null;
  findByInternalId(internalId: string): StoredComment | null;
  findByDedupeKey(dedupeKey: string): StoredComment | null;
  findByVerificationTokenHash(tokenHash: string): StoredComment | null;
  findByControlTokenHash(tokenHash: string): StoredComment | null;
  list(): StoredComment[];
  countRecentByPost(postPath: string, since: string): number;
  getTombstoneEpoch(): number;
  incrementTombstoneEpoch(): number;
  appendAudit(event: RepositoryAuditEvent): void;
  listAuditEvents(): RepositoryAuditEvent[];
  purge(now: string): number;
  close(): void;
}

export type NotificationKind = 'verification' | 'approved' | 'rejected' | 'reply';

export interface NotificationMessage {
  notificationId?: string;
  kind: NotificationKind;
  to: string;
  publicId: string;
  postPath: string;
  token?: string;
  controlToken?: string;
  parentPublicId?: string;
}

export interface NotificationTransport {
  send(message: NotificationMessage): void | Promise<void>;
}

export interface NotificationDeliveryTransport {
  deliver(message: NotificationMessage): void | Promise<void>;
}

export interface RouteCatalog {
  postPaths: ReadonlySet<string>;
}

export type RouteCatalogInput = RouteCatalog | Iterable<string>;

export interface PublicComment {
  id: string;
  postPath: string;
  parentId: string | null;
  displayName: string;
  homepage?: string;
  body: string;
  createdAt: string;
}

export interface PublicExport {
  schemaVersion: typeof PUBLIC_EXPORT_SCHEMA_VERSION;
  sourceRevision: string;
  generatedAt: string;
  tombstoneEpoch: number;
  comments: PublicComment[];
  digest?: string;
}

export interface ExportOptions {
  sourceRevision?: string;
  generatedAt?: Date | string;
}

export interface Clock {
  now(): Date;
}
