# Historical Memo Source Inventory

Read-only investigation on 2026-10-06; no source changes or remote requests.
Initial inspection found no files in the owner-selected external `blog/memos`.

## Provenance

Both `.private/migration/actual/memos.private.jsonl` and
`.private/migration/typecho-m5/memos.private.jsonl` contain 376 records and have
SHA-256 `66f38b90cb8beef5da81ba27eab7d98b55718ad555ccf8da2bfc337a67c0c94a`.
The primary agent independently checked line counts, hashes and historical
parser/provenance anchors reported by the investigation agent.

`ff34f23^:tooling/migrate-typecho/src/source.ts:344` maps `rows('notes')` to
the historical memo dataset, extracting `content` or `body` directly.
`ff34f23^:tooling/migrate-typecho/src/index.ts:647` exports the private JSONL.
`ff34f23^:.trellis/tasks/archive/2026-08/08-14-full-content-migration/research/sql-source-analysis.md:28`
lists 376 Notes; the adjacent Revisions/Authors/Sessions/Temp tables are HedgeDoc
collaboration data. These records accompanied the Typecho backup but do not
come from Typecho's article table or the retired visitor Memo service.

The owner confirmed that all notes are theirs and requested processing them
together. No identity fields need to become public to establish this decision.

## Aggregate inventory

- 376 unique source UUIDs and 376 unique private memo references.
- 287 empty bodies; 89 nonempty bodies, including one pair of equal bodies.
- 58 nonempty bodies satisfy the raw 8192-byte size limit. This does not prove
  successful source validation or rendering.
- 31 nonempty bodies exceed that limit, ranging from 9840 to 70615 bytes.
- Created timestamps range from `2024-04-02 13:43:49` to
  `2026-06-30 07:25:05`. All historical timestamps lack timezone information.
- All exported deletion markers are null.
- Permission labels: freely 292, editable 65, private 2, locked 9, limited 6,
  protected 2. The subsequent explicit owner decision permits public eligibility
  for the included nonempty notes regardless of these historical labels.
- 29 records contain Markdown images: 224 references, 218 distinct, including
  222 absolute web URLs. No images have been fetched or verified.
- 28 records contain Markdown links, 63 contain URLs, 49 contain fenced code,
  and 24 match HTML-like tags (which may occur within code).

Oversized source line numbers: 40, 41, 45, 62, 74, 75, 86, 92, 126, 147, 164,
171, 179, 183, 194, 196, 209, 213, 216, 226, 228, 231, 258, 263, 276, 316,
323, 330, 336, 337, 369.

## Initial Publisher Constraints

`tooling/publish-memos/src/source.mjs` accepts exactly `id`, `createdAt`, `draft`
metadata. Nonempty draft bodies also pass body validation; setting draft alone
does not make oversized bodies valid. Timestamp values require canonical UTC.
`tooling/publish-memos/src/render.mjs` rejects remote images and validates local
asset containment and types. Unsupported files beside Markdown also fail source
scanning, except `.gitkeep` and files under `assets/`.

## Retained SQL and revision investigation

The focused follow-up inspected the retained compressed SQL snapshot read-only.
Its compressed SHA-256 agrees with the SQLite migration run's `dump_sha256`.
The snapshot contains 376 Notes and 1146 Revisions, with `Revisions.noteId`
referencing `Notes.id` and no orphan revisions. The older research's 1019
revision count is not authoritative for this retained snapshot.

All current Notes content agrees with the exported bodies. All 287 empty Notes
have revisions. Of those, 284 never have any nonempty content/lastContent/patch;
the remaining 3 have only the four-byte serialized JSON null placeholder in
historical fields. Their latest revisions are empty. None can be recovered to
meaningful content; do not substitute historical placeholders into current notes.

Of 89 nonempty current Notes, 87 agree with their latest revision content; 2
have null revision content. Always use authoritative current Notes content,
not a blanket latest-revision replacement.

The SQL import session sets timezone `+00:00`, while source creation fields are
DATETIME. A session setting alone does not establish the timezone convention of
these stored values. The owner subsequently resolved the interpretation as
UTC+8; this is no longer a blocking decision.

## Confirmed Owner Decisions

- All notes are owner-authored; process the 89 nonempty records together.
- All imported content should be eligible for the next publication; historically
  restricted permission labels are not an exclusion filter.
- No production push has been authorized.
- The owner explicitly chose to skip all 287 empty records. Do not create empty
  Markdown files, draft placeholders or public entries for them.
- The owner confirmed UTC+8 source timestamps and approved implementation after
  reviewing full-body preservation and image/link handling.

## Final Corpus Compatibility Audit

A focused read-only audit used the publisher's pinned Markdown/raw-HTML/sanitize
parsers on all 89 included bodies, without image requests or application builds.
Zero bodies have forbidden controls/formatting/surrogate characters or CR line
endings. All 31 body-validation failures are solely the 8192-byte limit; three
bodies also exceed the current source reader's 32 KiB limit.

Actual parsed image counts agree with the earlier scan: 224 occurrences, 218
distinct sources, 29 notes, 222 HTTP(S) occurrences and two relative references.
All survive sanitization. No SVG/data/protocol-relative images or other media
elements were found. The two relative raster references are in one note; their
files have not been located. Remote availability/type is still unverified.

There are 463 parsed hyperlinks. Twenty-three old-note links in five notes map
to 18 included nonempty Notes through 16 short-ID and seven alias matches.
Seventeen are absolute and six relative. Absolute origin must also be checked
before conversion. None maps to an excluded empty record. One unmatched
extensionless relative link still needs resolution or explicit text fallback.

Seventy-eight notes have headings, 77 have H1. Seventy-seven legacy titles match
some authored heading, and 74 match the first heading. Preserve authored bodies
without automatic title insertion. The audit does not prove the source semantic
timezone. The owner subsequently confirmed UTC+8 in the final approval; convert to
canonical UTC by subtracting eight hours and retain raw values privately.

## Final Execution

The approved 128 KiB body and 256 KiB source limits are implemented. Exactly
89 sources and 211 recovered/deduplicated assets were installed and validated
from the actual external root. Complete encoded-UUID correspondence resolved
37 note links to 30 included targets, superseding the preliminary 23/18 scan.
The corrected real candidate and independent review verify all preserved bodies,
UTC+8 mapping and original ledger hashes. See [execution-evidence.md](execution-evidence.md)
and [quality-review.md](quality-review.md) for final gates and remaining Git-only
bookkeeping; no remote publication occurred.
