# Superseded interactive production plan

The owner replaced this direction on 2026-10-06 with an owner-authored static
Memo publisher. The following artifacts preserve prior approval, requirements,
checks and operational provenance; they no longer authorize public interaction
or mail acceptance. Current planning is in the task root artifacts.


## Previous prd.md

# Memo Production Enablement and Acceptance

## Goal

Enable Memo in an owner-selected production environment and verify real
submission, email verification, private moderation, static publication and
removal. Only verified, owner-approved messages become publicly readable.

## Authorization and confirmed facts

- The owner authorized creation and planning, then explicitly approved the
  current plan for execution on 2026-10-05. The task was activated and local
  readiness plus operational checks began. The isolated private runtime and
  initial empty-state recovery checks have since passed. Sending mail, public
  edge exposure and release promotion have not been performed in this task.
- The owner selected reuse of the existing Firefly production host, HTTPS and
  SMTP on 2026-10-05. Memo must keep independent keys and private storage on
  that host; no separate environment is in scope.
- The owner confirmed on 2026-10-05 that the dedicated recipient and related
  VPS SMTP configuration used by the earlier M5 comments work already exist.
  The exact mailbox, host, paths and credentials remain owner-controlled and
  must not enter this task.
- The owner approved the synthetic public test text on 2026-10-05:
  `Memo production acceptance 2026-10-05 — temporary owner test; delete after
  verification.`
- During execution the owner identified the existing comments runtime as the
  private SMTP source, confirmed its unique account/sender mailbox as the
  controlled recipient, and chose owner confirmation of actual receipt.
  Subsequent outer HTTPS evidence identified a product-level logging blocker,
  described below; no verification traffic or test mail has been sent.
- All four Memo implementation children and combined acceptance are archived;
  local TLS/runtime tests do not certify production SMTP or edge behavior.
  Evidence: `.trellis/workspace/sam/journal-2.md` and the archived
  `09-28-public-memo-stream` parent under `.trellis/tasks/archive/2026-10/`.
- `plugins/memos/README.md` supports root Compose with a shared web network
  namespace and standalone same-host edge deployment. Neither layout exposes
  private Memo data to the web container.
- `services/memos/README.md` defines independent Memo keys, private storage,
  certificate-validated SMTP, worker delivery and absent-destination restore.
- Prior comments deployment evidence does not establish current host state or
  authorize Memo use of a host, mailbox or credentials.
- Wrapped publication retains deletion history; `./preview.sh package` packages
  the validated public tree. A fresh Docker build cannot establish the previous
  deployment's deletion floor.

## Requirements

- R1: Enable only owner-local production configuration; keep tracked defaults
  disabled, static reading and native submission intact, and preserve existing
  site/comments behavior.
- R2: Verify actual HTTPS, host/origin isolation and trusted client identity;
  keep private routes unexposed and verification tokens out of URI logs.
  Validate private mounts, numeric identity, persistence, HTTP readiness and
  independent worker health with no public private-service listener.
- R3: Reuse the owner-approved M5 recipient and VPS SMTP boundary for one
  controlled Memo submission using the approved synthetic text, then exercise
  real mailbox receipt, verification, approval, export and static publication.
  Distinguish SMTP acceptance from mailbox receipt. Delete the test message and
  republish; do not replay unrelated queued mail or test with visitor records.
- R4: Validate exact public export/DOM/candidate inventory and retain durable
  deletion history across enablement, removal, disabling and rollback. Prove
  rejection of stale export/restored-state publication in isolation, without
  replacing live content with an old candidate.
- R5: Retain prior release/configuration, validate a consistent private backup
  and restore to an absent private destination with matching keys separately
  retained. Separate static rollback from data recovery; never overwrite live
  data or lower deletion history. Record redacted results and exact-owned cleanup.

## Acceptance Criteria

- [ ] AC1 / R1: Production Memo is enabled; tracked defaults remain disabled;
      representative existing site/comments checks pass.
- [ ] AC2 / R2: Real edge, private runtime, persistence, readiness and worker
      checks pass without exposing private routes, state or tokens.
