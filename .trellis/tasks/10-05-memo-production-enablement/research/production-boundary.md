# Memo production boundary research

This is historical research for the cancelled interactive plan. The current
task-root PRD/design supersede its mail, verification and public-write sequence.
Retain it for provenance and private recovery boundaries, not execution routing.

## Research scope

This note records repository-backed constraints for the owner-approved Memo
production enablement task. It does not contain a host, mailbox, credential,
remote path, release identifier, or raw operational output.

## Owner decisions and confirmed operator inputs

- On 2026-10-05 the owner selected the existing Firefly production host,
  HTTPS edge and SMTP setup. A separate environment, DNS change or certificate
  issuance is outside this task.
- The owner confirmed that the dedicated recipient and related VPS SMTP setup
  used by the earlier M5 comments work already exist. The exact values remain
  in the owner-controlled operational channel and are not copied here.
- The owner approved one controlled Memo submission with the public synthetic
  text: `Memo production acceptance 2026-10-05 — temporary owner test; delete
  after verification.`
- At planning review, this task had not performed provisioning, mail delivery,
  publication, remote probing or promotion. After execution approval, read-only
  operational probes began; current outcomes and limitations are recorded in
  `research/execution-evidence.md`. The earlier M5 result is precedent for the
  owner-managed boundary, not evidence that Memo itself is deployed or healthy.

## Repository evidence

### Private runtime and edge

- `plugins/memos/README.md:9-34` requires owner-local config/secrets outside
  release directories, private 0700 data, 0600 secrets, a matching numeric
  runtime identity, independent Memo keys and no private host port. It
  documents both root Compose and same-host standalone Compose shapes.
- `plugins/memos/README.md:38-58` requires a prefix-only `/v1/memos/` proxy,
  authoritative `X-Real-IP` replacement, cleared forwarded chains, bounded
  timeouts, no-store/security headers, disabled access/error URI logging and
  an independently healthy worker.
- `plugins/memos/README.md:62-102` requires approved-only export, a separate
  public TOML handoff, wrapped publication with retained deletion history, and
  refusal of stale re-enable or history-unaware rollback.
- `plugins/memos/README.md:106-117` separates consistent private backup/restore
  from static rollback and states that local fixtures do not certify real SMTP,
  edge identity/TLS, provisioning or immutable release switching.
- `services/memos/README.md:88-126` defines the private admin/export commands,
  encrypted leased delivery, 15-second worker cadence, bounded shutdown and
  worker-specific health.
- `services/memos/README.md:130-154` requires backup to an absent destination,
  separately retained matching keys, no active-state overwrite and publication
  rejection for a restored older epoch.
- `compose.yml:3-60` provides the opt-in root `memos` profile: HTTP and worker
  share the web namespace, bind loopback port 8788, use read-only mounts and
  publish no private port. `plugins/memos/compose.yml:3-53` provides the
  operator-owned same-host alternative and requires an explicit UID:GID.
- `services/memos/ops/nginx-hosts.conf.example:9-43` is a placeholder-only
  host-scoped HTTPS example. It proxies only `/v1/memos/`, removes forwarded
  chains and fails closed for unknown `/v1/` routes; it must not be installed
  without substituting owner-managed values in the operator channel.

### Static publication and history

- `.trellis/spec/frontend/memo-site-contract.md` keeps the site static and
  public-only: enabled builds consume a strict contained export, disabled
  builds do not read Memo inputs, and the native form posts to the configured
  HTTPS origin without JavaScript.
- `.trellis/spec/frontend/memo-publication-runtime-contract.md` requires the
  actual staged DOM to match the decoded export, keeps the prior tombstone
  epoch while disabled, rejects malformed/lost history and stale exports, and
  keeps the canonical snapshot under `artifacts/` rather than the web release.
- `.trellis/spec/frontend/memo-service-contract.md` keeps verification pending
  until owner approval, encrypts queued recipient/token data, and makes
  deletion terminal with an epoch increment.
- `config/site.toml.example:55-66` keeps comments and Memo tracked examples
  disabled. The owner-local activation must not be copied into tracked defaults.
- The archived Memo validation record
  `.trellis/tasks/archive/2026-10/10-01-memo-publication-runtime/research/validation-findings.md`
  reports complete local synthetic lifecycle evidence, but explicitly says it
  did not perform production deployment or real mail. The archived M5 evidence
  similarly records a redacted owner-approved comments delivery boundary while
  keeping exact mailbox and host values out of project records.

## Consequences for execution

1. Begin with a read-only owner-authorized baseline of the existing host and
   current comments/static deployment. Select the already-used Compose/edge
   shape; do not run both root-profile and standalone Memo runtimes.
2. Prepare an owner-local Memo config, secret file and data root with separate
   Memo keys and matching numeric ownership. Reuse only the approved M5 SMTP
   transport/mailbox boundary; never reuse comments data, database or keys.
3. Preserve the current static release, publication metadata, active Memo data
   and a verified private snapshot before any switch. Keep the snapshot and
   matching keys under owner-managed retention.
4. Validate the private HTTP service, worker health, persistence and direct
   port refusal before adding the host-scoped `/v1/memos/` route. Validate
   actual HTTPS Host/Origin/client identity and token-free proxy logs after the
   route is present.
5. Submit exactly one new synthetic Memo to the approved recipient. Treat SMTP
   acceptance and mailbox receipt as separate observations. Verify from the
   received link, approve through the private CLI, export the approved-only
   record and build/promote the static stream through the wrapped assembler.
6. Delete the synthetic record, obtain a fresh export and republish. Confirm
   it is absent from the live public stream and that the tombstone epoch rises.
   Test stale export and restored-state refusal in an isolated candidate,
   never by replacing the live release with an old candidate.
7. Restore the backup into an absent private destination with matching keys;
   validate it without repointing the live runtime. A static release/config
   rollback may switch only the static/config target and must leave live data
   and publication history untouched.
8. Remove only exact-owned test records, queued test mail, staging exports and
   temporary candidates. Keep owner-requested backups; remove or retain them
   only under the owner-controlled policy. Record redacted outcomes and
   unresolved limits in task evidence.

## Evidence limits

Local `./preview.sh verify`, `services/memos/ops/check-runtime.sh`, Compose
syntax and synthetic TLS/SMTP fixtures prove repository wiring only. They do
not prove the current VPS host, real mailbox receipt, public edge/TLS behavior,
production worker scheduling, deployed publication history or backup recovery.
Those claims require the owner-authorized production checks planned above.
