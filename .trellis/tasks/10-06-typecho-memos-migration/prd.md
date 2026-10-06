# Import 89 Historical Owner Notes into External Memo Sources

## Goal

Make the owner's 89 nonempty historical notes editable and public-eligible in
the selected external `blog/memos` directory, compatible with the independent
Memo publisher. Refresh project records so this approved scope supersedes the
earlier historical-import exclusion for this corpus.

## Background

- Initial inspection found the selected external Memo directory empty. The existing
  ignored owner adapter already selects it for independent build/publication.
- `.private/migration/actual/memos.private.jsonl` and
  `.private/migration/typecho-m5/memos.private.jsonl` each contain 376 records
  and have identical SHA-256
  `66f38b90cb8beef5da81ba27eab7d98b55718ad555ccf8da2bfc337a67c0c94a`.
- These are HedgeDoc `Notes` bundled with the Typecho backup. Historical
  `ff34f23^:tooling/migrate-typecho/src/source.ts:344` reads `rows('notes')`,
  not a Typecho memo table. The SQL/provenance investigation is recorded in
  [historical-source-inventory.md](research/historical-source-inventory.md).
- Current SQL bodies match the exports: 89 are nonempty; 287 are genuinely
  empty and have no meaningful recoverable revision content. The authoritative
  body is current `Notes.content`, including the two nonempty notes whose
  latest revision is null. Do not substitute revisions.
- The owner confirmed authorship, selected public eligibility for all imported
  content, then explicitly narrowed the import to the 89 nonempty notes and
  requested refreshing the records. Historical permission labels do not filter
  this approved corpus. The 287 empty records produce no files or placeholders.
- Existing publisher constraints prevent direct import: 31 bodies exceed
  8192 bytes (maximum 70615); 3 exceed the source reader's 32 KiB limit.
  29 notes contain 224 actual image elements: 222 HTTP(S) and 2 relative refs.
  Current rendering requires local images. Complete UUID/encoded-UUID/short-ID/
  alias correspondence resolves 37 old-note links to 30 included notes; an
  earlier partial scan found only 23/18. One additional relative link remains
  unresolved and 40 absent legacy-note targets need explicit text fallbacks.
- Source validation at `tooling/publish-memos/src/source.mjs` accepts exactly
  `id`, `createdAt`, `draft`. The 89-body audit found no forbidden
  controls/Unicode or CR line endings. Private identity/history metadata must
  remain outside generated sources and public bundles.

## Requirements

- R1: Generate one Markdown source for each of the 89 included notes, with a
  deterministic stable public ID, canonical creation timestamp and
  `draft: false`. Preserve two separate notes even if their bodies are equal.
- R2: Preserve full authored bodies and significant whitespace without
  truncation, arbitrary splitting or duplicate title insertion. Necessary
  image/internal-link rewrites must be traceable in a private conversion report.
- R3: Handle oversized bodies through bounded publisher compatibility. Generated
  sources and their resulting candidate must pass the maintained strict decoder
  and renderer; do not bypass validation for legacy records.
- R4: Materialize retrievable referenced images as contained local assets.
  Account for every unsupported/unavailable reference without dropping a note
  or pretending a failed image was recovered. Preserve an available original
  HTTP(S) reference as a normal link when an image cannot be retained locally.
- R5: Preserve note navigation where a historical alias/short-ID link targets
  another included note. Links to excluded/unknown targets must remain
  explicitly accounted for and must not acquire invented destinations.
- R6: Preserve all original backups/exports, existing external files, production
  history and unrelated dirty work. Writes are absent-only; retries verify
  already-created identical files instead of overwriting user edits.
- R7: Keep private record identities, account/permission/deletion metadata,
  operational paths and the conversion report out of public sources/receipts.
  Exclude all 287 empty records from sources and public output.
- R8: Refresh current project/task records to the verified provenance and
  approved 89-note scope. Historical archived task snapshots remain historical
  evidence and are not rewritten to claim work that did not occur.

## Acceptance Criteria

- [x] AC1 / R1,R2,R7: Exactly 89 Markdown note sources are generated and all 89 appear
  in a locally validated candidate. No empty-record sources/placeholders appear.
- [x] AC2 / R1,R2,R6: Stable ID/time/body mapping accounts for every included source,
  preserves the two equal-body notes separately and verifies unchanged original
  hashes; collisions/user edits prevent overwrite.
- [x] AC3 / R2,R3: Every full body, including the 70615-byte note, survives the
  approved conversion and strict public export round trip. Above-limit inputs
  still fail; Markdown whitespace and Unicode behavior remain covered.
- [x] AC4 / R4,R5: Every media/internal-note reference has a recorded outcome; the
  built candidate references only validated local images and correct generated
  note anchors. Unavailable original HTTP(S) references remain ordinary links;
  genuinely unresolved relative targets are explicitly reported.
- [x] AC5 / R6,R7: Local candidate validation and desktop/mobile static reading pass;
  no production pointer, receipt or blog/source-mirror state is changed.
- [x] AC6 / R8: Mainline/task records reflect confirmed decisions and actual execution
  status; final reporting distinguishes local evidence from remote publication.

## Out of Scope

- Any of the 287 empty notes; creating placeholder/draft entries for them.
- Visitor comments, private user identities or historical account migration.
- Production deployment/publication, remote image installation or changes to
  existing release pointers. A compatible remote validator is a prerequisite
  for a later separately authorized publication.
- General blog changes, unrelated current work or recreating HedgeDoc services.

## Technical Notes and Review Assumptions

- The SQL import session is UTC, but note timestamps are timezone-free DATETIME.
  Preserve raw source timestamps in the private report; the proposed conversion
  interprets them as UTC+8, explicitly confirmed by the owner on 2026-10-06,
  then subtracts eight hours to emit canonical UTC createdAt values.
- Live image availability remains an execution-time fact. A missing resource
  produces a documented link fallback rather than an excluded or truncated note.
- Source compatibility, migration details and validation order belong to
  `design.md` and `implement.md`. The owner approved implementation on 2026-10-06;
  the task is in progress and local validation precedes external source writes.
