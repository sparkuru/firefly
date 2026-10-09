import { resolveSiteMetadata } from './site-meta.mjs';

export function resolveDocumentShareUrl(pathname, canonical) {
  const resolved = resolveSiteMetadata({ pathname, canonical }).canonical;
  if (resolved === undefined) return pathname;
  const url = new URL(resolved);
  url.hash = '';
  return url.href;
}
