import type { CanonicalDocument } from './content';
import type { CommentsPublicConfig } from '../../../../plugins/comments/config.mjs';
import type { PublicCommentsExport } from '../../../../plugins/comments/public.mjs';

export type { PublicComment, PublicCommentsExport } from '../../../../plugins/comments/public.mjs';

export type CommentsSiteConfig = CommentsPublicConfig;

export function commentsPostPathFromSiteHref(value: unknown): string | null;
export function decodePublicCommentsExport(value: unknown, source?: string): PublicCommentsExport;
export function loadPublicCommentsExport(configuredPath?: string): PublicCommentsExport;
export function loadCommentsForPosts(
  posts: readonly CanonicalDocument[],
  config: CommentsSiteConfig,
  enabledOverride?: boolean
): ReadonlyMap<string, readonly PublicComment[]>;
