# Project Mainline

## Initiative

- **Title:** Repository audit remediation
- **Objective:** Reconcile Firefly's authoritative documentation and incrementally reduce validation, comments-contract, X Core, adapter, and release-quality risks without changing the working static-publication architecture.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** 2026-08-29 — The P1 repository-audit remediation parent and its X Core/plugin-host and canonical-route child are complete and archived. The owner approved planning the adapter/package contract cleanup child as the next guided item. M5.1 is implemented and privately provisioned but remains disabled in tracked configuration, and public enablement remains a separate guided decision. M7 remains the historical staging rehearsal; M6 remains superseded.

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
| 6 | `.trellis/tasks/archive/2026-08/08-13-m5-content-filesystem-vim-reader` — M5 content-filesystem/Vim-reader prelude | complete | Owner-approved implementation, independent review, focused screenshots, commit, and archival are complete. |
| 7 | M5.1 — dynamic comments and identity service | production_provisioned_pending_enablement | The service, static consumer, publication boundary, private provisioning, release-bound route catalog, and Unicode canonical-route compatibility are implemented and verified. Tracked configuration remains disabled by default. SMTP delivery, controlled public browser validation, and public enablement remain separate owner-authorized gates; the main site must not become SSR or directly read the database. |
| 8 | `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging` — M7 reverse-tunnel staging rehearsal | complete | Owner-authorized Basic Auth rehearsal passed public/direct-origin, TLS, static, and browser checks; independent cleanup found no remote Nginx/auth/port or local runtime residue. This is the accepted staging verification for the current mainline. |
| 9 | `.trellis/tasks/archive/2026-08/08-20-production-rollout-record` — Production rollout | complete | The approved v1.0.0 release passed guarded build/staging/integrity/promotion checks and public route, error, security-header, and static-asset cache verification. The prior immutable release remains the rollback target; detailed operational values are local-only. |
| 10 | `.trellis/tasks/archive/2026-08/08-27-repository-audit-remediation/` — P1 repository audit remediation | complete | The Unicode compatibility prerequisite, documentation-convergence, deterministic-validation, comments-contract, and X Core/route children are archived. The remaining adapter and release/observability work stays separately verifiable. |
| 11 | `.trellis/tasks/08-29-adapter-package-contract-cleanup/` — Adapter/package contract cleanup | active | Owner approved the plan and implementation is in progress. The child remains limited to production adapter package declarations plus the Semantic non-mutating transform contract; focused gates are green and the full fixture gate is blocked only at the existing publication epoch guard. |

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
- M4 post-review runtime correction replaces the stale NERV-only root `dev.sh` with a fresh assembled-publication server. The exact owner command now returns `200` at `/`, `/lab/`, and `/lab/nerv/`, retains exact-label isolation, and tears down cleanly. Its default host binding is now `0.0.0.0` for LAN review; `SAM_BIND_HOST=127.0.0.1` restores loopback-only access.
- M4 owner-review refinement implements exact optional-`./` Terminal completion, causal prompt/document viewport settlement, safe printable typing-to-prompt with native/ARIA exclusions, root-selectable semantic Terminal theme tokens, and self-hosted unmodified JetBrains Mono v2.304 Regular/Medium under SIL OFL 1.1. Both font weights, the complete tagged license, provenance, hashes, and desktop/mobile review captures are published and checked.
- M4 durable contracts under `.trellis/spec/frontend/` now record manifest/catalog signatures, source-controlled build trust, safe tree/reference validation, coordinated rollback, Terminal/NERV boundaries, global keyboard ownership, semantic theme/font ownership, pinned font provenance, and required tests. Task evidence and refreshed review captures are under `.trellis/tasks/08-13-m4-experiment-pipeline/`.
- M4 known residual: NERV retains 19 pre-existing dependency advisories (2 low, 6 moderate, 11 high) outside the approved no-force-upgrade scope. Subjective visuals, real devices, and assistive technology remain human review residuals.
- M5-prelude implementation: `.trellis/tasks/08-13-m5-content-filesystem-vim-reader/` now provides the configurable Markdown workspace, exact read-only authored-symlink transport, race-safe transactional materialization, guest-only access projection with future identity seams, extensible command/alias registry, `tree`, nested `cat`/`vim`, canonical directory/document routes and breadcrumbs, and a bounded read-only Vim reader.
- M5 independent review fixed incomplete symlink-chain/broad-mount defenses, scan-to-copy replacement races, Unicode/path drift, active-registry help coupling, reader ID/ARIA/Range ownership gaps, and runtime inventory proof. No confirmed finding remains open.
- M5 automated evidence: seven package/application checks pass; 58 non-browser tests, main-site Playwright 68/68, publication Playwright 4/4, and sixteen desktop/mobile review captures pass. The external chained-symlink workspace E2E proves exact read-only mounts, ordinary-file staging, guest/private isolation, and absence of host paths. The runtime-only non-root/read-only Nginx image passes exact 23-file manifest/release/image equality, nested route/redirect, distinct 404, security/cache, and teardown probes.
- M5 owner-review follow-up adds exact prompt `Ctrl+C` cancellation, record-start help settlement, safe ambiguous cat/vim Tab ownership without browser-focus loss, prefixed completion candidates, and copyable cwd-relative post versus virtual-absolute page operands. Independent review found no remaining defect after correcting help/error wording and expanding history/modifier/tree regressions; focused Terminal Playwright is 42/42.
- M5 second owner-review follow-up makes syntactically safe zero-result cat/vim completion an exhaustive Terminal-owned `no-match` state (`No matches.` without focus loss), while unsafe/control/non-NFC/modifier/IME cases remain native. It also locks permalink grammar to `guest@firefly:~/blog $ / posts / characters / nahida.md`, with linked root/parents and an underlined non-link current filename. Independent review fixed the control-character boundary and found no remaining issue; focused breadcrumb is 2/2 and the full site remains 68/68.
- M5 final owner refinement replaces collapsible breadcrumb whitespace with six explicit `1ch` gap boxes around real slash tokens. Independent review changed browser coverage to measure the gap boxes directly across valid wrapping; site check/build/static, focused breadcrumb 2/2, and full site 68/68 remain green. The owner approved commit after this refinement.
- M5 durable contract: `.trellis/spec/frontend/content-workspace-contract.md` records workspace/link/materializer/access/path/registry/reader signatures, validation matrix, cases, tests, and wrong/correct patterns; adjacent frontend specs were reconciled from the flat M4 route/index assumptions.
- M5 human residuals: subjective visuals, real devices, assistive technology, and private deployment environments. Linked attachments, staging, and production remain later milestones.
- M5-prelude completion commits: `58ab2d9` (implementation/tests), `4433b6a` (contracts/evidence), `a837107` (task archive), and `ac152c2` (journal). The content workspace and reader remain the approved Markdown authoring boundary.
- M5.1 was initially deferred, then re-authorized by the owner on 2026-08-20. The approved parent and serial implementation children are archived; the static-only boundary remains preserved and tracked comments configuration remains disabled.
- M5.1 planning and implementation artifacts are archived under `.trellis/tasks/archive/2026-08/08-14-m51-dynamic-comments-identity/`, `.trellis/tasks/archive/2026-08/08-20-m51-comments-service-core/`, `.trellis/tasks/archive/2026-08/08-20-m51-static-comment-consumer/`, and `.trellis/tasks/archive/2026-08/08-20-m51-comments-publication-ops/`. The approved contracts define the self-built write/moderation service, static export, post-only scope, plain-text body, privacy controls, and rollback gates.
- M5.1 implementation evidence: the service child passes 15/15 tests plus check/build, including consent, encrypted private email, hashed tokens, verification/moderation/replies, retention, SQLite, export, and backup/restore. The site child passes 35/35 content tests, 15/15 static-output tests in both disabled and enabled-fixture builds, Astro check, and full site Playwright 122/122. The publication/ops child passes assembler 7/7, assembled-publication Playwright 4/4, default publication build, `check:m51`, `test:m51`, shell syntax/ShellCheck/shfmt, and `package-runtime.sh` runtime probes. The tracked config remains `comments.enabled = false`; no deployment or credentials were used.
- M5.1 WIP convergence evidence (2026-08-21): `433c16d` integrates the
  plugin-owned comments public/private configuration boundary, Node `v22.23.1`
  service/site checks, root-context Docker/read-only config probes, raw SMTP
  and private-path regressions, and privacy scanning. `6f60776` aligns the
  canonical nested post route, accepts deeper authored post output by shape,
  passes assembler 7/7, content 36/36, publication Playwright 4/4, runtime
  probes, and stale-route scanning. The two child tasks are archived under
  `.trellis/tasks/archive/2026-08/08-21-*`; no external service or credential
  was provisioned.
