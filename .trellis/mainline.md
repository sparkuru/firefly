# Project Mainline

## Initiative

- **Title:** f1refly MVP
- **Objective:** Deliver the Markdown-first static blog described in `prd.md`, with semantic and terminal presentations, isolated experiments, migration, staging, and production rollout.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-13 — approve the shell-first M3 Terminal interface after direct production-preview review. Preserve inline `cat`, screen-clearing `clear`, static recovery, and the JavaScript-free canonical article; keep lab commands/publication deferred to M4.

## Continuation Policy

- The main session owns phase changes, task selection, commit plans, archival, and this control record.
- After each task is archived, run Project Pulse and present the next ready item before continuing.
- Guided mode requires a fresh user decision before creating or starting the next product task.

## Ordered Work

| Order | Work item | State | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | M0 — architecture baseline | complete | The repository layout, NERV experiment, Trellis workflow, Docker wrapper, and validation path are established. This is a structural baseline, not an assertion that product features are complete. |
| 1 | `.trellis/tasks/archive/2026-08/00-bootstrap-guidelines` | complete | The frontend guidelines are populated, checked, and committed; finish-work archived the task. |
| 2 | `.trellis/tasks/archive/2026-08/08-12-astro-static-foundation` — M1 Astro static foundation | complete | The Astro 7 static site, content contract, four-route surface, browser evidence, and durable specs are committed and archived. |
| 3 | `.trellis/tasks/archive/2026-08/08-12-m2-x-core-semantic-interface` — M2 X Core semantic interface | complete | The independently locked X Core and semantic packages, Astro metadata bridge, restrained semantic UI, adversarial contract checks, and browser evidence are committed and archived. |
| 4 | `.trellis/tasks/08-12-m3-terminal-interface` — M3 Terminal interface | complete | The independently green shell-first home, inline document rendering, static recovery path, JavaScript-free canonical article, and targeted desktop review are approved; finish-work archives the task in this session. |
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
- Completed M2 task: `.trellis/tasks/archive/2026-08/08-12-m2-x-core-semantic-interface/`.
- M2 work commits: `7084f7f` (X Core semantic presentation) and `c099952` (presentation contracts and task evidence).
- Active M3 implementation task: `.trellis/tasks/08-12-m3-terminal-interface/`.
- Mainline decision source: after completing M2, the owner approved M3 planning and implementation, chose to hide lab commands until M4, authorized one sibling-repository article, selected the audited Trellis article, and chose a whole-route Terminal presentation on 2026-08-12. On 2026-08-13, the owner redirected the enhanced home to a specialized shell-first interaction and approved the resulting production preview for commit.
- Superseded M3 baseline evidence: before owner review, X Core 11, semantic 3, Terminal 7, content 13, registry integration 5, static output 8, and Playwright 32 tests passed; all five package/application checks and builds passed. This evidence does not approve the shell-first revision.
- Revised M3 automated evidence: X Core 11, semantic 3, Terminal 8, content 13, registry integration 5, static output 9, focused Playwright 12 + 32, and full four-project Playwright 44 tests pass; all package/application checks and builds pass. Static output remains exactly five HTML, one semantic CSS, one home-only JS, and zero maps/unknown files.
- Revised M3 artifact evidence: home HTML is 72,195 bytes, with 57,637 bytes across exactly three inert build-rendered templates; client JS is 12,538 bytes. Only `/` references the script.
- M3 review evidence: six desktop/mobile captures cover prompt-only home, canonical Terminal article, and inline `cat`; direct owner review approved the final production preview. The preservation-first article edit ledger remains current under `.trellis/tasks/08-12-m3-terminal-interface/research/`. NERV retains 19 pre-existing audit advisories outside M3 scope.

## Next Decision

At the next Project Pulse, ask whether to create and plan M4 — experiment pipeline. Do not start later work automatically.
