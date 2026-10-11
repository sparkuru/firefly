# Owner Refinement Implementation and Checker Handoff

## Handoff Status

The approved minimal layout and center-based reader are implemented. This is
**not a passed final quality gate**. The last clean full browser run finished
with 34 passes, 15 intentional project skips and 3 failures. Two failures were
duplicate trace startup in the added BFCache harness; the manual tracing calls
have now been removed because the runner already traces the new context. That
small harness correction has not been rerun. The remaining mobile seek-persistence
failure is assigned to the independent checker for diagnosis and repair.

At the main session's instruction, the implementer stopped build/test execution
after this handoff. No Docker command remains running from this pass.

## Implemented Behavior

- Removed the global Memo header, site identity/navigation, large feed intro and
  unused `memo-shell.ts`. An accessible hidden page H1 and skip link remain.
- Desktop has a left history rail and generous entry stream; narrow viewports
  keep the horizontal rail. Header clearance is absent/zero rather than 64px.
  Narrow safe-area positioning, local overflow, static tail/anchor clearance and
  enlarged-text short-landscape navigation remain covered.
- Details are flat, centered, bounded to 46rem, with date and complete authored
  content/title, divider, exactly one bottom return and existing footer. Removed
  upper return and detail tag/marker/update chrome. Stored content is unchanged.
- Native scrolling selects the visible entry interval nearest the unobscured
  viewport's center. Mobile excludes the actual sticky rail. Exact gap ties use
  document order; long entries remain active while spanning the center.
- Explicit seeks hold a separate lock through feedback expiration and geometry
  callbacks. Pointer/touch/key contact only arms browsing: the lock releases on
  actual viewport movement, including a viewport-only scrollbar path. Geometry
  snapshots distinguish layout anchoring from later viewport-only scrolling.
  A cleanly reproduced 1px-wheel edge was corrected from a >1px to >0.5px
  movement threshold.
- Date bubble and discrete target emphasis remain visual-only and retain UTC+8,
  slider semantics, immediate alignment, equal occupied-month mapping and native
  history behavior. Same-hash month clicks settle the target without preventing
  native anchors; the remaining mobile issue below needs independent resolution.
- Same-tab unmodified canonical detail clicks store bounded `memoTimelineReturn`
  context through `history.replaceState`, preserving URL/history length/other
  plain-object state. Modified/default-prevented/new-tab/download links and
  unsupported state shapes are untouched. Return metadata is consumed, including
  exact restoration of null state; IDs are validated against the public index.
- Ordinary reload initialization and persisted `pageshow` both restore valid
  clicked-entry context before falling back to an older URL hash. The added
  BFCache test starts from an older hash, navigates to a different short entry,
  and asserts a retained document, `pageshow.persisted`, unchanged URL and correct
  consumed state. Its real cached lifecycle remains unverified until the harness
  correction is rerun.

## Validation Evidence

| Check | Actual outcome |
| --- | --- |
| `./sam npm --prefix apps/site run check` | Last source/harness version before removing redundant tracing: 0 errors, 0 warnings, 9 existing hints |
| `./sam npm --prefix apps/site run test:content` | 113 passes, 0 failures |
| `./sam npm --prefix apps/site run test:x-core` | 9 passes, 0 failures |
| `./preview.sh render npm run prepare:test:memos` | Final public/empty/single outputs built serially; exit 0 |
| `./preview.sh render npm run test:e2e:memos` | Clean final run before harness correction: 34 passed, 15 skipped, 3 failed |
| `git diff --check` | Passed after the final harness correction |

The content/X Core suites preceded the final ownership/history refinements;
later edits stayed in the Memo UI/controller/tests, not the content pipeline.
No dependency installation or lockfile change was needed.

| Browser project | Passed | Failed | Intentional skips |
| --- | --- | --- | --- |
| Desktop interactive, 1440x900 | 11 | 1 BFCache harness | 1 mobile-only gesture |
| Desktop static, 1440x900 | 6 | 0 | 7 enhancements/gestures |
| Mobile interactive, 375x812 | 11 | 1 persistence + 1 BFCache harness | 0 |
| Mobile static, 375x812 | 6 | 0 | 7 enhancements/gestures |

