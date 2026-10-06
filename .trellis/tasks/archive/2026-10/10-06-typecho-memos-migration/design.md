# Historical Owner Memo Import Design

## Boundaries

The input is the retained private 376-record HedgeDoc Notes ledger and its
read-only SQLite/SQL correspondence. Select exactly the 89 current nonempty
bodies; never recover or generate placeholders for the 287 empty records.
The output is the owner-selected external Memo directory and its contained
`assets/` child, plus a private mapping/report under `.private/` and a locally
validated candidate. No production operation belongs to this task.

Use a task-specific preparation script in `/tmp` or ignored private tooling;
do not add real historical bodies, source identities, URLs, owner-local paths or
operational configuration to tracked code or synthetic tests. Existing generic
authoring defaults and the private external read adapter remain unchanged.

## Bounded Long-Body Compatibility

Raise the pure Markdown body ceiling from 8192 to 131072 UTF-8 bytes (128 KiB)
and the source-file reader ceiling from 32 KiB to 256 KiB. The observed maximum
historical body is 70615 bytes. One source note remains one public record; no
truncation or arbitrary continuation fragments.

Update `plugins/memos/public.mjs`, its declarations and actual byte-boundary
tests together, plus `tooling/publish-memos/src/source.mjs` and focused publisher
tests. Producers, strict decoders and candidate validation use the same ceiling;
schema 2 and exact record fields remain unchanged. Keep UTF-8, controls,
ordering/digests, immutable timestamp, source containment and visible-output
checks intact. Reuse the exported constant for source body validation; keep
source file reads separately bounded. Above-limit input remains rejected.

Current remote promotion uses an immutable publisher image. An old image may
reject the new larger bodies, so later remote publication requires an image
with the revised contract. Do not install or select a remote image here. Local
public eligibility and successful local builds do not prove remote acceptance.

## Source Identity and Time

Use a stable opaque ID such as `m_legacy_<sha256(memoRef)>` and a safe filename
containing the source date plus an ID suffix. Map all 89 notes independently;
equal body text does not collapse distinct source records. Record original
UUID/ref, title, timestamps and new ID/file mapping only in the private report.
Source front matter contains exactly `id`, canonical UTC `createdAt` and
`draft: false`. Keep the author name in the existing owner configuration.

Interpret timezone-free source timestamps as UTC+8, explicitly confirmed by
the owner together with final implementation approval on 2026-10-06. Subtract
eight hours to emit canonical UTC values, preserving raw values and this
conversion policy privately. Once published, accepted timestamps are immutable.

Keep the authored Markdown body and headings; do not insert a second title.
The content audit found no forbidden Unicode/controls or CR line endings.
Revalidate all bodies after URL conversion and stop on any unexpected issue.

## Markdown and Link Conversion

Inspect Markdown/raw-HTML image and link nodes outside fenced/inline code using
the same pinned parser family as the publisher. Modify only reference spans,
including shared Markdown reference definitions, preserving the rest of the
authored text and significant whitespace. Do not serialize the entire document
through a formatter merely to replace URLs.

Thirty-seven recognized old-note links target 30 included notes. Correlate SQL
UUID/encoded-UUID/alias/short-ID mappings with the actual old origin before rewriting absolute
URLs; matching a path on an unrelated host is insufficient. Rewrite confirmed
targets to `/memos/#<stable-id>`. Preserve query/fragment intent where a
supported equivalent exists; account explicitly for unsupported old semantics.
Bare GFM and angle autolinks must become explicit Markdown links when their new
target is relative; replacing a bare HTTP URL with `/memos/#...` alone loses
the rendered link. Preserve the original visible label and verify actual rendered
anchor targets, not only converted source strings. Unknown opaque root-note
targets become visible label/target text rather than fabricated current routes.

One unmatched relative link currently fails asset resolution. Resolve it from
authorized historical evidence if possible. Otherwise preserve its label and
literal original target as visible text rather than invent a destination or
make candidate generation fail. The private report records that outcome.

## Image Materialization

The parsed corpus has 224 image occurrences / 218 distinct sources in 29 notes:
222 HTTP(S) occurrences and two relative references. No SVG/data/protocol-relative
images were found. Resolve the two local references only from task-relevant
existing authoring/backup assets; do not scan unrelated workspaces.

For referenced HTTP(S) images, request only the listed resources with bounded
timeouts, redirect count and bytes, without credentials/cookies. Follow only
HTTP(S) redirects and validate each actual response. Do not traverse a host or
collect unrelated assets. Validate supported raster signatures before retaining
bytes, using the publisher's supported types and 16 MiB per-asset bound.

Deduplicate by verified content digest; retain deterministic contained paths
under `assets/legacy/`. Rewrite each recovered image to its local asset path.
No publisher/network-policy change is needed; its remote-image refusal stays.

If an image is unavailable, invalid or unsupported, preserve its caption/alt and
original HTTP(S) URL as a normal link. For unresolved relative references,
preserve caption and literal original target as text. Record each fallback;
never claim that unavailable bytes were recovered. There are no silent note
omissions because one image failed.

## Preparation, Promotion and Rollback

Prepare all 89 sources/assets under a private staging root first. Keep original
hashes and a complete planned file inventory. Build and validate a candidate
from that staged root through `sam` with `SAM_CONTENT_MODE=none` before writing
the external authoring root.

Check canonical nonsymlink parent paths, target repository instructions/status
and every absent destination. Promote only this inventory with exclusive
creation. If a destination exists with identical bytes, allow a verified retry;
if it differs, stop without overwrite. On interrupted promotion, the private
mapping records the exact subset created; subsequent retries remain safe.

Rebuild from the actual external root through the existing private adapter and
validate exact 89-record output. Rollback removes only absent-before-import
files whose bytes still match this task's inventory; edited or preexisting files
are never removed. Keep all private originals and reports. No rollback touches
a production pointer or accepted Memo receipt.

## Validation

Use synthetic tests for changed byte limits and long source files, including
multibyte boundary cases, over-limit refusal and exact body round trips. Keep
actual note bodies out of tracked tests and general repository fixture inputs.

Validate the real staged/external candidate privately: 89 IDs/files/export
records, exact timestamps/mapped bodies, all 287 skips, link/media outcomes,
public inventory closure and absence of private metadata. Check no-JS desktop
and narrow-mobile reading, especially long code/tables and local images. Run
the affected package/contract/integration gates through approved wrappers.
Broader site/runtime checks follow the changed consumer boundary and any new
failure; avoid rebuilding or publishing the owner's blog merely for this import.
