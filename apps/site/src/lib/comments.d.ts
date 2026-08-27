import type { CanonicalDocument } from './content';
import type { CommentsPublicConfig } from '../../../../plugins/comments/config.mjs';

export interface PublicComment {
  readonly id: string;
  readonly postPath: string;
  readonly parentId: string | null;
  readonly displayName: string;
  readonly homepage?: string;
  readonly body: string;
  readonly createdAt: string;
}

export interface PublicCommentsExport {
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly tombstoneEpoch: number;
  readonly digest?: string;
  readonly comments: readonly PublicComment[];
}

export type CommentsSiteConfig = CommentsPublicConfig;

export function commentsPostPathFromSiteHref(value: unknown): string | null;
export function decodePublicCommentsExport(value: unknown, source?: string): PublicCommentsExport;
export function loadPublicCommentsExport(configuredPath?: string): PublicCommentsExport;
export function loadCommentsForPosts(
  posts: readonly CanonicalDocument[],
  config: CommentsSiteConfig,
  enabledOverride?: boolean
): ReadonlyMap<string, readonly PublicComment[]>;
