# Reader sticky contrast and full-width layout

## Goal

Make the persistent reader status panel visually unmistakable and let it span
the viewport independently from the readable document container.

## Requirements

- Give semantic and Terminal sticky status panels a theme-aware contrasting
  surface that is clearly separated from the page/document canvas while
  preserving existing token ownership and readable foreground/border contrast.
- Let the visible sticky panel use the available viewport width rather than
  the current `70ch` / Terminal measure cap, without introducing horizontal
  document overflow or changing the readable measure of the content below it.
- Preserve sticky behavior, normal-flow height reservation, search/command
  prompt layout, mode/position feedback, duplicate-search suppression, native
  labels, focus treatment, reduced motion, and JavaScript-disabled recovery.
- Keep semantic styles route-local and Terminal styles fully namespaced; do not
  add a new UI dependency or client state.

## Acceptance Criteria

- [x] Semantic and Terminal status panels have a visibly distinct opaque
  theme-backed surface at desktop and mobile widths, with legible text,
  borders, and controls.
- [x] The panel spans the viewport/container available to the presentation,
  remains sticky while scrolling, and does not create horizontal overflow;
  document prose remains governed by its existing readable measure.
- [x] Existing reader actions and search/command form contracts remain green,
  including committed-search single-line display and semantic fragment entry.
- [x] Focused and full site browser suites plus Astro check/build/static-output,
  content/X Core tests, `git diff --check`, and Trellis validation pass.

## Constraints

- Limit implementation to the existing reader styles/tests and the durable
  frontend reader contract if the behavior contract changes.
- Reuse existing semantic/Terminal theme tokens or add only presentation-level
  theme tokens where the current palette cannot express the required contrast.
- Keep the change CSS/layout-only unless validation proves a bounded markup or
  controller correction is necessary.
