# Reader search viewport status and prefix layout

## Goal

Refine the existing read-only Vim reader so an active search remains
observable while the reader scrolls, and make the `?` search prefix visually
separate from its native input at narrow and wide widths.

## User value

After moving through matches in a long document, the reader should not have to
scroll back to the document header to learn the current match index. The
backward-search control should also read as a prefix plus an input, rather than
as an overlapping glyph and focus outline.

## Confirmed repository facts

- Exact occurrence matching, CSS Highlight ranges, and `n/N` navigation are
  already implemented and must remain unchanged in behavior.
- `data-reader-search-status` is updated by the reader controller but its
  parent status section is currently in normal document flow before the reader
  region, so it scrolls out of view.
- The semantic and Terminal status forms use the same two-column grid with no
  explicit column gap; the prefix can visually meet the focused input edge.
- The Terminal shell uses a fixed `78rem` desktop width cap. The supplied
  screenshots show that this cap is acceptable around 2.5K but leaves the page
  disproportionately narrow on a 4K full-screen viewport.
- Search state is route-local and the reader must remain a progressive
  enhancement over static semantic HTML.

## Requirements

### R1 — Keep committed search status visible during reading

- When a non-empty query is committed, keep the complete reader status region
  (mode, reading-unit position, persistent search status, and transient command
  hint) visible with a sticky viewport position while the containing document is
  scrolled.
- Use the existing semantic and Terminal surface tokens for an opaque sticky
  background and visible boundary so document content does not bleed through the
  status region.
- Remove the sticky state when search is cancelled; do not make the idle reader
  status permanently fixed, create a nested scroller, or change canonical URLs.
- Continue updating the status text on the initial search and every `n`/`N`
  transition, including zero-result states.

### R2 — Separate the search prefix from the native input

- Keep the visible `/` or `?` prefix, native labeled search input, direction
  label, and direction-specific placeholder.
- Add an explicit spacing rhythm of at least 8 CSS pixels between the prefix
  and input at 375px and 1440px viewport widths.
- Preserve the existing 44px minimum input target and visible focus outline;
  the prefix must not overlap or be swallowed by the input focus treatment.

### R3 — Preserve the reader contract

- Do not change exact occurrence ranges, active highlighting, `n/N` direction or
  wraparound, focus ownership, IME handling, native controls, selection, or
  reduced-motion behavior.
- Keep both semantic and Terminal presentations aligned without introducing
  new dependencies, icons, runtime content requests, or authored-content DOM
  wrappers.

### R4 — Scale the Terminal frame on wide screens

- Above the existing mobile breakpoint, let the Terminal shell grow with the
  viewport after the current 78rem baseline, with a bounded wide-screen cap so
  4K full-screen layouts do not retain excessive side gutters.
- Keep the existing narrow-screen full-width behavior and inner padding.
- Scale the shell/document measure together; do not enlarge the base font just
  to compensate. Preserve readable text measures and keep wide code/table
  regions horizontally contained rather than causing page-level overflow.

## Acceptance Criteria

- [ ] After a committed query, the status region has a sticky position and
      remains visible within the viewport after the reader is scrolled through a
      long document; its text still changes after `n` and `N`.
- [ ] Cancelling search removes the active sticky state and preserves the
      existing idle reader behavior.
- [ ] At 375px and 1440px widths, the `/` and `?` prefixes have at least 8px of
      measurable space before the input, with no overlap or horizontal
      overflow; the focused input remains a 44px target.
- [ ] The backward search keeps its visible `?`, accessible “backward” label,
      and `Search backward…` placeholder.
- [ ] At a 3840px-wide interactive viewport, the Terminal shell grows beyond
      the old 78rem cap, occupies a proportional bounded frame, and produces no
      horizontal document overflow; the 1440px and 375px layouts retain their
      existing containment.
- [ ] Exact highlight ranges, same-unit occurrence navigation, canonical
      fragment entry, native target boundaries, IME, selection, reduced motion,
      static output, site checks, and full Playwright coverage remain green.
- [ ] The durable frontend reader contract records the sticky status and
      prefix-spacing requirements.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
