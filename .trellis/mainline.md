# Project Mainline

## Initiative

- **Title:** f1refly MVP
- **Objective:** Deliver the Markdown-first static blog described in `prd.md`, with semantic and terminal presentations, isolated experiments, migration, staging, and production rollout.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-12 — approve the restrained-editorial M2 plan, then implement and validate the X Core semantic interface before considering M3.

## Continuation Policy

- The main session owns phase changes, task selection, commit plans, archival, and this control record.
- After each task is archived, run Project Pulse and present the next ready item before continuing.
- Guided mode requires a fresh user decision before creating or starting the next product task.

## Ordered Work

| Order | Work item | State | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | M0 — architecture baseline | complete | The repository layout, NERV experiment, Trellis workflow, Docker wrapper, and validation path are established. This is a structural baseline, not an assertion that product features are complete. |
| 1 | `.trellis/tasks/00-bootstrap-guidelines` | complete | The frontend guidelines are populated, checked, and committed; finish-work archives the task in this session. |
| 2 | `.trellis/tasks/08-12-astro-static-foundation` — M1 Astro static foundation | complete | The Astro 7 static site, content contract, four-route surface, browser evidence, and durable specs are committed; finish-work archives the task in this session. |
| 3 | `.trellis/tasks/08-12-m2-x-core-semantic-interface` — M2 X Core semantic interface | complete | The independently locked X Core and semantic packages, Astro metadata bridge, restrained semantic UI, adversarial contract checks, and browser evidence are committed; finish-work archives the task in this session. |
| 4 | M3 — Terminal interface | planned | M2 is complete; ready for an explicit product-planning decision after M2 archive. |
| 5 | M4 — experiment pipeline | planned | Depends on the earlier product foundations and follows M3 in the approved milestone order. |
| 6 | M5 — content migration | planned | Depends on M1–M4. |
| 7 | M6 — staging rollout | planned | Depends on M5 and its quality gates. |
| 8 | M7 — production rollout | planned | Depends on M6 acceptance. |

## Evidence

- Product scope and milestone order: `prd.md`
- Completed Trellis Plus initialization: `.trellis/tasks/archive/2026-08/08-12-trellis-plus-init/`
- Completed prerequisite: `.trellis/tasks/archive/2026-08/00-bootstrap-guidelines/` contains the checked frontend-spec bootstrap task.
- Work commits: `6e22a7b` (frontend guidelines) and `54f778d` (guided mainline establishment).
- Completed M1 task: `.trellis/tasks/archive/2026-08/08-12-astro-static-foundation/`.
- M1 work commits: `e9d49d9` (Astro static foundation) and `d81e550` (development contracts and task evidence).
- M2 task before finish-work archive: `.trellis/tasks/08-12-m2-x-core-semantic-interface/`.
- M2 work commits: `7084f7f` (X Core semantic presentation) and `c099952` (presentation contracts and task evidence).
- Mainline decision source: the user approved guided mode, then explicitly approved the restrained-editorial M2 plan and implementation on 2026-08-12.

## Next Decision

At the next Project Pulse, ask whether to create and plan M3 — Terminal interface. Do not start later work automatically.
