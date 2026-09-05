# Public Comments Enablement

## Goal

Enable public comments for canonical public post documents on the production
site using the existing M5.1 static-publication and private-service design.
Readers must be able to submit and verify plain-text comments through the
private service, while only owner-approved records enter the next sanitized
static publication. The repository's safe default remains comments-disabled.

## User value

Readers can leave verified feedback on public posts, and the owner can review,
approve, reject, quarantine, delete, and export comments without exposing the
comments database, moderation state, email addresses, tokens, or SMTP
credentials to the browser or static release.

## Background and confirmed facts

- The M5.1 comments service, static consumer, public export contract,
  publication handoff, private storage, moderation, notification outbox, and
  host-scoped `/v1/comments/*` boundary are implemented and archived.
- The site remains Astro static-only. It does not become SSR and it does not
  read the comments database or expose a public comments read API.
- The latest route-catalog reconciliation produced an exact match between the
  current release's canonical article documents and the private runtime route
  catalog (93 documents/routes in the recorded evidence); this must be
  rechecked against the exact release used for enablement rather than treated
  as a permanent count.
- Prior M5.1 evidence covers owner-authorized health, loopback,
  no-public-port, origin, unknown-API, security, fresh-identity, SMTP
  TLS/AUTH, synthetic-delivery, and backup/restore probes. During this
  enablement attempt, an isolated current-image probe passed, the first
  data-bound cutover failed, and the owner then explicitly approved an empty
  store reset. The prior database is retained in an owner-only recovery copy;
  the new runtime is healthy with an empty store, and the production outbox
  was not drained or replayed.
- The latest private observability work added fail-closed `/readyz`, bounded
  process-local metrics, and privacy-safe request records. `/readyz` and
  `/metrics` remain private and are not proxied publicly.
- The pre-rollout owner-authorized read-only edge gate validated the
  intended comments namespace, host isolation, private observability boundary,
  loopback-only listener, no-public-port posture, and unchanged production
  database/outbox state. It did not submit or verify a comment through the
  public origin and did not activate or promote a public release.
- The production owner-local input now uses the canonical enabled activation,
  while the tracked template and repository defaults remain disabled. The
  exact promoted release/config pair reconciled at 93/93 routes, and its
  enabled publication validated with 0 comments and tombstone epoch 0.
- The immutable static release and blog mirror were promoted. The first
  promotion command lost its SSH connection while performing the final blog
  inventory check, so its built-in rollback could not be proven during the
  disconnect. Independent recovery probes found the new current release and
  blog mirror complete with exact checksum and manifest agreement; no manual
  rollback was needed, and the previous release and blog backup were retained.
- The controlled public-origin smoke passed for routes, forms, security
  headers, cache behavior, distinct 404s, submission, delivery, verification,
  deletion, queue cleanup, empty export, runtime health, and temporary
  cleanup.
- `config/site.toml` and the owner-local plugin configuration are ignored
  inputs. The production owner-local site projection now uses the canonical
  enabled `[plugins.comments]` namespace and repository-relative plugin path;
  the tracked template and repository defaults remain disabled.
- The existing immutable publication release, comments data root, tombstone
  epoch guard, and separate static/data rollback boundaries are authoritative.
- Exact deployment identities, private paths, mailbox values, credentials,
  raw remote output, and release identifiers must remain in the owner channel;
  they must not enter source, task records, logs, or commits.

## Requirements

### R1. Controlled activation

- Enable comments only in the owner-local/production build input used for the
  approved release, using the canonical `[plugins.comments]` projection.
- Keep `config/site.toml.example` and all tracked defaults disabled.
- Enable comment forms and public approved-comment rendering only for
  canonical public post documents. Pages, indexes, experiments, 404 output,
  and inline non-post presentation remain comment-free.
- Preserve the static site boundary: forms may submit to the configured HTTPS
  write origin, but the site must not fetch comments or private state at
  runtime.

### R2. Release and route safety

- Build from the exact release/content snapshot that will be published and
  reconcile its canonical article routes against the private runtime catalog.
- Fail closed on missing, stale, invalid, duplicate, directory-index, or
  non-canonical Unicode routes before enabling the release.
- Preserve the existing UTF-8 uppercase percent-encoding boundary between
  readable site hrefs and encoded service routes.
- Do not manually broaden the route catalog or silently filter a mismatch.

### R3. Sanitized publication

- Use an owner-approved `comments.public.v1` export containing only the public
  allowlist, valid digest, source revision, generated time, and current
  tombstone epoch.
- Validate the enabled static build and assembled publication for route
  binding, public markup, privacy sentinels, digest, metadata, headers, and
  separate 404 behavior.
- Keep the active release and data rollback targets untouched until the new
  release passes all gates.

### R4. Private runtime and edge

