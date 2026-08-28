import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import {
  DEFAULT_CONSENT_VERSION,
  MAX_REQUEST_BYTES,
  type NormalizedSubmission,
  type PublicComment,
  type PublicExport,
  type RouteCatalog,
  type RouteCatalogInput,
  type SubmissionInput
} from './types.js';
import { ExportValidationError, ValidationError } from './errors.js';

type CommentsPublicModule = typeof import('../../../plugins/comments/public.mjs');
const publicContract = await import(
  pathToFileURL(path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../../plugins/comments/public.mjs')).href
) as CommentsPublicModule;

export function isCanonicalCommentsPostRoute(value: unknown): value is string {
  return publicContract.isCanonicalCommentsPostRoute(value);
}

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
const CONTROL_CHARACTER = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u;
function contractMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function translateValidation<T>(operation: () => T): T {
  try {
    return operation();
  } catch (error) {
    if (error instanceof ValidationError) throw error;
    throw new ValidationError(contractMessage(error));
  }
}

export function createRouteCatalog(postPaths: Iterable<string>): RouteCatalog {
  return translateValidation(() => publicContract.createRouteCatalog(postPaths));
}

export function toRouteCatalog(input: RouteCatalogInput): RouteCatalog {
  return translateValidation(() => publicContract.toRouteCatalog(input));
}

export function normalizePostPath(value: unknown): string {
  return translateValidation(() => publicContract.normalizePostPath(value));
}

export function assertKnownPostPath(postPath: string, catalog: RouteCatalog): void {
  try {
    publicContract.assertKnownPostPath(postPath, catalog);
  } catch (error) {
    const message = contractMessage(error);
    if (message.includes('not in the current public post catalog')) {
      throw new ValidationError('postPath is not in the current public post catalog.', 'stale_post_path');
    }
    throw new ValidationError(message);
  }
}

export function normalizeDisplayName(value: unknown): string {
  return translateValidation(() => publicContract.normalizeDisplayName(value));
}

export function normalizeBody(value: unknown): string {
  return translateValidation(() => publicContract.normalizeBody(value));
}

export function normalizeHomepage(value: unknown): string | null {
  return translateValidation(() => publicContract.normalizeHomepage(value));
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
  return translateValidation(() => publicContract.normalizePublicId(value));
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
  try {
    const options = catalogInput === undefined ? undefined : { routeCatalog: toRouteCatalog(catalogInput) };
    return publicContract.decodePublicCommentsExport(input, 'comments.public.v1.json', options);
  } catch (error) {
    if (error instanceof ExportValidationError) throw error;
    throw new ExportValidationError(contractMessage(error));
  }
}

export function validatePublicComment(value: unknown, catalogInput?: RouteCatalogInput, seen = new Set<string>()): PublicComment {
  try {
    const options = catalogInput === undefined ? undefined : { routeCatalog: toRouteCatalog(catalogInput) };
    return publicContract.validatePublicComment(value, options?.routeCatalog, seen);
  } catch (error) {
    if (error instanceof ExportValidationError) throw error;
    throw new ExportValidationError(contractMessage(error));
  }
}

export function comparePublicComments(left: PublicComment, right: PublicComment): number {
  return publicContract.comparePublicComments(left, right);
}

export function digestForExport(value: Pick<PublicExport, 'schemaVersion' | 'sourceRevision' | 'generatedAt' | 'tombstoneEpoch'> & { comments: readonly PublicComment[] }): string {
  return publicContract.digestForExport(value);
}

export function serializePublicExport(value: PublicExport): string {
  try {
    return publicContract.serializePublicExport(value);
  } catch (error) {
    if (error instanceof ExportValidationError) throw error;
    throw new ExportValidationError(contractMessage(error));
  }
}

export function createPublicExport(
  value: Omit<PublicExport, 'digest'>,
  catalogInput?: RouteCatalogInput
): PublicExport {
  try {
    const options = catalogInput === undefined ? undefined : { routeCatalog: toRouteCatalog(catalogInput) };
    return publicContract.createPublicExport(value, options?.routeCatalog);
  } catch (error) {
    if (error instanceof ExportValidationError) throw error;
    throw new ExportValidationError(contractMessage(error));
  }
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
