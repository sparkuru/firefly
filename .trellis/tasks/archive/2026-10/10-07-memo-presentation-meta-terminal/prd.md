# Memo Documents and Time-Scrubbing Reader

## Goal

Publish the owner's Memo as document-family content in the coordinated Firefly
build, with an independent Twitter-like reader at /pages/memos/. Readers find
content by moving through historical time, with cursor and content synchronized.

## Background and Evidence

The owner approved planning on 2026-10-07 and subsequently confirmed all key
product choices below. The owner approved the final complete planning summary
on 2026-10-07. Implementation is authorized; task status is in_progress.

The corpus consists of 180 owner-authored historical short entries and 89
previously converted notes. All historic names belong to the owner; no name
filtering or repeated author display is required. The previous extraction
preserved all 180 bodies with unique UTC+8 timestamp filenames. The 89-note
target was empty during planning, but a retained corrected set of 89 Markdown files
and 211 assets matches every final manifest, source and body hash; see
[retained-corpus-verification.md](research/retained-corpus-verification.md).

The prior Memo used independent publication, a strict source/wire format and a
global plugin gate. The owner explicitly superseded that product model with
ordinary document publishing and coordinated builds. The baseline article consumers
supported posts/pages and two fixed page experiences; the new content/presentation
requires explicit implementation, not merely an extra metadata value.

Relevant source evidence is retained in
[metadata-and-reading.md](research/metadata-and-reading.md),
[page-presentation-independence.md](research/page-presentation-independence.md),
[homepage-template-boundary.md](research/homepage-template-boundary.md), and
[document-migration-compatibility.md](research/document-migration-compatibility.md).
Older independent/Lab-only recommendations are historical proposals.

## Requirements

- R1: Present all 269 owner-authored entries in one chronological stream, with
  no mandatory short-entry/note categories. Show short content directly and
  bounded long-content previews with access to the complete individual entry.
- R2: Preserve full text, code, significant whitespace, intended prose/verse/
  dialogue line breaks, media and original creation instants. Do not repeat
  author names. Preserve meaningful titles without forcing visible title
  chrome onto untitled brief entries.
- R3: Reuse document metadata semantics and shared build-time Markdown/document
  processing. Creation generates stable id/date/draft; title, description,
  updated, tags and firefly.markers are optional. Missing descriptions may be
  derived from body prose. Ordinary post/page authoring rules remain strict.
- R4: Provide /pages/memos/ as a distinct full-page Twitter-like presentation,
  discoverable through Pages. Memo uses ordinary draft/access publication
  controls; no separate global Memo switch governs new document visibility.
  Homepage and ordinary Terminal documents keep their established presentation.
- R5: Include Memo in the coordinated site/Experiment build and release.
  Transition the legacy route/publisher/config coherently while preserving raw
  backups, source/ID correspondence, assets and private acceptance/deletion
  history. Do not reset history or silently revive retired content.
- R6: Desktop uses a sticky left vertical time rail and naturally scrolling
  content on the right. The rail has a draggable cursor, year/month/date ticks,
  snap feedback and clear active-time emphasis with subdued surrounding ticks.
  Occupied months receive equal track space; empty intervals are compressed,
  with actual date labels. Dragging time positions content; scrolling content
  updates the cursor without oscillation or competing scroll feedback.
- R7: Combine aggregate browsing and individual-entry pages. Stable entry/date
  links open complete content in Memo styling; Back and explicit return restore
  the entry's timeline context. Seeking time does not open details or create
  browser history entries per drag frame.
- R8: Narrow mobile uses a sticky horizontal time control above single-column
  content, retaining the same time mapping and bidirectional synchronization.
  Support keyboard/click alternatives, reduced motion, zoom and readable static
  chronological content/anchors when JavaScript is disabled or unavailable.

## Acceptance Criteria

- [x] AC1 / R1,R2,R7: The real unified corpus has exactly 269 distinct entries,
  each with a stable timeline reference and full individual reading route.
  Short bodies are readable and long previews cannot discard the complete body.