Passing coverage includes clipped 0.5/full/full/full/0.5 entry geometry selecting
the middle complete entry, nearest gaps, sustained long reading, explicit seek
feedback expiration, geometry callbacks, non-scrolling mouse/touch contact,
modified keys, actual 1px wheel movement, keyboard/touch/viewport-only takeover,
ordinary Back and null/other-key state preservation, static details, accessible
naming, empty/single, controller failure, no-JS month/oldest clearance, 200% text,
tablet and short landscape. This does not establish the failing final portion
of the mobile persistence scenario or the unexecuted BFCache assertions.

## Preserved Failures and Remaining Work

The remaining clean product-risk failure is:

```text
memos-mobile-interactive
explicit seeks survive scroll and geometry callbacks until browsing resumes
memos.spec.ts:392 (at the final run)
After clicking the 2026-06 native month link and dispatching a scroll callback,
the active ID was m_fixture_dense_00 rather than m_fixture_recent.
```

The earlier wheel takeover portion now passes. Desktop persistence passes.
Do not weaken this assertion: independently diagnose native anchor/induced-scroll
ordering and preserve the owner's selected target until real browsing moves.
Then run the corrected BFCache scenarios and the complete clean matrix.

Original clean failure artifacts are retained at
`/tmp/memos-refinement-clean-matrix-failures/`, with stdout in
`/tmp/memos-refinement-clean-matrix-browser.log`. The maintained ignored output
is `apps/site/test-results/memos-browser/`. BFCache failures have configured
runner traces despite manual tracing never starting; the harness correction
retains runner tracing plus a diagnostic screenshot on assertion failure.

One initial run was invalid: fixture preparation overlapped content-negative
builds sharing `.generated-content`, causing the single fixture to read an
invalid-license negative input. Those artifacts are preserved separately under
`/tmp/memos-refinement-invalid-fixture-run/` and matching invalid logs. That run
is neither product regression evidence nor a pass. All subsequent shared
build/preparation/check mutations were serial. The intermediate clean 1px-wheel
failure is separately preserved under `/tmp/memos-refinement-one-pixel-failure/`.

The main session/checker owns quality completion, broad verification/packaging,
actual-corpus review and restoring the normal preview. No commit, archive or
deployment was performed here.

## Diagnostic Captures

The final clean run produced settled feed/detail captures at
`apps/site/test-results/memos-browser/`:

- `memos-unified-static-feed--11c7a--policy-and-Pages-discovery-memos-desktop-interactive/`
  and the mobile counterpart: `integrated-memo-reading.png`,
  `integrated-memo-detail.png`, `integrated-memo-detail-return.png`.
- `memos-reading-center-choos-44cb0--and-sustained-long-content-memos-desktop-interactive/`
  and mobile counterpart: `integrated-memo-reading-center.png`.
- `memos-time-feedback-identi-f8b39-t-introducing-header-chrome-memos-desktop-interactive/`
  and mobile counterpart: `integrated-memo-seek.png`.
- `memos-minimal-light-feed-a-0faf2-esponsive-readable-measures-memos-desktop-interactive/`:
  feed/detail captures at 900, 768 and 667px widths.
- Existing zoom and enlarged-text landscape captures remain available.

These synthetic diagnostics were visually inspected for the requested minimal
layout. They are not owner acceptance or an automatically accepted baseline.

## Stable Source Fingerprints at Handoff

`memo-shell.ts` is absent. The implementer will not mutate these files or start
further checks after handing them to the independent checker.

```text
814d594cf0380c0397f2b464d9e906e6dd1d639504c018b79b968f5707a0d43a  apps/site/src/layouts/MemoLayout.astro
f710c82e16db2e1ae05690732694336704e4eefc1e1d8f83cbcd7de58f5111a0  apps/site/src/components/MemoDocument.astro
94459bcc2199feec06488e0ea686e121fa06fcd9a4b711ab1afdbccdb67fae17  apps/site/src/components/MemoTimeline.astro
0a6a310a912af06355ddcadf17fbaa749bbe4da5b76257f839f947ea1ba6942f  apps/site/src/components/MemoEntry.astro
c7eeccd08e54fc6e833620fa8703dfb3db82e58cb0e0a6551fd7c04cca84caa2  apps/site/src/styles/memo.css
17f8907556642b5111bc2e46a7fe82e1551b571f6809094d150c0d802c6337d7  apps/site/src/scripts/memo-timeline.ts
fcb56bd719072b757b11da048053ec94608d8afa08dc76d9926e39e557fb9acf  apps/site/tests/memos.spec.ts
```
