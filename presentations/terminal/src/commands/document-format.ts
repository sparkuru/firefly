import type { PublicDocument } from '../vfs/contracts.js';

export function documentDisplayName(document: PublicDocument): string {
  const title = document.title.trim();
  return title.length > 0 ? title : document.filename.slice(0, -3);
}

export function formatDocument(document: PublicDocument): string {
  const displayPath = document.kind === 'post' ? document.relativePath : document.path;
  return `${documentDisplayName(document)} — ${document.date} — ${displayPath}`;
}
