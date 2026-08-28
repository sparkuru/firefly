import { createHash } from 'node:crypto';

import {
  commentsPostPathFromSiteHref,
  isCanonicalCommentsPostRoute
} from './config.mjs';

export const PUBLIC_EXPORT_SCHEMA_VERSION = 1;
export const MAX_DISPLAY_NAME_CODE_POINTS = 80;
export const MAX_BODY_BYTES = 8 * 1024;

const PUBLIC_EXPORT_KEYS = new Set([
  'schemaVersion',
  'sourceRevision',
  'generatedAt',
  'tombstoneEpoch',
  'comments',
  'digest'
]);
const PUBLIC_COMMENT_KEYS = new Set([
  'id',
  'postPath',
  'parentId',
  'displayName',
  'homepage',
  'body',
  'createdAt'
]);
const PUBLIC_ID = /^c_[A-Za-z0-9_-]{3,128}$/u;
const SOURCE_REVISION = /^[A-Za-z0-9._~-]{1,256}$/u;
const DIGEST = /^(?:sha256:)?[a-f0-9]{64}$/u;
const CONTROL_CHARACTER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\p{Cf}]/u;

export class PublicCommentsContractError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'PublicCommentsContractError';
  }
}

function fail(message) {
  throw new PublicCommentsContractError(message);
}

function invalid(source, message) {
  fail(`Invalid public comments export in ${source}: ${message}`);
}

function isPlainObject(value) {
  if (value === null || typeof value !== 'object') return false;
  const prototype = Object.getPrototypeOf(value);
  return prototype === Object.prototype || prototype === null;
}

function assertExactKeys(value, allowed, required, source, label) {
  if (!isPlainObject(value)) invalid(source, `${label} must be a plain object.`);
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      invalid(source, `${label} contains unknown field "${String(key)}".`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(source, `${label}.${key} must be a data property.`);
    }
  }
  for (const key of required) {
    if (!Object.hasOwn(value, key)) invalid(source, `${label} is missing ${key}.`);
  }
}

function denseArray(value, source, label) {
  if (!Array.isArray(value) || Object.getPrototypeOf(value) !== Array.prototype) {
    invalid(source, `${label} must be a plain dense array.`);
  }
  const descriptors = new Map(
    Reflect.ownKeys(value).map((key) => [key, Object.getOwnPropertyDescriptor(value, key)])
  );
  const lengthDescriptor = descriptors.get('length');
  if (
    lengthDescriptor === undefined ||
    !Object.hasOwn(lengthDescriptor, 'value') ||
    typeof lengthDescriptor.value !== 'number' ||
    !Number.isSafeInteger(lengthDescriptor.value) ||
    lengthDescriptor.value < 0
  ) {
    invalid(source, `${label} has an invalid length.`);
  }
  const values = [];
  const allowed = new Set(['length']);
  for (let index = 0; index < lengthDescriptor.value; index += 1) {
    const key = String(index);
    allowed.add(key);
    const descriptor = descriptors.get(key);
    if (descriptor === undefined || !Object.hasOwn(descriptor, 'value')) {
      invalid(source, `${label} must be a dense data array.`);
    }
    values.push(descriptor.value);
  }
  for (const key of descriptors.keys()) {
    if (typeof key !== 'string' || !allowed.has(key)) {
      invalid(source, `${label} contains an unexpected property.`);
    }
  }
  return values;
}

function requireString(value, field) {
  if (typeof value !== 'string') fail(`${field} must be a string.`);
  return value;
}

function assertCanonicalDate(value, source, field) {
  if (typeof value !== 'string') invalid(source, `${field} must be an ISO UTC timestamp.`);
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    invalid(source, `${field} must be a canonical ISO UTC timestamp.`);
  }
}

export function createRouteCatalog(postPaths) {
  if (postPaths === null || postPaths === undefined || typeof postPaths[Symbol.iterator] !== 'function') {
    fail('route catalog must be an iterable of post paths.');
  }
  const normalized = new Set();
  for (const value of postPaths) {
    normalized.add(normalizePostPath(value));
  }
  return Object.freeze({ postPaths: normalized });
}

export function toRouteCatalog(input) {
  if (isRouteCatalog(input)) return input;
  return createRouteCatalog(input);
}

function isRouteCatalog(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value) &&
    value.postPaths !== null && typeof value.postPaths === 'object' &&
    typeof value.postPaths.has === 'function';
}

export function normalizePostPath(value) {
  if (typeof value !== 'string' || value.length > 512 || !isCanonicalCommentsPostRoute(value)) {
    fail('postPath must be a canonical /posts/.../ route with safe UTF-8 encoding.');
  }
  return value;
}

export function assertKnownPostPath(postPath, catalog) {
  if (!catalog || typeof catalog.postPaths?.has !== 'function') {
    fail('route catalog must contain a postPaths set.');
  }
  if (!catalog.postPaths.has(postPath)) {
    fail('postPath is not in the current public post catalog.');
  }
}

