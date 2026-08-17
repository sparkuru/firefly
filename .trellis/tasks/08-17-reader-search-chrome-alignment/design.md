# Design: Reader search chrome contrast and repeat alignment

## Evidence and root cause

- `ReaderStatus.astro` puts the visible prefix in one grid column and the
  native input in another. The input receives the global `:focus-visible`
  outline, so the prefix is visually outside the rectangle shown in the
  supplied `图2.png` screenshot.
- `.terminal-command-row` already solves the desired Terminal presentation:
  it owns the full row, draws an inset bottom rule, and moves the focus state
  to `:focus-within`.
- `openSearch()` changes the form visibility but leaves a previously committed
  `searchQuery` active while `mode === 'search'`. The status section therefore
  remains marked sticky during the next input session. The new prompt is
  visually coupled to the old committed-result chrome, which makes repeated
  `/`/`?` entry sensitive to the prior state.
- Search result status and highlight ownership are otherwise route-local and
  occurrence-based; the fix must not clear or recreate ranges merely to style
  the form.

## Proposed behavior

1. Give the reader status a semantic surface token for its active sticky state.
   The surface must be opaque, distinct from the document canvas, and bounded
   by the existing border token. Terminal and semantic styles keep their own
   token systems but use the same intent.
2. Make each visible reader form a flex row with a shared inset bottom rule.
   The prefix is a fixed `1ch` flex item with the existing explicit gap; the
   input fills the remaining width and has no independent outline or border.
   `form:focus-within` supplies a visible 2px focus rule, matching the prompt.
3. Make `data-reader-search-active` represent a committed query that is not
   currently being edited. A committed result remains visible in normal,
   visual, and command modes; opening search temporarily removes the sticky
   marker while preserving the old status text until the new form is submitted
   or cancelled. Submission then atomically installs the new query/matches and
   restores the marker. Cancellation clears the query and highlights through
   the existing lifecycle.
4. Add browser assertions for first and second search cycles, both directions,
   including computed row/input/prefix geometry, focus ownership, sticky
   marker transitions, and no document overflow.

## Accessibility and responsive decisions

- Keep native `<form>`, `<label>`, and input semantics. The row is a visual
  focus container, not a new interactive role.
- Keep the 44px input target and current visible focus indication. Removing an
  input-only outline is safe only because the row gets an equivalent visible
  `:focus-within` focus rule.
- Use existing semantic color variables rather than raw component colors; the
  distinct surface must maintain foreground/border contrast in dark Terminal
  and light semantic themes.
- Preserve mobile wrapping/containment and the current 8px-or-more prefix gap.

## Verification shape

- Focused reader Playwright: search lifecycle, geometry, sticky surface, and
  semantic fragment activation.
- Main-site check/build and content/static suites.
- Full main-site Playwright matrix, then `git diff --check` and Trellis
  validation.
