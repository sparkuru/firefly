# First-pass validation evidence

The approved refinement's newer results are recorded under "Inline/style
refinement" below. Earlier results remain as first-pass history.

## Implementation gates

The implementation worker finished `apps/site` edits. Main checked the final
gate logs and inspected all three viewport captures. Independent review passed
without findings or fixes; no commit, archive or deployment has been performed.
These results predate owner review requesting inline directory browsing and
style refinements (R9/R10). They do not verify the revised design. Preserve this
history and append new refinement evidence after the approved implementation.

| Gate | Final result | Log |
| --- | --- | --- |
| Site install from lockfile | passed | `/tmp/mobile-folder-install.log` |
| Content | 96 passed | `/tmp/mobile-folder-content.log` |
| X Core integration | 8 passed | `/tmp/mobile-folder-xcore.log` |
| Astro check | 103 files, zero errors/warnings/hints | `/tmp/mobile-folder-check.log` |
| Build/static output | 18 passed | `/tmp/mobile-folder-build.log` |
| Focused home/search browser checks | 20 passed, 46 expected project skips | `/tmp/mobile-folder-focused.log` |
| Full mobile interactive | 24 passed, 32 expected project skips | `/tmp/mobile-folder-mobile.log` |
| Full desktop interactive | 83 passed, 24 expected project skips | `/tmp/mobile-folder-desktop.log` |
| Full desktop/mobile static pair | 30 passed, 42 expected project skips | `/tmp/mobile-folder-static.log` |
| Whitespace | `git diff --check` passed | main and implementation worker |

Final browser runs had no retries. Full project selections include mixed suites
whose static/desktop/mobile cases intentionally skip in inapplicable projects;
counts differ from earlier tasks' focused file selections. Astro's diagnostic
count is zero; authored unsafe/malformed Mermaid examples intentionally emit
source fallback messages during content materialization. There is no lint script.

## Reproducible commands

```bash
./sam npm --prefix apps/site ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:content
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:x-core
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-mobile-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-desktop-interactive
FIREFLY_CONTENT_ROOT="$PWD/content" ./render.sh npm --prefix apps/site run test:e2e -- --project=chromium-desktop-static --project=chromium-mobile-static
```

All materialization/build/browser gates ran sequentially against wrapper-built
artifacts. No host npm/Node, raw Docker or `astro dev` was validation evidence.

## Findings corrected during implementation

- The first build iteration counted CSS selectors as HTML marker occurrences.
  Static-output assertions now count opening HTML tags.
- Initial full mobile: 23 passed, 31 skipped, two failures with one retry each.
  The article-navigation test clicked an expanded homepage link now hidden on
  mobile; it now enters `/pages/` before opening the canonical article. A mixed
  Mermaid suite attempted mobile `cat`; that command assertion is scoped to the
  desktop interactive project, preserving native diagram coverage in all modes.
  Evidence: `/tmp/mobile-folder-mobile-before.log`.
- Initial full desktop: 82 passed, 24 skipped, one failure with a retry. The
  friend fixture selected every fallback navigation and hit strict-mode conflict
  after adding the root navigation. It now targets `[data-home-friends]`, keeping
  the native/Terminal friends assertions. Evidence:
  `/tmp/mobile-folder-desktop-before.log`.

These obsolete test assumptions were fixed and full applicable gates rerun;
they were not product policy exceptions or removal of native reading coverage.

## Observable behavior

- Mobile root labels/order/destinations and native friend labels/descriptions/
  hrefs are asserted separately from complete public entry/template counts.
- Native pages/posts/lab clicks, article opening, parent/home and browser Back
  pass in mobile interactive and JavaScript-disabled projects.
- Existing bounded positive-build fixtures now include a root-level post, a
  mixed child file/folder directory and two nested levels, asserting immediate
  canonical children, parent/home anchors and no scripts. An isolated config
  also verifies empty friend feedback. Authored content/config are unchanged.
- Search still finds descendant body/public-page hits, handles IME/clear and
  keeps roots/friends available on failures. Desktop command/recovery and
  connecting/ready/failed media detours retain their existing regression checks.
- Main and worker inspected `/tmp/mobile-folder-portrait.png`,
  `/tmp/mobile-folder-landscape.png`, `/tmp/mobile-folder-tablet.png`. Captures
  use the viewport; portrait/tablet show root entries then friends. Landscape
  naturally scrolls to later entries. No visible shell or expanded section
  lists were present; geometry asserts no horizontal overflow and 44px targets.

