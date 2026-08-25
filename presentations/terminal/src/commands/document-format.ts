import type { PublicDocument } from '../vfs/contracts.js';

export function formatDocument(document: PublicDocument): string {
  const displayPath = document.kind === 'post' ? document.relativePath : document.path;
  return `${displayPath} — ${document.date} — ${document.title}`;
}
