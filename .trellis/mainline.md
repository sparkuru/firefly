# Project Mainline

## Initiative

- **Title:** Repository audit remediation
- **Objective:** Reconcile Firefly's authoritative documentation and incrementally reduce validation, comments-contract, X Core, adapter, and release-quality risks without changing the working static-publication architecture.
- **Mode:** guided
- **Serial authorization:** none
- **Owner decision:** The P1 repository-audit remediation parent and all six ordered children were complete and archived on 2026-08-30. The separately authorized M5.1 public enablement task was completed and archived on 2026-09-05: production owner-local activation, static promotion, SMTP delivery, and controlled public submission/verification passed. Tracked example configuration remains disabled by default. Deployment crash recovery remains operator-owned. M7 remains the historical staging rehearsal; M6 remains superseded.

## Continuation Policy

- The main session owns phase changes, task selection, commit plans, archival, and this control record.
- After each task is archived, run Project Pulse and present the next ready item before continuing.
- Guided mode requires a fresh user decision before creating or starting the next product task.

## Authorized Repository Maintenance

- Owner decision (2026-10-05): consolidate the four root shell entrypoints into
  `preview.sh`, then reapply Trellis Plus; explicitly do not create a task.
- Approved scope: unified developer CLI and real callers, literal root dotenv
  configuration, background preview/readiness/status/precise stop, preserved
  renderer/fixture validation/runtime packaging, and project-owned durable
  workflow policies. `sam` remains the Docker command boundary.
- Product pages, wire/data contracts, owner deployments, task states, prior
  archives and Git history are outside this maintenance. The owner separately
  approved the narrow root/Memo README command migration in this session.
- Acceptance: shell/static and focused command tests; actual local lifecycle
  and port cleanup; preserved complete fixture gate and runtime packaging.
  Record actual validation separately from source implementation. This owner
  choice does not authorize a subsequent product task or automatic commit.
- The owner subsequently explicitly authorized committing this completed
  maintenance. Task creation and archival remain outside this session.
- Verified (2026-10-05): Bash syntax/ShellCheck/shfmt and diff checks;
  23 CLI behavior fixtures and 36 combined diagram/CLI tests; the complete
  `./preview.sh verify` fixture gate, including 174 Playwright passes and 139
  applicability skips, plus Memo proxy/persistence/TLS/native desktop/mobile
  POST/publication/removal/restore/privacy and verified disposable cleanup.
  The final gate exited zero and both script/test source hashes stayed fixed.
- Real lifecycle verified after fixing Docker auto-removal timing: invocation
  from another directory, same-container repeated start, status/four routes,
  conflicting configuration rejection, immediate stop/down and closed ports;
  Astro hot reload with distinct host/container ports and owned lock cleanup;
  actual IPv6 loopback mapping and bracket-normalized repeated start. No owned
  preview containers remain. Runtime packaging assertions also passed with an
  isolated image tag, then its test container/tag were removed.
- Shared policy is installed under `spec/trellis-plus/`. Future task loading,
  actual Trellis update, incremental environment synchronization, UI/UUPM task
  execution and attributed archival remain unverified. Experimental media
  notice provenance remains `license-notice-needed` in `third_party/index.md`.

## Ordered Work

The owner approved the complete Memo document/timeline plan on 2026-10-07.
Archived task:
`.trellis/tasks/archive/2026-10/10-07-memo-presentation-meta-terminal/`.
Its 269-entry unified document family uses coordinated builds, a distinct
Memo presentation at `/pages/memos/`, responsive occupied-month scrubbing,
individual detail reading and ordinary draft/access visibility. This explicitly
supersedes independent Memo publication for new releases while retaining legacy
recovery/access evidence. Implementation and local acceptance passed: 269 actual
feed/details, 211 exact assets, actual desktop/mobile/no-JS/loaded-media reading,
398 Node and 184 browser passes (146 applicability skips), retained runtime
fixtures and isolated actual-source packaging. The final repeat's original
process exit was lost to daemon restart; all stage logs and 95 source hashes
survived, and both host fixtures were repeated with zero exit. All 491 original
input snapshots and 637 workspace identities remain exact. The owner accepted
the visible result and approved archival on 2026-10-08. Work commit `8a21ab4`
contains the coherent implementation, tests, specs and accepted task evidence.
The supported archive route completed; the separate archive/journal commits
follow the reviewed batch; archive commit `e29127c` records the supported move
and its required Codex attribution. No production deployment or next product task is
authorized.

