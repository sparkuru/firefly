# Implementation plan: mobile homepage article search

## Before activation

- [x] Present the final scope/interaction/acceptance summary and obtain a subsequent explicit owner approval. Owner approved the latest summary with "同意".
- [x] Verify both context manifests contain real spec/research entries and run `task.py validate`. Both passed; oversized content-workspace spec requires targeted direct reads as recorded in research.
- [x] Run `task.py start` only after approval of the latest artifacts. Task entered `in_progress` after owner approval.

## Ordered work

1. [x] Load the frontend contracts. Inspect current homepage, templates, strict Terminal payload readers, key/focus handling, and static-output assertions before editing. Keep ownership in `apps/site`; task/spec updates remain with the main session.
2. [x] Define the minimal typed public search projection and pure matching/result-context helpers. Use only guest-projected documents, canonical links, and approved metadata; add no dependency or front-matter contract.
3. [x] Add the independent mobile form/results section to `TerminalHome.astro`, outside startup/recovery/session visibility. Add description/tags safely and reuse existing sanitized article templates for lazy body extraction. Avoid changing Terminal entry decoding or `grep` semantics.
4. [x] Implement the search controller with cached extraction, literal matching, deterministic metadata-first order, input debounce, composition handling, immediate submission, clear/count/no-results feedback, and bounded safe snippets. Ensure one result per article and failure containment.
5. [x] Add token-based responsive styling for touch-primary clients, 44px controls, visible focus, long-title/path wrapping, and portrait/landscape/tablet layout. Verify media changes and protected native search controls do not steal Terminal focus or rewrite its transcript. Browser evidence is recorded in `research/validation.md`.
6. [x] Add focused meaningful tests for search semantics and the observable browser flow. Register the new browser suite in the project's explicit Playwright `testMatch` rules. Preserve all static/no-JavaScript assertions.
7. [x] Validate the changed site package and relevant regression suites. Review the complete diff and Trellis records. Update the durable frontend contract with the new search boundary and validation evidence. Final review passed with no unresolved findings; see `research/validation.md`.

## Verification

Run Node/browser commands through `./sam`; use `./render.sh` when site rendering or Playwright is involved. Select the tracked `content/` fixture explicitly and install the changed package from its own lockfile before checks, following `.trellis/spec/trellis-plus/validation-profile.md`. Prepare unchanged local package artifacts using the existing repository build sequence if needed; do not substitute host Node/npm or `astro dev` for validation.

```bash
./sam npm --prefix apps/site ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:x-core
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/home-search.spec.ts --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/home-search.spec.ts tests/terminal.spec.ts tests/document-navigator.spec.ts --project=chromium-desktop-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts tests/document-navigator-mobile.spec.ts --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- tests/site.spec.ts tests/home-search.spec.ts --project=chromium-desktop-static --project=chromium-mobile-static
```

The new pure/helper tests must be wired into the site package's existing test command so they cannot be omitted by the normal gates. If a package beyond the site changes, add that package's check/test/build gates. Run the broader project gate only if changes or unresolved concerns cross the site boundary; do not repeat passing checks without a reason.

Test coverage must include:

- Metadata-only and body-only hits in both public posts and pages; all approved fields; code/table/inline/body boundaries; case, Chinese, NFC text, literal punctuation, and blank queries.
- One article per result, metadata-first stable ordering, duplicate-title disambiguation, accurate count, bounded snippets, safe query/content text, canonical fragment-free result links, and no private/draft/experiment/friend leakage.
- Touch form discovery before/after boot, native submission/clear, IME composition, no automatic keyboard/focus takeover, correct no-results feedback, unchanged Terminal transcript/commands, startup failure, and media transitions.
- Portrait/landscape phone and touch-tablet layout, long labels/paths, target sizes, focus, and no document overflow. Static JavaScript-disabled browse links and search-controller failure recovery.
- An expanded synthetic public fixture with hundreds of entries and longer bodies, verifying complete result counts and recording extraction/search timings. Do not add synthetic content to the published real content workspace or use private owner data.

## Review and rollback points

- Do not change the current mobile document navigator policy, content access projection, metadata schemas, Terminal command matching semantics, or authored files while integrating search.
- Treat any need for worker/index infrastructure or different matching semantics as a planning change; return to review before implementing it.
- If template/data validation fails, do not show partial search results as complete. Preserve ordinary native browsing and record the failure classification.
- Before declaring implementation complete, record actual validation evidence and any physical-device/visual review still deferred. Final automated gates and viewport visual review passed; physical-device software-keyboard review remains optional.
- Rollback is limited to the added homepage search UI/controller/projection/styles/tests and its spec entry; no content migration, remote state, or deployment reversal is needed.
