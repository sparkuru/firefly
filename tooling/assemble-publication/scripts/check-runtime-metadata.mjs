import assert from 'node:assert/strict';
import path from 'node:path';
import { decodeMemoMetadata, memoContract, readContainedFile, validateMemoTree } from '../dist/src/plugins/memos.js';
import { loadMemoPublication } from '../dist/src/plugins/memos.js';
import { walkSafeTree } from '../dist/src/index.js';

const root = path.resolve(import.meta.dirname, '../../..');
const publication = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(readContainedFile('artifacts/publication.json', root, 'runtime publication metadata', 4 * 1024 * 1024)));
const metadata = decodeMemoMetadata(publication.memos);
const input = loadMemoPublication(root, { exportPath: 'artifacts/memos/memos.public.v1.json' });
assert.equal(metadata.enabled, input !== null);
if (input !== null) {
  const snapshot = memoContract.decodePublicMemosExport(readContainedFile('artifacts/memos/memos.public.v1.json', root, 'runtime memo snapshot', 64 * 1024 * 1024));
  for (const key of ['schemaVersion', 'sourceRevision', 'generatedAt', 'digest', 'tombstoneEpoch']) assert.equal(metadata[key], snapshot[key]);
  assert.deepEqual(snapshot, input.envelope);
}
const releaseFiles = (await walkSafeTree(path.join(root, 'dist'))).files;
assert.deepEqual([...publication.inventory].sort(), [...releaseFiles].sort());
assert.ok(!releaseFiles.includes('memos/memos.public.v1.json'));
await validateMemoTree(path.join(root, 'dist'), releaseFiles, input);
await validateMemoTree(path.join(root, 'artifacts/site'), (await walkSafeTree(path.join(root, 'artifacts/site'))).files, input);
if (!metadata.enabled) {
  const artifactFiles = (await walkSafeTree(path.join(root, 'artifacts'))).files;
  assert.ok(!artifactFiles.includes('memos/memos.public.v1.json'));
}
process.stdout.write('[package-runtime] exact memo metadata, retained epoch and public inventory passed\n');
