# Reader search viewport status and prefix layout — Technical Design

## 1. Scope and invariants

This is a narrow follow-up to the completed occurrence-level reader search
work. It changes search feedback layout only. The existing exact `Range`
collection, CSS Highlights, active occurrence model, `n/N` navigation, focus
settlement, canonical routes, and progressive-enhancement boundary remain the
source of truth.

The status section remains server-rendered and present in static output. The
controller only toggles a state attribute when a committed query exists; it
continues to own the status text and does not move content or search state into
the URL.

## 2. Sticky status state

`updateSearchStatus()` will synchronize a boolean state attribute on
`[data-terminal-reader-status]`:

```text
searchQuery is non-empty  -> status visible + data-reader-search-active
searchQuery is empty       -> status hidden + attribute removed
```

Both presentation styles will apply sticky treatment to the whole status
section only while that attribute is present:

- `position: sticky; inset-block-start: 0;`
- a presentation-specific opaque surface token;
- existing border treatment plus a restrained stacking level;
- no `overflow` or nested scrolling.

The whole section, rather than only the status paragraph, must be sticky: a
sticky child cannot outlive the short status-section containing block once the
document is scrolled. The section's containing article spans the reader
content, so the active status can remain visible while the document moves.
The section remains in normal flow and retains its original width and margins,
which avoids a layout jump when search starts. Existing range settlement places
matches in the central viewport band, so the sticky bar does not cover the
active occurrence.

## 3. Prefix/input geometry

Keep the existing form markup and native input semantics. Add a shared
`column-gap` to both semantic and Terminal reader forms, using the project's
8px spacing rhythm (the chosen value is at least `0.5rem`). Keep
`grid-template-columns: auto minmax(0, 1fr)` and the 44px input minimum. Make
the prefix an inline-flex/grid item with a stable one-character width so `/`,
`?`, and `:` align without relying on input padding or browser-specific
appearance.

This preserves the existing focus-visible outline around the input while
leaving a measurable gap after the prefix. No glyph, icon package, or raster
asset is needed.

## 4. Wide-screen frame geometry

The screenshots identify the current `78rem` `.terminal-shell` cap as the
source of the 4K imbalance. Replace the fixed-only desktop cap with one shared
fluid measure expression that:

- keeps `78rem` as the minimum desktop baseline;
- grows with `86vw` once the viewport is wider than that baseline; and
- caps the largest frame at `180rem` to prevent an unbounded ultra-wide canvas.

The same responsive measure is used by the shell and its stream/document
containers so the border, title bar, status region, and document content do not
drift into separate scales. The existing `max-width: 40rem` mobile override
continues to make the shell full width with no border. The body text remains
governed by existing reading-width rules and wide code/table wrappers retain
their inline overflow containment; no font-size scaling or page-level overflow
is introduced.

## 5. State flow

```text
submit non-empty query
  -> searchQuery assigned
  -> updateSearchStatus()
  -> data-reader-search-active added
  -> status section becomes sticky as scrolling begins
  -> moveToSearchMatch() updates text for every occurrence

submit empty query / Escape / route idle
  -> searchQuery cleared by existing cancellation path
  -> updateSearchStatus()
  -> data-reader-search-active removed
  -> normal document-flow status restored
```

The existing search status remains separate from the polite live announcer.
The sticky state is visual feedback, not an accessibility replacement; labels,
live announcements, and native focus behavior remain unchanged.

## 6. Verification design

Browser assertions will cover:

1. Enter from `/posts/llm-workflow-with-trellis/#terminal-reader`, submit
   `trellis`, assert the status section is visible, has computed `sticky`
   positioning, and remains within the viewport after a controlled scroll.
2. Press `n` and `N` from the focused reader without refocusing, and assert the
   status text changes and returns while the active CSS Highlight remains the
   exact query.
3. Open `/` and `?` at 375px and 1440px, measure prefix-to-input geometry,
   assert no overlap, and assert the backward label and placeholder remain
   discoverable.
4. Cancel search and assert the sticky state is removed; retain the existing
   no-result and static-output checks.
5. At 1440px, 2560px, and 3840px interactive viewports, measure the shell and
   document bounds, prove the 3840px shell exceeds the old fixed cap, and
   assert `document.documentElement.scrollWidth <= innerWidth`.

Visual review will inspect Terminal and semantic readers at the required mobile
and desktop checkpoints, including reduced-motion mode. The review must check
that the opaque status surface does not create horizontal overflow or obscure
the central active match.

## 7. Risks and rollback boundaries

- Sticky positioning can be disabled by an unexpected ancestor overflow or by
  a containing block shorter than the reader. Verify both presentation routes
  in Playwright and keep the status section as the sticky element.
- An opaque bar can hide content if its spacing or stacking is wrong. Keep
  search settlement in the existing central band and inspect the first and
  later matches at narrow width.
- A grid gap can cause overflow if the input is not allowed to shrink. Retain
  `min-width: 0` and test the 375px geometry.
- A fluid frame can make prose lines too long or push wide code beyond the
  viewport. Keep existing readable-measure and nested overflow rules, and
  inspect the 4K screenshot rather than judging from the shell border alone.

Rollback is limited to the reader controller state toggle, the two presentation
styles, reader tests, and the directly related frontend contract.