Real-device software-keyboard behavior remains untested. This is local built
artifact evidence, not a production release or deployment check.

## Independent quality review

The native Trellis checker reviewed source, tests, current specs and task records.
No product defects, spec drift or new private operational values were found.
It independently ran Astro check (103 files, zero diagnostics) and the focused
homepage/search suite across all four projects (25 passed, 63 expected mode
skips, no retries). Main verified the result logs:
`/tmp/mobile-folder-review-check.log` and
`/tmp/mobile-folder-review-browser.log`.

The reviewer checked earlier complete gate evidence, native diagram coverage
and desktop command guards, genuine friend fixture assertions, bounded hierarchy
and empty-friend fixtures, and all three viewport captures. `git diff --check`
passed again. No broader re-run was needed because review made no source changes.

## Inline/style refinement

Owner selected inline browsing and approved the revised final plan with "可以".
The implementation worker finished all refined product/test edits; main checked
the built output and inspected all six new captures. Independent refinement
review passed without findings or edits. No commit, archive or deployment has
been performed.

| Gate | Final refined result | Log |
| --- | --- | --- |
| Content/history/native build fixtures | 98 passed | `/tmp/mobile-folder-refine-content.log` |
| X Core integration | 8 passed | `/tmp/mobile-folder-refine-xcore.log` |
| Astro check | 110 files, zero errors/warnings/hints | `/tmp/mobile-folder-refine-check.log` |
| Build/static output | 18 passed | `/tmp/mobile-folder-refine-build.log` |
| Focused browse/search/static | 27 passed, 35 expected project skips | `/tmp/mobile-folder-refine-focused.log` |
| Full mobile interactive | 32 passed, 33 expected project skips | `/tmp/mobile-folder-refine-mobile.log` |
| Full desktop interactive | 83 passed, 33 expected project skips | `/tmp/mobile-folder-refine-desktop.log` |
| Full desktop/mobile static pair | 30 passed, 60 expected project skips | `/tmp/mobile-folder-refine-static.log` |
| Whitespace | passed | `git diff --check` |

Refinement runs had no failures or retries. The final mobile run includes the
touch-based directory screenshot traversal. Exact full command forms are above
and in `implement.md`; new suites are registered in all explicit Playwright
project patterns. The site test script adds the pure history test; no dependency
or lockfile changed, and the first-pass lockfile installation was reused.

### Verified refinement behavior

- Root browse/friend headings have matching computed color, size and weight;
  directory links are border-free, left aligned and retain 44px touch/focus
  geometry. Desktop recovery heading styling is unchanged.
- Mobile pages/lab/posts and registered post folders open in the same document,
  without fetch or document requests. Current path, parent/home, local browser
  Back/Forward and article-return state work. Modified/final links stay native.
- Minimal build-time guest snapshots reuse `ContentDirectoryChildren` with the
  native indexes. Complete public search entry/body correspondence and unique
  Terminal friend metadata remain separate from visible browse copies.
- History uses `fireflyHomeBrowse: { version: 1, href }`, accepts only registered
  public directories/root and preserves unrelated fields without storing search
  queries. Stale/invalid state and browse projection failure return to usable
  native root navigation. Browse/search failure and mode ownership are independent.
- A body/public-page query from a post folder still searches globally. Explicit
  `firefly:home-search-clear` returns browse root after search resets/focuses its
  input; the browse controller does not steal that focus.
- Exact public experiment entry hrefs are projected via
  `data-home-browse-experiment-href`, avoiding mount-prefix inference without
  changing the Terminal decoder. Validated browse fragments are cached privately
  and cloned before activation/history changes.
- Main/worker inspected `/tmp/mobile-folder-refine-portrait.png`,
  `/tmp/mobile-folder-refine-landscape.png`, `/tmp/mobile-folder-refine-tablet.png`,
  `/tmp/mobile-folder-refine-posts.png`, `/tmp/mobile-folder-refine-posts-touch.png`
  and `/tmp/mobile-folder-refine-lab.png`. Root/folder/lab share the dark homepage
  and retain search/friends. The posts keyboard capture intentionally shows a
  path focus outline; the ordinary touch capture shows unboxed browsing.

Physical software-keyboard testing is still unperformed. These are local static
artifact/browser checks, not production release evidence.

