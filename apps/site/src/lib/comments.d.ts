import type { CanonicalDocument } from './content';

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

export interface CommentsSiteConfig {
  readonly enabled: boolean;
  readonly writeOrigin: string | null;
  readonly exportPath: string;
  readonly consentVersion: string;
}

export function decodePublicCommentsExport(value: unknown, source?: string): PublicCommentsExport;
export function loadPublicCommentsExport(): PublicCommentsExport;
export function loadCommentsForPosts(
  posts: readonly CanonicalDocument[],
  config: CommentsSiteConfig
): ReadonlyMap<string, readonly PublicComment[]>;
