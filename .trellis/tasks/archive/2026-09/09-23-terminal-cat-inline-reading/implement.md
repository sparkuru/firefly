# Implementation plan

Precondition: owner approves this proposal; start this child, not the parent.
Load frontend specs and the curated manifests before editing.

1. Add synthetic fixture coverage for long CJK prose, long URLs, wide/simple and
   spanning-cell tables, exact code, matching/nonmatching opening headings and
   repeated documents. Do not import owner blog files.
2. Implement stream tokens, wrapping and directional overflow affordances.
3. Add native per-output controls and independent collapse state; integrate
   delegated events, cleanup and the existing open destination resolver.
4. Add conservative header hierarchy handling and restrained focus treatment.
5. Add typing guidance; regression-test all existing protected interactions.
6. Complete focused tests, package gates and the parent visual matrix.
7. Update only the executable contracts changed by accepted implementation.

Validation (renderer-bearing commands use ./render.sh, which delegates to ./sam):
- ./sam npm --prefix apps/site ci
- FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm run build:m3
- FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
- FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:x-core
- FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
- FIREFLY_CONTENT_ROOT="$PWD/content" SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
- Run full site browser gate after focused tests pass; extend affected package
  gates only if implementation actually changes adapters/runtime contracts.

Then rebuild from the locally configured blog and review 375x812, 768x1024,
1440x900, 1920x1080. Capture top/middle/end, horizontal scroll in both directions,
collapsed/reexpanded output and two copies of the same article. Add 200% zoom,
short landscape height, keyboard-only and reduced-motion checks. Real soft-keyboard
validation is an explicitly reported device follow-up, not simulated evidence.

Do not run fixture-dependent browser assertions against the owner content build.
Keep screenshots in ignored test-results; record redacted measurements and results.
Rollback all related stream/controller changes together if state/focus contracts fail.

## Completion evidence

Implementation and applicable gates are complete; the parent research/validation.md
contains the exact checks, visual matrix, integration fixes and device limitation.
The owner confirmed local commit and task archival after reviewing the completed changes.
