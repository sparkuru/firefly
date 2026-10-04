# Wire memo publication and runtime

## Goal

Complete the new-submission memo feature with an opt-in private runtime and
verified static publication. Visitors can submit and verify a memo; the owner
can moderate/export it; only the exact approved projection reaches the next
static release. Invalid input or an older deletion epoch preserves the prior
release instead of leaking private state or resurrecting removed records.

## Accepted Dependencies and Confirmed Context

- Contract `c9885e6`, service `bcbca34`, and site `f5bc47c` are accepted and
  archived. The owner approved implementation on 2026-10-05; this final child is
  in progress and parent acceptance requires their combined evidence.
- At the planning baseline, the site had strict export loading and a native `/memos/` form, but
  no emitted export identity or memo IDs for publication binding
  (`apps/site/src/plugins/memos/MemoStream.astro:6`).
- At that baseline, assembly staged/preserved the artifact/release pair and owned comments
  metadata (`tooling/assemble-publication/src/index.ts:563`). Memo metadata and
  a deletion high-water mark across disabled releases are absent.
- Root comments Compose shares the web namespace without a private host port
  (`compose.yml:35`); Nginx has comments and unknown-v1 handling
  (`nginx.conf:69`, `nginx.conf:83`). Memo defaults to a distinct private port.
- Baseline memo submissions used the socket address for rates
  (`services/memos/src/http.ts:73`). Mail delivery is one-shot
  (`services/memos/src/operations.ts:19`); server scheduling covers maintenance
  only (`services/memos/src/server.ts:8`). Runtime integration owns both gaps.
- Parent decisions already exclude historical Typecho imports, accounts, SSR,
  public runtime listing, production deployment and an owner web console.

## Requirements

- **R1 — Bind publication to actual static data.** Activation follows the site
  config. When enabled, independently decode the contained raw export, require
  the memo route and compare its ordered public text/IDs/timestamps and build
  identity to that export before promotion. Reject missing, malformed, private,
  swapped or stale inputs and mismatched/unsafe output. Persist exact memo
  schema/revision/time/digest/epoch metadata. An unchecked metadata argument
  must not bypass this gate.
- **R2 — Preserve releases and deletion history.** Reject candidate epochs
  below the previously promoted high-water mark. Disabling removes the memo
  surface and needs no memo config/export/service, while retaining the previous
  mark; re-enabling an older export fails. Legacy manifests without memo state
  are compatible; malformed/unsafe present state fails closed. All preflight or
  promotion failures preserve the prior `artifacts/` and `dist/` pair.
- **R3 — Operate the existing independent service.** Add opt-in root `memos`
  and plugin-local Compose wiring with persistent owner-only private state,
  read-only config/secrets, nonroot mount-compatible identity,
  health/readiness, and no memo/worker host port. Schedule the existing encrypted
  mail drain with bounded nonoverlapping work and clean shutdown. Keep comments
  and the default static runtime compatible.
- **R4 — Establish the proxy rate boundary.** Route only `/v1/memos/` to the
  memo loopback listener with no-store/security response behavior and fail-closed
  absence/unknown-route handling. Explicit loopback proxy trust accepts only a
  single validated address overwritten by the proxy; default direct service
  mode ignores forwarding. Forged forwarded chains cannot choose rate identity.
  Distinct clients retain distinct persistent rate quotas. Owner routes still
  require the existing Bearer credential. Proxy/service logs contain no raw
  verification token, request body, private email or Authorization value.
- **R5 — Prove the combined privacy/static boundary.** With synthetic local
  inputs, demonstrate submit, scheduled delivery, verification, moderation,
  export, site build, publication, removal and stale rollback refusal. Test an
  older restored database/export against the retained release epoch. Static
  artifacts contain no private fixture identity/token/state/path/history; the
  approved plain-text stream remains usable without JavaScript and absent from
  post/page/search/Lab projections. Keep existing credential/path scanners.
- **R6 — Make operation reproducible.** Wire memo install/check/test/build and
  focused integration checks into maintained root commands; document contained
  export staging, enable/disable, worker/proxy/identity setup, backup/restore and
  rollback. Deployment, real SMTP and edge TLS/client-IP validation remain
  explicitly operator-gated and unclaimed by local fixtures.

## Ownership and Out of Scope

Own assembler/publication metadata, root verification/runtime packaging,
Compose/Nginx templates, operator docs and cross-layer tests. Allow only minimal
site build-evidence attributes and service trusted-address/worker plumbing
needed for R1/R3/R4. No new visitor UX, domain rules, database schema, pure wire
format or moderation transitions; no sharing comments state.

No production host provisioning, credentials, DNS/TLS changes, real mail,
automatic deployment, historical data import, public runtime listing, SSR,
browser moderation console, data reset/key rotation, or concurrent publisher
protocol is included. Publication remains a single-writer local build boundary;
deleting its durable history is not a supported epoch reset.

## Acceptance Criteria

- [x] **AC1 (R1):** Valid/empty enabled exports produce exact memo metadata and
  matching rendered records; swapped input, private/invalid bytes, changed text,
  IDs/order, missing route/identity and unsafe DOM are rejected before promotion.
- [x] **AC2 (R2):** Epoch regression and malformed/symlink/special prior state
  preserve both prior trees. Enabled → disabled → enabled retains the high-water
  mark; disabled with unusable memo inputs and a legacy memo-free release works.
  Injected pair-promotion failure restores both trees.
- [x] **AC3 (R3):** Default/memo/comments/combined root Compose and plugin-local
  template validate; disposable runtime proves nonroot/read-only mounts, no
  private host port, readiness and state/rate/outbox persistence. Worker cycles
  deliver through the existing operation without overlap or private diagnostics.
- [x] **AC4 (R4):** Actual local proxy and service tests prove native POST and
  readable verification response, correct no-store/security headers, absent
  service failure, unknown-v1 rejection, owner auth, spoof rejection and distinct
  client rates. Direct mode continues ignoring untrusted forwarding.
- [x] **AC5 (R5):** A synthetic no-JavaScript lifecycle reaches only an
  owner-approved static record; removal advances epoch and old restored/exported
  state cannot republish it. Private sentinels remain absent from export/release;
  comments/navigation/static projection regressions and parent criteria pass.
- [x] **AC6 (R6):** Maintained root gates include memos and pass through approved
  wrappers. Runtime packaging validates the new metadata and inventory without
  private inputs in the web image. Operator instructions contain placeholders
  and identify the unperformed deployment/SMTP/TLS gates.

## Evidence and Deferred Validation

Planning evidence is in `research/publication-findings.md` and
`research/runtime-findings.md`. Local integration uses private disposable
fixtures and injected delivery or a local certificate-validated TLS mail sink;
it neither sends external messages nor validates real operator infrastructure.
