import { createHash } from 'node:crypto';
import { denseArray, exactObject } from './validation.mjs';

export const PUBLIC_EXPORT_SCHEMA_VERSION = 1;
export const MAX_DISPLAY_NAME_CODE_POINTS = 80;
export const MAX_BODY_BYTES = 8192;
const PAYLOAD_KEYS = ['schemaVersion', 'sourceRevision', 'generatedAt', 'tombstoneEpoch', 'memos'];
const EXPORT_KEYS = [...PAYLOAD_KEYS, 'digest'];
const RECORD_KEYS = ['id', 'displayName', 'body', 'createdAt'];
const UNSAFE_TEXT = /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f-\u009f\u2028\u2029\p{Cf}\p{Cs}]/u;

export class PublicMemosContractError extends TypeError {
  constructor(message) {
    super(message);
    this.name = 'PublicMemosContractError';
  }
}
const fail = (message) => { throw new PublicMemosContractError(message); };

function text(value, label) {
  if (typeof value !== 'string' || /\p{Cs}/u.test(value)) fail(`${label} must be well-formed Unicode text.`);
  const result = value.replace(/\r\n?/gu, '\n').normalize('NFC').trim();
  if (!result || UNSAFE_TEXT.test(result)) fail(`${label} contains empty or unsafe text.`);
  return result;
}

export function normalizeDisplayName(value) {
  const result = text(value, 'displayName');
  if (/[\t\n]/u.test(result) || [...result].length > MAX_DISPLAY_NAME_CODE_POINTS) fail('displayName must be single-line text of 1–80 code points.');
  return result;
}

export function normalizeBody(value) {
  const result = text(value, 'body');
  if (Buffer.byteLength(result, 'utf8') > MAX_BODY_BYTES) fail('body must contain 1–8192 UTF-8 bytes.');
  return result;
}

export function normalizePublicId(value) {
  if (typeof value !== 'string' || !/^m_[A-Za-z0-9_-]{3,128}$/u.test(value)) fail('id must be an opaque memo ID (m_ followed by 3–128 ASCII letters, digits, underscores or hyphens).');
  return value;
}

function timestamp(value, label) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(value)) fail(`${label} must be a canonical UTC timestamp.`);
  const parsed = new Date(value);
  if (!Number.isFinite(parsed.getTime()) || parsed.toISOString() !== value) fail(`${label} must be a valid canonical UTC timestamp.`);
  return value;
}

function record(value, normalize) {
  exactObject(value, RECORD_KEYS, RECORD_KEYS, fail, 'memo');
  const displayName = normalizeDisplayName(value.displayName);
  const body = normalizeBody(value.body);
  if (!normalize && (displayName !== value.displayName || body !== value.body)) fail('memo text must already be canonical.');
  return Object.freeze({ id: normalizePublicId(value.id), displayName, body, createdAt: timestamp(value.createdAt, 'createdAt') });
}

export function validatePublicMemo(value) { return record(value, false); }

export function comparePublicMemos(left, right) {
  if (left.createdAt !== right.createdAt) return left.createdAt > right.createdAt ? -1 : 1;
  return left.id < right.id ? -1 : left.id > right.id ? 1 : 0;
}

function payload(value, normalize = false) {
  if (value.schemaVersion !== PUBLIC_EXPORT_SCHEMA_VERSION) fail('schemaVersion must be 1.');
  if (typeof value.sourceRevision !== 'string' || !/^[A-Za-z0-9._~-]{1,256}$/u.test(value.sourceRevision)) fail('sourceRevision must be an opaque ASCII revision.');
  const generatedAt = timestamp(value.generatedAt, 'generatedAt');
  if (!Number.isSafeInteger(value.tombstoneEpoch) || value.tombstoneEpoch < 0 || Object.is(value.tombstoneEpoch, -0)) fail('tombstoneEpoch must be a non-negative safe integer.');
  const memos = denseArray(value.memos, fail, 'memos').map((memo) => record(memo, normalize));
  const seen = new Set();
  for (const memo of memos) {
    if (seen.has(memo.id)) fail('memos contains duplicate IDs.');
    seen.add(memo.id);
  }
  if (normalize) memos.sort(comparePublicMemos);
  else if (memos.some((memo, index) => index > 0 && comparePublicMemos(memos[index - 1], memo) > 0)) fail('memos must be newest-first with ascending ASCII ID ties.');
  return Object.freeze({ schemaVersion: PUBLIC_EXPORT_SCHEMA_VERSION, sourceRevision: value.sourceRevision, generatedAt, tombstoneEpoch: value.tombstoneEpoch, memos: Object.freeze(memos) });
}

const hash = (value) => createHash('sha256').update(JSON.stringify(value), 'utf8').digest('hex');

export function digestForExport(value) {
  exactObject(value, PAYLOAD_KEYS, PAYLOAD_KEYS, fail, 'digest payload');
  return hash(payload(value));
}

export function decodePublicMemosExport(value, source = 'memos.public.v1.json') {
  try {
    if (value instanceof Uint8Array) value = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(value);
    if (typeof value === 'string') {
      if (/\p{Cs}/u.test(value)) fail('JSON must be well-formed Unicode.');
      value = JSON.parse(value);
    }
    exactObject(value, EXPORT_KEYS, EXPORT_KEYS, fail, 'export');
    const result = payload(value);
    if (typeof value.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(value.digest) || value.digest !== hash(result)) fail('digest must be the matching lowercase SHA-256 hex digest.');
    return Object.freeze({ ...result, digest: value.digest });
  } catch (error) {
    throw new PublicMemosContractError(`Invalid public memos export in ${source}: ${error instanceof PublicMemosContractError ? error.message : 'invalid JSON or UTF-8.'}`);
  }
}

export function createPublicExport(value) {
  exactObject(value, PAYLOAD_KEYS, PAYLOAD_KEYS, fail, 'producer payload');
  const result = payload(value, true);
  return decodePublicMemosExport({ ...result, digest: hash(result) });
}

export function serializePublicExport(value) {
  return `${JSON.stringify(decodePublicMemosExport(value))}\n`;
}
