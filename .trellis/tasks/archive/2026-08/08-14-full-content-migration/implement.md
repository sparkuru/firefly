# M5 Full Content Migration — Implementation Plan

## Entry gate

- [x] Owner approves this refreshed final planning summary after reviewing the
  PRD, design, implementation plan, UUPM research, and M5.1 handoff.
- [x] Curated implementation/check manifests validate and load the refreshed
  design, research, and relevant frontend contracts.

## 1. Private source and fixtures

- [x] Add `tooling/migrate-typecho/` with exact options/input decoding, contained
  candidates, a Typecho source adapter, private SQLite ledger, and versioned
  article/memo/comment handoff schemas.
- [x] Validate the backup checksum and produce a non-sensitive SQL inventory
  before materializing candidate values. Filter `typecho_fields` to current
  content and report the 1,080 orphan rows instead of treating them as article
  metadata.
- [x] Add synthetic fixtures for nested article organization, timestamps,
  categories/tags, templates/custom-field candidates, resource references,
  memo permissions/deletions, and comment classification. No raw private dump,
  remote path, credential, email, IP, or source identifier enters fixtures.
- [x] Test deterministic counts, route/path collisions, candidate rollback,
  owner-authorized body preservation and metadata classification,
  memo/comment non-public export, malformed source handling, and private-path
  absence in migration artifacts. Verify the real source only through local
  non-printing counts/checksums and non-sensitive reports.

## 2. Article corpus and canonical model

- [x] Generate the 93 posts and 7 pages as framework-neutral Markdown;
  materialize through the existing workspace/schema/access boundary while
  preserving the default fixture build. The real corpus is currently an
  ignored private review candidate; owner-confirmed public body text and local
  asset references are preserved without redaction.
- [x] Derive `content/posts/<category-slug>/<slug>.md` from the source category
  relationship and `content/pages/<slug>.md` for all pages. Fail on missing or
  ambiguous category edges, unsafe Unicode/path segments, or canonical
  collisions; retain special template names only in the private report.
- [x] Normalize the observed HTML/Markdown wrapper syntax into X Core-safe
  Markdown, extract body image references, and use `customSummary` only after
  safe text normalization with a derived-summary fallback.
- [x] Extend canonical content only where large real corpus/tag navigation
  requires it. Preserve one route/tree/Terminal/breadcrumb source of truth and
  add negative checks for folder/tag/canonical collisions and private/draft
  leakage.
- [x] Emit a reviewed metadata-candidate report and promote only approved
  semantic fields into strict front matter. Keep counters, templates, IDs, and
  unreviewed custom fields private or deferred.

## 3. Native static presentation

- [x] Confirm that no new semantic static routes/components are needed: the
  existing native nested routes and layouts cover the approved corpus while
  preserving
  visible H1, semantic lists/links, skip path, keyboard focus, controlled
  measure, no-JavaScript readability, and no mobile overflow.
- [x] Update content, static-output, and browser tests for representative nested
  article directories, tags where present, larger indexes, source-independent
  Terminal discovery, and absence of memos/comments/private data.

## 4. Managed resources and publication

- [x] Build a checked resource manifest and use a read-only, manifest-listed,
  checksum-verified transfer for required source-upload files. Promote verified
  ordinary assets atomically; retain trusted external URLs; preserve authored
  local image references (including relative `assets/<segments>` and legacy
  drive-style paths) as non-blocking deferred OSS-upload work; report unsafe
  URI schemes as exceptions.
- [x] Include current `thumb` candidates and body image-like references in the
  same managed/external/deferred/exception decision. Do not publish empty
  thumbnail fields or Typecho asset paths as opaque front matter.
- [x] Preserve normalized owner-confirmed public bodies without a
  credential/path-pattern redaction scan or promotion block. Keep migration
  inputs, identities, and private handoffs isolated separately.
- [x] Emit an aggregate-only `review-report.json` beside the private ledger
  decisions so resource disposition review can be repeated without exposing raw
  references or source values.
- [x] Extend static/assembler/runtime validation for asset hashes/types, broken
  local references, migration-source-path absence outside authored bodies,
  deterministic inventory, cache headers, and NERV isolation. Do not add a
  legacy redirect include or Typecho compatibility route layer.

## 5. Integration, review, and completion

- [x] Run affected checks/builds through `./sam`, including `check:m5`,
  `test:m5`, and `build:m5`; the existing main-site browser matrix is 68/68
  and `package-runtime.sh` passes the exact runtime inventory/probes.
- [x] Verify the private memo export preserves all 376 rows' permission/deletion
  state and that the private identity/comment handoff contains only opaque
  correspondence and field classifications. Public builds must contain none of
  those records.
- [x] Run the existing focused/full main-site browser coverage (68/68) and
  complete the Trellis quality review. Migrated article screenshots remain a
  follow-up because the real corpus is still private and public materialization
  remains an explicit owner action.
- [x] Update stable specs, mainline M5/M5.1 evidence, and task records only
  after verified behavior. Commit/archive only after owner review/approval.

## Rollback points

- Before private intake promotion: remove only contained candidate/ledger work;
  leave public source unchanged.
- Before content/asset promotion: retain the prior Markdown/managed-asset trees
  and manifests; do not partially replace either.
- Before publication claim: rely on the assembler's coordinated rollback of
  `artifacts/` and `dist/`; reject any source/reference/runtime mismatch.
