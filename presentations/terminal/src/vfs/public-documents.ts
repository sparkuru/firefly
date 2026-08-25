import type { ReadonlyVirtualFs } from './contracts.js';

const maxDirectories = 4_096;

export interface PublicDocumentWalk {
  readonly paths: readonly string[];
  readonly complete: boolean;
}

function childDirectoryPath(parent: string, name: string): string {
  const child = name.endsWith('/') ? name.slice(0, -1) : name;
  return parent === '/' ? `/${child}` : `${parent}/${child}`;
}

export function walkPublicDocuments(fs: ReadonlyVirtualFs, root: string): PublicDocumentWalk {
  const pending = [root];
  const visited = new Set<string>();
  const documents: string[] = [];

  while (pending.length > 0) {
    const path = pending.shift();
    if (path === undefined || visited.has(path)) continue;
    visited.add(path);
    if (visited.size > maxDirectories) {
      return Object.freeze({ paths: Object.freeze(documents), complete: false });
    }
    const listing = fs.list(path);
    if (listing === undefined || path.startsWith('/.rshell')) continue;
    documents.push(...listing.documents.map(({ path: documentPath }) => documentPath));
    pending.push(...listing.directories
      .map((name) => childDirectoryPath(path, name))
      .filter((childPath) => !childPath.startsWith('/.rshell')));
  }

  return Object.freeze({
    paths: Object.freeze([...new Set(documents)].sort()),
    complete: true
  });
}
