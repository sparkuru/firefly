import { SITE_CONFIG } from '../src/lib/site-config.mjs';
import { loadPublicCommentsExport } from '../src/lib/comments.mjs';

if (SITE_CONFIG.comments.enabled) {
  const handoff = process.env.FIREFLY_COMMENTS_EXPORT?.trim();
  if (!handoff) {
    throw new Error('M5.1 build requires FIREFLY_COMMENTS_EXPORT when comments.enabled is true.');
  }
  const bundle = loadPublicCommentsExport(SITE_CONFIG.comments.exportPath);
  if (bundle.digest === undefined) {
    throw new Error('M5.1 build requires a SHA-256 digest in the comments export.');
  }
  process.stdout.write(`[comments] validated export ${bundle.sourceRevision} at tombstone epoch ${bundle.tombstoneEpoch}\n`);
}
