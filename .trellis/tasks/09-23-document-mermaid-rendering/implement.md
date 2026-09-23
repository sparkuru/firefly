# Feasibility and implementation plan

The owner approved implementation. The runtime gate selected Mermaid 12.0.0 and
Playwright 1.62.0 with isolated render pages (design.md). Use ./render.sh for
renderer-bearing commands; integration gates below remain required.

1. Perform the bounded local renderer compatibility experiment in ignored/tmp
   artifacts; record results, selected dependency/image and limits.
2. Finalize build/dev/verify/packaging command matrix and shared processor order.
3. Add synthetic flowchart, sequence, invalid source, CJK/multiline labels and
   adversarial-resource fixtures using the actual shared Markdown processor.
4. Implement build-time rendering/cache and generated SVG asset lifecycle.
5. Integrate accessible preview/full-size/source/fallback output with both adapters.
6. Verify repeated cat, clear/re-execution, no-JS canonical pages, stable heading/
   node identities, safe SVG and absence of a Mermaid client asset.
7. Check publication inventory/assembler closure, immutable build output, cold/
   warm repeatability and local source visual results.
8. Update affected specs and report real dependency/runtime costs.

Affected areas: apps/site/astro.config.mjs, site-owned Markdown/build modules,
site manifest/lock, figure CSS, site x-core/static/browser tests, and publication
asset validation where necessary. Any wrapper/script changes require the shell
skill and wrapper syntax/lint/lifecycle checks. X Core API changes are not planned.

Required gates through ./sam with the finalized renderer-capable image:
- site dependency install, test:content, test:x-core, check, build;
- affected adapter check/test/build only if adapter code changes;
- static/no-JS and interactive site Playwright matrices;
- build:m4 and assembled-publication browser/asset checks;
- packaging/runtime checks if their build entry changes.

Run repository fixtures separately from the owner-selected local source. Pin
FIREFLY_CONTENT_ROOT to "$PWD/content" for fixture gates; retrieve local source
from config.dev for visual review. Never run remote push tooling.

## Completion evidence

Implementation and applicable gates are complete; the parent research/validation.md
contains the exact checks, visual matrix, integration fixes and device limitation.
The owner confirmed local commit and task archival after reviewing the completed changes.