The owner then explicitly chose the original 180 historical short entries as
the active Memo corpus, replacing the initial 269-entry imported baseline.
After archival this bounded content-only change completed: all 180 original
bodies/dates and retained source identities/modes/mtimes remain exact; the 89
notes and 211 attachments moved to an owner-only, same-filesystem private sibling
backup with all 300 original file identities preserved. The operation lock is
absent, and originals/recovery histories/posts/pages remain unchanged. The ordinary
coordinated build passed all 18 static checks and both Experiment builds. An
independent audit found exactly 180 feed/details over 32 occupied UTC+8 months,
no withdrawn identity anywhere in the release/legacy mapping and no owned Memo
asset or private backup leakage. Actual desktop/mobile interactive/no-JS reading,
pointer/keyboard/natural-scroll sync, month spacing, detail/Back/return and source
body comparisons passed in all four contexts. The local review preview is
refreshed. This is owner-authorized content maintenance, without a new product
task; historical 269-entry task evidence remains an accurate archived baseline.

The owner approved unified plugin public-access switches on 2026-10-06. The
completed `plugin-public-access` task makes comments and Memo false close
their entire public namespaces with 404 while retaining private data/history.
The reviewed current deployment keeps both owner flags false. Positive/mixed
coverage uses isolated fixtures; provisioning the absent comments runtime is
outside this task. Completion and live acceptance evidence follow verification.
Local full verification, runtime packaging and independent reviews pass. The
first host installation restored its baseline after verified origin checks
rejected an expired source certificate. The owner separately authorized renewal;
the existing client renewed it and strict origin TLS passed. The reviewed
both-off publication is now deployed, with canonical origin/edge 404s, headers,
redirects and desktop/mobile reading verified. Memo source/remote bytes,
pointer/receipt/history and retained plugin modes match their exact baseline;
both owner flags remain unchanged. The private sync also corrected an observed
target Zsh special-variable conflict, with 33 isolated flows plus real retry
passing. Work commit `c04b09f` contains the reviewed implementation, specs and
safe evidence. The task is archived at
`.trellis/tasks/archive/2026-10/10-06-plugin-public-access/`; its separate
archive and session journal commits follow the approved work commit. No Git
push or another product task is authorized.

| Order | Work item | State | Dependency / readiness |
| --- | --- | --- | --- |
| 0 | M0 — architecture baseline | complete | The repository layout, NERV experiment, Trellis workflow, Docker wrapper, and validation path are established. This is a structural baseline, not an assertion that product features are complete. |
| 1 | `.trellis/tasks/archive/2026-08/00-bootstrap-guidelines` | complete | The frontend guidelines are populated, checked, and committed; finish-work archived the task. |
| 2 | `.trellis/tasks/archive/2026-08/08-12-astro-static-foundation` — M1 Astro static foundation | complete | The Astro 7 static site, content contract, four-route surface, browser evidence, and durable specs are committed and archived. |
| 3 | `.trellis/tasks/archive/2026-08/08-12-m2-x-core-semantic-interface` — M2 X Core semantic interface | complete | The independently locked X Core and semantic packages, Astro metadata bridge, restrained semantic UI, adversarial contract checks, and browser evidence are committed and archived. |
| 4 | `.trellis/tasks/archive/2026-08/08-12-m3-terminal-interface` — M3 Terminal interface | complete | The independently green shell-first home, inline document rendering, static recovery path, JavaScript-free canonical article, and targeted desktop review were approved, committed, and archived. |
| 5 | `.trellis/tasks/archive/2026-08/08-13-m4-experiment-pipeline` — M4 Experiment pipeline | complete | Implementation, independent full-scope review/fixes, durable specs, browser evidence, production-shaped container probes, and focused owner review are complete; finish-work archives the approved task in this session. |
| 6 | `.trellis/tasks/archive/2026-08/08-13-m5-content-filesystem-vim-reader` — M5 content-filesystem/Vim-reader prelude | complete | Owner-approved implementation, independent review, focused screenshots, commit, and archival are complete. |
| 7 | M5.1 — dynamic comments and identity service | complete | The separately authorized public enablement task completed on 2026-09-05. Production owner-local activation, static promotion, SMTP delivery, and controlled public submission/verification passed; test records and queue were cleaned. Tracked example configuration remains disabled by default; the main site stays static and does not read the database. |
| 8 | `.trellis/tasks/archive/2026-08/08-15-m7-reverse-tunnel-staging` — M7 reverse-tunnel staging rehearsal | complete | Owner-authorized Basic Auth rehearsal passed public/direct-origin, TLS, static, and browser checks; independent cleanup found no remote Nginx/auth/port or local runtime residue. This is the accepted staging verification for the current mainline. |
| 9 | `.trellis/tasks/archive/2026-08/08-20-production-rollout-record` — Production rollout | complete | The approved v1.0.0 release passed guarded build/staging/integrity/promotion checks and public route, error, security-header, and static-asset cache verification. The prior immutable release remains the rollback target; detailed operational values are local-only. |
| 10 | `.trellis/tasks/archive/2026-08/08-27-repository-audit-remediation/` — P1 repository audit remediation | complete | The Unicode compatibility prerequisite, documentation-convergence, deterministic-validation, comments-contract, X Core/route, adapter, and release/observability children are archived. |
| 11 | `.trellis/tasks/archive/2026-08/08-29-adapter-package-contract-cleanup/` — Adapter/package contract cleanup | complete | The approved child moved X Core to production dependencies in both presentation packages, made the Semantic transform non-mutating with source-identity regression coverage, and reconciled the durable X Core contract. Focused install/check/test/build gates are green; the full fixture gate reached the existing publication epoch rollback guard after all preceding stages passed. |
| 12 | `.trellis/tasks/archive/2026-08/08-30-release-observability-hardening/` — Release and observability hardening | complete | The owner-approved private comments observability scope is implemented and archived. Readiness is fail-closed, metrics and request evidence are bounded/privacy-safe, comments remain disabled, and deployment crash recovery is explicitly deferred; focused gates pass and the full fixture gate retains the existing publication epoch guard. |

