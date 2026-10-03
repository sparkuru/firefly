# Contract review

## Evidence and implementation constraints

- `plugins/comments/plugin.json:1` demonstrates first-party manifest ownership.
  Memo consumers are implemented by later children; this contract-only child
  must not claim those entrypoints already exist.
- `apps/site/src/lib/site-config.mjs:245` rejects non-comments plugin keys.
  Keep live activation and site-loader integration in `memo-site`.
- `plugins/comments/public.mjs:9` and `:10` define the comments precedent of
  the display-name and body bounds adopted by the owner for memo; the approved
  limits are recorded in this child's PRD.
- `plugins/comments/public.mjs:158` and `:169` normalize submission text;
  the export boundary checks canonical values. Keep producer normalization
  distinct from strict wire validation.
- `plugins/comments/public.mjs:335` decodes exports, sorts incoming records,
  and accepts an absent digest. Memo intentionally requires every envelope
  field and rejects noncanonical order; do not copy that compatibility policy.

## Relevant publication safeguards

Source: `.trellis/spec/frontend/comments-publication-contract.md`, especially
the shared contract and first-party plugin configuration sections. This note
is a focused context summary because the complete spec exceeds the native
per-file injection limit. Consult the source sections when changing a related
boundary; this note does not replace that spec.

- Public projection is an exact allowlist, with immutable decoded values and
  deterministic digest/serialization. Private identity, tokens, moderation
  state, abuse metadata and local paths stay out of public records.
- Service-owned normalization and export use the shared pure contract. Site
  and publication consumers never read private databases.
- A publication tombstone prevents an older export from restoring removed
  content. The pure contract validates epoch shape; publication owns prior
  promoted state and epoch comparison.
- Build configuration exposes only public settings. Secrets remain separate
  service inputs; examples contain names and inert placeholders only.
- Disabled plugins must not require private inputs or an export. Contract
  tests should cover unknown keys, malformed text, deterministic ordering,
  duplicate IDs, digest mismatch, immutability and configuration boundaries.
- Historical Typecho memo records remain excluded. This new approved-only
  public schema does not authorize importing or publishing that history.