### Independent refinement review

The native Trellis checker reviewed the final source, tests, specs/task records,
full gate evidence and all six captures. It found no verified issues or drift
and made no edits. Independent Astro check passed for 110 files with zero
errors/warnings/hints. The homepage/browse/search matrix across four projects
passed 33 tests with 91 expected project skips and no retries. Main verified
`/tmp/mobile-folder-refine-review-check.log` and
`/tmp/mobile-folder-refine-review-browser.log`. No new code changes warranted
repeating the broader gates.

## Breadcrumb/root-only-friends refinement

After the inline/style review and before committing, the owner explicitly
requested underlined clickable `~/blogs/...` breadcrumb navigation and friend
links only on the mobile homepage root. Revised PRD/design/implementation notes
authorize this bounded change in the existing task. Previous gate evidence
remains historical. The worker finished and stopped product edits; main verified
the final log tails and inspected all seven new captures. Independent review
passed with no findings or edits.

| Gate | Final breadcrumb result | Log |
| --- | --- | --- |
| Astro check | 110 files, zero errors/warnings/hints | `/tmp/mobile-folder-breadcrumb-check.log` |
| Build/static output | 18 passed | `/tmp/mobile-folder-breadcrumb-build.log` |
| Affected four-project browser matrix | 35 passed, 97 expected project skips, no failures/retries | `/tmp/mobile-folder-breadcrumb-browser.log` |
| Whitespace | passed | `git diff --check` |

The matrix comprises mobile interactive 26 pass/7 skips, mobile static 3/30,
desktop interactive 5/28 and desktop static 1/32. Earlier full package/content/
X Core and full mobile/desktop/static evidence remains above; this bounded final
refinement changes no helper, authored data or dependency boundaries.

### Assertions and viewport evidence

- A single `[data-home-browse-breadcrumbs]` nav replaces the separate home/parent
  controls and path heading. Registered native segment hrefs, underlining,
  `aria-current="page"`, current-segment history no-op and modified native
  activation pass. Same-document/no-request traversal, history/article return
  and global search/Clear remain covered.
- Mobile directory view hides friends from display/accessibility/tab order;
  root/Back/Clear/failure restores the unchanged group. Forward while focused
  on a friend transfers focus to breadcrumbs before hiding it; search focus and
  desktop behavior remain intact.
- Main/worker inspected `/tmp/mobile-folder-breadcrumb-portrait.png`,
  `/tmp/mobile-folder-breadcrumb-landscape.png`,
  `/tmp/mobile-folder-breadcrumb-tablet.png`,
  `/tmp/mobile-folder-breadcrumb-nested.png`,
  `/tmp/mobile-folder-breadcrumb-infra.png`,
  `/tmp/mobile-folder-breadcrumb-long.png` and
  `/tmp/mobile-folder-breadcrumb-long-tablet.png`. Actual `posts/infra` shows
  `~/blogs/posts/infra`; bounded long-path fixtures wrap on phone/tablet with
  search visible, no overflow, no friends or shell within directories.
- Initial Astro check caught a test fixture variable named `document` shadowing
  the DOM global; renamed it to `leaf`. Evidence:
  `/tmp/mobile-folder-breadcrumb-check-before.log`. The first clean matrix was
  35 pass/97 skips; capture inspection then exposed inconsistent long-fixture
  filename metadata triggering search fallback. Corrected fixture metadata and
  added a search-visible assertion, then reran the same matrix successfully.
  First evidence: `/tmp/mobile-folder-breadcrumb-browser-first.log`.

No unresolved product findings, commit or deployment. Physical software-keyboard
testing is still unperformed; screenshots are viewport browser emulation.

### Final independent review

The native Trellis checker reviewed the whole final task diff, current specs,
task/evidence history, test scope and all seven final captures. No verified
findings, privacy/spec drift or edits. Independent Astro110 check returned zero
diagnostics, and the four-project browse/homepage/search matrix passed 35 tests
with 97 expected mode skips and no retries. Main verified
`/tmp/mobile-folder-breadcrumb-review-check.log` and
`/tmp/mobile-folder-breadcrumb-review-browser.log`. Whitespace remained clean;
earlier successful broad gates were reviewed and no reviewer code changes
required repeating them. Final task acceptance is complete, awaiting commit
confirmation rather than archive/deployment.

