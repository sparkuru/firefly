import { ConflictError, NotFoundError } from './errors.js';
import type { CommentRepository, RepositoryAuditEvent, StoredComment } from './types.js';

export class MemoryCommentRepository implements CommentRepository {
  private readonly comments = new Map<string, StoredComment>();
  private readonly audits: RepositoryAuditEvent[] = [];
  private tombstoneEpoch = 0;

  create(comment: StoredComment): void {
    if (this.comments.has(comment.internalId) || [...this.comments.values()].some((current) => current.publicId === comment.publicId || current.dedupeKey === comment.dedupeKey)) {
      throw new ConflictError('comment already exists.');
    }
    this.comments.set(comment.internalId, clone(comment));
  }

  save(comment: StoredComment): void {
    if (!this.comments.has(comment.internalId)) {
      throw new NotFoundError();
    }
    this.comments.set(comment.internalId, clone(comment));
  }

  findByPublicId(publicId: string): StoredComment | null {
    return this.find((comment) => comment.publicId === publicId);
  }

  findByInternalId(internalId: string): StoredComment | null {
    return this.find((comment) => comment.internalId === internalId);
  }

  findByDedupeKey(dedupeKey: string): StoredComment | null {
    return this.find((comment) => comment.dedupeKey === dedupeKey);
  }

  findByVerificationTokenHash(tokenHash: string): StoredComment | null {
    return this.find((comment) => comment.verificationTokenHash === tokenHash);
  }

  findByControlTokenHash(tokenHash: string): StoredComment | null {
    return this.find((comment) => comment.controlTokenHash === tokenHash);
  }

  list(): StoredComment[] {
    return [...this.comments.values()].map(clone);
  }

  countRecentByPost(postPath: string, since: string): number {
    const sinceTime = Date.parse(since);
    return [...this.comments.values()].filter((comment) => comment.postPath === postPath && Date.parse(comment.createdAt) >= sinceTime).length;
  }

  getTombstoneEpoch(): number {
    return this.tombstoneEpoch;
  }

  incrementTombstoneEpoch(): number {
    this.tombstoneEpoch += 1;
    return this.tombstoneEpoch;
  }

  appendAudit(event: RepositoryAuditEvent): void {
    this.audits.push({ ...event });
  }

  listAuditEvents(): RepositoryAuditEvent[] {
    return this.audits.map((event) => ({ ...event }));
  }

  purge(now: string): number {
    const nowTime = Date.parse(now);
    let changed = 0;
    for (const current of this.comments.values()) {
      const comment = clone(current);
      let touched = false;
      if (comment.status === 'unverified' && comment.verificationExpiresAt && Date.parse(comment.verificationExpiresAt) <= nowTime) {
        comment.status = 'expired';
        comment.verificationTokenHash = null;
        comment.verificationExpiresAt = null;
        touched = true;
      }
      if (comment.ipHash && Date.parse(comment.abuseRetentionAt) <= nowTime) {
        comment.ipHash = null;
        comment.userAgentHash = null;
        touched = true;
      }
      if (comment.privateEmailRetentionAt && Date.parse(comment.privateEmailRetentionAt) <= nowTime && (!comment.notifyReplies || comment.status === 'rejected' || comment.status === 'quarantined' || comment.status === 'spam' || comment.status === 'expired' || comment.status === 'deletion_requested' || comment.status === 'deleted')) {
        comment.emailCiphertext = '';
        comment.emailFingerprint = '';
        comment.privateEmailRetentionAt = null;
        touched = true;
      }
      if (comment.status === 'deleted') {
        if (comment.displayName || comment.homepage || comment.body || comment.controlTokenHash || comment.controlExpiresAt || comment.verificationTokenHash || comment.verificationExpiresAt || comment.emailCiphertext || comment.emailFingerprint) {
          comment.displayName = '';
          comment.homepage = null;
          comment.body = '';
          comment.controlTokenHash = null;
          comment.controlExpiresAt = null;
          comment.verificationTokenHash = null;
          comment.verificationExpiresAt = null;
          comment.emailCiphertext = '';
          comment.emailFingerprint = '';
          touched = true;
        }
      }
      if (touched) {
        comment.updatedAt = now;
        this.comments.set(comment.internalId, comment);
        changed += 1;
      }
    }
    return changed;
  }

  close(): void {}

  private find(predicate: (comment: StoredComment) => boolean): StoredComment | null {
    for (const comment of this.comments.values()) {
      if (predicate(comment)) {
        return clone(comment);
      }
    }
    return null;
  }
}

function clone(comment: StoredComment): StoredComment {
  return { ...comment };
}