export function normalizeDisplayName(value) {
  const name = requireString(value, 'displayName').normalize('NFC').trim();
  if (name.length === 0 || [...name].length > MAX_DISPLAY_NAME_CODE_POINTS) {
    fail('displayName must contain 1–80 Unicode code points.');
  }
  if (CONTROL_CHARACTER.test(name) || /[\r\n]/u.test(name)) {
    fail('displayName contains a control character or line break.');
  }
  return name;
}

export function normalizeBody(value) {
  const body = requireString(value, 'body').replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (body.length === 0 || Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    fail('body must contain 1–8192 UTF-8 bytes.');
  }
  if (CONTROL_CHARACTER.test(body)) {
    fail('body contains a disallowed control character.');
  }
  if (/[<>]/u.test(body) || /(?:https?:\/\/|www\.)/iu.test(body) || /!?\[[^\]]*\]\([^)]*\)/u.test(body)) {
    fail('body accepts plain text only; links, markup, and images are not allowed.');
  }
  return body;
}

export function normalizeHomepage(value) {
  if (value === undefined || value === null || value === '') return null;
  const raw = requireString(value, 'homepage').trim();
  if (raw.length > 2048 || CONTROL_CHARACTER.test(raw)) {
    fail('homepage is too long or contains a control character.');
  }
  let url;
  try {
    url = new URL(raw);
  } catch {
    fail('homepage must be an absolute HTTPS URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.hostname) {
    fail('homepage must be a credential-free HTTPS URL without a fragment.');
  }
  return url.toString();
}

export function normalizePublicId(value) {
  if (typeof value !== 'string' || !PUBLIC_ID.test(value)) {
    fail('comment IDs must be opaque c_ identifiers.');
  }
  return value;
}

function normalizeExportPath(value, source, catalog) {
  try {
    const postPath = normalizePostPath(value);
    if (catalog) assertKnownPostPath(postPath, catalog);
    return postPath;
  } catch (error) {
    invalid(source, error instanceof Error ? error.message : 'postPath is invalid.');
  }
}

function requireExportText(value, source, field, maximum, { bytes = false, multiline = false } = {}) {
  if (typeof value !== 'string' || value !== value.normalize('NFC')) {
    invalid(source, `${field} must be normalized NFC text.`);
  }
  if (!multiline && (value.trim() !== value || /[\r\n]/u.test(value))) {
    invalid(source, `${field} must be trimmed single-line text.`);
  }
  try {
    const normalized = field === 'body' ? normalizeBody(value) : normalizeDisplayName(value);
    if (normalized !== value) invalid(source, `${field} must already be normalized.`);
    if (bytes ? Buffer.byteLength(value, 'utf8') > maximum : [...value].length > maximum) {
      invalid(source, `${field} exceeds its limit.`);
    }
  } catch (error) {
    if (error instanceof PublicCommentsContractError && error.message.startsWith('Invalid public comments export')) throw error;
    if (field === 'body' && error instanceof Error && error.message.includes('plain text only')) {
      invalid(source, 'comments[].body must be bounded plain text.');
    }
    invalid(source, error instanceof Error ? error.message : `${field} is invalid.`);
  }
  return value;
}

function decodePublicComment(value, source, catalog, seen) {
  assertExactKeys(value, PUBLIC_COMMENT_KEYS, ['id', 'postPath', 'parentId', 'displayName', 'body', 'createdAt'], source, 'comments[]');
  let id;
  try {
    id = normalizePublicId(value.id);
  } catch (error) {
    invalid(source, error instanceof Error ? error.message : 'comment ID is invalid.');
  }
  if (seen.has(id)) invalid(source, `duplicate public comment ID ${id}.`);
  seen.add(id);

  const postPath = normalizeExportPath(value.postPath, source, catalog);
  let parentId;
  if (value.parentId === null) {
    parentId = null;
  } else {
    try {
      parentId = normalizePublicId(value.parentId);
    } catch (error) {
      invalid(source, error instanceof Error ? error.message : 'parent ID is invalid.');
    }
  }
  const displayName = requireExportText(value.displayName, source, 'displayName', MAX_DISPLAY_NAME_CODE_POINTS);
  const body = requireExportText(value.body, source, 'body', MAX_BODY_BYTES, { bytes: true, multiline: true });

  let homepage;
  if (value.homepage !== undefined) {
    let normalizedHomepage;
    try {
      normalizedHomepage = normalizeHomepage(value.homepage);
    } catch (error) {
      invalid(source, error instanceof Error ? error.message : 'homepage is invalid.');
    }
    if (normalizedHomepage === null || normalizedHomepage !== value.homepage) {
      invalid(source, 'homepage must be canonical when present.');
    }
    homepage = normalizedHomepage;
  }
  assertCanonicalDate(value.createdAt, source, 'createdAt');
  return Object.freeze({
    id,
    postPath,
    parentId,
    displayName,
    ...(homepage === undefined ? {} : { homepage }),
    body,
    createdAt: value.createdAt
  });
}

function assertParentRelationships(comments, source) {
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  for (const comment of comments) {
    if (comment.parentId === null) continue;
    const parent = byId.get(comment.parentId);
    if (parent === undefined) invalid(source, `comment ${comment.id} references a missing parent.`);
    if (parent.parentId !== null) invalid(source, `comment ${comment.id} would create a nested reply.`);
    if (parent.postPath !== comment.postPath) invalid(source, `comment ${comment.id} crosses post boundaries.`);
  }
}

export function comparePublicComments(left, right) {
  return compareStableString(left.postPath, right.postPath) ||
    compareStableString(left.createdAt, right.createdAt) ||
    compareStableString(left.id, right.id);
}

function compareStableString(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

export function digestForExport(value) {
  const payload = {
    schemaVersion: value.schemaVersion,
    sourceRevision: value.sourceRevision,
    generatedAt: value.generatedAt,
    tombstoneEpoch: value.tombstoneEpoch,
    comments: [...value.comments].sort(comparePublicComments)
  };
  return createHash('sha256').update(JSON.stringify(payload), 'utf8').digest('hex');
}

export const EMPTY_PUBLIC_COMMENTS_EXPORT = Object.freeze({
  schemaVersion: PUBLIC_EXPORT_SCHEMA_VERSION,
  sourceRevision: 'empty',
  generatedAt: '1970-01-01T00:00:00.000Z',
  tombstoneEpoch: 0,
  comments: Object.freeze([])
});

export function emptyPublicCommentsExport() {
  return EMPTY_PUBLIC_COMMENTS_EXPORT;
}

export function decodePublicCommentsExport(value, source = 'comments.public.v1.json', options = {}) {
  if (value === undefined || value === null) return EMPTY_PUBLIC_COMMENTS_EXPORT;
  assertExactKeys(value, PUBLIC_EXPORT_KEYS, ['schemaVersion', 'sourceRevision', 'generatedAt', 'tombstoneEpoch', 'comments'], source, 'export');
  if (value.schemaVersion !== PUBLIC_EXPORT_SCHEMA_VERSION) invalid(source, 'schemaVersion must be 1.');
  if (typeof value.sourceRevision !== 'string' || !SOURCE_REVISION.test(value.sourceRevision)) {
    invalid(source, 'sourceRevision has an invalid format.');
  }
  assertCanonicalDate(value.generatedAt, source, 'generatedAt');
  if (!Number.isSafeInteger(value.tombstoneEpoch) || value.tombstoneEpoch < 0) {
    invalid(source, 'tombstoneEpoch must be a non-negative integer.');
  }
  if (value.digest !== undefined && (typeof value.digest !== 'string' || !DIGEST.test(value.digest))) {
    invalid(source, 'digest must be a SHA-256 hex digest.');
  }
  const rawComments = denseArray(value.comments, source, 'comments');
  const catalog = options?.routeCatalog === undefined ? undefined : toRouteCatalog(options.routeCatalog);
  const seen = new Set();
  const comments = rawComments.map((comment, index) => decodePublicComment(
    comment,
    `${source} comments[${index}]`,
    catalog,
    seen
  ));
  assertParentRelationships(comments, source);
  const sorted = Object.freeze([...comments].sort(comparePublicComments));
  const normalized = {
    schemaVersion: PUBLIC_EXPORT_SCHEMA_VERSION,
    sourceRevision: value.sourceRevision,
    generatedAt: value.generatedAt,
    tombstoneEpoch: value.tombstoneEpoch,
    comments: sorted
  };
  if (value.digest !== undefined) {
    const expectedDigest = digestForExport(normalized);
    if (value.digest.replace(/^sha256:/u, '') !== expectedDigest) {
      invalid(source, 'digest does not match the export payload.');
    }
    normalized.digest = expectedDigest;
  }
  return Object.freeze(normalized);
}

export function validatePublicComment(value, catalogInput, seen = new Set()) {
  const catalog = catalogInput === undefined ? undefined : toRouteCatalog(catalogInput);
  return decodePublicComment(value, 'comments.public.v1.json', catalog, seen);
}

export function serializePublicExport(value) {
  const decoded = decodePublicCommentsExport(value);
  const digest = decoded.digest ?? digestForExport(decoded);
  return `${JSON.stringify({ ...decoded, digest }, null, 2)}\n`;
}

export function createPublicExport(value, catalogInput) {
  const options = catalogInput === undefined ? undefined : { routeCatalog: catalogInput };
  const decoded = decodePublicCommentsExport(value, 'comments.public.v1.json', options);
  const digest = digestForExport(decoded);
  return Object.freeze({ ...decoded, digest });
}

export {
  commentsPostPathFromSiteHref,
  isCanonicalCommentsPostRoute
};