## Evidence

- Public comments enablement completion (2026-09-05):
  `.trellis/tasks/archive/2026-09/08-30-public-comments-enablement/evidence.md`
  and commit `e28ad4f` supersede the pending-enablement status in the earlier
  evidence below. The exact 93/93 release/catalog pair, enabled empty epoch-0
  publication, static release and blog mirror passed verification. Controlled
  public submission, mail delivery, verification, test-record deletion, queue
  cleanup, and runtime-health checks passed. Tracked examples remain disabled;
  production activation is owner-local. Credential/key rotation remains an
  owner follow-up. The prior database is retained for owner-led recovery and
  is not a verified backup; it was not imported into the new empty store.
- Product and architecture boundaries: `.trellis/spec/frontend/architecture-contract.md`.
  Milestone order and historical completion state are recorded in this mainline
  and the archived task evidence below.
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
- Completed M4 task: `.trellis/tasks/archive/2026-08/08-13-m4-experiment-pipeline/`. Its repository evidence anchors the manifest, `/lab/`, Terminal command, independent build, fresh assembly, NERV, container, and validation contracts now indexed by `.trellis/spec/frontend/architecture-contract.md`. The owner approved the final implementation and focused Terminal refinement for commit/archive.
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
  commit `6edc880` reconciled the former root PRD, mainline, and durable frontend
  specs. Historical inventory evidence, default Presentation behavior,
  repository-versus-deployment publication ownership, and audited remediation
  gaps are now explicitly separated.
- Adapter/package contract cleanup evidence (2026-08-30):
  `.trellis/tasks/archive/2026-08/08-29-adapter-package-contract-cleanup/` and
  commit `c06c27f` move `@firefly/x-core` to production dependencies in both
  presentation packages and clone the Semantic HAST input before wrapping.
  Focused install/check/test/build gates pass, as do the package and site
  fixture stages of `./verify.sh`; publication assembly remains protected by
  the pre-existing comments tombstone/publication epoch rollback guard.
- Release/observability hardening evidence (2026-08-30):
  `.trellis/tasks/archive/2026-08/08-30-release-observability-hardening/` and
  commit `0c2f553` add private `/readyz`, in-memory bounded Prometheus metrics,
  privacy-safe request records, readiness regression coverage, and the durable
  repository/deployment recovery boundary. Comments check/test/build and
  assembler check/test/build pass; the full `./verify.sh` fixture gate reaches
  the existing `comments tombstone epoch 0 predates the published epoch 4;
  refusing rollback.` guard after all preceding stages pass, and publication
  state remains unchanged.
- Deterministic validation evidence (2026-08-28):
  `.trellis/tasks/archive/2026-08/08-28-deterministic-validation-gate/` and
  the complete `./verify.sh` fixture run passed all package checks/tests/builds,
  site Playwright 130/130, NERV Playwright 8/8, and assembled-publication
  Playwright 4/4 with the tracked fixture, Playwright Noble image, and host IPC.
  The gate preserves package-local failure reports, keeps the owner-workspace
  build separate, and leaves comments disabled; the site build emitted only its
  existing CSS optimizer notices for `::highlight` selectors.
