# Implementation plan

1. Review the existing theme tokens, reader status selectors, and frame
   containment rules.
2. Update semantic and Terminal status styles for inverse contrast and a
   viewport-bleed width; keep content measures and reader controller markup
   unchanged.
3. Extend reader browser metrics/assertions for semantic and Terminal full-bleed
   geometry, contrast surfaces/foregrounds, and responsive no-overflow behavior.
4. Update the durable reader contract only if the full-width presentation is a
   contract worth preserving.
5. Run focused/full browser checks, Astro check/build/static-output, content and
   X Core tests, diff checks, and Trellis validation before commit/archive.

Validation commands are the existing main-site profile from
`.trellis/spec/frontend/quality-guidelines.md`, with build preceding preview
based Playwright runs.
