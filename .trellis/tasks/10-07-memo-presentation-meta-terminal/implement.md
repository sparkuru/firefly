# Memo Timeline Implementation Plan

Status: in_progress. The owner approved the latest complete planning summary
on 2026-10-07 and the main session ran task.py start.

## Phase Gate and Scope

- [x] Owner review of converged PRD/design/this plan.
- [x] Confirm task remains planning until that review is approved.
- [x] Validate implement/check contexts and read frontend/trellis-plus contracts.
- [x] Read content-workspace-contract.md in full before affected edits/review;
      it exceeds automatic context injection size, so its injected prefix alone
      is insufficient. Use explicit full-file or sequential section reads.
- [x] Refresh Git status, owner source inventory and retained private history.
      Do not stage or overwrite unrelated work.
- [x] Main session activates the task; implementation/check work uses Trellis
      agents with curated native context and child-side loading fallback.

Use one task with ordered implementation boundaries, because source projection,
new routes and old access/publisher retirement need a coordinated acceptance.
Workers receive explicit file ownership and must preserve other workers' edits.
No commit, archive or production deployment is implied by implementation approval.

## 1. Shared Document and Source Contracts

- [x] Factor/reuse document metadata validators; add a Memo schema with stable
      id/date/draft and optional title/description/updated/tags/markers/access.
      Keep ordinary post/page required fields strict.
- [x] Add optional memos source/stage collection, containment/path/UTF-8/body
      validation, asset inventory and draft-first guest projection.
- [x] Define the Pages aggregate entry and the central nested Memo detail/asset
      routes; reject collisions/duplicate IDs and preserve timestamps.
- [x] Extend canonical/X Core context types and resolution deliberately. Preserve
      document diagnostics and prevent owner paths/private identity in output.
- [x] Add a new-entry authoring command with generated identity/date/draft and
      exclusive creation; stop the old publish/push path with useful guidance.
- [x] Validate schema examples, absent directories, empty draft, malformed meta,
      chronology, private/draft exclusion, route/ID collision, parser controls,
      and unchanged ordinary document behavior.
- [x] Repair the scoped empty-glob cache path and verify warm last-entry
      withdrawal without force/cache removal, including retained source assets;
      exact source-derived output inventories must reject stale records.

Likely files: apps/site/src/lib/content-schema.mjs, content.ts,
canonical-route.mjs, x-core-context.ts, content.config.ts;
apps/site/scripts/materialize-content.mjs and a focused Memo authoring entry;
packages/x-core/src/contracts.ts and its context validation/tests.

## 2. Registered Memo Rendering and Asset Closure

- [x] Add the framework-neutral memo adapter and register a third full-page
      experience without importing another presentation's source.
- [x] Allow the experience's native/no-navigator composition while preserving
      existing firefly/semantic defaults and override validation.
- [x] Reuse shared Markdown/raw-HTML sanitation and code/media handling. Evaluate
      existing generated-stage heading normalization against the full corpus;
      keep raw files/code spans unchanged.
- [x] Compile bounded previews without malformed HTML/Markdown fragments;
      preserve intentional line breaks and retain full detail HTML.
- [x] Resolve owned assets and existing entry links through one safe build-time
      mapping; namespace aggregate heading/footnote IDs and verify all closure.
- [x] Ensure the full feed is composed only in Memo routes; the aggregate home
      template remains compact and individual entries do not expand home HTML.

Likely files: a focused presentations/memo package and its lock/build/test
contract; apps/site/src/lib/presentation-experiences.ts,
document-navigation-composition.ts, render-document.ts;
new Memo components/layout/data projection; aggregate and nested detail routes.
Update actual package dependency/lockfiles and build order, not placeholder
scripts. No external fonts, UI library, or browser Markdown processor.

## 3. Reader UI and Bidirectional Time Control

- [x] Implement the approved desktop sticky vertical rail plus natural content
      scroll; mobile sticky horizontal control plus single content column.
- [x] Build equally spaced occupied-month time positions in UTC+8, newest-first
      with stable ties; compress empty periods and display real dates/gap
      information. Verify equal month-segment lengths independently of record
      count, body height or gap duration in desktop and mobile orientations.
- [x] Implement pointer seek, soft snap/release settling and scroll-to-cursor
      synchronization with explicit update ownership and frame batching.
- [x] Implement keyboard/click alternatives, reduced-motion policy, visible
      focus, slider date labels, target sizing and non-chatty announcements.
- [x] Preserve active IDs on resize, stable reading alignment for long/media
      content, native entry/detail links and Back/return context.
- [x] Add static/no-JS month anchors and honest empty/single-entry behavior.
      UI failure keeps the already rendered content and links usable.
- [x] Add deterministic fixture browser tests for real drag/scroll/keyboard/touch
      behavior and final entry/cursor alignment, not algorithm-mirroring tests.

Likely files: apps/site/src/components/Memo*, layouts/Memo*,
styles/memo*.css, scripts/memo-timeline.ts, pure month/seek model and tests;
maintained Memo fixture/browser config and relevant static-output tests.

## 4. Coordinated Publication and Legacy Compatibility

- [x] Include aggregate/details/assets in ordinary site/assembler inventories
      and authored-content validation without broadening private-data exemptions.
- [x] Transition /memos/ to site-owned compatibility navigation with visible-ID
      fragment handling. Remove active independent mount/gate assumptions from
      preview/package/runtime; the old flag must not control new documents.