- [ ] AC3 / R3: An approved controlled submission is received, verified,
      approved and visible in the deployed static stream without JavaScript.
- [ ] AC4 / R4: Deleted test content disappears after publication and isolated
      stale export/restore publication is refused against retained history.
- [ ] AC5 / R5: Backup integrity and isolated restore pass; a documented safe
      release/config rollback preserves live data and deletion history.
- [ ] AC6 / R2,R3,R5: Private data stays out of public artifacts and retained
      evidence; exact-owned test artifacts are cleaned and limitations recorded.

## Proposed scope boundaries

Exclude historical Typecho import, accounts, SSR, public read APIs, schema
redesign, moderation web UI, unrelated comments migration and broad deployment
crash-recovery redesign. No DNS or certificate changes are assumed; the
existing Firefly host, HTTPS edge and SMTP service are reused.

## Artifact status

On 2026-10-06, the owner's outer-proxy traffic export established that request
paths are recorded. Current mail/HTTP code puts the verification credential in
that path (`services/memos/src/smtp.ts:16`, `services/memos/src/http.ts:78`).
The task returns to planning because this cannot satisfy R2 merely by disabling
source URI logs or checking query fields. The owner has no further log-search
action pending. A concrete proposed amendment is in
`research/verification-transport-amendment.md`: a token-free verification-page
link followed by pasting the existing code into a native HTTPS POST form. It
preserves JavaScript-free operation but adds one paste/submit step. That UX and
protocol change requires owner approval before product implementation.

The reviewed `prd.md`, `design.md`, `implement.md` and curated context manifests
are present. The owner's explicit implementation approval activated the task.
Execution returned to `planning` at the implementation plan's failed local
packaging gate. Actual-image diagnosis identified a restrictive-umask invocation
issue, with no product source patch needed. The same approved scope is resuming
with the corrected package environment. The later URI-token finding now stops
public rollout again; private runtime and initial recovery evidence are retained,
and production acceptance remains unclaimed.


## Previous design.md

# Memo production enablement design

## Design objective

The original operational design below is paused at the public edge gate after
the 2026-10-06 URI-token finding. The proposed material verification-transport
change is specified in `research/verification-transport-amendment.md` and awaits
owner UX/protocol approval. No product change is approved or implemented yet.

Enable the already-implemented Memo workflow on the existing Firefly
production host and prove the owner-visible lifecycle without weakening the
static/public boundary. The task is an operational integration task; it does
not redesign the Memo schema, visitor UX, public wire format, comments
service, edge certificate, or deployment crash-recovery model.

This remains one task rather than a parent with independent children. Runtime
enablement, real-mail acceptance, publication/deletion history and recovery
share one live host and one rollback boundary. Splitting them would allow an
unsafe partial production state to be archived as independently complete.

## Topology and data flow

```text
native browser
  -> existing HTTPS host/SNI server block
     -> /v1/memos/* only
        -> 127.0.0.1:8788 Memo HTTP service
           -> private Memo SQLite/data root
           -> encrypted outbox -> Memo worker -> existing SMTP -> M5 mailbox

owner private CLI -> loopback Memo admin/export endpoints
approved export + public-only site TOML
  -> verified owner-content site build
  -> wrapped assembler with retained publication history
  -> validated artifacts/dist pair
  -> immutable static release switch
```

The comments service remains on its existing route, port, data root and
credentials. The web/static container never receives Memo secrets, database
mounts, private exports or runtime configuration. The worker has its own
health signal; a healthy HTTP process cannot mask a stopped worker.

## Deployment shape

The owner-selected boundary is the existing Firefly host, HTTPS edge and SMTP
transport. A read-only baseline determines whether that host currently runs
the root Compose stack or the standalone same-host Memo template. Reuse the
existing comments deployment shape when possible:

- If the host's static service already owns the root network namespace, use
  the opt-in root `memos` profile. HTTP and worker share the web namespace,
  bind loopback `127.0.0.1:8788`, and publish no host port.
- If the host runs private services beside an owner-managed Nginx edge, use
  `plugins/memos/compose.yml` with explicit owner UID:GID and host networking.

