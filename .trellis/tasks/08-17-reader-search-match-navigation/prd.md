# Reader search match navigation and highlighting

## Goal

Make the read-only Vim reader's literal search behave like a precise,
observable occurrence navigator. A reader should be able to see the current
match, move through every occurrence with `n`/`N`, and understand the `?`
backward-search control without losing native document reading behavior.

## User value

Searching a long Terminal document must identify the exact text the reader is
looking for, including repeated occurrences inside one code block. The search
status must follow the active match so that movement is meaningful even when
the surrounding semantic reading unit does not change.

## Confirmed repository facts

- `apps/site/src/scripts/terminal-reader.ts` currently collects
  `searchMatches` as reading-unit indexes. Multiple occurrences inside one
  unit therefore collapse into one match.
- Current CSS Highlight ranges use `Range.selectNodeContents(unit)`, so a
  matching paragraph or `<pre>` is highlighted in its entirety.
- `n`/`N` repeat the stored search direction but move only to a matching unit;
  when all remaining occurrences are inside the current unit, the active
  visual target does not change.
- Search feedback is currently written to the transient reader message and
  live announcer. The persistent status row only exposes mode and reading-unit
  position.
- The backward-search prefix is a plain `?` span and the native search input
  has no placeholder or explicit directional helper text. The reported mobile
  screenshot shows the search field is technically focused but visually
  ambiguous.
- The existing reader contract is literal, case-insensitive, read-only,
  route-local, and progressively enhanced. Native links, selection, IME,
  modifiers, protected controls, local-scroll regions, reduced motion, and
  JavaScript-free semantic HTML remain authoritative.

## Requirements

### R1 — Match every literal occurrence

- Keep search literal and case-insensitive; do not add regex, fuzzy matching,
  replacement, or cross-document search.
- Represent each non-overlapping occurrence as an independent match with its
  owning reading unit and an exact DOM `Range` covering only the matched text.
- The matching algorithm must use rendered reading-unit text while preserving
  inline markup boundaries. It must not replace authored content or add
  persistent `<mark>` elements.
- Search highlighting must cover only exact match ranges. If CSS Highlights are
  available, all matches may use a quiet highlight and the active match must
  have a distinct visual treatment. If the browser lacks CSS Highlights, status,
  navigation, and scrolling still work without mutating the document.

### R2 — Make `n`/`N` occurrence navigation reliable

- After `/` or `?` submits a non-empty query, select the first match in the
  requested direction relative to the current match/reading position, with
  deterministic wraparound.
- `n` repeats the current search direction and `N` reverses it.
- Both keys must move between individual occurrences, including occurrences
  within the same paragraph, list item, or `<pre>` block.
- The active match must scroll into a readable viewport position while the
  reader region retains keyboard ownership. Moving between matches must not
  require a manual click and must not capture protected native targets.
- The active match index and total count must update for every movement, with
  announcements remaining polite and concise.

### R3 — Persistent, focus-following search status

- When a committed query has matches, expose a persistent status such as
  `2/22 matches for “trellis”.` alongside the mode and reading-unit position.
- Update that status whenever the active occurrence changes through the initial
  search, `n`, `N`, or another bounded movement that changes the active match.
- Keep the status separate from the live announcer so it remains visible after
  the transient announcement has been read.
- For zero matches, show a stable bounded `No results for “…”` state. Empty
  search cancels without creating a query. A new query replaces the prior
  search state; route changes discard it.

### R4 — Make backward search discoverable

- The `?` search control must visibly communicate backward search through its
  prefix, accessible label, and an input placeholder or equivalent hint.
- The input text and placeholder must meet the existing Terminal contrast and
  focus-visible conventions at desktop and mobile widths.
- Keep a native labeled search input, IME behavior, Escape cancellation, and
  normal-mode keyboard boundaries intact.

### R5 — Preserve the reader boundary

- Keep canonical URLs, `#terminal-reader` entry, `:q`, static navigation, and
  the JavaScript-free semantic document contract unchanged.
- Do not add persistence, query/hash search state, a client router, runtime
  content fetch, Markdown parsing, editing, replacement, or arbitrary Vim
  commands.
- Do not commandeer native text selection, links, code/table local scrolling,
  inputs, ARIA widgets, modified keys, or IME composition.

## Acceptance Criteria

- [ ] A query with repeated occurrences in one reading unit produces one
      independent match per occurrence, and only those exact ranges are
      highlighted.
- [ ] `n` and `N` move through occurrences in both directions, including
      repeated matches inside the same `<pre>` block; the active occurrence
      visibly changes and scrolls into view without a manual refocus.
- [ ] The persistent reader status displays and updates the active match index
      and total, including wraparound and zero-result states.
- [ ] The `?` control clearly communicates backward search in its visual label,
      accessible name, and input hint at 1440px and 375px widths.
- [ ] Existing movement, visual selection, native link/control ownership, IME,
      modifier, reduced-motion, direct permalink, `:q`, Back/Forward, and
      JavaScript-disabled tests remain green.
- [ ] The implementation does not mutate authored document content or create
      duplicate IDs, and no search state enters the canonical URL or storage.
- [ ] Focused reader, static-output, site build, and full site Playwright
      evidence is recorded before commit.

## Out of scope

- Regex, fuzzy, whole-site, or cross-document search.
- Search persistence, shareable search URLs, browser history entries, or saved
  search queries.
- Search-and-replace, editing, annotations, macros, arbitrary ex commands, or
  full Vim emulation.
- Replacing the semantic document with a canvas/editor surface or changing the
  canonical route and `#terminal-reader` entry contract.

## Planning status

- No blocking product decision remains: the requested behavior directly implies
  occurrence-level matching, persistent match feedback, and a visible
  backward-search affordance.
- Complex-task artifacts (`design.md` and `implement.md`) are required before
  activation. Implementation approval is a separate gate after the final
  planning summary.
