import { existsSync, readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  commentsPostPathFromSiteHref,
  isCanonicalCommentsPostRoute
} from '../../../../plugins/comments/config.mjs';

export { commentsPostPathFromSiteHref } from '../../../../plugins/comments/config.mjs';

const moduleRepositoryRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../');
const repositoryRoot = [
  path.resolve(process.cwd()),
  path.resolve(process.cwd(), '../..'),
  moduleRepositoryRoot
].find((candidate) => existsSync(path.join(candidate, 'config/site.toml')) && existsSync(path.join(candidate, 'content/posts')) && existsSync(path.join(candidate, 'content/pages'))) ?? moduleRepositoryRoot;
const defaultExportPath = path.join(repositoryRoot, 'artifacts/comments/comments.public.v1.json');
const envelopeKeys = new Set(['schemaVersion', 'sourceRevision', 'generatedAt', 'tombstoneEpoch', 'digest', 'comments']);
const commentKeys = new Set(['id', 'postPath', 'parentId', 'displayName', 'homepage', 'body', 'createdAt']);
const commentIdPattern = /^c_[A-Za-z0-9_-]{3,128}$/u;
const controlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const bodyControlCharacters = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029]/u;
const digestPattern = /^(?:sha256:)?[a-f0-9]{64}$/u;

function invalid(source, message) {
  throw new TypeError(`Invalid public comments export in ${source}: ${message}`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, required, source, label) {
  if (!isPlainObject(value)) invalid(source, `${label} must be a plain object.`);
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) invalid(source, `${label} contains unknown field "${key}".`);
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) invalid(source, `${label} is missing ${key}.`);
  }
}

function assertSafeText(value, source, label, maximum, { multiline = false } = {}) {
  if (typeof value !== 'string' || value.length === 0 || value.normalize('NFC') !== value) {
    invalid(source, `${label} must be non-empty NFC text.`);
  }
  if ([...value].length > maximum || controlCharacters.test(value)) {
    invalid(source, `${label} contains unsafe or overlong text.`);
  }
  if (!multiline && (value.trim() !== value || /[\r\n]/u.test(value))) {
    invalid(source, `${label} must be trimmed single-line text.`);
  }
}

function assertIsoTimestamp(value, source, label) {
  if (typeof value !== 'string' || value.length === 0 || Number.isNaN(Date.parse(value)) || new Date(value).toISOString() !== value) {
    invalid(source, `${label} must be an ISO UTC timestamp.`);
  }
}

function assertPostPath(value, source, label = 'postPath') {
  if (!isCanonicalCommentsPostRoute(value)) {
    invalid(source, `${label} must be a normalized canonical /posts/ route.`);
  }
}

function normalizeHomepage(value, source) {
  if (value === undefined || value === null) return undefined;
  if (typeof value !== 'string' || value.normalize('NFC') !== value || controlCharacters.test(value) || value.trim() !== value) {
    invalid(source, 'homepage must be a safe HTTPS URL.');
  }
  let parsed;
  try {
    parsed = new URL(value);
  } catch {
    invalid(source, 'homepage must be a valid HTTPS URL.');
  }
  if (parsed.protocol !== 'https:' || parsed.username || parsed.password || parsed.hash || parsed.toString() !== value) {
    invalid(source, 'homepage must be an HTTPS URL without credentials or fragment data.');
  }
  return parsed.toString();
}

