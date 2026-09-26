# Implementation plan

## Approval and first-pass history

- [x] Owner approved the initial plan with "开始"; current task is in progress.
- [x] Native implementation/check completed the first uncommitted version.
  Exact original results and corrected test assumptions are retained in
  `research/validation.md`; these predate the inline/style revision.
- [x] Owner review requested matching headings, unboxed links and selected inline
  homepage directory browsing.
- [x] Converge revised PRD/design and curate context for the changed UX.
- [x] Present revised final summary and obtain subsequent approval before resuming
  product edits, because the navigation design materially changes.
  Owner approved the latest revised summary with "可以".
- [x] Resume the existing task through native Trellis implementation; no new task.
  Existing implementation agent received the revised task after approval.

## Ordered refinement

### Latest typography/tree request (implemented and reviewed)

Use one existing base font size throughout mobile home and inline directory UI
(headings/breadcrumbs/rows/search/friends), replacing the old 1.1rem exception.
Give root section rows and all inline sibling rows `├──` / final `└──` prefixes
instead of bullets, with decorative accessible-safe markers and aligned wrapping.
Keep breadcrumbs, root-only friends, search/history/native fallback and desktop.

- [x] Implement site-only shared typography and tree rows, scoped to mobile home
  and the homeBrowse listing variant; update meaningful geometry/semantic checks.
- [x] Run affected Astro/build/browser gates and inspect root/folder/long captures.
  Astro111 zero/build18/browser35 pass97 expected skips/no retries; bounded native
  fixture1 pass; main/worker inspected nine captures. Exact evidence in validation.
- [x] Independent full-task check; synchronize specs/AC/evidence.
  No findings/edits; independent Astro111 zero and browser35 pass97 expected
  skips/no retries. Reviewed earlier full gates and current native fixture/captures.
- [x] Refresh the exact final commit plan; owner confirmed with "不错；可以提交".

### Previous breadcrumb/root-only-friends request (implemented and reviewed)

Replace home/parent plus path heading with one clickable underlined path,
`~/blogs/posts/infra`: blogs maps to `/`, each segment to its registered
directory, and the current segment is an accessible history no-op. Friends
appear only at mobile browse root and restore on root/Back/Clear/failure;
search stays global/visible and desktop is unchanged.

- [x] Implement breadcrumbs/root-only friend visibility in `apps/site` and
  adjust meaningful browser/static regressions; preserve canonical hrefs,
  no-fetch history/failure/media/focus behavior and 44px/wrapping geometry.
- [x] Run affected Astro/build/browser gates and inspect viewport captures.
  Astro 110 files/zero diagnostics; build/static 18 pass; affected four-project
  matrix 35 pass/97 expected skips, no failures/retries. Main/worker viewed seven
  viewport captures; exact evidence is in `research/validation.md`.
- [x] Independent native Trellis check; main updates specs/AC/evidence.
  No findings/edits; independent Astro110 zero and browser35 pass97 expected
  skips/no retries. Earlier full-scope gates reviewed; no new code rerun needed.
- [x] Refresh actual final commit plan after review, awaiting confirmation.

1. [x] Load implement context -> revised PRD -> design -> this plan; directly read
   the oversized content-workspace canonical directory, mobile, startup/failure
   and native-route sections. Main updated specs for R9/R10; synchronize actual
   controller/marker/history details with reviewed code before completing review.
2. [x] Match mobile browse/friend heading typography and remove decorative
   directory boxes, preserving targets/focus and desktop recovery styling.
3. [x] Generate minimal canonical guest directory snapshots, reuse native listing
   semantics, and add independent media-gated local browse controller. Preserve
   full search/Terminal data, unique friend metadata and native href fallback.
4. [x] Implement current path/parent/home and local Back/Forward, modified/native
   link behavior, independent initialization/failure/focus/media transitions,
   and search Clear returning to root. Do not fetch or install a site-wide router.
5. [x] Update meaningful built-artifact tests for inline no-navigation browsing
   versus static native fallback, hierarchy/root files, complete global search
   from a folder, clear/failure/media/history and revised heading/border geometry.
6. [x] Run applicable package/build/browser gates sequentially and inspect updated
   viewport captures. Preserve first-pass logs; use
   `/tmp/mobile-folder-refine-*.log` for new evidence.
7. [x] Complete independent native Trellis check. No findings or fixes; independent
   Astro and four-project browse/home/search matrix passed. Main synchronized
   mobile/search/workspace specs and evidence.
