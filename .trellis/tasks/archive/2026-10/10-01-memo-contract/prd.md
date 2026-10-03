# Define memo public contract and plugin config

## Goal

Establish the independent memo plugin's manifest, configuration boundary, and
versioned public export contract so the service, site, and publication layers
share one exact data model.

## Dependencies and Boundaries

- This child has no implementation dependency on the other memo children.
- `10-01-memo-service`, `10-01-memo-site`, and
  `10-01-memo-publication-runtime` consume this child’s contract.
- Own only `plugins/memos/` and the public build/config examples needed to
  define the contract. Do not implement HTTP handlers, SQLite, Astro routes,
  Nginx, Compose, or publication promotion.

## Requirements

- Add a `memos` manifest for first-party static registration with its own version,
  `configNamespace`, and config/site/publication/service/UI entrypoints. It
  must not reuse the comments manifest or schema. Consumer registration belongs
  to the site and publication children; this child must not add an activation
  key to the live site configuration before its loader supports it.
- Define `[plugins.memos]` activation with `enabled = false` by default and a
  repository-relative `configPath`. Define separate public build settings
  (`writeOrigin`, `exportPath`, and consent version) from private runtime
  settings and secret environment names.
- Define `memos.public.v1.json` with exact envelope keys
  `schemaVersion`, `sourceRevision`, `generatedAt`, `tombstoneEpoch`, `digest`,
  and `memos`.
- Define the exact public record allowlist: `id`, `displayName`, `body`, and
  `createdAt`. Public bodies are bounded normalized plain text; email,
  consent, tokens, moderation state, abuse metadata, and local paths are never
  valid public fields.
- Define canonical UTF-8/NFC normalization with normalized display names of
  1–80 Unicode code points and normalized bodies of 1–8192 UTF-8 bytes,
  opaque memo IDs, canonical UTC timestamps, duplicate-ID rejection, and
  newest-first ordering with stable ID tie-breaking.
- Define the SHA-256 digest input and monotonic tombstone epoch semantics so a
  consumer can reject corruption and publication rollback deterministically.
- Add adversarial contract tests for exact keys, malformed dates/UTF-8,
  private-field leakage, duplicate IDs, order, digest mismatch, and tombstone
  values.

## Out of Scope

- Submission or verification HTTP behavior.
- SQLite schema, moderation state transitions, email delivery, admin CLI, or
  Docker runtime.
- Astro presentation, navigation, Nginx, Compose, and publication assembly.

## Acceptance Criteria

- [x] `plugins/memos/plugin.json` and config modules define an independent
  `memos` capability and reject unsupported config keys.
- [x] The public decoder accepts only the documented v1 envelope and exact
  public record fields, accepting canonical text and returning immutable
  values; producer helpers normalize input before export.
- [x] Text limits are tested at the exact accepted boundaries and immediately
  beyond them, including multibyte UTF-8 bodies and supplementary Unicode
  characters in display names.
- [x] The decoder rejects private fields, unknown keys, invalid IDs/dates,
  duplicate IDs, invalid order, digest mismatches, and invalid tombstone
  values. Comparison against the last promoted epoch remains the publication
  child's acceptance responsibility, not a completed integration here.
- [x] The digest and serialization helpers produce deterministic output that
  the service and publication consumer can use without duplicating rules.
- [x] Focused contract tests pass through the repository's `./sam` container
  command boundary without a running site or memo service, secrets, or a
  database.

## Technical Notes

Repository precedent is `plugins/comments/public.mjs`, `config.mjs`,
`plugin.json`, and `tests/public.test.mjs`; reuse the validation discipline but
keep all memo names, fields, and IDs separate.