Never start both shapes for the same data root. Do not make DNS, certificate,
firewall or unrelated comments changes. Install the Memo edge prefix only in
the matching owner-managed HTTPS server block and keep `/readyz`, worker
health, metrics and admin routes private.

## Configuration and identity

- Keep the tracked site example and repository defaults disabled. Enable Memo
  only in the owner-local site configuration used for the selected release.
- Keep the full Memo runtime TOML and `secrets.env` outside public release
  directories. Use a separate public-only TOML for the static site handoff.
- Use independent random Memo token/encryption/admin keys and an independent
  private Memo SQLite/data root. The existing M5 SMTP transport/mailbox may be
  reused, but comments keys, database and outbox are never reused.
- Match the numeric runtime UID:GID to the existing 0700 data and 0600 secret
  ownership. Fix ownership at the owner boundary; never broaden modes.
- Run the HTTP and worker services with read-only roots, dropped capabilities,
  no-new-privileges, bounded temporary storage and read-only config/secret
  mounts. Missing inputs must fail startup rather than be created.
- Set `MEMOS_TRUST_PROXY=loopback` only when the process is loopback-bound and
  the host proxy overwrites one literal `X-Real-IP` while clearing forwarded
  chains. Direct service access remains private and does not trust spoofed
  forwarding headers.

## Publication and history model

The service export is the only public Memo input. After owner approval, stage a
fresh public export and public-only TOML outside `artifacts/` and `dist/` when
preserving the current pair matters. Build the site, then run the wrapped
assembler so it validates the actual staged/final DOM, exact public fields,
form identity and the retained tombstone epoch. Package the validated pair with
the minimal web runtime; never solve a history failure by using a fresh Docker
build or deleting publication metadata.

For removal, delete the test record in the private service, export again and
republish. The new epoch must be at least the previous promoted epoch and the
test body must be absent from the public stream. Stale export and restored-DB
checks run against an isolated candidate and must fail before either live
target is replaced.

## Acceptance sequence

| Stage | Evidence required | Live-state rule |
| --- | --- | --- |
| Baseline | current release/config/data pointers, route exposure and owner backup readiness | read-only only |
| Private runtime | readiness, numeric identity, mount modes, persistence, worker health and no public port | no public Memo route yet |
| Edge | HTTPS Host/SNI, Origin, client identity, prefix-only proxy, unknown-route refusal and token-free logs | fail closed on any mismatch |
| Mail lifecycle | one synthetic submission, SMTP acceptance, actual mailbox receipt, single-use verification | do not drain existing outbox |
| Moderation/publication | private approval/export, no-JS public stream, exact DOM/export and static release | promote only after assembler/history gate |
| Removal | delete, fresh export, republish, public absence and epoch increase | do not lower history |
| Recovery | consistent backup, absent-destination restore, stale restored-state refusal and static/config rollback | never overwrite live data |
| Cleanup | exact test row/outbox/staging/candidate cleanup and redacted evidence | retain only owner-requested backups |

The approved submission uses the existing owner-approved M5 recipient and the
exact synthetic text recorded in `prd.md`. Its mailbox value, verification
token and any private form identity stay in the owner operational channel.

## Failure handling and rollback

Every stage is a gate. A failed or unavailable gate stops the rollout and is
reported as such; it is not converted to a pass by a local fixture result.
SMTP authentication/acceptance without mailbox receipt is not a successful
mail gate. A missing worker tick, exposed port, wrong Host/SNI, token-bearing
URI log or private field in public output is a stop condition.

Static rollback switches only the prior immutable release/configuration and
leaves Memo SQLite, backup keys and publication history untouched. Data
recovery restores to a new absent private destination and is reviewed before
any mount change. An older restored export/database cannot replace a newer
published deletion epoch. If history is malformed or missing, stop and use
the owner recovery procedure; never reset it to zero.

## Compatibility and residual risk

