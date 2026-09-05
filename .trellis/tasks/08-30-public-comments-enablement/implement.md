# Public Comments Enablement — Implementation Plan

## Current execution status

Local enablement, route reconciliation, sanitized publication assembly, full
desktop/mobile browser coverage, private-runtime/edge checks, and SMTP
preflights passed. The owner-approved empty-store reset retained the prior
database in an owner-only recovery copy and left a healthy runtime with an
empty schema-valid, digest-valid export. Production then enabled the canonical
owner-local activation while keeping tracked defaults disabled. The exact
release/config pair reconciled at 93/93 routes, and the enabled build and
publication validated with 0 comments at tombstone epoch 0.

The immutable static release and blog mirror were promoted. The first
promotion command's final blog inventory check hung after its SSH connection
stopped responding, so the built-in rollback could not be proven during the
disconnect. Independent recovery probes showed the new current release and
blog mirror complete with exact hash, count, checksum, and manifest agreement;
no manual rollback was needed. The previous release and blog backup remain
available.

The controlled public-origin smoke passed. Representative routes, forms,
security headers, cache behavior, and distinct 404s validated; submission
returned 202, the outbox moved from 2 to 3 records, delivery reported 1
delivered, 2 skipped, and 0 failed, and verification returned 200. The test
comment was deleted, the queue was cleaned, the export returned to 0 comments
at tombstone epoch 0, the runtime remained healthy, and cleanup passed.
Credential/key rotation remains an owner-operated follow-up. See `evidence.md`
for the redacted gate record.

## Review gate before activation

- [x] Review `prd.md`, `design.md`, and this checklist; no product decision is
      unresolved and the enabled scope is canonical public posts only.
- [x] Confirm the worktree contains only this planning task and preserve all
      ignored owner-local config, secret, data, and generated files.
- [x] Confirm the tracked template remains disabled and no private value will
      be copied into task records, logs, source, or commits.
- [x] Present the final planning summary and obtain explicit approval before
      running `task.py start`; task creation is not implementation approval.

## Ordered execution

### 1. Activate the approved task and load context

- Run `task.py start` only after the planning-summary approval.
- Load the relevant `trellis-before-dev` guidance for the comments service,
  frontend static build, and publication layers before editing any product or
  configuration file.
- Validate the active task artifacts and curated `implement.jsonl` /
  `check.jsonl` manifests. If sub-agents are dispatched, every prompt starts
  with the active task path and the main session retains rollout ownership.
- Confirm the project command boundary, locked Node/browser images, and
  available operator access without printing credentials or private paths.
  The current remote comments image must also satisfy the latest private
  readiness/metrics contract before rollout.

### 2. Establish a redacted baseline and rollback references

- Check `git status`, ignored owner inputs, existing publication metadata,
  current comments readiness, active release identity, and data/outbox state
  using only status/count labels.
- Confirm the route catalog is reconciled against the exact release selected
  for this task. Regenerate a temporary candidate only if the release changed;
  do not manually edit a list to hide drift.
- Confirm the existing immutable static release, active data root, outbox,
  secret mount, and Compose/runtime rollback references are intact.
- Stop and record a blocking/deferred gate if the baseline cannot be proven
  without exposing or mutating owner state.

### 3. Prepare the enabled publication inputs

- Obtain or generate an owner-reviewed `comments.public.v1` export from
  approved records. Current execution result: the owner-only admin token was
  configured, the exact service container was restarted once, and the empty-
  store export was transferred into the ignored mode-`0600` staging path. Its
  schema, digest, zero-comment count, and tombstone epoch 0 validated locally;
  only redacted metadata was retained in task evidence.
- Create a contained ignored enablement site input with canonical
  `[plugins.comments].enabled = true`, the existing plugin config path, and no
  legacy `[comments]` namespace. Keep the repository template disabled.
- For local coverage, prepare only a sanitized fixture export and fixture site
  input under the repository's ignored temporary area. Do not copy production
  data, secrets, email addresses, tokens, or raw remote output.
- If the export or route catalog is stale, fail closed and reconcile it through
  the owner-controlled path before proceeding.

### 4. Run local enabled-build and browser gates

- Run route-catalog validation against the exact release/config pair and
  require zero missing, stale, invalid, duplicate, directory-index, or
  non-canonical Unicode routes.
- Run the enabled site build and assembled publication with explicit contained
  `FIREFLY_SITE_CONFIG_PATH` and `FIREFLY_COMMENTS_EXPORT` values.
- Verify comments render only on public posts, forms contain the canonical
  encoded submission route, pages/indexes/experiments remain comment-free,
  and no private sentinels or unsafe markup enter HTML or publication metadata.
- Run the locked static and interactive browser suites, including the Unicode
  comments fixture, with the repository's `./sam` boundary. Record exact
  counts/statuses and keep generated reports ignored.
- Run `git diff --check` and inspect the candidate tree for unexpected files.
- If publication validation reveals a scanner defect, record the exact
  redacted failure class, update the contract before proceeding, and add the
  narrowest regression test without weakening unrelated privacy checks.
- Execution correction: generic enabled static-output builds now derive the
  expected rendered comment count and form action from the current export and
  site configuration instead of hardcoded fixture values. Fixture-specific
  Unicode coverage remains separate.

### 5. Verify the private runtime, edge, and SMTP gates

- Repeat the minimal owner-authorized read-only baseline before any persistent
  operation. If the current comments image is still pre-observability, stop
  and use the separately approved image rollout path before continuing.
