import { lstat, readFile, realpath } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { walkSafeTree, type CommentsPublicationMetadata } from '../index.js';

const EMPTY_COMMENTS_PUBLICATION: CommentsPublicationMetadata = Object.freeze({
  enabled: false,
  schemaVersion: 1,
  sourceRevision: 'empty',
  generatedAt: '1970-01-01T00:00:00.000Z',
  digest: null,
  tombstoneEpoch: 0
});

export async function loadCommentsPublication(repositoryRoot: string): Promise<CommentsPublicationMetadata> {
  const siteOutput = path.join(repositoryRoot, 'apps/site/dist');
  const tree = await walkSafeTree(siteOutput);
  let hasCommentSurface = false;
  for (const relative of tree.files) {
    if (!relative.endsWith('.html')) continue;
    const contents = await readFile(path.join(siteOutput, relative), 'utf8');
    if (/<section\b[^>]*\bclass=["'](?:terminal-)?comment-section["']/iu.test(contents)) {
      hasCommentSurface = true;
      break;
    }
  }
  const handoff = process.env.FIREFLY_COMMENTS_EXPORT?.trim();
  if (!handoff) {
    if (hasCommentSurface) {
      throw new Error('comment HTML is present but FIREFLY_COMMENTS_EXPORT was not supplied.');
    }
    return EMPTY_COMMENTS_PUBLICATION;
  }

  const candidate = path.resolve(path.isAbsolute(handoff) ? handoff : path.join(repositoryRoot, handoff));
  const relative = path.relative(repositoryRoot, candidate);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new Error('FIREFLY_COMMENTS_EXPORT must remain inside the repository.');
  }
  const resolved = await realpath(candidate);
  const resolvedRelative = path.relative(repositoryRoot, resolved);
  const stats = await lstat(candidate);
  if (resolvedRelative.startsWith('..') || path.isAbsolute(resolvedRelative) || !stats.isFile()) {
    throw new Error('FIREFLY_COMMENTS_EXPORT must resolve to a regular file inside the repository.');
  }
  const decoder = await import(pathToFileURL(path.join(repositoryRoot, 'apps/site/src/lib/comments.mjs')).href) as {
    decodePublicCommentsExport(value: unknown, source?: string): {
      schemaVersion: 1;
      sourceRevision: string;
      generatedAt: string;
      tombstoneEpoch: number;
      digest?: string;
      comments: readonly { postPath: string }[];
    };
  };
  const bundle = decoder.decodePublicCommentsExport(JSON.parse(await readFile(candidate, 'utf8')), candidate);
  if (bundle.digest === undefined) {
    throw new Error('comments export must contain a SHA-256 digest before publication.');
  }
  for (const comment of bundle.comments) {
    const relativeRoute = `${comment.postPath.slice(1, -1)}/index.html`;
    if (!tree.files.includes(relativeRoute)) {
      throw new Error(`comments export references a post route absent from site output: ${comment.postPath}`);
    }
  }
  if (!hasCommentSurface) {
    throw new Error('FIREFLY_COMMENTS_EXPORT was supplied but the site output has no comment surface.');
  }
  return Object.freeze({
    enabled: true,
    schemaVersion: bundle.schemaVersion,
    sourceRevision: bundle.sourceRevision,
    generatedAt: bundle.generatedAt,
    digest: bundle.digest,
    tombstoneEpoch: bundle.tombstoneEpoch
  });
}
