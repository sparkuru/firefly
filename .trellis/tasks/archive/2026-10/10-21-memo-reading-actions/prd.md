# Memo hover selection and reading actions

## Goal

Make Memo reading follow the reader's mouse when present, preserve natural
scroll-based selection otherwise, and provide consistent detail, copy and share
actions with noninteractive timestamps.

The owner explicitly requested task creation and four changes on 2026-10-21,
with screenshots of the active border, timestamp, detail header and Terminal
metadata. The owner approved the final planning summary with "开始" on
2026-10-21, authorizing implementation and validation of this scope.

## Background

- Viewport-center selection lives at `apps/site/src/scripts/memo-timeline.ts:95`;
  explicit seeks retain selection at `apps/site/src/scripts/memo-timeline.ts:112`.
- Feed timestamps link to details at `apps/site/src/components/MemoEntry.astro:15`.
  The bottom detail link currently appears only for truncated previews at
  `apps/site/src/components/MemoEntry.astro:25`. Untitled short entries need a
  replacement detail entry point when timestamps stop navigating.
- Original Markdown bytes are already exposed at
  `apps/site/src/lib/render-document.ts:73`. Canonical Share enhancement and
  clipboard compatibility exist at `apps/site/src/scripts/document-share.ts:5`
  and `apps/site/src/scripts/clipboard-text.ts:55`.
- Authored licensing is currently post-only at
  `apps/site/src/lib/content-schema.mjs:99`. The Memo schema at
  `apps/site/src/lib/content-schema.mjs:114` has no license field.

## Requirements

### R1 — Hover selection and scroll fallback

Hovering a feed entry with the mouse makes it the single active/highlighted
entry, synchronizing the rail and date. Moving between entries transfers the
highlight without scrolling or navigating. Bodies remain selectable text.

With no hovered entry, ordinary browsing uses the existing unobscured viewport
center rule. Actual wheel/keyboard/touch/scrollbar movement away from an
explicitly selected entry releases the seek lock; when no entry is hovered,
center selection resumes. Explicit rail/month/hash/return seeks retain their
existing alignment and lock until actual browsing or deliberate mouse movement
takes ownership. Touch cannot latch hover, and a stationary pointer must not
retain an offscreen entry while scrolling or layout changes move cards.

### R2 — Plain timestamps and complete-detail access

Feed timestamps are semantic readable time text without link/click navigation,
link styling or tab stops. Every entry, including complete untitled short ones,
has a native `Read Full` link in its bottom row. The owner's 2026-10-22
refinement requires an underline, no trailing arrow, and the same hover,
pressed and focus visuals as Share. Keep authored title/body links native.

### R3 — Per-entry Share

Every feed entry has Share at the right end of its Read Full row. It
copies that entry's canonical permanent detail URL without a fragment, using
the existing actual-success Copied / failure Failed feedback and reset. Each
entry's feedback is independent; copying must not navigate, move the page or
destroy body selection.

### R4 — Detail metadata, COPY and Share

Keep the detail date on the left and add a compact right-aligned header group:
`<N> bytes · CC BY-NC 4.0 · COPY · Share`. Bytes use the existing original
Markdown provenance, including frontmatter. The fixed license uses the existing
official CC BY-NC 4.0 deed mapping; no authored Memo license field is added.
The owner's further 2026-10-22 refinement requires the Memo license link to
match Share's hover/pressed/focus visuals and timing, without an underline,
while retaining native license navigation in enhanced and no-JS reading.

COPY copies the entire rendered body as plain text, preserving meaningful
paragraph/line boundaries and Unicode, including content beyond the feed
preview. Exclude metadata, action labels, footer and Return to timeline.
Share copies the canonical detail URL as in R3. Both controls have independent
success/failure/reset feedback. On narrow screens the group can wrap below the
date without obscuring content or causing page overflow.

## Acceptance criteria

| ID | Requirement | Observable outcome |
| --- | --- | --- |
| A1 | R1 | Hover a visible noncentral entry, then another: exactly one active border and matching rail/date follow, with no hover-induced page motion. |
| A2 | R1 | Move to a gutter and scroll away: center selection resumes. Wheel with a stationary pointer reconciles the entry actually under it instead of retaining an offscreen entry. |
| A3 | R1 | Rail drag/keyboard/month/hash/Back/return alignment and selection retention survive induced scroll, resize and media updates. Real browsing or deliberate mouse movement can take over; touch remains native and does not latch hover. |
| A4 | R2 | Timestamp click does not navigate; timestamps are not links/tab stops. Every entry has a usable underlined native Read Full link without an arrow, with Share's interaction visuals, with and without JS. |
| A5 | R3 | Each feed Share writes its exact expected permanent URL, with independent Copied/Failed/reset states and no navigation, unwanted page motion or selection loss. |
| A6 | R4 | Detail header shows the verified original UTF-8 Markdown byte count and fixed CC BY-NC 4.0 deed, right-aligned in wide layout. |
| A7 | R4 | COPY writes complete rendered body text with line boundaries/Unicode and no page chrome; detail Share writes the exact canonical URL. |
| A8 | R3, R4 | Clipboard denial, repeated clicks, stale promises and pagehide/pageshow have honest local feedback. JS-only controls/separators are hidden without JS; reading stays available. |
| A9 | R1–R4 | Desktop/narrow-mobile static and interactive checks cover focus, keyboard, 44px touch targets, reduced motion, 200% text and landscape reflow. Existing Terminal Share/navigation regressions pass. |

## Scope boundaries

One coherent reader task covers these shared feed/detail components and their
browser fixtures. Excluded: source-body edits/imports, configurable Memo
licenses, remote work/deployment, new sharing services, card-wide navigation,
global redesign, README edits, commits or archival without later authorization.

## Risks and deferred validation

Hover arbitration must preserve explicit-seek ownership. Clipboard permission
can fail and must report failure honestly. Synthetic browser tests do not prove
private-corpus correspondence, physical devices, assistive technology or
subjective visual acceptance.