- Current execution result: the isolated new-image probe passed. The initial
  data-bound cutover failed, after which the owner explicitly approved an
  empty-store reset. The old database was retained in an owner-only recovery
  copy, stale exact-service containers were reconciled, and the new runtime
  passed health, readiness, metrics, route, identity, mount, loopback,
  no-public-port, empty-database, and outbox-integrity checks. No static
  release or public activation had been performed at that reset stage.
- Prove a fresh comments process can read the owner-only secret/config mounts
  under the explicit owner-aligned numeric identity, with loopback binding,
  no published comments port, read-only root/config/secret, one writable data
  mount, dropped capabilities, and no-new-privileges.
- Verify `/healthz`, `/readyz`, allowed-origin behavior, generic errors,
  unknown `/v1/*`, direct-port refusal, and the host-scoped
  `/v1/comments/*` proxy. Keep readiness/metrics private.
- Current edge result: the owner-authorized read-only gate passed. HTTPS/TLS,
  the comments namespace proxy, and host isolation validated; valid-Origin
  `OPTIONS` returned 204, invalid Origin returned 403, and the unknown
  comments path, `/v1` root, and unknown `/v1` path returned 404. Public
  `/readyz` and `/metrics` returned 404; the direct public port was refused;
  the listener remained loopback-only with no published port. The production
  database/outbox remained unchanged, the service remained healthy, and
  temporary cleanup passed. No public-origin submission or verification,
  static promotion, owner activation, or public comments rollout occurred
  during that pre-rollout read-only gate.
- Run the non-sending SMTP TLS/AUTH probe, then at most one isolated approved
  synthetic delivery/submission smoke. Never mount or drain the real outbox;
  record only redacted outcome classes.
- Current SMTP result: TLS/AUTH, isolated submission (202), one isolated
  outbox record, and isolated verification (200) passed. Exactly one sending
  attempt was made. Its wrapper falsely rejected mixed stdout and removed the
  temporary result during cleanup, so it was not repeated; production
  database/outbox hashes stayed unchanged and the runtime remained healthy.
  The direct SMTP-acceptance result was not retained, but the owner observed
  the synthetic verification message in the approved mailbox, so delivery
  confirmation passed. No public-origin submission or verification occurred.
- If a recipient, credential, or operator-only prerequisite is absent, stop
  before public activation and record the exact deferred consequence.

### 6. Execute the bounded production enablement

- [x] Preserve the prior release/config/data rollback references and record
      only redacted identities/statuses. The previous immutable release and
      blog backup remain retained.
- [x] Apply the canonical enabled owner-local/production input and build the
      exact sanitized publication candidate without changing tracked defaults,
      DNS/TLS, certificates, or deployment crash recovery. The exact pair
      validated at 93/93 routes with 0 comments and tombstone epoch 0.
- [x] Promote the immutable static release and blog mirror through the existing
      operator path. The first command disconnected during its final blog
      inventory check, leaving its built-in rollback unproven at that moment;
      independent recovery checks proved the new current/blog outputs complete
      and exact, so no manual rollback was required.
- [x] Recheck runtime health, edge isolation, static routes, forms, security
      headers, distinct 404s, cache behavior, checksums, counts, manifests, and
      publication metadata after promotion.

### 7. Run controlled public smoke and rollback decision

- [x] Submit one clearly marked synthetic comment against the public origin
      through the approved test-recipient boundary. Submission returned 202;
      the outbox moved from 2 to 3 records; delivery reported 1 delivered, 2
      skipped, and 0 failed; verification returned 200.
- [x] Confirm the test record never entered the approved public projection,
      delete it, clean the queue, and validate a production export containing
      0 comments at tombstone epoch 0 without draining existing notifications.
- [x] Record only bounded outcomes and counts. All recovery probes and smoke
      gates passed, the runtime remained healthy, and cleanup passed. No manual
      rollback was needed; the previous release and blog backup remain the
      retained static rollback points.

### 8. Finish quality and handoff

- [x] Run the full applicable Trellis quality check, task validation, privacy
      scan, `git diff --check`, and the complete relevant `./sam` gates.
- [x] Review the complete diff and ignored-file boundaries. No secret, mailbox
      value, token, raw remote output, exact deployment identity, private path,
      or private comment field entered repository records.
- [x] Update the durable comments/publication spec for the reusable scanner and
      empty-store reset contracts; retain this task's redacted evidence as the
      operational record.
- [ ] Commit and archive only after the quality gate and owner review pass. Update
      the project mainline and journal with the final state, including any
      remaining credential rotation or deployment-owned follow-up.

## Validation commands

Use the repository boundary for Node, npm, browser, and publication checks:

```sh
git diff --check
python3 ./.trellis/scripts/task.py validate \
  .trellis/tasks/08-30-public-comments-enablement
./sam npm run check:m51
./sam npm run test:m51
./sam npm run build:m51
./sam npm run verify:m51
```

The enabled commands must receive explicit contained fixture/owner inputs for
`FIREFLY_SITE_CONFIG_PATH` and `FIREFLY_COMMENTS_EXPORT`. The exact release,
deployment, mailbox, and private runtime arguments belong only in the
owner-operated channel. Any remote checks are recorded as redacted probes,
not pasted command output.

## Rollback points

1. Before input preparation: preserve ignored owner files and confirm the
   tracked disabled template is unchanged.
2. Before service/config mutation: retain exact owner-controlled config and
   runtime rollback references; use temporary mounts for all tests.
3. Before release promotion: retain the prior immutable release and current
   publication metadata; do not lower the tombstone epoch.
4. Before public smoke: confirm the test record, recipient boundary, and
   notification state are isolated from the real outbox/data root.
5. On any failure: stop, remove only exact temporary artifacts, restore the
   prior release/runtime state, recheck readiness/static serving, and leave
   repository defaults disabled.
