import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import test from 'node:test';
import { createPublicExport, decodePublicMemosExport, digestForExport, MAX_BODY_BYTES, normalizeBody, normalizeDisplayName, serializePublicExport, PublicMemosContractError } from '../public.mjs';

const date = '2026-09-30T00:00:00.000Z';
const memo = (overrides = {}) => ({ id: 'm_aaa', displayName: 'Reader', body: 'Hello', createdAt: date, ...overrides });
const input = (memos = [memo()]) => ({ schemaVersion: 2, bodyFormat: 'markdown', sourceRevision: 'revision-1', generatedAt: date, tombstoneEpoch: 0, memos });
const wire = () => structuredClone(createPublicExport(input()));
const rejects = (value, message) => assert.throws(() => decodePublicMemosExport(value), (error) => {
  assert.ok(error instanceof PublicMemosContractError);
  if (message) assert.match(error.message, message);
  return true;
});

test('producer normalizes and sorts without mutating; digest has a fixed independent preimage', () => {
  const original = input([memo({ id: 'm_zzz', body: ' e\u0301\r\nline\rnext ' }), memo({ id: 'm_AAA' }), memo({ id: 'm_old', createdAt: '2025-01-01T00:00:00.000Z' })]);
  const snapshot = structuredClone(original);
  const result = createPublicExport(original);
  assert.deepEqual(original, snapshot);
  assert.deepEqual(result.memos.map(({ id }) => id), ['m_AAA', 'm_zzz', 'm_old']);
  assert.equal(result.memos[1].body, ' e\u0301\nline\nnext ');
  const expected = '{"schemaVersion":2,"bodyFormat":"markdown","sourceRevision":"revision-1","generatedAt":"2026-09-30T00:00:00.000Z","tombstoneEpoch":0,"memos":[{"id":"m_aaa","displayName":"Reader","body":"Hello","createdAt":"2026-09-30T00:00:00.000Z"}]}';
  assert.equal(wire().digest, createHash('sha256').update(expected).digest('hex'));
  assert.equal(digestForExport(input()), wire().digest);
  const serialized = serializePublicExport(result);
  assert.ok(serialized.endsWith('\n'));
  assert.deepEqual(decodePublicMemosExport(Buffer.from(serialized)), result);
  assert.equal(serializePublicExport(decodePublicMemosExport(serialized)), serialized);
  for (const value of [result, result.memos, ...result.memos]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { result.memos[0].body = 'changed'; }, TypeError);
});

test('exact fields reject private/legacy fields and every missing required field', () => {
  for (const key of Object.keys(wire())) { const value = wire(); delete value[key]; rejects(value, /export is missing/); }
  for (const key of Object.keys(memo())) { const value = wire(); delete value.memos[0][key]; rejects(value, /memo is missing/); }
  for (const key of ['email', 'ip', 'userAgent', 'token', 'consent', 'state', 'postPath', 'parentId', 'homepage', 'databasePath']) {
    rejects({ ...wire(), [key]: 'private' }, /unsupported field/);
    const value = wire(); value.memos[0][key] = 'private'; rejects(value, /unsupported field/);
  }
  let getterCalls = 0;
  const accessor = wire(); Object.defineProperty(accessor, 'digest', { get() { getterCalls += 1; return 'private'; } });
  rejects(accessor, /data property/);
  assert.equal(getterCalls, 0);
  const symbol = wire(); symbol[Symbol('private')] = 'secret'; rejects(symbol, /unsupported field/);
  const hidden = wire(); Object.defineProperty(hidden.memos[0], 'email', { value: 'secret' }); rejects(hidden, /unsupported field/);
  rejects(Object.assign(Object.create({}), wire()), /plain object/);
  for (const memos of [new Array(1), Object.assign([], { email: 'secret' }), [memo(), , memo()]]) rejects({ ...wire(), memos }, /dense array/);
  const accessorArray = [memo()];
  Object.defineProperty(accessorArray, '0', { get() { getterCalls += 1; return memo(); } });
  rejects({ ...wire(), memos: accessorArray }, /data entries/);
  assert.equal(getterCalls, 0);
});

test('strict wire does not repair order, canonical text, invalid dates, or IDs', () => {
  const result = createPublicExport(input([memo(), memo({ id: 'm_bbb' })]));
  rejects({ ...result, memos: [...result.memos].reverse() }, /newest-first/);
  rejects({ ...wire(), memos: [memo(), memo()] }, /duplicate IDs/);
  for (const body of ['a\rb', 'a\r\nb', 'a\u0000b', 'a\u202eb', '\ud800', '']) rejects({ ...wire(), memos: [memo({ body })] }, /canonical|unsafe text|well-formed Unicode/);
  for (const body of [' Hello', 'Hello ', 'e\u0301', '  indented\nline  \n', '```\ne\u0301  \n```']) assert.equal(createPublicExport(input([memo({ body })])).memos[0].body, body);
  for (const id of ['c_aaa', 'm_a', 'm_中文', 'm_a/b', 'm_' + 'a'.repeat(129)]) rejects({ ...wire(), memos: [memo({ id })] }, /opaque memo ID/);
  for (const createdAt of ['2026-02-30T00:00:00.000Z', '2026-09-30T00:00:00Z', '2026-09-30T00:00:00.000+00:00', '+010000-01-01T00:00:00.000Z']) {
    rejects({ ...wire(), memos: [memo({ createdAt })] }, /createdAt.*canonical UTC timestamp/);
    rejects({ ...wire(), generatedAt: createdAt }, /generatedAt.*canonical UTC timestamp/);
  }
  assert.throws(() => createPublicExport(input([memo({ body: '\udfff' })])), PublicMemosContractError);
});

