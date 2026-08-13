# Project Mainline

## Initiative

- **Title:** f1refly MVP
- **Objective:** Deliver the Markdown-first static blog described in `prd.md`, with semantic and terminal presentations, isolated experiments, migration, staging, and production rollout.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-13 — M4 was approved, committed, and archived; the separately approved M5 content-filesystem/Vim-reader prelude is implemented and independently checked, with final owner review pending before commit/archive.

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
| 6 | `.trellis/tasks/08-13-m5-content-filesystem-vim-reader` — M5 content-filesystem/Vim-reader prelude | submit-ready | Owner-approved implementation is complete; independent review/fixes and all automated gates pass. Awaiting focused human screenshot review and explicit commit/archive approval. |
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
- M5-prelude implementation: `.trellis/tasks/08-13-m5-content-filesystem-vim-reader/` now provides the configurable Markdown workspace, exact read-only authored-symlink transport, race-safe transactional materialization, guest-only access projection with future identity seams, extensible command/alias registry, `tree`, nested `cat`/`vim`, canonical directory/document routes and breadcrumbs, and a bounded read-only Vim reader.
- M5 independent review fixed incomplete symlink-chain/broad-mount defenses, scan-to-copy replacement races, Unicode/path drift, active-registry help coupling, reader ID/ARIA/Range ownership gaps, and runtime inventory proof. No confirmed finding remains open.
- M5 automated evidence: seven package/application checks pass; 58 non-browser tests, main-site Playwright 68/68, publication Playwright 4/4, and sixteen desktop/mobile review captures pass. The external chained-symlink workspace E2E proves exact read-only mounts, ordinary-file staging, guest/private isolation, and absence of host paths. The runtime-only non-root/read-only Nginx image passes exact 23-file manifest/release/image equality, nested route/redirect, distinct 404, security/cache, and teardown probes.
- M5 owner-review follow-up adds exact prompt `Ctrl+C` cancellation, record-start help settlement, safe ambiguous cat/vim Tab ownership without browser-focus loss, prefixed completion candidates, and copyable cwd-relative post versus virtual-absolute page operands. Independent review found no remaining defect after correcting help/error wording and expanding history/modifier/tree regressions; focused Terminal Playwright is 42/42.
- M5 second owner-review follow-up makes syntactically safe zero-result cat/vim completion an exhaustive Terminal-owned `no-match` state (`No matches.` without focus loss), while unsafe/control/non-NFC/modifier/IME cases remain native. It also locks permalink grammar to `guest@f1refly:~/blog $ / posts / characters / nahida.md`, with linked root/parents and an underlined non-link current filename. Independent review fixed the control-character boundary and found no remaining issue; focused breadcrumb is 2/2 and the full site remains 68/68.
- M5 final owner refinement replaces collapsible breadcrumb whitespace with six explicit `1ch` gap boxes around real slash tokens. Independent review changed browser coverage to measure the gap boxes directly across valid wrapping; site check/build/static, focused breadcrumb 2/2, and full site 68/68 remain green. The owner approved commit after this refinement.
- M5 durable contract: `.trellis/spec/frontend/content-workspace-contract.md` records workspace/link/materializer/access/path/registry/reader signatures, validation matrix, cases, tests, and wrong/correct patterns; adjacent frontend specs were reconciled from the flat M4 route/index assumptions.
- M5 human residuals: subjective visuals, real devices, assistive technology, and private deployment environments. Linked attachments, full migration, staging, and production remain later milestones.

## Next Decision

Review the M5 desktop/mobile screenshots and checked behavior. If approved, commit and archive this task, run Project Pulse, and decide whether to begin the separate full content-migration inventory. Do not fold staging or production rollout into the prelude.
