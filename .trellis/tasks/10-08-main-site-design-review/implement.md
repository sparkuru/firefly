# Execution plan

## Planning gate

- [x] Owner chose existing Terminal refinement.
- [x] Capture assessment, boundaries and testable acceptance in PRD/design.
- [x] Validate implement/check manifests: final validation passed with 16 curated entries each and no truncation warning.
- [x] Present the final plan and record the owner's decision: owner approved implementation on 2026-10-08 with “开始实施”.
- [x] Obtain a subsequent explicit approval of that final plan; activation follows this approval.

## Phase 2 sequence

1. Recheck Git/task status and read phase step 2.1. Dispatch the permitted Trellis implementation role with `Active task: .trellis/tasks/10-08-main-site-design-review`; provide native context or child-side loading fallback. Worker owns the stated site styles/components/tests and must preserve other edits.
2. Establish a deterministic fixture baseline through the wrapper/built-artifact flow; keep screenshots in ignored browser artifacts. Preserve the initial assessment's existing-build captures separately.
3. Restore previous default prose width while retaining document/outline spacing improvements. Verify Chinese/English/mixed content, standalone/cat alignment and independent wide regions.
4. Refine coarse-pointer canonical directory/outline anchors and Memo month target; verify wrapping, click/focus behavior and sticky rail clearance.
5. Implement first-index-visit-only help hint and supported state feedback. Settle safe completion viewport after long output, with fitting-group centering and midpoint-capped oversized lists. Check input/focus, selection/acceptance, history/IME and reduced motion.
6. Extend maintained browser tests with meaningful geometry/focus/overflow checks. Avoid assertions that merely repeat CSS constants; exercise actual navigation, native wide scrolling and reading entry points.
7. Independent Trellis check verifies spec compliance, code reuse, measured results and all affected acceptance; repair failures and rerun affected checks.
8. Run the required integrated gate, compare final desktop/mobile/theme captures and complete two rounds of visual review. Summarize retained improvements and actual limits.
9. Promote stable original conventions into existing specs only where evidence supports them. Finish using project policy; commits/archive/deployment require the applicable owner decision and are not automatically authorized by implementation approval.

## Validation classification

- UI acceptance: `playwright-required`; use maintained, built-artifact Chromium automation.
- Mobile: `mobile-required`; include desktop/mobile static/interactive and supplemental touch-tablet/landscape checks.
- Subjective visual comparison: agent review plus owner-visible before/after artifacts; no claim that automation proves taste or award qualification.

## Commands and gates

All Node/browser commands use `sam` or `preview.sh render`. Prepare affected lockfile/package prerequisites if missing; do not substitute host tools. Use a tracked public fixture and contained configuration for deterministic checks, keeping owner content/configuration intact. Follow the existing fixture orchestration rather than manually swapping owner configuration.

Focused static/build checks:

```sh
./preview.sh render npm --prefix apps/site run check
./preview.sh render npm --prefix apps/site run build
```

Focused maintained browser suites on the resulting appropriate fixture:

```sh
./preview.sh render npm --prefix apps/site run test:e2e -- tests/site.spec.ts tests/terminal.spec.ts tests/document-navigator.spec.ts tests/document-navigator-mobile.spec.ts tests/mobile-homepage.spec.ts tests/home-browse.spec.ts tests/home-search.spec.ts
./preview.sh render npm run prepare:test:memos
./preview.sh render npm run test:e2e:memos
```

If a new suite is needed, add it to explicit project `testMatch` selections and the focused invocation. Geometry changes may invalidate scroll-based assertions: verify real expected behavior before updating an assertion; do not weaken it to force success.

Final maintained fixture/integration and runtime gates required by the affected contracts:

```sh
./preview.sh verify
./preview.sh package
```

These gates include existing lab regression checks as integration evidence; lab source remains outside design/implementation scope. A normal gate may create ignored builds and artifact outputs, but it does not publish production. Avoid repeat broad runs after success unless later changes or unresolved findings justify them.

## Evidence matrix

- AC1: fixture Chinese/English/mixed page-wide prose alignment, standalone and `cat`; wide code/table keyboard scrolling; paper isolation.
- AC2: desktop/mobile short/long document and directory captures; stable headings/IDs/native outline anchors.
- AC3: anchor geometry, actual directory/outline navigation, long-label wrapping; Memo summary/rail clearance and oldest-entry alignment.
- AC4: first-visit hint/value, retirement/reload/return/storage failure/mobile policy; input/keyboard/history/IME, hover/press/focus and reduced motion. AC5 completion viewport: fitting/oversized geometry after long output, repeated selection/acceptance and keyboard guards.
- AC5: maintained static/interactive suites and full fixture gate.
- AC6: 375px, touch tablet, landscape, enlarged text, registered palettes, safe-area/fixed-control clearance and overflow.
- AC7: before/after reasons, independent check result and two visual rounds; list real-device/assistive-technology limits.

## Risk and rollback checkpoints

- Prose CSS cascade: preserve previous page-wide defaults and avoid accidental narrowing of prose or code/table internals.
- Touch outline expansion: verify body access, focused navigator outline and native fragment scroll.
- Memo sticky geometry: retain existing controller measurement and scroll ownership; investigate any regression before changing runtime.
- Source inspection confirmed the lab index uses separate semantic/global styles. Keep those styles and experiment source outside the refinement; existing integration gates verify the exclusion.
- Owner data/privacy: tracked tests use synthetic fixtures; screenshots/body excerpts of owner content remain ignored and outside task records.
- Revert only task-owned changes at the affected checkpoint; retain logs, user edits and prior outputs. Report missing prerequisites honestly.

## Execution status

Owner review reopened Phase 2 on 2026-10-08: restore previous prose width,
first-visit-only help placeholder, and completion viewport settlement. The
owner's request directly authorizes these revisions; no additional planning
approval is needed. Previous totals and captures remain historical evidence.
Dispatch implement then independent check, update changed contracts and run
the required final gates before reporting the revised result.

The owner revision is implemented and independently reviewed. Focused tests,
revised full verification (208 browser passes / 166 intentional skips), normal
runtime packaging and local preview readiness passed. See
`research/owner-revision-validation.md` for current evidence and limits;
`research/final-validation.md` is the historical first candidate. Stable
contracts are synchronized. Owner visual/Git approval remains pending; no
commit, archive or production deployment occurred.
