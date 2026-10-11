# Memos Standalone Page Redesign

## Goal

Redesign both the Memos feed and individual detail reader into a spacious
personal timeline with restrained Apple-inspired interaction and a silver/white,
light-gray palette. The owner's preview refinement simplifies the feed to
history plus entries and the detail page to date/content/bottom return/footer.

## Confirmed Background

- The owner explicitly requested task creation and design ideas on 2026-10-11.
- The owner requested light Apple-website-inspired interaction, chose
  silver/white surfaces with light-gray layering, and confirmed that the feed
  and individual detail reader should be redesigned together.
- The current feed lives at `/pages/memos/`; `/memos/` is a compatibility page.
- The independent reader uses `MemoLayout.astro`, `MemoTimeline.astro`,
  `MemoEntry.astro`, `MemoDocument.astro`, and `memo.css` in `apps/site/src/`.
- Entries show dates, optional titles, bodies, tags, and full-reading links.
  Historical date scrubbing and month navigation already exist.
- The shared contract preserves a static newest-first personal stream, without
  repeated author identity, and full access to long entries.
- The owner accepted the first candidate's visual direction, then requested
  three refinements: avoid highlighting a clipped top entry during native
  scrolling, remove detail chrome/top return, and remove feed site navigation
  while moving historical navigation to the left.
- Current native-scroll selection finds the first entry crossing the upper
  clearance line (`apps/site/src/scripts/memo-timeline.ts:86`, `:90`). This
  explains the highlighted half-visible top entry; it does not measure gaze.

## Requirements

- R1: Give the desktop reader more room and clearer hierarchy using only a
  left historical rail and entry stream; remove Home/Pages/Memos site navigation,
  global site header and the large feed intro. Retain an accessible page title.
- R2: Apply Twitter-inspired organization to a personal newest-first stream,
  retaining complete access to each entry without repeated site/author chrome.
- R3: Preserve comfortable mobile reading and full access to long entries.
- R4: Preserve existing date navigation, links, and static reading fallbacks.
- R5: Add restrained, purposeful interaction inspired by Apple website polish,
  with keyboard/touch equivalents and reduced-motion support.
  Retain date/seek/control feedback; retire the removed header's compact-label
  effect. Native scrolling highlights the entry at the effective reading viewport
  center, as explicitly chosen by the owner; explicit seeking keeps its target
  until actual browsing resumes.
- R6: Use the chosen silver/white and light-gray visual direction, emphasizing
  generous whitespace, fine borders, and soft depth.
- R7: Use a minimal flat detail reader with date, complete content, a divider,
  exactly one bottom Return to timeline link and the existing footer. Remove
  Reading a memo, global header/navigation, top return, sidebar and outer-card
  chrome. Preserve authored titles as content when present and the accessible
  title for untitled entries; preserve all source bodies.

## In Scope

- `/pages/memos/` two-column shell, entry rhythm and left historical rail.
- `/pages/memos/<id>/` detail shell, typography and return navigation.
- Responsive desktop/tablet/mobile presentation and progressive enhancement.
- Lightweight date-cursor feedback, seek-target emphasis, actionable-control
  feedback and native-scroll active-entry policy as specified in `design.md`.
- Focused browser regression coverage and the owning Memo contract update.

## Out of Scope

- Accounts, likes, reposts, visitor posting, new social/search/filter features.
- Changes to stored content, authoring/import, publication/access contracts,
  homepage Terminal behavior, or public route identities.
- A dark theme, remote fonts, new animation frameworks, or Apple brand assets.
- Production deployment, Git push, or new independent product tasks.

## Acceptance Criteria

- [x] AC1 (R1, R2, R6): Desktop feed shows left history and a spacious entry
  stream, without visible global navigation/header/large intro. Accessible page
  naming remains available and light surfaces retain the accepted visual quality.
- [x] AC2 (R3, R6, R7): At 375px, tablet widths and landscape, feed and details
  remain readable without page-wide horizontal overflow; wide content scrolls
  locally and zoom does not remove reading or navigation access.
- [x] AC3 (R4): Pointer/touch/keyboard seeking, natural-scroll sync, equal
  occupied-month spacing, month anchors, oldest-entry clearance, detail Back
  and explicit return preserve entry context and existing date semantics.
- [x] AC4 (R5): Native-scroll blue-bar/date selection follows the agreed reading
  policy, including clipped edge entries and long entries. Explicit seeks retain
  their chosen target until actual browsing resumes. Date/control feedback
  remains clear without implying knowledge of the visitor's actual gaze.
- [x] AC5 (R3, R4, R5): Reduced motion suppresses decorative transitions;
  keyboard focus is visible, touch targets remain at least 44px, and normal
  text meets 4.5:1 contrast. No-JS/controller failure retains static reading,
  detail links and native month navigation; empty/single controls remain honest.
- [x] AC6 (R7): Details render date and complete content with no global header,
  navigation, sidebar or upper return link. Exactly one bottom return follows
  a divider and preserves the originating timeline entry, followed by the footer.
- [x] AC7 (R1–R7): Applicable automated gates pass, desktop/mobile evidence is
  recorded separately, and the owner reviews the resulting local preview.

## Technical Notes and Risks

Source anchors and design reasoning are retained in
`research/ui-ux-pro-max.md`. `design.md` owns layout, interaction and contracts;
`implement.md` owns execution and validation.

Removing the header changes sticky clearance and the controller's former 64px
fallback. Moving history back left and refining browse selection require owning
spec updates and seek/scroll regression coverage. Subjective visual acceptance
remains an owner review; device emulation
does not establish physical-device or assistive-technology acceptance.

## Planning Status

The owner explicitly approved the latest complete planning summary on 2026-10-11
("可以"). Requirements/design and execution scope are approved for implementation.
No product code had changed at approval time.

First-candidate implementation, independent review, full verification, packaging
and actual-corpus checks passed (`research/final-validation.md`); the owner
accepted that visual direction. Those results are historical evidence for the
first candidate, not verification of the new refinement. The task remained
`in_progress` during refinement. The owner subsequently chose the effective reading-viewport-center
rule ("中央规则吧"), resolving the remaining decision and authorizing the revised
implementation together with the already-directed feed/detail simplifications.
At that stage no new task, commit/archive or deployment was authorized.

The revised implementation and independent review now pass, followed by the
complete gate (417 Node / 254 browser passes), normal packaging and all four
actual-corpus contexts. Original source bytes and reviewed fingerprints remain
unchanged; the restored preview serves the exact normal Memo HTML/CSS. Evidence:
`research/owner-refinement-validation.md`.

On 2026-10-11 the owner accepted the refined preview and explicitly requested
commit ("效果可以；提交"). AC7 is satisfied and all acceptance criteria are complete.
Proceed with the task work commit and standard archive/journal closeout. This
authorization does not include a remote push or production deployment.