The disabled static site, existing comments behavior, ordinary posts/pages,
Experiments and JavaScript-free reading must remain unchanged. The task does
not import historical Typecho memos, add accounts/SSR/public read APIs, alter
the database schema or change DNS/TLS issuance. Production edge identity,
mailbox receipt, release switching, backup retention and crash recovery remain
owner-environment evidence and cannot be certified by repository fixtures.


## Previous implement.md

# Memo production enablement implementation plan

## Preconditions and non-negotiable boundaries

1. Keep the task in planning until this document, `design.md`, the converged
   `prd.md`, and both context manifests are reviewed. Only a later explicit
   approval of the final planning summary may run `task.py start`.
2. Use the owner-controlled operational channel for the SSH target, account,
   exact mailbox, credentials, remote paths and release identifiers. Do not
   copy them into source, task artifacts, logs, screenshots, manifests or
   commits.
3. Snapshot the current dirty paths before any work. The existing untracked
   task directory is the only expected worktree change; preserve unrelated
   user changes.
4. Treat every production stage as a stop-the-line gate. A local fixture,
   SMTP TLS/AUTH success, HTTP 200, or running container proves only its own
   scope.

## Current execution gate (2026-10-05)

**Superseded on 2026-10-06:** owner-provided outer-proxy HTTP analytics records
request paths, while the current service places verification credentials in
the path. Public routing and mail remain closed. Task status is `planning` for
the material amendment in `research/verification-transport-amendment.md`.
The owner need not search for additional logging switches. Before further
product/runtime rollout, review and approve the proposed token-free page link
plus native POST code-entry UX; only then reactivate and implement/check it,
rebuild the service image, and resume the original ordered production gates.
Keep the existing private keys, database, runtime and recovery inputs intact.

The owner approved the reviewed plan and the task was activated. Full local
verification and private image checks passed, but the runtime packager failed
at temporary-container port discovery after its successful image build. The
task returned to planning under step 1's stop rule. Actual-image diagnosis
then reproduced Nginx startup refusal: the verification wrapper's `umask 077`
made the copied public Nginx config root-owned 0600, unreadable by the image's
nonroot user. This is an execution-environment correction; no product source
patch or production write is required.

Re-run the approved package gate with process `umask 022`, precreating its log
as 0600 inside an owner-only temporary directory. Keep private operational
inputs/configuration at their original owner-only modes. Original requirements,
acceptance criteria and production boundaries are unchanged, so the recorded
execution approval continues to apply to this corrected invocation.

The owner corrected the operational directory to the existing comments runtime
on the recovered sync endpoint. Its current input inventory is being checked
without copying secret values into project records. Review any material
repair-plan amendment before reactivation. See `research/local-readiness.md`,
`research/execution-evidence.md` and `research/execution-review.md` for actual
results; passing local fixtures do not satisfy production acceptance.

## Ordered execution checklist

### 1. Local readiness and context

- Load the applicable Trellis specs from both manifests and validate the task
  context before implementation.
- Run the Memo-focused repository gates through the project wrappers with the
  tracked content root:

  ```sh
  FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run check:m51
  FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run test:m51
  FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run test:memos-publication
  FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run prepare:test:memos
  FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm run test:e2e:memos
  ./preview.sh verify
  ./preview.sh package
  ```

- Local tracked content is fixture evidence. Production publication uses the
  owner-configured content workspace only after its full Markdown manifest
  matches the production mirror. Preserve the current deployed route inventory
  before promotion; never replace it with fixture content.
- Validate host-side Compose syntax for the default, Memo, comments, combined
  and standalone shapes. Run the maintained image/runtime gates only with
  disposable exact-owned resources; confirm no owner data, port or container
  is touched.
- If a local contract/build gate fails, return to planning and update the
  artifacts; do not patch product code opportunistically during deployment.

### 2. Owner-authorized read-only baseline

- Verify the owner-approved SSH identity/host key through the existing
  operational input, then collect only redacted baseline facts: OS/runtime,
  current static release pointer, previous release availability, current
  comments/edge shape, free space, listeners, service health and current Memo
  input presence.
- Confirm the existing M5 recipient/SMTP configuration is available without
  printing its value and that the real comments outbox will not be attached to
  a Memo test.