- Production rollout evidence: P0's guarded release procedure completed on
  2026-08-20. The promoted publication matched its locally verified candidate;
  public representative site/content/experiment routes, distinct 404s,
  required security headers, and immutable static assets passed. Operational
  identifiers and rollback commands are deliberately excluded from Git.
- M5.1 production provisioning evidence (2026-08-24): the owner-authorized
  private comments runtime is healthy, non-root, read-only, and loopback-only;
  the host-specific edge proxies only `/v1/comments/*`, while `/v1` and
  unknown `/v1/*` paths return bounded JSON 404s with required security
  headers. Static and private data backups were checksum/integrity verified,
  and a restore to an absent candidate left active data untouched. One
  non-ASCII publication path was reported and excluded by the existing
  comments route contract; no public comments surface was enabled.
- M5.1 route-catalog reconciliation evidence (2026-08-27): the owner-approved
  private runtime catalog was regenerated from the exact immutable release and
  now has zero missing, stale, invalid, or duplicate routes. A stale
  production runtime identity was aligned with the existing owner-only
  secret/data boundary without changing secret content or modes; the comments
  service is healthy, loopback-only, and has no published Docker port. Public
  comments remain disabled, and operational identifiers remain local-only.
- M5.1 Unicode route compatibility evidence (2026-08-27):
  `.trellis/tasks/archive/2026-08/08-27-m51-unicode-route-compatibility/` and
  commit `bb7ee81` preserve readable Unicode public URLs while converting them
  at the comments boundary to canonical uppercase UTF-8 percent-encoded post
  routes. Focused unit, static-build, and browser checks passed locally without
  enabling comments, contacting deployment, or using credentials.
