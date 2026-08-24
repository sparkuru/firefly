# M5.1 External Comments Provisioning

## Goal

Move the implemented private comments service from locally validated code to
an owner-operated, same-device runtime that can safely receive public comment
submissions, while preserving the Markdown-first static publication boundary,
the existing immutable-release rollback path, and the privacy guarantees of
the M5.1 design.

The task must end with reproducible operator evidence and an explicit handoff
decision. It must not silently turn the Astro site into SSR, expose the
comments database, or put runtime credentials into the repository.

## Background and confirmed facts

- M5.1 service, static consumer, publication handoff, SQLite storage boundary,
  secret-file boundary, reverse-proxy examples, and rollback contracts are
  implemented and archived in the preceding M5.1 tasks.
- The owner-local site configuration keeps `[plugins.comments].enabled = false`;
  the static publication remains the default behavior when the comments
  service is absent.
- The private service owns writes, verification, moderation, notification
  delivery, storage, backup, and export. The site consumes only the reviewed
  sanitized export during a static build.
- The first deployment shape is same-origin `/v1/comments/*` routing through a
  host-scoped edge proxy to a private comments runtime. Unknown `/v1/*`
  resources fail closed, and the comments service port is never published
  directly to the Internet.
- SQLite is the only first-release runtime driver. MariaDB/MySQL remain
  adapter-level deferred work.
- Local validation already covers the service/package/publication contracts,
  container confinement, shell checks, and static disabled-build behavior.
- Owner-authorized production preflight, private runtime provisioning,
  host-scoped edge verification, and static/data backup-restore checks have
  now been performed. Exact targets, accounts, mailbox values, credentials,
  release identifiers, and raw operational output remain only in the
  owner-controlled operational channel.
- Controlled SMTP delivery and public browser submission/verification smoke
  remain intentionally deferred because no SMTP secret/test recipient or safe
  enabled staging projection was supplied. Tracked comments remain disabled.

## API namespace finding

The current service exposes comments lifecycle routes directly below the
version root: `/v1/submissions`, `/v1/verify/*`, `/v1/control/*`, and
`/v1/admin/*`. The edge currently forwards the whole `/v1/` prefix to the
comments runtime.

`/v1` is not inherently a comments-only namespace. It can be the version root
for several first-party, same-origin APIs, while each resource owns an explicit
subpath and security policy. Plausible future resource families include:

- `comments`: submissions, verification, reader self-control, moderation, and
  sanitized export;
- `identity`: only if a later product decision introduces guest identity or
  accounts;
- `contact` or `webmentions`: only if the blog later accepts those inbound
  interactions;
- other site-owned inbound integrations that need the same origin, rate-limit,
  abuse-control, audit, and rollback discipline.

Publication assembly, health, metrics, and deployment operations should remain
outside this public resource namespace because they have different lifecycles
or visibility rules.

Approved route decision — 2026-08-23: reserve `/v1/` as the version root,
move comments under explicit `/v1/comments/*` paths, route only that prefix to
the comments service, and fail closed for unknown `/v1/*` resources. Future
APIs can receive their own path and upstream without making the comments
service a catch-all gateway. The existing implementation is not externally
deployed yet, so this is the least expensive compatibility point at which to
make the boundary explicit.

## Requirements

### R1. Preserve the static/public boundary

- Keep the Astro site and publication assembler static-only.
- Keep private database fields, email addresses, moderation tokens, SMTP
  credentials, outbox state, and service-only configuration out of the site,
  static output, browser runtime, and publication metadata.
- Do not enable comments in tracked configuration until every required gate is
  explicitly accepted.

### R2. Provision the private runtime

- Deploy the comments service beside the immutable static site on the
  owner-authorized device/runtime.
- Use a private network or loopback listener with no externally published
  comments port.
- Preserve non-root, read-only-root-filesystem, private writable data mounts,
  healthcheck, dropped-capability, and no-new-privileges requirements from the
  existing runtime contract.
- Supply exact deployment paths and service identifiers only through the
  owner-controlled operational input; do not copy them into Trellis records.

### R3. Keep configuration and secrets separated

- Use `config/site.toml` for core site settings and the single
  `[plugins.comments]` activation projection. Keep comments-owned public and
  runtime settings in `config/plugins/comments/config.toml`, with named secret
  indirection only.
- Supply runtime secrets through an owner-only private input or supervisor
  environment, with read-only service access and permission preflight.
- Never read, print, copy, rotate, or commit the real SMTP password or any
  other credential in the repository workflow.
- Verify that the static build, Docker context, task artifacts, logs, and
  generated publication contain no secret values.

### R4. Validate host-scoped same-origin routing

- Configure or verify the owner-managed edge so host/SNI selection occurs
  before explicit `/v1/comments/*` routing.
- Verify the production `/v1/comments/*` path reaches only the production
  comments upstream and data boundary; development or unrelated hosts must not
  cross that boundary.