- Confirm a fresh comments process can read the owner-only secret mount under
  the explicit owner-aligned numeric runtime identity, with read-only config
  and secret mounts, one private writable data mount, loopback binding,
  dropped capabilities, no-new-privileges, and no published comments port.
- Keep the existing edge contract: only `/v1/comments/*` reaches the private
  service; unknown `/v1/*` remains fail-closed; `/readyz` and `/metrics` stay
  private.
- Do not change DNS, certificates, TLS issuance, or unrelated deployment
  recovery behavior in this task.

### R5. SMTP and live submission behavior

- Reconfirm non-sending SMTP TLS/AUTH with runtime-injected credentials and
  retain only a redacted result.
- Exercise one controlled public submission/verification smoke using the
  previously approved owner-mailbox test boundary and an isolated test state;
  never drain or replay the real notification outbox.
- Treat SMTP acceptance, delivery, verification, moderation, and public export
  as distinct outcomes. Do not infer one from another.
- Once the release is approved, live visitors may submit plain-text comments;
  verification and owner approval remain required before public display.

### R6. Rollout and rollback

- Promote the enabled static release through the existing operator-owned
  release path only after the local, private, SMTP, and publication gates pass
  and the owner authorizes production activation.
- Immediately after promotion, run the controlled public-origin smoke and
  verify the representative post form, submission response, verification
  behavior, security headers, static routes, and distinct 404s.
- On any failed gate, remove only exact temporary artifacts and restore the
  prior static/runtime configuration without lowering the tombstone epoch or
  touching active data.
- Record a redacted handoff stating passed, failed, unavailable, and deferred
  gates, plus post-development credential/key rotation ownership.

## Acceptance Criteria

- [x] The exact enablement release's route catalog matches the canonical public
      post documents with zero missing, stale, invalid, duplicate, directory,
      or non-canonical Unicode routes.
- [x] The canonical owner-local/production activation is enabled while the
      tracked template and repository default remain disabled.
- [x] An enabled static publication builds and assembles with a valid sanitized
      export, digest, current tombstone epoch, and no private fields or
      comments on non-post surfaces. The promoted candidate carried 0 comments
      at tombstone epoch 0.
- [x] The fresh private service remains healthy, ready, loopback-only,
      no-public-port-bound, and able to read its owner-only secret mount under
      the explicit runtime identity. The owner-approved empty-store reset
      passed the private runtime, route, mount, identity, and outbox-integrity
      gates; the prior database remains retained separately for recovery.
- [x] The owner-authorized read-only edge gate validated HTTPS/TLS, the
      host-scoped comments namespace proxy, and host isolation. Valid-Origin
      `OPTIONS` returned 204; invalid Origin returned 403; an unknown comments
      path, the `/v1` root, and an unknown `/v1` path returned 404; public
      `/readyz` and `/metrics` returned 404; and the direct public port was
      refused. The listener remained loopback-only with no published port,
      the production database/outbox remained unchanged, the service remained
      healthy, and temporary cleanup passed.
- [x] Non-sending SMTP TLS/AUTH and the isolated controlled submission/
      verification path passed without touching the real outbox. The one
      sending attempt has no retained direct SMTP-acceptance result because its
      wrapper discarded mixed stdout during cleanup; it was not retried. The
      owner observed the synthetic verification message in the approved
      mailbox, so delivery confirmation passed. This was not a public-origin
      submission or verification smoke.
- [x] Public representative routes, forms, security headers, cache behavior,
      and distinct 404s passed after rollout. The controlled public smoke
      returned 202 for submission and 200 for verification; the test comment
      was deleted, the queue was cleaned, and the resulting export remained at
      0 comments and tombstone epoch 0.
- [x] The previous immutable release and blog backup were retained. The first
      promotion command disconnected during its final blog inventory check,
      but independent recovery probes proved that the new current release and
      blog mirror were complete with exact checksum and manifest agreement, so
      no manual rollback was needed. The prior database remains in an owner-
      only recovery copy; no independently verified data backup was found, and
      the approved empty store remains at tombstone epoch 0.
- [x] No credential, mailbox value, token, raw remote output, exact deployment
      identity, private path, or private comment field enters repository or
      Trellis records.

## Out of scope

- SSR, browser-side comment reads, a public comments read API, accounts,
  reactions, rich text, historical comment import, or comments on pages and
  experiments.
- DNS changes, certificate issuance, TLS reconfiguration, broad deployment
  crash recovery, infrastructure redesign, or unrelated host changes.
- Credential/key rotation during the enablement transaction; rotation remains
  an owner-operated follow-up after verification.
- Draining/replaying existing production notifications or using the active
  production database/outbox as a test fixture.
- Changing the repository's disabled defaults, committing private config,
  secrets, private exports, or production data.
