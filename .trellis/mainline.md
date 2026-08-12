# Project Mainline

## Initiative

- **Title:** f1refly MVP
- **Objective:** Deliver the Markdown-first static blog described in `prd.md`, with semantic and terminal presentations, isolated experiments, migration, staging, and production rollout.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-12 — finish `00-bootstrap-guidelines` before starting the M1 static-foundation milestone.

## Continuation Policy

- The main session owns phase changes, task selection, commit plans, archival, and this control record.
- After each task is archived, run Project Pulse and present the next ready item before continuing.
- Guided mode requires a fresh user decision before creating or starting the next product task.

## Ordered Work

| Order | Work item | State | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | M0 — architecture baseline | complete | The repository layout, NERV experiment, Trellis workflow, Docker wrapper, and validation path are established. This is a structural baseline, not an assertion that product features are complete. |
| 1 | `.trellis/tasks/00-bootstrap-guidelines` | active | The frontend guidelines are populated and the quality gate has passed; commit and archive remain. |
| 2 | M1 — Astro static foundation | planned | Start only after the bootstrap task is checked, committed, and archived. |
| 3 | M2 — X Core semantic interface | planned | Depends on M1. |
| 4 | M3 — Terminal interface | planned | Depends on M2. |
| 5 | M4 — experiment pipeline | planned | Depends on the earlier product foundations and follows M3 in the approved milestone order. |
| 6 | M5 — content migration | planned | Depends on M1–M4. |
| 7 | M6 — staging rollout | planned | Depends on M5 and its quality gates. |
| 8 | M7 — production rollout | planned | Depends on M6 acceptance. |

## Evidence

- Product scope and milestone order: `prd.md`
- Completed Trellis Plus initialization: `.trellis/tasks/archive/2026-08/08-12-trellis-plus-init/`
- Current prerequisite: `.trellis/tasks/00-bootstrap-guidelines/` has passed its documentation and Astro checks and is pending commit and archive.
- Mainline decision source: the user approved guided mode and the bootstrap-before-M1 sequence on 2026-08-12.

## Next Decision

No decision is needed while `00-bootstrap-guidelines` is active. After it is archived, ask whether to create and start the M1 static-foundation task.