test('exact display-name code point limit applies to producers and wire records', () => {
  const displayName = '😀'.repeat(80);
  assert.equal(normalizeDisplayName(` ${displayName} `), displayName);
  assert.equal(normalizeBody(' leading and trailing  '), ' leading and trailing  ');
  assert.equal(decodePublicMemosExport(createPublicExport(input([memo({ displayName })]))).memos[0].displayName, displayName);
  for (const changes of [{ displayName: displayName + 'a' }, { displayName: 'a\nb' }, { displayName: ' ' }]) {
    assert.throws(() => createPublicExport(input([memo(changes)])), PublicMemosContractError);
    rejects({ ...wire(), memos: [memo(changes)] }, /1–80|unsafe text/);
  }
});

test('128 KiB ASCII and multibyte bodies round trip exactly; one extra byte is rejected', () => {
  assert.equal(MAX_BODY_BYTES, 131072);
  const bodies = ['a'.repeat(131072), '中'.repeat(43690) + 'ab', '😀'.repeat(32768)];
  for (const body of bodies) {
    assert.equal(Buffer.byteLength(body, 'utf8'), 131072);
    assert.equal(normalizeBody(body), body);
    const result = createPublicExport(input([memo({ body })]));
    const serialized = serializePublicExport(result);
    for (const value of [result, serialized, Buffer.from(serialized, 'utf8')]) {
      assert.equal(decodePublicMemosExport(value).memos[0].body, body);
    }
    const oversized = body + 'a';
    assert.equal(Buffer.byteLength(oversized, 'utf8'), 131073);
    const message = /body must contain 1–131072 UTF-8 bytes\./;
    assert.throws(() => normalizeBody(oversized), message);
    assert.throws(() => createPublicExport(input([memo({ body: oversized })])), message);
    const invalid = { ...result, memos: [memo({ body: oversized })] };
    for (const value of [invalid, JSON.stringify(invalid), Buffer.from(JSON.stringify(invalid), 'utf8')]) {
      rejects(value, message);
    }
  }
});

test('digest and epoch checks reject corruption and invalid metadata', () => {
  for (const digest of [undefined, null, '', 'a'.repeat(64), wire().digest.toUpperCase(), `sha256:${wire().digest}`]) rejects({ ...wire(), digest });
  for (const tombstoneEpoch of [-1, -0, 0.5, Number.MAX_SAFE_INTEGER + 1, Infinity, '0', null]) rejects({ ...wire(), tombstoneEpoch }, /tombstoneEpoch.*safe integer/);
  assert.equal(createPublicExport({ ...input([]), tombstoneEpoch: Number.MAX_SAFE_INTEGER }).tombstoneEpoch, Number.MAX_SAFE_INTEGER);
  rejects({ ...wire(), sourceRevision: '/private/path' }, /sourceRevision.*opaque ASCII revision/);
  rejects({ ...wire(), schemaVersion: 1 }, /schemaVersion must be 2/);
  rejects({ ...wire(), bodyFormat: 'text' }, /bodyFormat must be markdown/);
  rejects({ ...wire(), memos: [memo({ body: 'tampered' })] });
});

test('JSON and byte decoder reject malformed UTF-8 without replacement repair', () => {
  for (const bytes of [[0xc0, 0xaf], [0xed, 0xa0, 0x80], [0xf0, 0x9f], [0xff]]) rejects(new Uint8Array(bytes));
  rejects('{bad json}');
  rejects(JSON.stringify(wire()).replace('Hello', '\\ud800'));
  rejects(Buffer.concat([Buffer.from(JSON.stringify(wire()).replace('Hello', '')), Buffer.from([0xff])]));
  const valid = createPublicExport(input([memo({ body: '中文😀' })]));
  assert.deepEqual(decodePublicMemosExport(Buffer.from(serializePublicExport(valid))), valid);
  // A permissive decoder would repair this byte to U+FFFD and accept the digest.
  const replacementWire = serializePublicExport(createPublicExport(input([memo({ body: '\ufffd' })])));
  const [prefix, suffix] = replacementWire.split('\ufffd');
  const invalidBytes = Buffer.concat([Buffer.from(prefix), Buffer.from([0xff]), Buffer.from(suffix)]);
  assert.deepEqual(decodePublicMemosExport(invalidBytes.toString('utf8')), decodePublicMemosExport(replacementWire));
  rejects(invalidBytes, /invalid JSON or UTF-8/);
});