- Documentation convergence evidence (2026-08-28):
  `.trellis/tasks/archive/2026-08/08-28-repository-docs-convergence/` and
  commit `6edc880` reconcile the root PRD, mainline, and durable frontend
  specs. Historical inventory evidence, default Presentation behavior,
  repository-versus-deployment publication ownership, and audited remediation
  gaps are now explicitly separated.
- Deterministic validation evidence (2026-08-28):
  `.trellis/tasks/archive/2026-08/08-28-deterministic-validation-gate/` and
  the complete `./verify.sh` fixture run passed all package checks/tests/builds,
  site Playwright 130/130, NERV Playwright 8/8, and assembled-publication
  Playwright 4/4 with the tracked fixture, Playwright Noble image, and host IPC.
  The gate preserves package-local failure reports, keeps the owner-workspace
  build separate, and leaves comments disabled; the site build emitted only its
  existing CSS optimizer notices for `::highlight` selectors.
- Roadmap reconciliation evidence: the root `prd.md` now separates the
  original SQL input baseline (93 posts / 7 pages) from the authored
  workspace snapshot observed during M5 (95 posts / 8 pages), classifies
  M0–M5, M6, M7, M5.1, and P0 with their current states, and records the
  cwd-relative/`~/blog` Terminal path grammar. Mutable inventory is derived
  from the explicitly selected workspace rather than fixed as a durable count.
  The archived M6/M7 records and targeted journal entry contain only neutral
  staging references; operational execution details remain local.

## Next Decision

The approved P1 remediation parent is the current initiative. Its ordered
deliverables are documentation convergence, deterministic validation,
comments-contract extraction, X Core/canonical-route cleanup, adapter/package
cleanup, and release/observability hardening; the first four deliverables are
archived and adapter/package cleanup is now in progress. After each child is
checked and archived, Project Pulse must present the next dependency-ready
child for a fresh guided decision rather than assuming serial authorization.

Public comments enablement is intentionally outside that remediation sequence.
M5.1 implementation, private provisioning, route-catalog reconciliation, and
Unicode route compatibility have passed, while tracked configuration remains
disabled. SMTP inputs, controlled public browser gates, and public enablement
may proceed only through a separate owner-approved task. Historic counters
remain private unless another task defines their schema and presentation.