- Roadmap reconciliation evidence: the former root PRD separated the original
  SQL input baseline (93 posts / 7 pages) from the authored workspace snapshot
  observed during M5 (95 posts / 8 pages), and classified M0–M5, M6, M7,
  M5.1, and P0. The durable architecture and cwd-relative/`~/blog` Terminal
  path grammar now live in `.trellis/spec/frontend/`; historical states remain
  in this mainline and archived tasks. Mutable inventory is derived from the
  explicitly selected workspace rather than fixed as a durable count.
  The archived M6/M7 records and targeted journal entry contain only neutral
  staging references; operational execution details remain local.

## Next Decision

The approved P1 remediation parent is a completed initiative. Its ordered
deliverables are documentation convergence, deterministic validation,
comments-contract extraction, X Core/canonical-route cleanup, adapter/package
cleanup, and release/observability hardening; all six deliverables are now
archived. No next product task is created automatically: guided mode requires
a fresh owner decision after Project Pulse.

Public comments enablement was completed through the separate owner-approved
task archived on 2026-09-05. Production owner-local activation is enabled;
tracked example configuration remains disabled by default. Credential/key
rotation, retained-database recovery, and deployment crash recovery remain
owner-operated follow-ups. Historic counters remain private unless another
task defines their schema and presentation.

The independent public memo initiative has completed implementation and joint
acceptance across all four deliverables. Contract `c9885e6`, service `bcbca34`
and site `f5bc47c` precede the final publication/runtime integration. Its durable
records belong under `.trellis/tasks/archive/2026-10/` in
`10-01-memo-publication-runtime/` and `09-28-public-memo-stream/`.

On 2026-10-05 the owner approved implementation and then confirmed the concrete
53-file work commit, separate final-child and parent archives, and scoped
session journal. The integrated result binds actual static Memo DOM to strict
public input, retains deletion history while disabled, and supplies opt-in
private Compose/Nginx/proxy trust, delivery scheduling and operator guidance.

Independent final verification passed: one complete maintained gate with
372 Node tests, 174 browser passes and 139 intentional skips, strict local
HTTPS/TLS lifecycle, minimal web packaging and default-user service image
checks. All six final-child and eight parent criteria pass together. These
local results do not certify production deployment, real SMTP or owner edge
topology. Historical Typecho import and new domain rules remain excluded.
No next product task is created or started automatically; the next product
direction requires a fresh owner decision.

## Owner Memo Static Publication

On 2026-10-06 the owner replaced interactive Memo production enablement with
local owner-only Markdown authoring and an independent static publisher. The
reviewed revised plan was explicitly approved. Implementation and actual
production acceptance now pass in
`.trellis/tasks/archive/2026-10/10-05-memo-production-enablement/`.
The owner-approved combined publisher/import work was committed as `82131db`;
this production-enablement task is complete and archived.
Visitor submission,
verification and mail are superseded; comments retain their own boundary.

The maintained full gate, focused final-source deltas, default/combined
packages, exact preview lifecycle and real host workflows passed. Actual SSH
publishing and HTTPS/no-JS desktop/mobile reading passed, including a narrow
Memo cache correction verified at both origin and CDN. Routine Memo publishing
preserved complete blog state; a subsequent ordinary blog build/deployment
preserved complete Memo history, ownership and pointers. Production starts
empty; nonempty authoring/media/deletion/rollback use isolated synthetic checks.
The owner-selected external source switch passed an independent local build,
then was superseded by an explicit repository/clone-oriented correction:
generic creation/default build uses repo-local originals; ignored private
tooling selects the external directory for reading/publication only. This
bounded follow-up passed independent review, 13 focused host regressions,
26 real-jq rejection cases and four real local builds. It leaves the actual
production acceptance/history and external originals intact; no remote promotion
occurred in the follow-up. Scoped Git/finish approval was subsequently granted
for the combined publisher and historical import batch.

The exact former private HTTP/worker pair is stopped cleanly. Private data,
keys and recovery material remain retained; comments and the source mirror
remain unchanged at the observed host baseline. Operational values remain
owner-local. At the close of this production-enablement scope, no historical
data import was authorized; the subsequent owner decision is recorded below.

## Historical Owner Notes Import Decision