8. [x] Review all revised ACs/diff and refresh the concrete Phase 3.4 commit plan.
9. [x] Obtain fresh commit confirmation. Owner approved the final 33-file plan
   with "不错；可以提交".
10. [x] Execute the approved work commit: `d7f5a19`.

Archive and journal bookkeeping follow through the standard wrappers; task
completion is recorded by archive metadata and the developer journal.

Implementation/check workers own `apps/site`; main owns task/spec records. Tell
workers they are not alone, preserve other edits, and do not spawn additional
implement/check agents. Reuse the existing agents when appropriate.

## Validation commands

Use explicit tracked `content/`, wrappers and built artifacts. Rendering/
materialization/build/preview state is shared: run gates sequentially. No host
Node/npm, raw Docker or `astro dev` evidence.

```bash
./sam npm --prefix apps/site ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:x-core
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-desktop-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-desktop-static --project=chromium-mobile-static
git diff --check
python3 .trellis/scripts/task.py validate .trellis/tasks/09-26-mobile-homepage-folder-browsing
```

Existing installation is available; reinstall only if required by the package
execution boundary or manifest changes. Register new suites in explicit
Playwright project patterns and put focused paths before `--project=<name>`.
No lint script exists; report Astro diagnostics and whitespace accurately.

## Review and rollback focus

Likely surfaces: homepage markup/composition, canonical immediate-child renderer,
new site browse controller/projection, mobile CSS, search-clear coordination and
home/search/static/route tests. Directory switching must keep the same document
and theme with no fetch, while final/modified links remain native. Preserve full
public body/template correspondence and one friend metadata projection.

Check history restoration/Back after opening an article, arbitrary/stale browse
state, root/parent/clear behavior, no autofocus/hidden focus, first-paint fallback
and browse/search independence. Media changes cannot let the local controller
interfere with desktop commands or restore a mobile shell.

Use viewport screenshots saved in mounted test artifacts before copying to host
`/tmp`; full-page capture can reset touch eligibility. Real-device software
keyboard review remains optional and must not be claimed by browser emulation.
No authored migration, dependency addition or deployment.

## Commit boundary

The earlier native-only file list is superseded. The final reviewed work forms
one coherent commit, proposed below. Await one-shot confirmation before executing;
no amend, push or deployment. Archive only this task and record its journal after
the work commit, as separate bookkeeping commits.

### Proposed work commit

`feat(site): simplify mobile homepage browsing`

Includes the inline mobile directory browser and unboxed styling, retained global
search/friends, canonical native fallback, relevant regressions, executable specs
and this task's reviewed planning/validation records. Exact files:

- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/homepage-search-contract.md`
- `.trellis/spec/frontend/mobile-experience-contract.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/design.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/implement.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/prd.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/research/directory-browsing.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/research/validation.md`
- `.trellis/tasks/09-26-mobile-homepage-folder-browsing/task.json`
- `apps/site/package.json`
- `apps/site/playwright.config.ts`
- `apps/site/src/components/ContentDirectoryChildren.astro`
- `apps/site/src/components/ContentDirectoryIndex.astro`
- `apps/site/src/components/DirectoryEntryRow.astro`
- `apps/site/src/components/HomeBrowseSnapshots.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/lib/home-browse-history.ts`
- `apps/site/src/pages/index.astro`
- `apps/site/src/scripts/home-browse.ts`
- `apps/site/src/scripts/home-search.ts`
- `apps/site/src/styles/terminal.css`
- `apps/site/tests/content-build-positive.test.mjs`
- `apps/site/tests/document-navigator-mobile.spec.ts`
- `apps/site/tests/home-browse.spec.ts`
- `apps/site/tests/home-browse.test.mjs`
- `apps/site/tests/home-search-fixtures.ts`
- `apps/site/tests/home-search.spec.ts`
- `apps/site/tests/mermaid.spec.ts`
- `apps/site/tests/mobile-home-assertions.ts`
- `apps/site/tests/mobile-homepage.spec.ts`
- `apps/site/tests/site.spec.ts`
- `apps/site/tests/static-output.test.mjs`
- `apps/site/tests/terminal.spec.ts`

Unrecognized dirty files: none. Ignored local context JSONL files and temporary
logs/captures are excluded. The final 33-file list is refreshed after uniform
typography/tree-row validation and independent review. It includes shared tree
rows, mobile base typography, clickable breadcrumbs and root-only friend links.
The owner confirmed this exact final plan with "不错；可以提交". The work commit
is `d7f5a19`; archive/journal bookkeeping follows through the standard wrappers.
