# Memo Document Timeline Design

Status: final design approved by the owner on 2026-10-07; implementation started.
The approved product decisions are authoritative in prd.md; the defaults below
make them concrete without adding a new social product or theme marketplace.

## 1. Ownership and Data Flow

```text
selected content workspace
  posts/ + pages/ + memos/ + owned Memo assets
    -> contained materialization and shared metadata validation
    -> guest document projection (draft/access first)
    -> shared build-time Markdown/sanitize/X Core processing
    -> /pages/memos/ timeline + /pages/memos/<id>/ detail pages
    -> existing site/Experiment assembly and coordinated release
```

Use an explicit memos content collection for entry identity and optional-title
authoring, sharing the document schema primitives and normal processing. This
is one content family, not a short-entry/note classifier. Extend the central
canonical document and X Core context types deliberately rather than casting
Memo records to posts or depending on the retired wire decoder.

The aggregate remains a real Pages document (a Memo timeline layout) and the
primary homepage entry. A registered memo presentation owns its full-page
layout. Individual entries have the same presentation and generated nested
routes, while ordinary posts/pages keep their established semantics.

Memo source roots resolve from the existing selected workspace, with repo
content/memos/ as the clone default. An absent optional Memo directory yields
an empty collection so existing workspaces do not suddenly fail. If it exists,
unreadable/invalid inputs fail explicitly. Do not invent an operational path
or add a second external-source selector. Authoring data and conversion reports
remain outside public build artifacts.

Collection loaders clear their scoped Astro store when no staged Markdown
matches, before the normal glob load. A warm build must not retain withdrawn
records merely because Astro returns early for an empty collection; retained
assets do not make an otherwise empty collection populated.

## 2. Authoring Metadata

Example of a complete new source:

```yaml
---
id: m_example_001
date: 2024-06-01T08:00:00.000Z
draft: false
title: An optional title
description: An optional excerpt
tags: [reading]
firefly:
  markers: [featured]
---
The authored Markdown body.
```

The minimal form contains only id, date and draft. Creation generates a random
stable ID, a precise UTC date and draft: true, without overwriting an existing
file. New filenames use a timestamp-based name; collisions fail explicitly.
Import preserves the existing 89 IDs and dates and generates deterministic
opaque IDs for the 180 historical comment entries. Titles never determine ID.

| Field | Semantics |
| --- | --- |
| id | Required stable opaque Memo identity; never expose numeric database IDs |
| date | Required valid creation instant; common date validation; import writes precise UTC |
| draft | Required boolean; new entries start as drafts; public projection excludes drafts |
| title | Optional authored title; absence does not produce a visible filename heading |
| description | Optional plain excerpt; otherwise derive meaningful prose for preview/SEO |
| updated | Optional document date, not earlier than date |
| tags | Optional document tags; shown as labels, without a new filter feature |
| firefly.markers | Same validated editorial marker semantics; featured does not mean pinned |
| access | Same ordinary document policy; default public, nonpublic absent from guest output |
| presentation | Registered document presentation, default memo for this collection |
| contentTheme | Existing body-theme contract; defaults apply inside the Memo body |

Generated-stage layout/context values may default to memo; the aggregate uses
the timeline layout and memo presentation. Authoring should not require these
implementation selectors on every short entry. Unsupported fields/values fail
explicitly. Share validators/default semantics with the site schema without
weakening required title/description rules for ordinary posts/pages.

Untitled details still have an accessible/HTML page title derived from Memo and
the date, while the visible card header remains date-only. Preview text is not
the canonical body. No field silently enables comments, pinning, tag search,
browser Markdown execution, or arbitrary authored component/CSS imports.

## 3. Routes and Discovery

| Route | Behavior |
| --- | --- |
| /pages/memos/ | Canonical unified timeline, newest first |
| /pages/memos/#<id> | Stable timeline position for a visible entry |
| /pages/memos/<id>/ | Full individual entry in Memo styling |
| /pages/memos/assets/... | Contained, inventoried Memo assets |
| /memos/ | Compatibility navigation to the new timeline, retaining recognized fragment context |

Reserve the new aggregate/detail/asset namespace centrally and reject conflicts
with pages, aliases, assets or other collection output. Only visible entries
produce detail pages or public cursor data. Do not include private/draft IDs in
public legacy-fragment mapping. Unknown/withdrawn fragments show a normal
missing-target/available-timeline result; no legacy content lookup occurs.

The old /memos namespace transitions from an independent gated mount to a
site-owned compatibility entry; the old global flag does not control it or
the new reader. This requires coordinated changes to release markers, static
servers, preview and package fixtures, not merely an extra Astro page.

