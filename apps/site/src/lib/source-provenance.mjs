import { readFile } from 'node:fs/promises';
import path from 'node:path';

export const SOURCE_PROVENANCE_FILENAME = '.source-provenance.json';
const collections = ['posts', 'pages', 'memos'];

function safeIdentity(value) {
  return typeof value === 'string' && value.endsWith('.md') && value.normalize('NFC') === value &&
    value.split('/').every(segment => segment.length > 0 && !segment.startsWith('.') &&
      !/[\\/?#%\u0000-\u001f\u007f]/u.test(segment));
}

// Site commands run from apps/site; import.meta.url moves during prerender bundling.
export async function readSourceProvenance(collection, id, { root = path.resolve('.generated-content') } = {}) {
  if (!collections.includes(collection) || !safeIdentity(id)) throw new Error('Invalid generated content provenance identity.');
  const file = path.join(root, collection, SOURCE_PROVENANCE_FILENAME);
  let snapshot;
  try { snapshot = JSON.parse(await readFile(file, 'utf8')); }
  catch (error) { throw new Error('Missing or invalid generated content provenance.', { cause: error }); }
  if (snapshot === null || typeof snapshot !== 'object' || Array.isArray(snapshot) ||
    Object.keys(snapshot).sort().join(',') !== 'records,version' || snapshot.version !== 1 ||
    snapshot.records === null || typeof snapshot.records !== 'object' || Array.isArray(snapshot.records)) {
    throw new Error('Invalid generated content provenance snapshot.');
  }
  for (const [identity, record] of Object.entries(snapshot.records)) {
    if (!safeIdentity(identity) || record === null || typeof record !== 'object' || Array.isArray(record) ||
      Object.keys(record).sort().join(',') !== 'kind,sourceByteLength' ||
      !['authored', 'generated'].includes(record.kind) ||
      !Number.isSafeInteger(record.sourceByteLength) || record.sourceByteLength < 0) {
      throw new Error('Invalid generated content provenance record.');
    }
  }
  if (!Object.hasOwn(snapshot.records, id)) throw new Error('Missing generated content provenance record.');
  return Object.freeze({ ...snapshot.records[id] });
}