- Preserve existing static route, cache, security-header, and distinct-404
  behavior for all non-`/v1/comments/` paths, and return a bounded failure for
  unknown `/v1/*` resources.
- Verify missing or unhealthy comments runtime behavior fails closed for
  `/v1/comments/*` without affecting static page serving.

### R5. Validate SMTP and storage operations

- Run a controlled SMTP delivery test with owner-injected credentials and a
  non-sensitive result record only.
- Verify SQLite `core.db` ownership, migration state, integrity, backup,
  restore-to-new-location, retention metadata, and rollback behavior.
- Keep plugin-owned storage below the private data root and preserve the
  explicit SQLite-first / MariaDB-MySQL-deferred boundary.
- Do not claim encryption unless the owner-controlled backup destination
  actually provides it.

### R6. Complete staged and public verification

- Run repository checks through `./sam`, the relevant container/runtime probes,
  shell validation, and publication/static regression checks before enablement.
- Verify TLS/origin, allowed-origin behavior, direct-port refusal, health,
  generic error responses, and no secret leakage.
- Perform owner-authorized public browser submission and verification smoke
  coverage against a staging or temporary enabled projection only after the
  private and edge gates pass. Never commit the enabled projection; if no safe
  staging path exists, record the browser gate as deferred and make no
  enablement claim.
- Record each result as pass, fail, unavailable, or intentionally deferred;
  unavailable evidence must not be reported as passed.

### R7. Preserve rollback and handoff safety

- Keep the previous immutable static release as the static rollback target.
- Keep data rollback separate: restore a verified new data root before any
  active-path switch, and leave the current data root untouched on failure.
- Stop and report if any preflight, privacy, proxy, SMTP, backup, or public
  verification gate fails.
- Keep the tracked comments-disabled state until the owner explicitly accepts
  the final rollout decision.

## Acceptance Criteria

- [x] The owner-authorized private comments runtime is deployed or the task
      records a precise, reproducible blocker before any remote mutation.
- [x] The comments port is not publicly published; health and confinement
      probes pass for the actual runtime shape.
- [x] The comments service, site form, notification links, edge configuration,
      tests, and contracts use the approved `/v1/comments/*` route family.
- [x] Host-scoped same-origin `/v1/comments/*` routing is verified for the
      intended environment, including wrong-host isolation and static-route
      regression.
- [x] The edge forwards only `/v1/comments/*` to the comments service;
      unknown `/v1/*` resources fail closed and do not reach it.
- [x] TLS/origin and allowed-origin checks pass, or remain explicitly deferred
      to the owner with the reason and required follow-up.
- [x] Controlled SMTP delivery succeeds without exposing the credential, or
      the task records an operator-owned blocker without leaking its value.
- [x] SQLite storage backup and restore-to-new-location pass integrity and
      rollback checks; the active data path remains untouched on failure.
- [x] Repository, container, shell, publication, and browser evidence is
      captured with exact commands and redacted results.
- [x] No task/spec/journal/context file, Git diff, static output, image, or
      log contains an operational identity, credential, private mailbox value,
      raw remote output, or unredacted deployment target.
- [x] The final tracked comments-enabled state matches the approved rollout
      decision, and a previous immutable static release remains rollbackable.

## Out of scope

- Importing historical comments or private identity/memo data.
- Adding a public runtime comments read API, SSR, browser-side database access,
  rich text, accounts, reactions, or a generic plugin marketplace.
- Shipping a MariaDB/MySQL driver or changing the existing comments schema
  beyond what the already-approved SQLite runtime requires.
- Automatic DNS changes, certificate issuance, account creation, password
  rotation, or unattended production promotion.
- Recording exact SSH targets, hostnames, mailbox addresses, filesystem paths,
  synchronization commands, release IDs, or credentials in project records.

## Risks and deferred items

- SMTP account readiness, final backup-destination policy, the incompatible
  non-ASCII route gap, and public smoke review remain owner-operated concerns.
- TLS termination, host-specific edge selection, allowed-origin behavior,
  private health, and SQLite backup/restore have passed the recorded
  production probes.
- A missing or unhealthy private runtime must not degrade static publication;
  the fail-closed `/v1/comments/*` behavior is a required operational
  invariant.
- The task cannot claim full rollout if the owner-controlled operational input
  or an external gate is unavailable.

## Approved decisions

### API namespace

Approved 2026-08-23: normalize the not-yet-deployed comments routes to
`/v1/comments/*`, reserve `/v1/` as a version root for future first-party APIs,
and make unknown `/v1/*` paths fail closed. This keeps URL versioning useful
without coupling every future API to the comments service. The accepted cost is
a small cross-layer route migration across the service, form action,
notification links, proxy examples, tests, and contracts before provisioning.

### Final enablement

Approved 2026-08-23: this task provisions and verifies the external runtime but
does not enable comments in tracked configuration. Public product enablement
and any future content publication remain separate approval boundaries requiring
a later explicit release decision.