function normalizeComment(value, source) {
  assertExactKeys(value, commentKeys, ['id', 'postPath', 'parentId', 'displayName', 'body', 'createdAt'], source, 'comments[]');
  if (typeof value.id !== 'string' || !commentIdPattern.test(value.id)) invalid(source, 'comments[].id is not an opaque public ID.');
  assertPostPath(value.postPath, source, 'comments[].postPath');
  if (value.parentId !== null && (typeof value.parentId !== 'string' || !commentIdPattern.test(value.parentId))) {
    invalid(source, 'comments[].parentId must be null or an opaque public ID.');
  }
  assertSafeText(value.displayName, source, 'comments[].displayName', 80);
  if (typeof value.body !== 'string' || value.body.length === 0 || value.body.trim() !== value.body || value.body.normalize('NFC') !== value.body || bodyControlCharacters.test(value.body) || /\r/u.test(value.body) || /[<>]/u.test(value.body) || /(?:https?:\/\/|www\.)/iu.test(value.body) || /!?\[[^\]]*\]\([^)]*\)/u.test(value.body) || Buffer.byteLength(value.body, 'utf8') > 8192) {
    invalid(source, 'comments[].body must be bounded plain text.');
  }
  assertIsoTimestamp(value.createdAt, source, 'comments[].createdAt');
  const homepage = normalizeHomepage(value.homepage, source);
  return Object.freeze({
    id: value.id,
    postPath: value.postPath,
    parentId: value.parentId,
    displayName: value.displayName,
    ...(homepage === undefined ? {} : { homepage }),
    body: value.body,
    createdAt: value.createdAt
  });
}

function emptyExport() {
  return Object.freeze({
    schemaVersion: 1,
    sourceRevision: 'empty',
    generatedAt: '1970-01-01T00:00:00.000Z',
    tombstoneEpoch: 0,
    comments: Object.freeze([])
  });
}

export function decodePublicCommentsExport(value, source = 'comments.public.v1.json') {
  if (value === undefined || value === null) return emptyExport();
  assertExactKeys(value, envelopeKeys, ['schemaVersion', 'sourceRevision', 'generatedAt', 'tombstoneEpoch', 'comments'], source, 'export');
  if (value.schemaVersion !== 1) invalid(source, 'schemaVersion must be 1.');
  if (typeof value.sourceRevision !== 'string' || !/^[A-Za-z0-9._~-]{1,256}$/u.test(value.sourceRevision)) {
    invalid(source, 'sourceRevision has an invalid format.');
  }
  assertIsoTimestamp(value.generatedAt, source, 'generatedAt');
  if (!Number.isSafeInteger(value.tombstoneEpoch) || value.tombstoneEpoch < 0) invalid(source, 'tombstoneEpoch must be a non-negative integer.');
  if (value.digest !== undefined && (typeof value.digest !== 'string' || !digestPattern.test(value.digest))) invalid(source, 'digest must be a SHA-256 hex digest.');
  if (!Array.isArray(value.comments)) invalid(source, 'comments must be an array.');
  const comments = value.comments.map((comment, index) => normalizeComment(comment, `${source} comments[${index}]`));
  const byId = new Map();
  for (const comment of comments) {
    if (byId.has(comment.id)) invalid(source, `duplicate public comment ID ${comment.id}.`);
    byId.set(comment.id, comment);
  }
  for (const comment of comments) {
    if (comment.parentId === null) continue;
    const parent = byId.get(comment.parentId);
    if (parent === undefined) invalid(source, `comment ${comment.id} references a missing parent.`);
    if (parent.parentId !== null) invalid(source, `comment ${comment.id} would create a nested reply.`);
    if (parent.postPath !== comment.postPath) invalid(source, `comment ${comment.id} crosses post boundaries.`);
  }
  const sorted = [...comments].sort((left, right) =>
    left.postPath.localeCompare(right.postPath, 'en') ||
    left.createdAt.localeCompare(right.createdAt, 'en') ||
    left.id.localeCompare(right.id, 'en')
  );
  if (value.digest !== undefined) {
    const payload = JSON.stringify({
      schemaVersion: 1,
      sourceRevision: value.sourceRevision,
      generatedAt: value.generatedAt,
      tombstoneEpoch: value.tombstoneEpoch,
      comments: sorted
    });
    const expectedDigest = createHash('sha256').update(payload, 'utf8').digest('hex');
    if (value.digest.replace(/^sha256:/u, '') !== expectedDigest) invalid(source, 'digest does not match the export payload.');
  }
  return Object.freeze({
    schemaVersion: 1,
    sourceRevision: value.sourceRevision,
    generatedAt: value.generatedAt,
    tombstoneEpoch: value.tombstoneEpoch,
    ...(value.digest === undefined ? {} : { digest: value.digest }),
    comments: Object.freeze(sorted)
  });
}

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
    return emptyExport();
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