- [x] Version the new access projection/ownership explicitly, retaining legacy
      v1 recovery decoding and rejecting mixed contradictory markers. New
      releases gate comments and treat Memo as ordinary site-owned content;
      accepted deprecated Memo configuration cannot control new visibility.
- [x] Update homepage Pages discovery/sitemap and remove duplicate old plugin
      navigation. Keep shell/search template inventories coherent.
- [x] Retain private receipts/retired IDs/backups and isolated legacy recovery
      code; do not reset publication evidence, reintroduce retired content or
      perform SSH pushes as part of the new build.
- [x] Replace obsolete independent-publication verification with positive
      integrated-build/runtime and retained-data checks. Preserve comments and
      ordinary Experiment/access fixtures; do not weaken unrelated assertions.

Likely files: tooling/assemble-publication/src and runtime/access fixtures;
plugins/public-access* compatibility projection; root package/build delegates;
Memo preview fixture preparation/serving; preview packaging/runtime config and
the retired publisher host entry. Read shell guidance before shell edits.

## 5. Actual-Corpus Conversion and Local Installation

- [x] Resolve owner-selected sources privately and snapshot exact identities,
      modes, file hashes and existing source/header baselines.
- [x] Verify the 180 extracted bodies/times against the retained ledger without
      author filtering; include all 89 corrected notes and their 211 assets.
      Planning found the owner-selected target empty, but the retained staging
      set matched all final manifest/source/body hashes. Reverify that set and
      current target rather than assume historical installation is still present.
- [x] Produce all 269 metadata-bearing candidates and private correspondence;
      preserve duplicate-body records separately, Unicode/U+200B, code, dates
      and referenced media. Account for every changed link/header/staged heading.
- [x] Reject source conflicts, unknown retired IDs, unsafe media, partial records,
      missing assets or unexplained body differences; never drop failed entries.
- [x] Validate a real local coordinated candidate before installation. Install
      absent-only new files; known existing header adaptation requires verified
      baseline, recovery copies and atomic replacement. Preserve originals.
- [x] Rebuild from actual installed sources; independently compare 269 IDs,
      dates, complete bodies/assets/link targets and public privacy projection.
- [x] Check actual-corpus desktop/mobile time navigation and representative long
      details, including oldest/newest bounds and large/loaded media.

No actual SQL/identity strings/source bodies or operational paths enter tracked
fixtures, tasks or journals. Migration reports and browser evidence remain
ignored owner-controlled files. No remote deployment, new image installation,
service stop or live pointer change is part of this plan.

## 6. Verification Commands and Gates

Node/browser commands use ./sam or the pinned preview.sh render profile. Install
only affected locked packages; do not use host npm/global Playwright as evidence.

Existing applicable commands (extend delegates for the new Memo package/tests):

```sh
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
./sam npm --prefix tooling/assemble-publication run check
./sam npm --prefix tooling/assemble-publication run test
./sam npm --prefix tooling/assemble-publication run build
./preview.sh render npm --prefix apps/site run test:e2e
./preview.sh render npm run test:e2e:memos
./preview.sh verify
git diff --check
```

Fixture/test:e2e:memos preparation must first be updated to the integrated
reader, and the full verify/runtime fixture must exercise the new publication
contract. Do not report old independent-publisher tests as proof of this reader.
Run shell syntax/ShellCheck/shfmt and CLI/lifecycle checks only for affected
scripts. Packaging checks verify emitted routes/assets, route fallback, no private
data/history exposure and unchanged default comments behavior.

Browser assertions: drag seeks; scroll moves cursor; no feedback oscillation;
equal occupied-month spacing in both orientations, empty/dense/gapped months;
pointer release/cancel; keyboard bounds/month stepping;
mobile horizontal scrubbing with unaffected vertical page scroll; resize and
late image layout; reduced motion; JS-disabled reading; detail/Back/return; no
new Memo CSS/runtime/feed body on ordinary Terminal routes. Preserve failures.

## 7. Review, Rollback and Finish

- [x] Trellis quality agent checks the approved plan, cross-layer data flow,
      preserved legacy/source evidence, privacy and actual tests; self-fixes
      concrete in-scope findings and reports remaining risks.
- [x] Main session independently verifies final evidence and source inventory,
      reviews desktop/mobile visual density/snap feel with the owner as needed,
      and records actual outcomes without claiming real-device certification.
- [x] Restore only task-owned candidates or verified source/header copies if a
      local stage fails; leave owner originals, private state and deployment
      pointers untouched. Reconcile exact inventories before retrying.
- [x] Update superseded frontend/Memo/publication/access/runtime specs and
      mainline with the final contract and validation, not historical claims.
- [x] Obtain the repository-required concrete commit/archive approval before
      those actions. Production deployment needs a separate explicit instruction.

Implementation and actual installed-corpus reading acceptance are complete.
Recorded automated gates and isolated actual-source runtime packaging passed.
The final full repeat lost its original exit handle during daemon restart; all
complete stage logs survived, and both host fixtures were repeated with zero
exit. Final reconciliation preserves 491 original inputs, 480 installed files
and all 637 workspace file/link identities. No source/header rollback was
required; original and failure evidence remains intact. Concrete commit/archive
approval remains separate. Exact evidence lives in research/final-acceptance.md.