- Check any actual outer HTTPS proxy's logging and trusted-address boundary.
  Source Nginx URI-log suppression alone does not certify an outer account's
  token handling. Keep verification traffic closed until that gate is resolved.
- Confirm the current static release, publication metadata, active comments
  data and existing backups are identifiable and can be retained. Do not
  create a candidate or switch a pointer in this step.

### 3. Prepare isolated owner-local Memo inputs

- Choose the existing host's current deployment shape: root `--profile memos`
  or standalone same-host Compose. Do not launch both.
- Create/verify the owner-only Memo data directory, full runtime TOML, secret
  file and public-only site TOML from the tracked examples. Keep data 0700,
  config/secrets/backup manifests 0600, regular and nonsymlinked, with the
  selected numeric UID:GID.
- Generate or retrieve distinct Memo token/encryption/admin keys through the
  owner secret boundary. Do not rotate or reuse comments keys. Retain matching
  keys separately from future Memo backups.
- Configure the existing approved SMTP transport and recipient boundary with
  certificate validation, explicit HTTPS origin/allowlist and private data
  paths. Keep runtime config/secrets outside the web build context.
- Build/load the Memo image from the reviewed commit and run a production-
  shaped no-send readiness/image check before attaching the live data root.

### 4. Start private services and validate confinement

- Start/reload only the Memo HTTP and worker services using the selected
  owner-local Compose shape. Keep the live static release serving while the
  private service is validated.
- Verify `/healthz` and `/readyz` from the private namespace, worker-specific
  tick health, graceful shutdown/restart, data persistence, numeric identity,
  read-only mounts, private SQLite ownership, no published Memo port and no
  secrets/database mounts in the web container.
- Verify the private admin CLI can list an empty/known state without exposing
  credentials in argv or output. Do not use the real comments admin route or
  outbox as a fixture.

### 5. Install and validate the host-scoped Memo edge

- Add only the placeholder-resolved `/v1/memos/` location to the existing
  matching HTTPS server block. Preserve current static/comments locations and
  unknown `/v1/` fail-closed behavior.
- Validate Nginx syntax and reload through the owner procedure. Probe the real
  HTTPS origin for Host/SNI selection, allowed/disallowed Origin, direct private
  port refusal, prefix-only routing, generic errors, no-store/security
  headers, authoritative client identity and unknown/private route refusal.
- Confirm Memo verification URLs do not enter proxy access/error logs and that
  service/worker diagnostics contain no body, recipient, token or authorization
  value. If an outer proxy supplies forwarded headers, prove the owner edge
  overwrites/clears them before the loopback trust policy.

### 6. Run the single controlled submission lifecycle

- Use the approved M5 dedicated recipient as the submitted address and the
  approved synthetic body from `prd.md`; use a clearly synthetic display name
  and no visitor data. Record only redacted IDs/statuses.
- Submit through the real HTTPS native form, then observe separately: accepted
  by SMTP, present in the approved mailbox, and opened/verified successfully.
  Never infer mailbox receipt from SMTP authentication or remote acceptance.
- Verify the single-use link, confirm the record is pending rather than public,
  approve it through the private authenticated CLI, export approved-only JSON,
  and inspect that only the four public fields are staged.
- Build the enabled static site with public-only TOML/export, run the wrapped
  assembler against retained history, package the minimal web release and
  perform the owner release switch only after every privacy/history check passes.
- Verify the deployed `/memos/` stream on desktop and narrow mobile with
  JavaScript disabled: the approved text is readable, the native form is
  present, no private fields/tokens appear, and existing site/comments routes
  still behave as before.

### 7. Delete and prove publication history

- Delete the synthetic record through the private Memo admin route. Obtain a
  fresh export and rebuild/republish; confirm the synthetic ID/body is absent
  from the deployed stream and the tombstone epoch increased.
- In an isolated candidate, attempt publication with the stale export and with
  a restored older database/export. Confirm the assembler refuses both before
  replacing either live target. Do not replace live content with the old
  candidate merely to demonstrate refusal.