Version the release-bound access ownership change explicitly: new integrated
releases use a strict version-2 access projection with comments as the gated
plugin namespace and Memo as site-owned document routes. Retain the existing
version-1 decoder/evidence for legacy recovery; do not reinterpret a retained
version-1 Memo-disabled release as if its gate had already been retired.
Reject mixed/contradictory release ownership/markers. Existing public site
configuration can accept the old Memo subsection as deprecated compatibility
input, with explicit guidance; it has no effect on new document visibility.
Never change the comments gate or its runtime behavior as part of this migration.

Homepage discovery is through existing Pages navigation. The aggregate's
home template contains a compact introduction and native full-page link, not
269 bodies. Existing open behavior navigates to the canonical Memo page without
a document-navigator fragment. Cat of the aggregate can show that introduction
and link, consistent with its actual document body. Individual Memo entries
are not all embedded into homepage templates; ordinary document/search sets
remain unchanged except for the discoverable aggregate. First-cut scope does
not add global full-body Memo search, a Memo VFS root, or a new memos command.

This separation must be explicit in the central homepage projection so the
current one-template-per-entry and mobile search contracts remain valid. Do
not skip templates for entries that the shell still expects. Site sitemap
includes the new public routes through the ordinary build projection.

## 4. Presentation and Responsive Layout

Desktop wireframe:

```text
 Home / Pages                     Memos
                                   small introductory text
 Time                             June 2024
 2026 |                           ---------------------------------
 2025 |                           06.18  09:30              [tag]
 2024 |---- [cursor: 2024-06]      A brief entry, fully readable.
      |                           ---------------------------------
 2023 |                           06.03  18:20
 2022 |                           Optional title
 sticky rail                      A bounded long-entry preview...
                                  Read full entry ->
```

Use a calm light reading surface, system fonts, blue active cursor/link accents,
fine separators and restrained cards. Omit repeated author/avatar blocks.
The selected Twitter-like direction is a reading/feed vocabulary. Scope its
tokens/CSS/runtime to Memo; do not recolor the homepage or load a third-party
font/UI library. The aggregate and detail share the same visual language.

Desktop has a bounded left control column and a comfortable central content
measure. The rail is sticky within the page; the content uses ordinary document
scroll, not a second fixed-height scroll pane. Selected date and nearby ticks
have clear contrast; remote ticks can be subdued while remaining readable.
Dense tick labels use level-of-detail selection rather than overlapping text.

Below a content-driven narrow breakpoint (initial design target 48rem), use one
content column with a compact sticky horizontal time control above it. Reserve
its height when positioning content; account for safe-area insets and zoom.
One controller/model drives either orientation, preserving the active ID when
the viewport changes. Touch drag on the handle/rail must not consume ordinary
vertical content scrolling or browser gestures elsewhere.

## 5. Entry Rendering and Previews

All 269 entries belong to one ordered stream. Order uses date descending and
stable ASCII-ID ties. Short text appears in full; long entries use bounded
build-time previews with an explicit full-entry link. Initial preview budget is
about 500 Unicode code points and 12 logical lines; tune display details without
changing source/body identity. Build previews from parsed/sanitized content,
never substring raw HTML or produce half-links/fences. Rich long entries must
remain fully available in details; preview omission is not source truncation.

Preserve intentional soft line breaks for Memo prose/dialogue/verse with scoped
rendering/styling. Retain indentation, fenced code, significant spaces and
Unicode code points. Preserve original sources; reuse/evaluate the existing
generated-stage legacy H1 normalization and shared renderer heading checks.
Repair generated presentation hierarchy only when required and documented;
never blanket-edit authored bodies or code examples.

Body assets and internal links are resolved at build time from contained owned
inputs. Rebase existing /memos asset/internal-entry references through verified
ID correspondence. Scope heading/footnote IDs per entry in aggregate previews
to avoid collisions; individual anchors and authored label text remain useful.
No asset downloading, browser Markdown parser, live database or old export
request is required for reading. Detail routes contain complete static HTML.

## 6. Time Mapping, Scrub and Scroll Ownership

Build a lightweight public time index from projected visible entries only.
Each occupied UTC+8 calendar month receives equal track space; empty months
are compressed. Inside a month, place entries according to their actual date
and time, with a stable tie order. Actual date labels distinguish calendar gaps
from a continuous elapsed-time scale. The newest month is at the top/leading
edge and the oldest at the bottom/trailing edge.

Model state includes ordered entries/months, active entry ID, continuous drag
position, and the interaction owner. Do not use cumulative card heights as the
time scale. The nearest available entry is the seek target, not an invented
record at an empty date. Clamp bounds and handle empty/single-entry corpora.

| Mode | Owns cursor/content update |
| --- | --- |
| browsing | Natural content scroll identifies the active entry and updates the cursor |
| dragging | Pointer position updates date/target; content seeks to changed target IDs |
| settling | Release settles to the target; induced scroll cannot feed back into seeking |