On 2026-10-06 the owner explicitly confirmed authorship of the retained notes
and authorized preparing them as public-eligible Memo sources in the selected
external authoring directory. The owner approved implementation with UTC+8
source timestamps. The external source migration, browser checks and independent
review have passed. The owner-approved work was committed as `82131db`; task
`10-06-typecho-memos-migration` is complete and archived under
`.trellis/tasks/archive/2026-10/10-06-typecho-memos-migration/`.
No production publication has occurred for this historical corpus.

The retained 376-record memo ledger comes from HedgeDoc `Notes` bundled with
the Typecho SQL backup, rather than a Typecho memo table. Read-only comparison
verified the two ledger copies are identical and agree with current SQL content.
There are 89 nonempty notes and 287 genuinely empty notes. Revision inspection
found no meaningful content recoverable for the empty notes. The owner chose to
skip those 287 records and process only the 89 nonempty notes, including notes
with historically restricted permission labels. Local public eligibility is
authorized; remote publishing remains a separate action.

Exactly 89 `draft: false` Markdown files and 211 verified local images have been
installed using exclusive creation, with all 300 source/asset hashes checked.
The pure body limit is now 128 KiB, source reads are capped at 256 KiB, and
UTC+8 dates are converted to canonical UTC without changing accepted identity.
The actual external-source candidate validates all 89 records; originals remain
unchanged. Of 224 image uses, 221 render locally, one HTTP 404 remains an ordinary
link and two absent relative images retain their caption/original target as text.
Thirty-seven verified old-note links are rewritten; 40 unknown old-note targets
and one malformed relative target remain explicit text rather than fabricated
destinations. Browser validation caught and drove repair of bare/angle autolinks;
only five unchanged files created by this task needed guarded correction.

Final focused evidence: contract 11/11, publisher 16/16 with syntax/type checks,
publication 4/4, site integration 4/4 under the pinned rendering image, and the
maintained desktop/mobile browser matrix 6/6 passed. Real-corpus no-JS desktop
and mobile each verified all 89 records, 221 decoded images, 37 mapped anchors,
zero horizontal overflow and zero failed/external requests. Independent review
reconstructed all 343 conversion patches and verified unchanged code, both
original ledger hashes, UTC+8 mapping and all 300 source/asset files. Mechanical
acceptance is `human-not-needed`; no physical-device/remote acceptance is claimed.
Later publication needs a validator image supporting the enlarged body contract.

This decision supersedes historical-import exclusions only for this bounded
owner corpus. Retained private originals, identity data and historical task
snapshots remain unchanged. The archived task's PRD and research record the
completed local source migration. Local acceptance does not establish production
publication of this corpus.

## Owner Terminal Refinement

On 2026-10-08 the owner approved a main-site assessment excluding lab,
selected preservation of the minimal Terminal mental model, then explicitly
approved its final refinement plan. Current task:
`.trellis/tasks/10-08-main-site-design-review/`.

Implemented default prose measure in standalone and `cat` reading, controlled
outline/body rhythm, coarse-pointer native targets, an empty-command help hint,
readable state feedback, Memo month touch height and enlarged-text containment.
Fonts, palettes, commands, authored sources and independent experiment designs
retain their existing contracts.

Independent review, focused checks, complete maintained verification and static
runtime packaging passed. The final browser matrix has 203 passes and 151
intentional applicability skips; local preview remains ready and serves the
refined styles. Two agent visual rounds found no further material change
justified by complexity. Evidence and limits are recorded in the task's
`research/final-validation.md`.

Owner subjective visual acceptance and the proposed work/archive/journal Git
batch remain pending. Task stays `in_progress`; no commit, archive or production
deployment is authorized or claimed by these local checks.

### Owner visual-review revision

The owner reviewed the first candidate and explicitly requested restoration of
previous page-dependent prose width, a first-index-visit-only help hint and
Tab completion viewport settlement. These decisions supersede the first
candidate's narrow measure/repeated placeholder. Continued implementation is
authorized. The previous 203-pass gate is historical evidence. Revised focused checks and
independent full-scope review passed. The new complete gate passed 208 browser
checks with 166 intentional applicability skips and no retry/flaky result.
Normal-publication packaging and local preview readiness passed; eight changed
app/test/config source fingerprints stayed unchanged through final gates. The
preview was stopped at readiness inspection, then started using its existing
configuration without stopping/reconfiguring any container.
Current evidence: task `research/owner-revision-validation.md`. Owner visual
acceptance and Git/archive authorization remain pending.

