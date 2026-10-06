import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { parse, type DefaultTreeAdapterTypes as HTML } from 'parse5';

const packageRoot = existsSync(path.resolve(import.meta.dirname, '../../package.json'))
  ? path.resolve(import.meta.dirname, '../..') : path.resolve(import.meta.dirname, '../../..');
export const publicationContractRoot = path.resolve(packageRoot, '../..');
export const { readContainedFile } = await import(pathToFileURL(path.join(publicationContractRoot, 'tooling/shared/contained-file.mjs')).href) as typeof import('../../../shared/contained-file.mjs');

export interface MemosPublicationMetadata {
  readonly enabled: boolean;
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly digest: string | null;
  readonly tombstoneEpoch: number;
}
const EMPTY_DATE = '1970-01-01T00:00:00.000Z';
export function memoMetadata(epoch = 0): MemosPublicationMetadata {
  return Object.freeze({ enabled: false, schemaVersion: 1, sourceRevision: 'empty', generatedAt: EMPTY_DATE, digest: null, tombstoneEpoch: epoch });
}
export function decodeMemoMetadata(value: unknown): MemosPublicationMetadata {
  const fail = () => { throw new TypeError('Invalid memo publication history; recover the prior publication metadata before rebuilding.'); };
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return fail();
  const fields = ['enabled', 'schemaVersion', 'sourceRevision', 'generatedAt', 'digest', 'tombstoneEpoch'];
  const descriptors = Object.getOwnPropertyDescriptors(value);
  if (Reflect.ownKeys(descriptors).length !== fields.length || fields.some((key) => !descriptors[key] || !('value' in descriptors[key]!))) return fail();
  const v = value as MemosPublicationMetadata;
  if (typeof v.enabled !== 'boolean' || v.schemaVersion !== 1 || typeof v.sourceRevision !== 'string' || !/^[A-Za-z0-9._~-]{1,256}$/u.test(v.sourceRevision) ||
    typeof v.generatedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/u.test(v.generatedAt) || !Number.isFinite(Date.parse(v.generatedAt)) || new Date(v.generatedAt).toISOString() !== v.generatedAt ||
    !Number.isSafeInteger(v.tombstoneEpoch) || v.tombstoneEpoch < 0 || Object.is(v.tombstoneEpoch, -0) ||
    (v.enabled ? typeof v.digest !== 'string' || !/^[a-f0-9]{64}$/u.test(v.digest) : v.digest !== null || v.sourceRevision !== 'empty' || v.generatedAt !== EMPTY_DATE)) return fail();
  return Object.freeze({ enabled: v.enabled, schemaVersion: 1, sourceRevision: v.sourceRevision, generatedAt: v.generatedAt, digest: v.digest, tombstoneEpoch: v.tombstoneEpoch });
}

export function hasMemoSurface(contents: string): boolean {
  const visit = (node: HTML.Node): boolean => {
    if ('attrs' in node && (node.attrs.some((a) => a.name.startsWith('data-memos-') || a.name.startsWith('data-memo-')) || node.attrs.some((a) => a.name === 'class' && /(?:^|\s)memo-(?:stream|submission)(?:\s|$)/u.test(a.value)))) return true;
    if ('content' in node && visit(node.content)) return true;
    return 'childNodes' in node && node.childNodes.some(visit);
  };
  return visit(parse(contents));
}

export async function validateMemoTree(root: string, files: readonly string[]): Promise<void> {
  for (const relative of files) {
    const route = relative.split('/').map((segment) => decodeURIComponent(segment)).join('/').normalize('NFKC').toLowerCase();
    if (route === 'memos.html' || route.startsWith('memos/')) throw new TypeError('Blog output cannot own the independent Memo namespace.');
    if (relative.endsWith('.html') && hasMemoSurface(new TextDecoder('utf-8', { fatal: true }).decode(await readFile(path.join(root, relative))))) throw new TypeError('Blog output cannot contain a retired Memo stream or submission surface.');
  }
}