- [x] AC2 / R2,R3,R5: All 89 recovered sources/211 assets and all 180 historical
  bodies/times are accounted for against private baselines. Duplicate bodies
  retain distinct IDs; code, Unicode/U+200B, paragraphs, media and meaningful
  links survive without unexplained transformation or user-file overwrite.
- [x] AC3 / R3: Minimal sources need only id/date/draft; new authoring generates
  them absent-only. Optional common fields have documented behavior, invalid/
  duplicate metadata fails, and ordinary post/page checks retain their rules.
- [x] AC4 / R4: Pages discovery opens the independent Memo presentation; the
  legacy Memo flag cannot hide/publish new entries. Draft/nonpublic entries are
  absent from public details, feed and time index. Ordinary Terminal behavior,
  navigation/template inventories and style/runtime isolation remain valid.
  Removing the last Memo or post must remove its public output on a warm build,
  including when unreferenced source assets remain; no cache reset is required.
- [x] AC5 / R1–R8: PRD, design, implementation plan and curated contexts pass
  planning review; the owner approves the latest complete summary before start.
- [x] AC6 / R3,R5: An ordinary coordinated build produces Memo routes/assets;
  entry edits no longer need a separate Memo push. The legacy route has clear
  compatibility behavior, and private recovery/history stays outside public
  output. No unrequested SSH or production deployment occurs.
- [x] AC7 / R6: Occupied-month spacing, real date labels, bounds/gaps and snap
  outcomes are observable. Pointer seek positions content and native scroll
  updates the cursor; induced scroll does not cause cursor/content oscillation.
- [x] AC8 / R7,R8: Detail/Back/return retains entry context. Desktop keyboard,
  narrow-mobile touch, normal page scrolling, resize, reduced-motion and
  JavaScript-disabled reading pass the maintained browser matrix.

## Scope and Reviewable Defaults

The concrete design is in [design.md](design.md), with ordered execution and
checks in [implement.md](implement.md). Chosen technical defaults are newest-
first ordering, UTC+8 display/month grouping, native detail/return links, shared
sanitization, a registered Memo page composition, compact homepage introduction
and no full-feed embedding in home HTML. Source installation uses verified
private candidates and conflict-aware recovery copies.

This is one coordinated feature task: content identity, page presentation and
old publication/access transition must be accepted together. Implementation may
use independently owned worker boundaries after approval; no child product task
or architecture choice is delegated implicitly.

## Out of Scope

- Product edits, imports or deployment during planning; commits/archival without
  the repository's later concrete approval.
- Production publishing, server/SSH/service changes, remote asset downloads or
  destructive cleanup of originals/private history.
- Visitor submissions, social interaction features, accounts or HedgeDoc.
- A second Lab reader, a general theme marketplace, arbitrary authored CSS/code,
  or browser Markdown parsing.
- Short-entry/note tabs, tag filtering/pinning, full-body Memo search on the
  homepage, a new Memo VFS root or a dedicated Terminal command. The Pages entry
  and ordinary open operation supply first-cut discovery.
- Tracked real owner content, operational identities, private database records
  or recovery reports in public output/tests/project records.

## Planning Status and Limits

Owner-owned product decisions are resolved for this MVP. Implementation is
delivered, with independently verified real-corpus source correspondence, rendered
269-entry/211-asset closure and absent-only installation. Full-scope review,
coordinated installed-workspace rebuild and actual desktop/mobile interactive,
no-JS and loaded-image acceptance passed. The complete fixture gate passed 398
Node tests and 184 browser tests with 146 applicability skips. The final repeat's
complete stage results survived daemon recovery; its lost process exit is not
invented. Both host fixtures were repeated successfully after recovery. Actual
runtime packaging and final original/source/output reconciliation passed.
Exact results live in task research. No production, commit or archival acceptance
is claimed. Material scope/behavior changes still require renewed plan review.