On 2026-10-09 the owner accepted the revised preview and authorized its commit.
The owner also requested simpler inline `cat` article chrome; the accepted
snapshot is committed first and this task remains active for that follow-up.
Archival/session bookkeeping will follow its completion, keeping work commits
ahead of task/journal commits. No remote push or deployment is authorized.

### Owner-defined inline navigation and file metadata

Accepted prior work is committed as `1a1fc31`. The owner's follow-up replaces
stacked inline article chrome with centered Command/Collapse-or-Expand/Open/Share
actions, title/body and a virtual Markdown file footer. Post-only `license`
defaults to CC-BY-NC-4.0, original UTF-8 bytes are captured before staging
transforms, and Share copies canonical URLs independently of navigator Open.
Sources/configuration and X Core/runtime payloads remain unchanged.

Implementation and independent full-scope review passed. The reviewer
strengthened rollback/identity fixtures and 200%-text navigation clearance.
Current evidence is task `research/inline-chrome-validation.md`. Full gates
passed: 213 browser passes,166 intentional skips, no retry/flaky result; normal
package and existing preview readiness passed. Nineteen app/test/config source
fingerprints stayed unchanged through the gates. The owner explicitly authorized task commits and provided the
final layout, so the concrete follow-up/archive/journal batch reuses that
authorization after gates. No push or production deployment is included.

Completed work commits: 1a1fc31 (accepted Terminal refinement) and 1d26fed
(owner-defined inline navigation/file metadata). Full gate/package/preview
passed and source is committed. Task evidence moves through the supported
no-auto-commit archive to .trellis/tasks/archive/2026-10/10-08-main-site-design-review/;
final developer journal references both work commits. No further product work
is inferred from completion; remote push/deployment remain outside this scope.

### Terminal completion viewport stability

On 2026-10-09 the owner accepted the inline composition and reported page jumps
while using Tab candidates despite ample visible room. The owner confirmed the
independent lightweight task `10-09-terminal-completion-viewport-stability`.
This supersedes unconditional completion centering: fully visible prompt/panel
geometry stays stationary; page movement only recovers obscured content.
Selection-only Tab/Arrow retains list geometry/local scroll and settlement
space. Implementation is bounded to the site controller and its existing
focused browser regressions. Build/static checks passed, focused browsers passed
9/9, and independent broader Terminal checks passed 81 with 26 applicability
skips and no retries. The existing configured publication was rebuilt and the
ready local preview serves its exact rebuilt entry script; reviewed source
fingerprints are unchanged. Evidence is the task's `research/validation.md`.
Commit/archive/journal reuse the prior owner commit authorization for this
ongoing refinement after a human-optional review. No lab/content change, remote
push or production deployment is included.

Completion repair committed as `8617d83`; completed evidence is archived at
`.trellis/tasks/archive/2026-10/10-09-terminal-completion-viewport-stability/`.
The developer journal references this work commit only. No new product work is
inferred from this completion.

### Terminal article metadata and new-tab opening

On 2026-10-09 the owner explicitly requested task creation and continued
implementation for standalone Terminal article metadata and retained-session
document opening. The owner then selected date/bytes/license ordering for both
standalone and inline cat metadata; standalone adds Share at the end, while
inline keeps its virtual file path and existing Share action.
Active task: `10-09-terminal-document-metadata-open`. Successful Terminal open
will launch a new tab and leave only its command record and next prompt in the
original session; inline Open also uses a native new tab. Capability-aware
navigator destinations/exit policies, raw-byte provenance, actual post licenses,
canonical Share and native mobile browsing remain established boundaries.
Implementation and independent review passed: 18 static checks, isolated actual
license/canonical/nav-none coverage, 156 affected browser passes and 67
applicability skips with no retries. Desktop/mobile/200%-text captures were
reviewed; Share separator wrapping/spacing was polished. A new static-test
basename assumption was corrected using the physical document mapping and
actual date/license; both owner and tracked-fixture static gates passed without
app-source changes. The final configured publication build and ready existing
preview passed, serving exact rebuilt homepage/bundle/OpenWrt metadata. All
13 app/test fingerprints remained unchanged through rebuilding. Evidence is
task `research/validation.md`. Commit/archive/journal reuse prior authorization
after human-optional review. No lab redesign, authored content change, remote
push or production deployment is included.

Metadata/new-tab work committed as `0cc296e`. Completed task evidence is archived
at `.trellis/tasks/archive/2026-10/10-09-terminal-document-metadata-open/`; the
developer journal references that work commit only. No further product scope
is inferred from completion.
