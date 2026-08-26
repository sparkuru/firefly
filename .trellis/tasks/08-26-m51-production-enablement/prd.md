# M5.1 Production Enablement Gates

## Goal

Advance M5.1 from `production_provisioned_pending_enablement` to a
controlled enablement decision using the owner-operated comments runtime and
its existing configuration. Verify the real runtime boundary, reconcile the
runtime post catalog with the current static release, exercise the existing
SMTP configuration safely, and run browser/public gates only through a temporary
non-tracked enabled projection. Keep the tracked publication disabled unless
the owner makes a separate final rollout decision.

## Background and confirmed facts

- The M5.1 service, static consumer, publication handoff, SQLite
  backup/restore boundary, and host-scoped `/v1/comments/*` contract are
  already implemented and archived.
- The owner authorized this task to use the existing private deployment
  configuration, retrieve non-secret configuration to a short-lived local
  directory when useful, and rotate credentials after development is complete.
  The agent must not rotate credentials or copy them into the repository.
- The repository worktree was clean before this task. The active task is the
  only current Trellis change.
- An owner-authorized SSH key probe and a minimal remote runtime probe passed.
  The comments container is healthy, listens privately on loopback, has no
  public comments port, and uses a non-root, read-only container shape.
- The mounted owner-only secret file is mode `0600` but is owned by a host UID
  different from the container's `node` UID. A fresh process running with the
  service UID cannot read it. The existing long-lived process has not been
  restarted by this task, so its current health is not evidence that a fresh
  start can load SMTP configuration.
- A temporary no-data container running with the secret owner's numeric UID
  completed SMTP TLS/AUTH successfully. No email was sent and the production
  container was not restarted or modified.
- Comparing the current release's `posts/**/index.html` inventory with the
  configured runtime route list found 108 configured entries versus 109 static
  entries, with 25 static entries absent from configuration and 24 configured
  entries absent from the release. The drift includes the `app/apps` and
  `course/courses` directory naming changes and two non-ASCII slug
  encodings. The comparison includes directory indexes, so the implementation
  must distinguish canonical post documents from directory routes before
  accepting the catalog.
- The private notification outbox currently contains two queued records. No
  delivery worker was run because doing so could notify real recipients without
  an explicit test-recipient boundary.
- The owner approved one clearly marked synthetic delivery to the configured
  sender mailbox. The real outbox must remain untouched.
- The tracked site remains comments-disabled and the immutable static release
  remains the rollback target.

## Requirements

### R1. Preserve the static and privacy boundary

- Keep the Astro site static-only and keep comments disabled in tracked
  configuration throughout development and verification.
- Never put SMTP passwords, tokens, private mailbox values, raw remote output,
  exact deployment identities, or operational release identifiers into source,
  Trellis records, logs, or commits.
- Do not use the production outbox as a test fixture unless its recipients are
  explicitly approved for this test.

### R2. Reconcile the runtime post catalog

- Validate the runtime catalog against the exact current public static release
  before enablement.
- Accept only canonical public post document routes; directory indexes and
  stale routes must not become comment targets.
- Handle canonical uppercase UTF-8 percent encoding for non-ASCII segments and
  preserve the existing route grammar.
- Prefer a reproducible catalog-generation or validation step tied to the
  release over a manually copied list that can drift after content layout
  changes.
- Fail closed before any public enablement when the catalog and release do not
  agree.

### R3. Repair the fresh-runtime secret boundary

- Make the service's non-root runtime identity able to read the owner-only
  secret mount without broadening permissions or copying the secret into the
  image.
- Keep the secret mount read-only and preserve dropped capabilities,
  no-new-privileges, read-only root, private networking, and protected data
  ownership.
- Prove a fresh service start or equivalent production-shaped probe can load the
  same configuration; a pre-existing healthy process is insufficient.
- Do not rotate the credential in this task; leave rotation to the owner after
  development and verification.

### R4. Exercise SMTP with an explicit recipient boundary

- Use the existing SMTP configuration for a non-sending TLS/AUTH
  check and retain only a redacted result.
- Run one synthetic controlled delivery only to an owner-approved test
  recipient, with a temporary isolated message/state fixture. Never drain the
  real outbox merely to prove SMTP.
- Record delivery as pass, fail, unavailable, or deferred; never infer
  delivery from authentication alone.

### R5. Verify edge, service, and static behavior

- Verify private health, host-scoped `/v1/comments/*` routing, generic error
  responses, allowed-origin behavior, unknown `/v1/*` fail-closed behavior,
  direct-port refusal, static routes, security headers, and distinct 404s.
- Keep production/development upstream and data boundaries isolated.
- Do not modify DNS, certificates, edge configuration, or persistent service
  state without a task-approved operation plan and the required remote safety
  gate.

### R6. Run temporary browser and publication gates

- Build an enabled projection only from a sanitized, repository-relative,
  non-tracked export fixture when browser coverage requires it.
- Exercise form submission, verification, moderation/export handoff, and
  canonical route behavior only against a safe staging or temporary target.
- Verify the generated publication contains only the allowlisted public
  comments projection and no private sentinels.
- If a safe recipient, enabled projection, or public browser target is not
  available, record the exact gate as deferred and make no enablement claim.

### R7. Preserve rollback and handoff safety

- Keep the previous immutable static release and active data root untouched
  until every relevant gate passes.
- For any data test, use a separate temporary fixture or restore candidate;
  never overwrite the active data root.
- Provide a redacted operator handoff covering passed gates, deferred gates,
  required key rotation, and the remaining final enablement decision.

## Acceptance Criteria

- [ ] The route catalog is reconciled against the current release, with
      directory indexes excluded and canonical non-ASCII routes handled
      correctly; stale or missing document routes fail closed.
- [ ] The service's non-root identity can load the owner-only secret mount in a
      fresh production-shaped start without broadening secret permissions.
- [ ] Non-sending SMTP TLS/AUTH passes or records a redacted actionable failure.
- [ ] A synthetic SMTP delivery passes to an explicitly approved test
      recipient, or the task records the gate as deferred/blocking without
      draining real notifications.
- [ ] Private service, edge, static route, unknown API, direct-port, security,
      origin, and 404 checks are captured as pass/fail/unavailable/deferred.
- [ ] Temporary enabled publication/browser checks pass, or their unavailable
      prerequisites and no-enable consequence are recorded.
- [ ] Tracked comments configuration remains disabled unless a separate owner
      rollout decision explicitly changes it.
- [ ] No credential, mailbox value, raw remote output, exact deployment
      identity, or private source path enters the repository or Trellis records.
- [ ] Existing immutable static and data rollback targets remain intact, and
      the final handoff states whether public enablement is still pending.

## Out of scope

- Credential rotation, account changes, DNS/TLS issuance, or unattended
  production promotion.
- Historical comment import, public read APIs, SSR, browser-side database
  access, accounts, reactions, rich text, or a plugin marketplace.
- MariaDB/MySQL support or unrelated content migration.
- Draining or replaying existing production notifications as a test.
- Committing an enabled site configuration or production data/export.
- Rewriting archived task history to hide earlier route or deployment state.
