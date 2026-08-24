import { createHash } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_CONSENT_VERSION,
  MAX_BODY_BYTES,
  MAX_DISPLAY_NAME_CODE_POINTS,
  MAX_REQUEST_BYTES,
  type NormalizedSubmission,
  type PublicComment,
  type PublicExport,
  type RouteCatalog,
  type RouteCatalogInput,
  type SubmissionInput
} from './types.js';
import { ExportValidationError, ValidationError } from './errors.js';

type CommentsConfigModule = typeof import('../../../plugins/comments/config.mjs');
const { isCanonicalCommentsPostRoute } = await import(
  pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../plugins/comments/config.mjs')).href
) as CommentsConfigModule;

const SUBMISSION_KEYS = new Set([
  'postPath',
  'parentId',
  'displayName',
  'homepage',
  'email',
  'body',
  'notifyReplies',
  'consentVersion',
  'consent',
  'honeypot'
]);
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
const CONTROL_CHARACTER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
const PUBLIC_ID = /^c_[A-Za-z0-9_-]{3,128}$/u;
const SOURCE_REVISION = /^[A-Za-z0-9._~-]{1,256}$/u;

export function createRouteCatalog(postPaths: Iterable<string>): RouteCatalog {
  const normalized = new Set<string>();
  for (const path of postPaths) {
    normalized.add(normalizePostPath(path));
  }
  return { postPaths: normalized };
}

export function toRouteCatalog(input: RouteCatalogInput): RouteCatalog {
  return isRouteCatalog(input) ? input : createRouteCatalog(input);
}

export function normalizePostPath(value: unknown): string {
  if (typeof value !== 'string') throw new ValidationError('postPath must be a string.');
  if (value.length > 512 || !isCanonicalCommentsPostRoute(value)) {
    throw new ValidationError('postPath must be a canonical /posts/.../ route with safe UTF-8 encoding.');
  }
  return value;
}

export function assertKnownPostPath(path: string, catalog: RouteCatalog): void {
  if (!catalog.postPaths.has(path)) {
    throw new ValidationError('postPath is not in the current public post catalog.', 'stale_post_path');
  }
}

export function normalizeDisplayName(value: unknown): string {
  const name = requireString(value, 'displayName').normalize('NFC').trim();
  if (name.length === 0 || [...name].length > MAX_DISPLAY_NAME_CODE_POINTS) {
    throw new ValidationError('displayName must contain 1–80 Unicode code points.');
  }
  if (CONTROL_CHARACTER.test(name) || /[\r\n\u2028\u2029]/u.test(name)) {
    throw new ValidationError('displayName contains a control character or line break.');
  }
  return name;
}

export function normalizeBody(value: unknown): string {
  const body = requireString(value, 'body').replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (body.length === 0 || Buffer.byteLength(body, 'utf8') > MAX_BODY_BYTES) {
    throw new ValidationError('body must contain 1–8192 UTF-8 bytes.');
  }
  if (CONTROL_CHARACTER.test(body)) {
    throw new ValidationError('body contains a disallowed control character.');
  }
  if (/[<>]/u.test(body) || /(?:https?:\/\/|www\.)/iu.test(body) || /!?\[[^\]]*\]\([^)]*\)/u.test(body)) {
    throw new ValidationError('body accepts plain text only; links, markup, and images are not allowed.');
  }
  return body;
}

export function normalizeHomepage(value: unknown): string | null {
  if (value === undefined || value === null || value === '') {
    return null;
  }
  const raw = requireString(value, 'homepage').trim();
  if (raw.length > 2048 || CONTROL_CHARACTER.test(raw)) {
    throw new ValidationError('homepage is too long or contains a control character.');
  }
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ValidationError('homepage must be an absolute HTTPS URL.');
  }
  if (url.protocol !== 'https:' || url.username || url.password || url.hash || !url.hostname) {
    throw new ValidationError('homepage must be a credential-free HTTPS URL without a fragment.');
  }
  return url.toString();
}