## Uniform typography/tree-row refinement

The owner accepted the overall behavior and explicitly requested uniform mobile
homepage/folder text sizes and matching tree-style row prefixes instead of dots.
Current PRD R9/R11 and design scope the change to mobile home and homeBrowse rows,
preserving native/desktop presentation and prior navigation/search/friend policy.
Implementation and affected validation/captures are complete; worker stopped
product edits for independent review. Main verified final log tails and inspected
all nine captures. The earlier evidence remains historical. No commit has been
authorized/performed.

| Gate | Final typography/tree result | Log |
| --- | --- | --- |
| Astro check | 111 files, zero errors/warnings/hints | `/tmp/mobile-folder-tree-check.log` |
| Build/static output | 18 passed | `/tmp/mobile-folder-tree-build.log` |
| Affected four-project browser matrix | 35 passed, 97 expected project skips, no failures/retries | `/tmp/mobile-folder-tree-browser.log` |
| Bounded existing native mixed/nested/empty-friend build fixture | 1 passed | `/tmp/mobile-folder-tree-native-fixture.log` |
| Whitespace | passed | `git diff --check` |

The browser matrix comprises mobile interactive 26 pass/7 skips, mobile static
3/30, desktop interactive 5/28 and desktop static 1/32. Existing broad content/
core/desktop/mobile/static evidence remains above; no controller/history or
dependency/authored changes were made in this refinement.

### Assertions and captures

- `DirectoryEntryRow.astro` shares root/pages/posts/lab row rendering. Its native
  variant keeps plain list-item markup; homeBrowse adds a decorative
  `[data-home-browse-tree-prefix][aria-hidden="true"]` outside the anchor and
  a flexible text column. Non-final/final sibling marks are `├──`/`└──`.
  No bullets, preserved anchor labels/list semantics and aligned wrapping pass.
- Mobile search/recovery text uses the existing base font size consistently;
  computed heading/path/row/search/friend sizes, 44px target/focus behavior,
  root-only friends and complete independent global search remain covered.
- Main/worker inspected `/tmp/mobile-folder-tree-root.png`,
  `/tmp/mobile-folder-tree-landscape.png`, `/tmp/mobile-folder-tree-tablet.png`,
  `/tmp/mobile-folder-tree-ai.png`, `/tmp/mobile-folder-tree-infra.png`,
  `/tmp/mobile-folder-tree-lab.png`, `/tmp/mobile-folder-tree-pages.png`,
  `/tmp/mobile-folder-tree-long.png` and
  `/tmp/mobile-folder-tree-long-tablet.png`. Root and all inline section lists
  share tree markers; long labels wrap below the text column without overflow.
- Initial static gate had 17 pass/1 fail because its native-markup assertion
  matched shared inline CSS. Strip style blocks before that assertion; final
  gate passed all 18 tests. Evidence: `/tmp/mobile-folder-tree-build-before.log`.
  This corrected test interpretation, with no product failure or policy exception.

Independent review passed with no findings/edits. No unresolved concerns or commit.
Physical software-keyboard testing remains unperformed; local browser evidence
does not claim production deployment.

### Final typography/tree independent review

The native Trellis checker reviewed the whole final task diff/specs/evidence and
all nine new captures, preserving prior broad gate evidence. No verified product
findings, fixes or contract/privacy drift. Independent Astro check passed for
111 files with zero diagnostics; four-project browse/homepage/search matrix
passed 35 tests with 97 expected skips and no retries. Main verified
`/tmp/mobile-folder-tree-review-check.log` and
`/tmp/mobile-folder-tree-review-browser.log`. Current build18 and native fixture1
and prior broad gates were reviewed. Whitespace remained clean; no reviewer edits
warranted additional reruns. Final acceptance is complete, awaiting confirmation
of the refreshed 33-file work commit, then archive/journal bookkeeping.

## Submission authorization

The owner confirmed the final 33-file commit plan with "不错；可以提交" after
reviewing the finished typography/tree refinement. Execute the approved
`feat(site): simplify mobile homepage browsing` work commit, followed by current
task archive and session journal bookkeeping. No additional product changes or
new validation scope were introduced by this confirmation.

Final staged whitespace review also covered newly added files. Removed one
extra blank line at the end of `home-search-fixtures.ts`; no code behavior
changed, so package/browser reruns are unnecessary. Recheck the staged diff
before committing the approved file set.
