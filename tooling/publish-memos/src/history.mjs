import { createHash } from 'node:crypto';
import { denseArray, exactObject } from '../../../plugins/memos/validation.mjs';
import { normalizePublicId, timestamp } from '../../../plugins/memos/public.mjs';
import { safeRelative, shaPathPattern } from './files.mjs';

export const hash = (value) => createHash('sha256').update(typeof value === 'string' || value instanceof Uint8Array ? value : JSON.stringify(value)).digest('hex');
const fail = (message) => { throw new TypeError(`Invalid Memo history: ${message}`); };
const RECEIPT_KEYS = ['schemaVersion', 'sequence', 'deletionFloor', 'retiredIds', 'acceptedMemos', 'exportDigest', 'expectedBase', 'inventory', 'digest'];
const count = (value, label) => {
  if (!Number.isSafeInteger(value) || value < 0 || Object.is(value, -0)) fail(`${label} must be a non-negative safe integer.`);
  return value;
};
const digest = (value) => { if (typeof value !== 'string' || !shaPathPattern.test(value)) fail('expected SHA-256 digest.'); return value; };
function ordered(items, key, label) {
  if (items.some((item, index) => index > 0 && key(items[index - 1]) >= key(item))) fail(`${label} must be unique and in ascending ASCII order.`);
  return items;
}

export function decodeReceipt(value) {
  if (typeof value === 'string') value = JSON.parse(value);
  exactObject(value, RECEIPT_KEYS, RECEIPT_KEYS, fail, 'receipt');
  if (value.schemaVersion !== 1) fail('unsupported schemaVersion.');
  const sequence = count(value.sequence, 'sequence');
  if (sequence === 0) fail('an accepted/candidate sequence must be positive.');
  const deletionFloor = count(value.deletionFloor, 'deletionFloor');
  const retiredIds = ordered(denseArray(value.retiredIds, fail, 'retiredIds').map(normalizePublicId), (id) => id, 'retiredIds');
  const acceptedMemos = ordered(denseArray(value.acceptedMemos, fail, 'acceptedMemos').map((memo) => {
    exactObject(memo, ['id', 'createdAt', 'digest'], ['id', 'createdAt', 'digest'], fail, 'accepted memo');
    if (retiredIds.includes(memo.id)) fail('retired ID remains accepted.');
    return Object.freeze({ id: normalizePublicId(memo.id), createdAt: timestamp(memo.createdAt, 'createdAt'), digest: digest(memo.digest) });
  }), (memo) => memo.id, 'acceptedMemos');
  const inventory = ordered(denseArray(value.inventory, fail, 'inventory').map((file) => {
    exactObject(file, ['path', 'bytes', 'digest'], ['path', 'bytes', 'digest'], fail, 'inventory file');
    const relative = safeRelative(file.path);
    if (!relative.startsWith('public/')) fail('inventory must contain only public files.');
    return Object.freeze({ path: relative, bytes: count(file.bytes, 'file bytes'), digest: digest(file.digest) });
  }), (file) => file.path, 'inventory');
  if (value.expectedBase !== null) digest(value.expectedBase);
  if ((sequence === 1) !== (value.expectedBase === null)) fail('sequence and expectedBase disagree.');
  const payload = { schemaVersion: 1, sequence, deletionFloor, retiredIds: Object.freeze(retiredIds), acceptedMemos: Object.freeze(acceptedMemos), exportDigest: digest(value.exportDigest), expectedBase: value.expectedBase, inventory: Object.freeze(inventory) };
  if (hash(payload) !== digest(value.digest)) fail('receipt digest mismatch.');
  return Object.freeze({ ...payload, digest: value.digest });
}

export const acceptedMemosFor = (bundle) => bundle.memos.map((memo) => ({ id: memo.id, createdAt: memo.createdAt, digest: hash(memo) })).sort((a, b) => a.id < b.id ? -1 : a.id > b.id ? 1 : 0);

export function nextHistory(memos, history, initialDeletionFloor = 0) {
  const previous = history === null ? null : decodeReceipt(history);
  count(initialDeletionFloor, 'initialDeletionFloor');
  if (previous !== null && initialDeletionFloor !== 0) fail('bootstrap floor cannot override established history.');
  const retired = new Set(previous?.retiredIds ?? []);
  const present = new Set(memos.map((memo) => memo.id));
  let removed = false;
  for (const memo of previous?.acceptedMemos ?? []) {
    if (!present.has(memo.id)) { retired.add(memo.id); removed = true; }
    else if (memos.find((current) => current.id === memo.id).createdAt !== memo.createdAt) fail('accepted createdAt is immutable.');
  }
  for (const memo of memos) if (retired.has(memo.id)) fail('a retired ID cannot be republished; create a new Memo ID.');
  const sequence = count((previous?.sequence ?? 0) + 1, 'sequence');
  const deletionFloor = count((previous?.deletionFloor ?? initialDeletionFloor) + (removed ? 1 : 0), 'deletionFloor');
  return { sequence, deletionFloor, retiredIds: [...retired].sort(), expectedBase: previous?.digest ?? null };
}

export function makeReceipt(bundle, history, inventory, initialDeletionFloor = 0) {
  const transition = nextHistory(bundle.memos, history, initialDeletionFloor);
  if (bundle.tombstoneEpoch !== transition.deletionFloor) fail('export floor does not match history.');
  const payload = { schemaVersion: 1, sequence: transition.sequence, deletionFloor: transition.deletionFloor, retiredIds: transition.retiredIds, acceptedMemos: acceptedMemosFor(bundle), exportDigest: bundle.digest, expectedBase: transition.expectedBase, inventory };
  return decodeReceipt({ ...payload, digest: hash(payload) });
}

export function assertTransition(receipt, bundle, history, initialDeletionFloor = 0) {
  const expected = makeReceipt(bundle, history, receipt.inventory, initialDeletionFloor);
  if (expected.digest !== receipt.digest) fail('stale candidate or invalid history transition.');
}
