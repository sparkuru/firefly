# Reader search chrome contrast and repeat alignment

## Goal

Make the canonical reader's search chrome readable at rest, visually consistent
with the Terminal prompt, and geometrically stable when a user opens search more
than once during one reader session.

## Requirements

- Keep the committed search status sticky while `n`/`N` changes the active
  occurrence, but give the sticky status an opaque, token-backed surface that
  is visibly distinct from the document canvas and preserves readable contrast
  in both Terminal and semantic presentations.
- Render the reader's search and command input rows with the same unboxed,
  full-width bottom rule used by the Terminal prompt. The visible `/`, `?`, and
  `:` prefixes must participate in that row rather than sitting outside an
  input-shaped focus rectangle.
- Preserve native labels, direction-specific placeholder text, visible
  keyboard focus, the explicit prefix/input spacing, and a minimum 44px input
  target at desktop and mobile widths.
- Treat an open search form as transient input state. Reopening `/` or `?`
  after a committed search must reset the form geometry and direction without
  leaving the new form inside the committed-search sticky state. Submitting a
  new non-empty query must restore the sticky status for the new result set;
  cancelling must restore the normal reader state.
- Preserve the existing occurrence-based highlights, `n`/`N` navigation, native
  document fallback, and route-local state boundaries.

## Acceptance Criteria

- [x] A committed search status remains visible while the reader scrolls and
  has a distinct opaque surface with a contrast-safe text/border treatment in
  Terminal and semantic routes.
- [x] Search and command forms expose one continuous bottom rule; their prefix
  and input share the row, and focused input no longer renders a detached
  rectangular outline around only the input.
- [x] `/` and `?` retain accessible names/placeholders, explicit spacing, a
  visible focus indication on the row, and a minimum 44px input height without
  horizontal overflow at configured viewports.
- [x] Browser coverage opens, commits, reopens, and cancels both search
  directions after a prior query; every cycle reports the correct prefix and
  direction, stable prefix/input geometry, and correct status lifecycle.
- [x] Existing reader, content, Astro, static-output, and full main-site
  browser checks remain green; `git diff --check` and Trellis validation pass.

## Constraints

- Keep the change in the main-site reader boundary: `ReaderStatus.astro`, the
  route-local reader controller, presentation styles, and focused reader tests.
- Reuse the existing Terminal color tokens and prompt-row interaction pattern;
  do not introduce a new client state store, remote request, or UI dependency.
- Update the durable reader contract if the transient/committed status
  lifecycle or focus-row contract changes.
