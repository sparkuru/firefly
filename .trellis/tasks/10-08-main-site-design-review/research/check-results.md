# Independent Terminal refinement check

## Review result

Reviewed the approved PRD/design, actual CSS cascade, static markup, command and navigator ownership, changed browser selection and tests. No open product-code defects were found. Default prose measurement applies to direct body blocks; code/table internals stay independent, standalone paper roots retain their own measure, and lab uses its separate semantic stylesheet. The help hint is a native placeholder, with no executable value or controller changes.

The previous wide-stream regression assertion required full-width paragraphs. The implementer corrected it after review: article/header/toolbar/wide frames still align with the command row, while prose is left aligned and narrower. Existing content and scroll assertions remain.

## Reviewer supplements

Extended `apps/site/tests/terminal-refinement.spec.ts` with a synthetic extreme mixed-language directory label. At 375px portrait, 768px tablet and 812px landscape, actual directory anchors stay within the viewport and their two-dimensional hit rectangles do not overlap. Existing native directory and outline navigation assertions remain.

Added actual keyboard scrolling of an overflowing standalone code region: focus the native region, press ArrowRight, observe its scrollLeft increase, and verify window.scrollX remains zero. This runs in all four maintained static/interactive desktop/mobile projects.

## Independent verification

Used the existing contained fixture selection for both commands:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run test:e2e -- tests/terminal-refinement.spec.ts

FIREFLY_CONTENT_ROOT="$PWD/content" \
FIREFLY_SITE_CONFIG_PATH=.firefly/memos/browser-fixture/config/site.toml \
./preview.sh render npm --prefix apps/site run check
```

- Focused browsers: 15 passed, five intentional environment skips.
- Astro check: 140 files, zero errors, warnings or hints.
- No dedicated lint script is configured; `git diff --check` passed.
- Docker socket access initially failed inside the sandbox; authorized escalation ran the wrapper successfully. An attempted example-config selection was rejected by the wrapper's required `.toml` suffix before execution; the existing contained fixture selection above resolved it.

Independently inspected the ignored capture scripts and before/after metrics plus changed-state report under `apps/site/artifacts/design-refinement/`. Recorded desktop prose is 760px versus baseline 1150px standalone/1152px stream. Touch targets are 44px versus baseline 21px directory/26.39px outline. Sampled changed-state text contrast has minimum 5.51:1; actual visible focus contrast has minimum 5.29:1. Mobile captures assert the coarse/no-hover predicate and use viewport screenshots, avoiding the known full-page touch capture issue.

Viewed final mobile directory/article and desktop mixed-content captures. Their spacing, reading hierarchy and wide-content behavior show no obvious defect; this is agent judgment rather than award qualification.

## Remaining gates and limits

Main owns full `./preview.sh verify`, `./preview.sh package` and final visual review. The first complete attempt reached 171 site-browser passes and 144 intentional skips, then failed the positive friend-focus scenario because the contained configuration has no friends. Evidence is preserved at `apps/site/artifacts/design-refinement/failures-integration/`. After the repair below, the complete gate, package and final visual rounds passed as recorded in `final-validation.md`.

## Full-gate fixture follow-up

The positive friend-focus/history scenario in `home-browse.spec.ts` depended on a configured friend. Added one public synthetic emitted-shape friend row to its own DOM before recording metadata count. Existing configured rows remain. The fixture removes the empty-state text, asserts a non-empty exact metadata count, and explicitly focuses the known synthetic link. Directory hiding, accessibility, metadata retention, Tab order and Back/Forward assertions remain intact.

The first targeted run uncovered another dependency: `expectMobileRootBrowsing()` asserted only the configured friend count and contents. Extended it with an optional expected-friends collection defaulting to the existing configuration. Only this positive fixture supplies the complete configured-plus-synthetic collection; all existing callers retain exact configuration assertions. The helper still checks exact count/name/href/description and visibility. No product source or configuration was changed.

Targeted command, with the same contained fixture environment above:

```sh
./preview.sh render npm --prefix apps/site run test:e2e -- tests/home-browse.spec.ts --grep 'friends leave accessibility'
```

Final result: one passed, three intentional project skips. Reran the same Astro check after both test changes: 140 files, zero errors/warnings/hints; `git diff --check` passed. The intermediate helper-dependency failure contexts/screenshots/trace are retained at `apps/site/artifacts/design-refinement/failures-friend-fixture/`. No assertions were skipped or weakened to repair this fixture.

The checks establish Chromium emulation and synthetic-fixture behavior. Physical-device/browser-engine, assistive-technology and owner subjective review remain outside this evidence. No commit, publication or owner preview lifecycle operation was performed.

## Final full-scope read-only pass

After main completed the full gate and packaging, the reviewer checked all nine changed application/test/config files, updated specs, mainline and task evidence/commit plan. No code blocker, scope drift, privacy issue or material evidence mismatch remained. Final arithmetic of 203 browser passes and 151 applicability skips is correct. Trackable changes are explicitly covered by the proposed Git batch. Owner subjective visual/Git review remains pending; no additional test run or Git operation was performed in this pass.