export function normalizeEmail(value: unknown): string {
  const email = requireString(value, 'email').trim().normalize('NFC').toLowerCase();
  if (email.length === 0 || Buffer.byteLength(email, 'utf8') > 320 || CONTROL_CHARACTER.test(email) || /\s/u.test(email)) {
    throw new ValidationError('email must be a valid private email address.');
  }
  const at = email.lastIndexOf('@');
  const local = at >= 1 ? email.slice(0, at) : '';
  const domain = at >= 1 ? email.slice(at + 1) : '';
  if (at <= 0 || at !== email.indexOf('@') || local.length > 64 || domain.length === 0 || domain.length > 253 || domain.startsWith('.') || domain.endsWith('.') || domain.includes('..') || !/^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/u.test(local) || !/^(?:[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?\.)+[A-Za-z]{2,63}$/u.test(domain)) {
    throw new ValidationError('email must be a valid private email address.');
  }
  return email;
}

export function normalizePublicId(value: unknown): string {
  if (typeof value !== 'string' || !PUBLIC_ID.test(value)) {
    throw new ValidationError('comment IDs must be opaque c_ identifiers.');
  }
  return value;
}

export function normalizeConsentVersion(value: unknown, expected: string = DEFAULT_CONSENT_VERSION): string {
  if (typeof value !== 'string' || value !== expected) {
    throw new ValidationError('consentVersion is not accepted.');
  }
  return value;
}

export function normalizeSubmission(
  input: unknown,
  options: { expectedConsentVersion?: string; routeCatalog?: RouteCatalog } = {}
): NormalizedSubmission {
  if (!isRecord(input)) {
    throw new ValidationError('submission must be an object.');
  }
  const issues = [...Object.keys(input).filter((key) => !SUBMISSION_KEYS.has(key)).map((key) => `unknown field: ${key}`)];
  if (issues.length > 0) {
    throw new ValidationError(issues);
  }
  if (input.honeypot !== undefined && input.honeypot !== '') {
    throw new ValidationError('honeypot must be empty.', 'honeypot');
  }
  if (input.consent !== 'accepted') {
    throw new ValidationError('consent must be explicitly accepted.', 'consent_required');
  }
  const postPath = normalizePostPath(input.postPath);
  if (options.routeCatalog) {
    assertKnownPostPath(postPath, options.routeCatalog);
  }
  const parentId = input.parentId === undefined || input.parentId === null || input.parentId === '' ? null : normalizePublicId(input.parentId);
  const notifyReplies = input.notifyReplies === undefined ? false : input.notifyReplies;
  if (typeof notifyReplies !== 'boolean') {
    throw new ValidationError('notifyReplies must be a boolean.');
  }
  return {
    postPath,
    parentId,
    displayName: normalizeDisplayName(input.displayName),
    homepage: normalizeHomepage(input.homepage),
    email: normalizeEmail(input.email),
    body: normalizeBody(input.body),
    notifyReplies,
    consentVersion: normalizeConsentVersion(input.consentVersion, options.expectedConsentVersion)
  };
}

export function assertRequestSize(input: unknown): void {
  try {
    if (Buffer.byteLength(JSON.stringify(input), 'utf8') > MAX_REQUEST_BYTES) {
      throw new ValidationError('request body is too large.', 'request_too_large');
    }
  } catch (error) {
    if (error instanceof ValidationError) {
      throw error;
    }
    throw new ValidationError('request body is not serializable.');
  }
}

export function decodePublicExport(input: unknown, catalogInput?: RouteCatalogInput): PublicExport {
  const catalog = catalogInput ? toRouteCatalog(catalogInput) : undefined;
  if (!isRecord(input)) {
    throw new ExportValidationError('public export must be an object.');
  }
  const topLevelIssues = Object.keys(input).filter((key) => !PUBLIC_EXPORT_KEYS.has(key)).map((key) => `unknown export field: ${key}`);
  if (topLevelIssues.length > 0) {
    throw new ExportValidationError(topLevelIssues);
  }
  if (input.schemaVersion !== 1) {
    throw new ExportValidationError('schemaVersion must be 1.');
  }
  const sourceRevision = requireExportString(input.sourceRevision, 'sourceRevision', SOURCE_REVISION);
  const generatedAt = requireCanonicalDate(input.generatedAt, 'generatedAt');
  const tombstoneEpoch = requireNonNegativeInteger(input.tombstoneEpoch, 'tombstoneEpoch');
  if (!Array.isArray(input.comments)) {
    throw new ExportValidationError('comments must be an array.');
  }
  const seen = new Set<string>();
  const comments: PublicComment[] = input.comments.map((value, index) => {
    try {
      return decodePublicComment(value, catalog, seen);
    } catch (error) {
      if (error instanceof ExportValidationError) {
        throw new ExportValidationError(`comments[${index}]: ${error.message}`);
      }
      throw error;
    }
  });
  const byId = new Map(comments.map((comment) => [comment.id, comment]));
  for (const comment of comments) {
    if (!comment.parentId) {
      continue;
    }
    const parent = byId.get(comment.parentId);
    if (!parent) {
      throw new ExportValidationError(`comment ${comment.id} references a missing parent.`);
    }
    if (parent.parentId !== null || parent.postPath !== comment.postPath) {
      throw new ExportValidationError(`comment ${comment.id} has an invalid parent relationship.`);
    }
  }
  const sorted = [...comments].sort(comparePublicComments);
  const digest = input.digest === undefined ? undefined : requireExportString(input.digest, 'digest', /^[a-f0-9]{64}$/u);
  const result: PublicExport = { schemaVersion: 1, sourceRevision, generatedAt, tombstoneEpoch, comments: sorted };
  if (digest !== undefined) {
    result.digest = digest;
    if (digest !== digestForExport(result)) {
      throw new ExportValidationError('digest does not match the export payload.');
    }
  }
  return result;
}

export function validatePublicComment(value: unknown, catalogInput?: RouteCatalogInput, seen = new Set<string>()): PublicComment {
  return decodePublicComment(value, catalogInput ? toRouteCatalog(catalogInput) : undefined, seen);
}

function decodePublicComment(value: unknown, catalog: RouteCatalog | undefined, seen: Set<string>): PublicComment {
  if (!isRecord(value)) {
    throw new ExportValidationError('comment must be an object.');
  }
  const unknown = Object.keys(value).filter((key) => !PUBLIC_COMMENT_KEYS.has(key));
  if (unknown.length > 0) {
    throw new ExportValidationError(`unknown comment field: ${unknown[0]}`);
  }
  let id: string;
  try {
    id = normalizePublicId(value.id);
  } catch (error) {
    throw new ExportValidationError(error instanceof Error ? error.message : 'invalid comment ID.');
  }
  if (seen.has(id)) {
    throw new ExportValidationError(`duplicate comment ID: ${id}`);
  }
  seen.add(id);
  const postPath = normalizeExportPath(value.postPath, catalog);
  let parentId: string | null;
  if (value.parentId === null) {
    parentId = null;
  } else {
    try {
      parentId = normalizePublicId(value.parentId);
    } catch (error) {
      throw new ExportValidationError(error instanceof Error ? error.message : 'invalid parent ID.');
    }
  }
  const displayName = requireNfcExportText(value.displayName, 'displayName', MAX_DISPLAY_NAME_CODE_POINTS, false);
  const body = requireNfcExportText(value.body, 'body', MAX_BODY_BYTES, true);
  let homepage: string | undefined;
  if (value.homepage !== undefined) {
    try {
      const normalizedHomepage = normalizeHomepage(value.homepage);
      if (normalizedHomepage === null || normalizedHomepage !== value.homepage) {
        throw new ExportValidationError('homepage must be canonical when present.');
      }
      homepage = normalizedHomepage;
    } catch (error) {
      if (error instanceof ExportValidationError) {
        throw error;
      }
      throw new ExportValidationError(error instanceof Error ? error.message : 'homepage is invalid.');
    }
  }
  const createdAt = requireCanonicalDate(value.createdAt, 'createdAt');
  return { id, postPath, parentId, displayName, ...(homepage ? { homepage } : {}), body, createdAt };
}

export function comparePublicComments(left: PublicComment, right: PublicComment): number {
  return compareStableString(left.postPath, right.postPath) || compareStableString(left.createdAt, right.createdAt) || compareStableString(left.id, right.id);
}

export function digestForExport(value: Pick<PublicExport, 'schemaVersion' | 'sourceRevision' | 'generatedAt' | 'tombstoneEpoch'> & { comments: readonly PublicComment[] }): string {
  const payload = {
    schemaVersion: value.schemaVersion,
    sourceRevision: value.sourceRevision,
    generatedAt: value.generatedAt,
    tombstoneEpoch: value.tombstoneEpoch,
    comments: [...value.comments].sort(comparePublicComments)
  };
  return createHashHex(JSON.stringify(payload));
}

export function serializePublicExport(value: PublicExport): string {
  const decoded = decodePublicExport(value);
  const digest = decoded.digest ?? digestForExport(decoded);
  return `${JSON.stringify({ ...decoded, digest }, null, 2)}\n`;
}

export function createPublicExport(
  value: Omit<PublicExport, 'digest'>,
  catalogInput?: RouteCatalogInput
): PublicExport {
  const decoded = decodePublicExport(value, catalogInput);
  decoded.digest = digestForExport(decoded);
  return decoded;
}

function normalizeExportPath(value: unknown, catalog?: RouteCatalog): string {
  try {
    const path = normalizePostPath(value);
    if (catalog) {
      assertKnownPostPath(path, catalog);
    }
    return path;
  } catch (error) {
    throw new ExportValidationError(error instanceof Error ? error.message : 'invalid postPath');
  }
}

function requireNfcExportText(value: unknown, field: string, max: number, bytes: boolean): string {
  if (typeof value !== 'string' || value !== value.normalize('NFC')) {
    throw new ExportValidationError(`${field} must be normalized NFC text.`);
  }
  try {
    const normalized = field === 'body' ? normalizeBody(value) : normalizeDisplayName(value);
    if (normalized !== value) {
      throw new ExportValidationError(`${field} must already be normalized.`);
    }
    if (bytes ? Buffer.byteLength(normalized, 'utf8') > max : [...normalized].length > max) {
      throw new ExportValidationError(`${field} exceeds its limit.`);
    }
    return normalized;
  } catch (error) {
    if (error instanceof ExportValidationError) {
      throw error;
    }
    throw new ExportValidationError(error instanceof Error ? error.message : `${field} is invalid.`);
  }
}

function requireCanonicalDate(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ExportValidationError(`${field} must be an ISO UTC timestamp.`);
  }
  const date = new Date(value);
  if (!Number.isFinite(date.getTime()) || date.toISOString() !== value) {
    throw new ExportValidationError(`${field} must be a canonical ISO UTC timestamp.`);
  }
  return value;
}

function requireExportString(value: unknown, field: string, pattern: RegExp): string {
  if (typeof value !== 'string' || !pattern.test(value)) {
    throw new ExportValidationError(`${field} has an invalid format.`);
  }
  return value;
}

function requireNonNegativeInteger(value: unknown, field: string): number {
  if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
    throw new ExportValidationError(`${field} must be a non-negative integer.`);
  }
  return value;
}

function requireString(value: unknown, field: string): string {
  if (typeof value !== 'string') {
    throw new ValidationError(`${field} must be a string.`);
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isRouteCatalog(value: RouteCatalogInput): value is RouteCatalog {
  return typeof value === 'object' && value !== null && 'postPaths' in value;
}

function createHashHex(value: string): string {
  return createHash('sha256').update(value, 'utf8').digest('hex');
}

function compareStableString(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}