- Disable/re-enable only in isolated release candidates when testing retained
  history. Never reset the history file, lower the epoch or use history-
  unaware tooling.

### 8. Backup, restore and rollback evidence

- Before/after live Memo acceptance, create a consistent private Memo snapshot
  using the service command. Verify checksum, SQLite integrity, schema,
  revision/epoch, queued encrypted mail and owner-only modes; retain matching
  keys separately under the owner backup policy.
- Restore into a previously absent private destination with matching keys and
  validate it without opening or overwriting the active data root. Remove the
  restore candidate only when the owner policy permits; otherwise leave it in
  the owner-controlled recovery location.
- Validate a static/config rollback rehearsal: retain the live Memo data root,
  restored keys, deletion history and service runtime while switching only the
  prior static/config target, then return to the accepted release. If an actual
  switch is unsafe or unavailable, record the exact gate as deferred rather
  than claiming AC5.
- Keep static rollback and private data recovery as separate operations. A
  restored older DB never authorizes an older public export.

### 9. Exact cleanup and evidence

- Remove the approved synthetic Memo record, its queued/delivered test state,
  staging export, temporary public TOML, isolated candidates and task-owned
  logs. Do not drain or delete unrelated existing notifications/data.
- Verify the deployed public stream, artifacts, release, container logs and
  retained task evidence contain no mailbox value, email identity, token,
  private body, absolute host path or raw remote output.
- Record a redacted result for each AC as `pass`, `fail`, `unavailable` or
  `deferred`, with the command purpose and residual risk. Preserve owner-only
  backup artifacts only under the explicit owner policy.
- Recheck `git status`, `git diff --check`, the task context validator and the
  full task-record privacy boundary. Do not stage unrelated files.

## Validation and review gates

| Gate | Required result before the next gate |
| --- | --- |
| Local repository | Memo contracts, service, site/publication, browser and runtime fixtures pass through the approved wrappers |
| Baseline | Existing release/data/edge state and rollback target are identified without mutation |
| Private runtime | HTTP/readiness/worker/persistence/confinement/no-port checks pass |
| Edge | Real HTTPS/origin/Host/client identity and token-free logging pass |
| Mail | SMTP acceptance and actual mailbox receipt are both observed |
| Publication | Exact export/DOM/history/privacy checks pass before static switch |
| Removal | Fresh deletion export removes the test and stale candidates are refused |
| Recovery | Backup/restore and static-only rollback preserve active data/history |
| Handoff | Cleanup, redaction, final diff and every acceptance status are reviewed |

Before task activation, present the final planning summary and wait for the
owner's explicit approval. After implementation, run a full Trellis check
against the actual task artifacts and production evidence. A deployment or
real-mail gate that cannot be performed remains human-required and blocks a
completed acceptance claim.

## Acceptance mapping

| PRD criterion | Evidence to retain |
| --- | --- |
| AC1 / R1 | owner-local activation, tracked-disabled diff, existing site/comments smoke and static fallback |
| AC2 / R2 | HTTPS/Host/Origin/client identity, private mounts/UID, readiness, worker health, persistence and no public port |
| AC3 / R3 | redacted submission ID, SMTP-vs-mailbox observations, verification, approval, export and no-JS deployed stream |
| AC4 / R4 | post-delete export/DOM absence, increased epoch and isolated stale export/restored-state refusal |
| AC5 / R5 | consistent backup manifest/integrity, absent-destination restore and static/config rollback with live data/history preserved |
| AC6 / R2,R3,R5 | privacy scans, exact cleanup, redacted records and explicit unavailable/deferred limitations |

## Rollback points

- Before runtime start: remove only new owner-local Memo inputs; current static
  and comments deployment remains untouched.
- Before edge reload: discard uninstalled candidate edge configuration and keep
  the current server block.
- Before publication: reject candidate and restore the prior artifact/release
  pair; do not alter Memo data.
- After publication: switch the prior immutable static/config release only;
  never restore over active Memo data.
- After deletion: do not lower the tombstone epoch. Recover only through the
  owner-approved publication-history procedure.
