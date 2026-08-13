# Project Mainline

## Initiative

- **Title:** f1refly MVP
- **Objective:** Deliver the Markdown-first static blog described in `prd.md`, with semantic and terminal presentations, isolated experiments, migration, staging, and production rollout.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-13 — approve the checked M4 Experiment pipeline and Terminal refinement for commit/archive, then authorize the separately planned M5 content-filesystem/Vim-reader prelude after M4 finishes.

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
| 4 | `.trellis/tasks/archive/2026-08/08-12-m3-terminal-interface` — M3 Terminal interface | complete | The independently green shell-first home, inline document rendering, static recovery path, JavaScript-free canonical article, and targeted desktop review were approved, committed, and archived. |
| 5 | `.trellis/tasks/archive/2026-08/08-13-m4-experiment-pipeline` — M4 Experiment pipeline | complete | Implementation, independent full-scope review/fixes, durable specs, browser evidence, production-shaped container probes, and focused owner review are complete; finish-work archives the approved task in this session. |
| 6 | `.trellis/tasks/08-13-m5-content-filesystem-vim-reader` — M5 content-filesystem/Vim-reader prelude | planned | Final PRD/design/plan are owner-approved. It starts only after M4 commit/archive and precedes the full migration inventory. |
| 7 | M5 — full content migration | planned | Depends on M1–M4 and the approved content-filesystem prelude. |
| 8 | M6 — staging rollout | planned | Depends on M5 and its quality gates. |
| 9 | M7 — production rollout | planned | Depends on M6 acceptance. |

## Evidence

- Product scope and milestone order: `prd.md`
- Completed Trellis Plus initialization: `.trellis/tasks/archive/2026-08/08-12-trellis-plus-init/`
- Completed prerequisite: `.trellis/tasks/archive/2026-08/00-bootstrap-guidelines/` contains the checked frontend-spec bootstrap task.
- Work commits: `6e22a7b` (frontend guidelines) and `54f778d` (guided mainline establishment).
- Completed M1 task: `.trellis/tasks/archive/2026-08/08-12-astro-static-foundation/`.
- M1 work commits: `e9d49d9` (Astro static foundation) and `d81e550` (development contracts and task evidence).
- Completed M2 task: `.trellis/tasks/archive/2026-08/08-12-m2-x-core-semantic-interface/`.
- M2 work commits: `7084f7f` (X Core semantic presentation) and `c099952` (presentation contracts and task evidence).
- Completed M3 task: `.trellis/tasks/archive/2026-08/08-12-m3-terminal-interface/`.
- Mainline decision source: after completing M2, the owner approved M3 planning and implementation, chose to hide lab commands until M4, authorized one sibling-repository article, selected the audited Trellis article, and chose a whole-route Terminal presentation on 2026-08-12. On 2026-08-13, the owner redirected the enhanced home to a specialized shell-first interaction and approved the resulting production preview for commit.
- Superseded M3 baseline evidence: before owner review, X Core 11, semantic 3, Terminal 7, content 13, registry integration 5, static output 8, and Playwright 32 tests passed; all five package/application checks and builds passed. This evidence does not approve the shell-first revision.
- Revised M3 automated evidence: X Core 11, semantic 3, Terminal 8, content 13, registry integration 5, static output 9, focused Playwright 12 + 32, and full four-project Playwright 44 tests pass; all package/application checks and builds pass. Static output remains exactly five HTML, one semantic CSS, one home-only JS, and zero maps/unknown files.
- Revised M3 artifact evidence: home HTML is 72,195 bytes, with 57,637 bytes across exactly three inert build-rendered templates; client JS is 12,538 bytes. Only `/` references the script.
- M3 review evidence: six desktop/mobile captures cover prompt-only home, canonical Terminal article, and inline `cat`; direct owner review approved the final production preview. The preservation-first article edit ledger remains archived under `.trellis/tasks/archive/2026-08/08-12-m3-terminal-interface/research/`. NERV retains 19 pre-existing audit advisories outside M3 scope.
- Completed M4 task: `.trellis/tasks/archive/2026-08/08-13-m4-experiment-pipeline/`. Its repository evidence anchors the root PRD's manifest, `/lab/`, Terminal command, independent build, fresh assembly, NERV, container, and validation contracts. The owner approved the final implementation and focused Terminal refinement for commit/archive.
- M4 automated evidence: all seven package/tool checks pass; the final affected suites include Terminal 9/9, content 13, site/X Core 5, site static-output 12/12, main-site Playwright 54/54, NERV Playwright 8/8, and assembled-publication Playwright 4/4. Clean publication produces a deterministic 18-file release.
- M4 independent review fixed realpath escapes, partial target promotion, build-order/Docker command drift, incomplete unsafe-artifact scanning, canonical Terminal catalog drift, missing mounted-runtime tests, incomplete global-key protection for ARIA widgets, and residual component-level Terminal theme literals. The current Docker Compose image passes health, route/redirect, both font and license URLs, distinct 404, security/cache header, non-root/read-only confinement, exact 18-file inventory, and teardown probes.
- M4 post-review runtime correction replaces the stale NERV-only root `dev.sh` with a fresh assembled-publication server. The exact owner command now returns `200` at `/`, `/lab/`, and `/lab/nerv/`, retains loopback/exact-label isolation, and tears down cleanly.
- M4 owner-review refinement implements exact optional-`./` Terminal completion, causal prompt/document viewport settlement, safe printable typing-to-prompt with native/ARIA exclusions, root-selectable semantic Terminal theme tokens, and self-hosted unmodified JetBrains Mono v2.304 Regular/Medium under SIL OFL 1.1. Both font weights, the complete tagged license, provenance, hashes, and desktop/mobile review captures are published and checked.
- M4 durable contracts under `.trellis/spec/frontend/` now record manifest/catalog signatures, source-controlled build trust, safe tree/reference validation, coordinated rollback, Terminal/NERV boundaries, global keyboard ownership, semantic theme/font ownership, pinned font provenance, and required tests. Task evidence and refreshed review captures are under `.trellis/tasks/08-13-m4-experiment-pipeline/`.
- M4 known residual: NERV retains 19 pre-existing dependency advisories (2 low, 6 moderate, 11 high) outside the approved no-force-upgrade scope. Subjective visuals, real devices, and assistive technology remain human review residuals.
- Approved M5-prelude planning: `.trellis/tasks/08-13-m5-content-filesystem-vim-reader/` defines the configurable Markdown workspace, authored-symlink ingestion, guest-only access projection with future identity seams, extensible command/alias registry, `tree`, nested `cat`/`vim`, path-addressable routes/breadcrumbs, and bounded read-only Vim reader. It remains planning-only until M4 is archived.

## Next Decision

After M4 archive and Project Pulse confirm the dependency, start the already approved M5 content-filesystem/Vim-reader prelude. Do not fold the full migration inventory, staging, or production rollout into that task.
