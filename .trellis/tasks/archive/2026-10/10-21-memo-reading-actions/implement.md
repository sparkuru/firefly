# Implementation plan

## Planning gate

- [x] Owner requested task creation; clean repository state inspected.
- [x] Source, topic contracts and applicable project policies inspected.
- [x] PRD converged with R1–R4 / A1–A9 mapping; design/research recorded.
- [x] Owner approved the latest final planning summary with "开始" (2026-10-21).
- [x] Activated with `task.py start`; task status is `in_progress`.

## Execution sequence

1. Main session loads phase 2.1 and dispatches `trellis-implement`. The worker
   owns site Memo source and focused tests, preserving all user/other-agent edits.
2. Replace timestamp links, ensure bottom detail access for every entry and add
   per-entry Share using existing URL/clipboard helpers.
3. Add detail byte/license/COPY/Share metadata and Memo-only enhancement/styles.
4. Add controller mouse-hover priority and scroll-aware pointer reconciliation,
   preserving explicit seeks and touch reading.
5. Extend maintained Memo fixture/build/browser checks. Replace timestamp-based
   navigation tests with bottom links; explicitly assert timestamp noninteraction.
   Cover short untitled entries, long previews, full-body COPY and canonical URLs.
6. Main session dispatches `trellis-check` for full diff review and applicable
   tests; verify findings against actual source before accepting them.
7. Main session updates stable topic specs and records actual evidence. Prepare
   a reviewable result; commit/archive require later owner authorization.

## Context and ownership

Every dispatch starts with
`Active task: .trellis/tasks/10-21-memo-reading-actions`.
Prefer native context injection; child-side loading is the fallback. Main session
owns task transitions, planning/approval, shared specs, mainline and finish.
Serialize source writes and fixture/content materialization.

Likely source: `apps/site/src/components/MemoEntry.astro`, MemoDocument/Timeline
where initialization belongs, `apps/site/src/scripts/memo-timeline.ts`, a focused
Memo copy controller and `apps/site/src/styles/memo.css`. Reuse existing helpers
before changing shared Share code. Tests use existing Memo fixture modules.

## Verification

All Node/browser commands use the project boundary. Confirm actual package
script syntax before execution; no host npm/global browser evidence.

1. Focused Memo/content tests and site check/build:
   - `./sam npm --prefix apps/site run test:memos`
   - `./sam npm --prefix apps/site run test:content`
   - `./sam npm --prefix apps/site run check`
   - `./sam npm --prefix apps/site run build`
2. Serialize fixture preparation, then the maintained Memo browser matrix:
   - `./preview.sh render npm run prepare:test:memos`
   - `./preview.sh render npm run test:e2e:memos`
3. Run relevant ordinary site Share/navigation browser regressions through
   `./preview.sh render`, checking URLs, feedback and selection preservation.
4. Follow the Memo contract with `./preview.sh verify`, then runtime packaging
   through `./preview.sh package`. Preserve failed-stage logs; clean only exact
   owned disposable resources. Name unavailable prerequisites, never count them
   as passes.
5. Inspect final diff/task records for privacy, source preservation, unrelated
   edits and coverage. Record desktop/mobile results separately; real devices,
   assistive technology and subjective feel remain residual review.

Browser scenarios: noncentral hover without page motion; stationary-pointer
wheel/gutter/viewport leave; center fallback; seek retention and browse takeover;
touch scrolling; short-entry detail access/plain timestamps; full-body copy;
per-entry Share; success/failure/reset/pending/page lifecycle; no-JS controls and
links; responsive metadata, focus/keyboard, reduced motion, 200% and landscape.

## Rollback points

Fix hover arbitration inside the existing controller rather than introducing
independent selection. Resolve rendered-text extraction mismatches before
accepting COPY. Revert only task-owned changes if required; preserve source
content, user changes and failure evidence. Never weaken tests or run shared
fixture preparation concurrently to dismiss failures.

## Completed execution

- [x] Implemented approved R1–R4 and maintained acceptance coverage A1–A9.
- [x] Independent full-scope Trellis review: no defects; separate type check passed.
- [x] Focused content/build/Memo/Share gates passed.
- [x] Full `./preview.sh verify` passed, including both host runtime fixtures.
- [x] Normal configured package passed; exact temporary image/container cleanup done.
- [x] Original 183 Memo source files and nine reviewed app/test fingerprints preserved.
- [x] Updated Memo topic contract and normal configured ready preview.
- [x] Owner-authorized local work commit `1175351` (2026-10-22); supported archive/journal follows under the same closeout authorization.

Actual results and residual review limits: `research/validation.md`.

## Owner refinement — 2026-10-22

The owner subsequently requested the same visual consistency for CC BY-NC 4.0:
share action styling/timing, no license underline, preserved deed navigation.
This directly authorized bounded follow-up uses focused existing checks and
normal preview refresh; no new task or full verification/package rerun.
Completed with focused browser 4/4, site static 18/18, clean independent review
and exact normal-preview artifact identity; all three refined source/test
fingerprints were preserved through refresh.

The owner accepted the result generally and directly requested underlined
`Read Full`, no trailing arrow, and Share's interaction visuals. This bounded
refinement is authorized within the current task. Update the native link,
shared action styling and affected locators/assertions; run focused browser
and build checks, independent review, then refresh the normal local preview.
Earlier full-gate evidence remains historical for the previous source snapshot.

Completed: exact native-link label/style/no-arrow change; build/static 18/18,
focused four-project browser 8/8 and changed build integration 1/1 passed.
Independent review found no defects. Normal configured publication/preview
refresh passed with exact served-artifact identity and unchanged four-file
source/test fingerprints. See `research/validation.md` for the dated evidence.
