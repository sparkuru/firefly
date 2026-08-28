import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  commentsPostPathFromSiteHref,
  decodePublicCommentsExport,
  emptyPublicCommentsExport
} from '../../../../plugins/comments/public.mjs';

export {
  commentsPostPathFromSiteHref,
  decodePublicCommentsExport,
  isCanonicalCommentsPostRoute
} from '../../../../plugins/comments/public.mjs';

function resolveModuleRepositoryRoot() {
  const modulePath = fileURLToPath(import.meta.url);
  const siteRootMarker = `${path.sep}apps${path.sep}site${path.sep}`;
  const siteRootIndex = modulePath.lastIndexOf(siteRootMarker);
  if (siteRootIndex >= 0) return modulePath.slice(0, siteRootIndex) || path.parse(modulePath).root;
  return path.resolve(path.dirname(modulePath), '../../../../');
}

const moduleRepositoryRoot = resolveModuleRepositoryRoot();
const repositoryRoot = moduleRepositoryRoot;
const defaultExportPath = path.join(repositoryRoot, 'artifacts/comments/comments.public.v1.json');

function resolveExportPath(configuredPath) {
  const configured = process.env.FIREFLY_COMMENTS_EXPORT?.trim();
  const candidate = configured?.length ? configured : configuredPath ?? defaultExportPath;
  const absolute = path.resolve(path.isAbsolute(candidate) ? candidate : path.join(repositoryRoot, candidate));
  const relative = path.relative(repositoryRoot, absolute);
  if (relative.startsWith('..') || path.isAbsolute(relative)) {
    throw new TypeError(`Comments export must remain inside ${repositoryRoot}.`);
  }
  return { absolute, explicit: Boolean(configured) };
}

export function loadPublicCommentsExport(configuredPath) {
  const { absolute, explicit } = resolveExportPath(configuredPath);
  if (!existsSync(absolute)) {
    if (explicit) throw new Error(`Comments export does not exist: ${absolute}`);
    return emptyPublicCommentsExport();
  }
  let parsed;
  try {
    parsed = JSON.parse(readFileSync(absolute, 'utf8'));
  } catch (error) {
    throw new Error(`Unable to read comments export ${absolute}: ${error instanceof Error ? error.message : String(error)}`);
  }
  return decodePublicCommentsExport(parsed, absolute);
}

export function loadCommentsForPosts(posts, config, enabledOverride) {
  const result = new Map(posts.map((post) => [post.href, Object.freeze([])]));
  const enabled = enabledOverride ?? (typeof config.enabled === 'boolean' ? config.enabled : true);
  if (!enabled) return result;
  const bundle = loadPublicCommentsExport(config.exportPath);
  const publicPosts = new Map();
  for (const post of posts) {
    const commentsPostPath = commentsPostPathFromSiteHref(post.href);
    if (commentsPostPath === null) {
      throw new Error(`Public post route cannot be represented by the comments protocol: ${post.href}`);
    }
    const existing = publicPosts.get(commentsPostPath);
    if (existing !== undefined && existing !== post.href) {
      throw new Error(`Public post routes collide in the comments protocol: ${existing} and ${post.href}`);
    }
    publicPosts.set(commentsPostPath, post.href);
  }
  const grouped = new Map();
  for (const comment of bundle.comments) {
    const siteHref = publicPosts.get(comment.postPath);
    if (siteHref === undefined) throw new Error(`Comments export references a non-public post route: ${comment.postPath}`);
    const current = grouped.get(siteHref) ?? [];
    current.push(comment);
    grouped.set(siteHref, current);
  }
  for (const [siteHref, comments] of grouped) result.set(siteHref, Object.freeze(comments));
  return result;
}