Dragging provides direct feedback at animation-frame cadence, without queuing
a smooth-scroll animation for every input. Soft snap feedback highlights nearby
entry/date nodes and release settles to the selected available entry. User
scroll/wheel/keyboard interruption returns ownership to browsing predictably.
Programmatic seek events are not mistaken for independent reader input.

For browsing, use a stable reading reference below the sticky header. The entry
containing that line, or the next entry when the line is in a gap, is active.
Long entries stay active until the reader reaches the next entry; lazy image
loads and resizing re-evaluate geometry without oscillation. Switching to a
different responsive orientation preserves logical ID rather than pixel offset.

The time control is keyboard-operable with readable current-date value and
visible focus: arrow keys move to adjacent entries; Page Up/Down move between
occupied months; Home/End move to bounds. A click/tap on the rail seeks directly.
Reduced motion preserves positioning/snap state while avoiding optional motion.
Use accessible slider semantics and non-chatty announcements; do not announce
every animation frame or steal focus when the user scrolls ordinary content.

Without JavaScript, render the chronological feed, real entry/detail links and
an ordinary year/month anchor index. Empty output has honest text and an inert
time control; initialization failure leaves the static reader usable.

## 7. Detail Links and Return Context

Clicking an entry date or its full-entry link opens that entry's canonical detail.
Browser Back restores reading position; the detail also supplies an explicit
return-to-timeline link targeting the same stable ID. Progressive history state
may retain the active ID/position for same-tab navigation. Reload/shared URLs
work from the ID anchor without a storage dependency. Seeking does not push a
history entry per frame, open details, or change dates in source metadata.

The single view avoids filter-state restoration complexity. Long details keep
the same Memo typography, date, optional title/tags/markers, full code/media,
and local return link. Ordinary Terminal navigator UI is not applied here.

## 8. Migration and Legacy Retirement

Current source inspection found the owner-selected Memo target empty, while
the retained corrected 89-note staging corpus and 211 assets match all 300
final manifest entries and all 89 source/body hashes. Use this verified retained
set (or a newly reverified current copy), not the raw pre-conversion export
alone. For the 180 entries, verify exported files
against the retained comment ledger's unique times and body hashes. Offline
conversion writes metadata-bearing candidates and a private ID/time/body/link
report; website builds never open that ledger or database.

Retain the raw backup, both original exports, existing note sources/assets,
and private accepted/retired-ID/history evidence. Preserve original instants;
imported authoring dates use canonical UTC, with UI/tick grouping in UTC+8.
The 35 entries containing U+200B preserve those code points through ordinary
document processing; do not weaken a decoder or erase text merely to pass the
retired independent Memo wire format. Prove actual-corpus render compatibility.

Validate all 269 candidate records, asset closure and correspondence before
installing them. Never overwrite unrelated originals. If adapting existing 89
source headers in their current owner-selected root is necessary, first verify
exact baselines, retain owner-only recovery copies and replace only those known
files atomically. Conflict/user edits stop conversion. Installation and final
actual-corpus build happen only after approval of this plan and new contracts.

Retire independent Memo publish/push as an active product path. Preserve legacy
private formats/tools needed for recovery; existing commands must give explicit
migration guidance rather than continue an unintended SSH push. Root build,
preview, packaging, access checks and verification must test the integrated
reader. Comments and unrelated Experiments retain their contracts.

No production pointer, service, SSH state or server is changed by local feature
implementation. Coordinated deployment/cutover remains a later explicit action.
Local rollback uses source/header baselines plus retained old release/history;
do not select an old deletion-floor state or recursively remove owner data.

## 9. Affected Boundaries and Validation

Primary implementation owners: apps/site content materialization/schema/context,
canonical routes/projection, new Memo reader components/controller/styles and
fixture tests; a registered framework-neutral Memo adapter and X Core context
support; integrated assembler/runtime access and packaging; legacy authoring/
publish entrypoints and safe offline conversion. Keep these in one task because
route, data and access transitions must be accepted together.

Relevant research: metadata-and-reading.md, terminal-discovery.md,
page-presentation-independence.md, time-scrubbing.md,
unified-stream-recommendation.md, document-migration-compatibility.md and
homepage-template-boundary.md and retained-corpus-verification.md. Older proposals are historical evidence;
this design and the converged PRD define the current plan.

Browser classification: playwright-required and mobile-required. Test meaningful
navigation/actions and final alignment on maintained desktop/narrow-mobile
projects, with static/no-JS, interactive, reduced-motion and keyboard variants.
Also validate empty/single/gapped/month-dense input, drafts/private content,
date/ID ties, same-time entries, long body/media, resizing and initialization
failure. Full affected package gates and ./preview.sh verify follow focused
passes, including coordinated runtime packaging and retained-data behavior.

Residual review: subjective snap feel and visual density need a short desktop/
mobile visual review; emulation does not certify physical-device browser engines.
All design defaults are reviewable here; actual tests have not run in planning.
