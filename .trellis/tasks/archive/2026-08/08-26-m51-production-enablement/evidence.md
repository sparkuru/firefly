# M5.1 Gate Evidence

All evidence below is intentionally redacted to project-scoped statuses,
counts, and command boundaries. Exact deployment identities, external paths,
release identifiers, mailbox values, credentials, and raw remote output are
not retained.

## Local checks

- Comments service `check`, `test`, and `build` passed through `./sam`.
- The comments suite passed 44/44 tests, including route classification,
  canonical Unicode encoding, mismatch fail-closed behavior, invalid-route
  redaction, symlink rejection, and Compose privacy assertions.
- Compose syntax passed with an explicit numeric `COMMENTS_RUNTIME_USER`.
  The same template failed closed when the variable was absent.
- `check:m4`, `test:m4`, and `build:m4` passed through `./sam` with the
  repository-local content root selected for the fixture contract.
- An initial unqualified `test:m4` used the machine's ignored external content
  root, so its site negative fixtures were not applied to the materialized
  source and four expected failures incorrectly built successfully. That
  invocation is not accepted as evidence; the explicit repository-local
  rerun passed and left fixtures clean.
- `git diff --check` passed.

## Remote production-shaped probes

- SSH connection and minimal identity/target probes passed.
- The reviewed route preflight against the exact current static release
  failed closed: 93 article routes were emitted, 108 routes were configured,
  22 emitted routes were missing from configuration, and 37 configured routes
  were stale. No route list or configuration value was printed or persisted.
  Public enablement remains blocked until the owner reconciles this catalog.
- A fresh temporary comments container used the discovered owner UID:GID,
  read-only config/secret mounts, isolated tmpfs data, loopback-only networking,
  dropped capabilities, no-new-privileges, and a read-only root. Health,
  unknown-API 404, invalid-Origin rejection, and loopback binding passed.
- Non-sending SMTP TLS/AUTH passed.
- One synthetic delivery passed to the owner-approved sender-mailbox boundary.
  The production outbox and data mount were not attached; no existing queued
  notification was drained.
- Owner-edge/static probes passed for the root page, post directory, missing
  route, unknown API, distinct experiment 404, required security headers,
  invalid-Origin rejection, no public comments port, and loopback binding.
- The long-lived production service remained running/healthy. No persistent
  Compose, release, data, outbox, secret, DNS, TLS, or edge configuration was
  changed. All temporary remote containers and work files were removed.

## Deferred and remaining gates

- Enabled publication/browser coverage is deferred. The tracked and
  owner-local site configuration remains comments-disabled, and no safe
  repository-relative enabled projection was created without changing an
  owner file. No public enablement claim is made.
- The owner follow-up is to reconcile the release-bound route catalog, apply
  the explicit Compose UID:GID to the persistent runtime through a separate
  rollout decision, complete the safe enabled browser/publication gate, and
  rotate credentials after development as planned.

## Final state

M5.1 remains `production_provisioned_pending_enablement`. SMTP and
runtime-boundary probes are positive, but route reconciliation and the enabled
browser/publication gate remain open. Tracked comments stay disabled and the
existing immutable static/data rollback boundaries remain authoritative.
