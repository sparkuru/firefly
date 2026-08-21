# Temporary comments provisioning and storage design

## Goal

Provision the comments service beside the existing static site on the same
device, while preserving the static/public boundary and preparing a storage
model that can grow from the current comments implementation to independent
plugin databases.

Operational target addresses, synchronization details, credentials, and
private deployment identifiers are intentionally excluded from this temporary
task and will be supplied only through the operator channel when needed.

## Requirements

- Keep the static publication served from its existing immutable release path.
  The comments service is a separate private runtime on the same device and is
  reached through a reverse-proxy route; it must not turn the Astro site into
  SSR or expose the comments database.
- Prefer same-origin routing for the first deployment: the existing site origin
  owns `/v1/*`, while the reverse proxy forwards those requests to the comments
  service on a loopback/private port. A separate comments subdomain remains an
  optional isolation strategy, not a prerequisite.
- Use the owner-supplied Zoho Mail mailbox as the sender identity. The exact
  mailbox and SMTP application password are private operational inputs and must
  never enter Git, the static build, Docker build context, task artifacts, or
  public logs.
- Keep public build configuration and private runtime secrets separate. The
  repository `config/site.toml` remains a non-secret shared configuration with
  `passwordEnv`. The development input is `config/secrets.env`, which must be
  ignored, permission-checked, excluded from build contexts, and read-only to
  the service. Production uses the same variable contract from its private
  deployment path or read-only secret mount rather than committing the file.
- Define a storage contract with one platform-owned `core.db` for core/plugin
  metadata and independent plugin-owned database files or schemas. Preserve
  the current comments schema boundary and provide a dialect adapter shape for
  SQLite and MariaDB/MySQL without coupling plugin tables to `core.db`.
- Define migrations, backup, restore, integrity checks, ownership/permissions,
  rollback, and retention for core and plugin storage independently.
- Create a safe local `config/secrets.env` input after task activation without
  inserting a real credential. Keep a tracked placeholder/template separate
  from that ignored file, require owner/application-only permissions, and let
  the comments runtime read the same variable contract from a private
  production mount or supervisor-managed env-file.
- Keep comments disabled in the tracked site configuration until deployment
  validation, origin/TLS, SMTP, backup/restore, and public/private probes pass.
- Do not record the remote SSH target or later synchronization details in
  project task/spec/mainline records.

## Confirmed facts

- The existing synchronization helper deploys the assembled static `dist/`
  atomically and retains the previous release for rollback; it does not deploy
  the comments service.
- The comments HTTP service already owns `/v1/submissions`, verification,
  control, moderation, and export routes and the site form constructs its action
  from the configured public write origin.
- The shared comments decoder rejects literal SMTP passwords and supports
  named secret indirection through `passwordEnv`.
- The tracked public site is currently comments-disabled by design.
- The owner approved `config/secrets.env` as the local secret input and the
  same variable contract from a private production path. The real password
  must not be read, copied, or recorded by the agent.

## Decisions

- The first deployment uses the existing public site origin and same-origin
  `/v1/*` reverse-proxy routing. A separate comments domain is not required for
  the MVP; it remains a future isolation option.
- `/v1/` is scoped by virtual host, not globally reserved by comments:
  `<production-host>/v1/*` and `<development-host>/v1/*` may have different
  upstreams and data boundaries when their Nginx `server_name` blocks are
  separate.
- The static site and comments service run on the same device as separate
  runtimes. The comments port is private to the local container/network or
  loopback; only the public reverse proxy handles HTTPS traffic.
- `config/site.toml` remains public build configuration and keeps only the
  `passwordEnv` indirection. Local development uses an ignored,
  owner-readable `config/secrets.env`; production supplies the same variables
  through a private, read-only deployment path. No literal SMTP password is
  added to either site configuration or task records.
- `core.db` retains the current comments tables and platform/plugin metadata for
  compatibility. Future plugins own their data in independently migrated DB
  files or schemas and access core metadata only through an explicit boundary.
- SQLite is the only first-release runtime driver. This task locks and tests
  the dialect-neutral adapter, migration, backup, restore, and integrity
  contracts; MariaDB/MySQL runtime support is deferred to a later task.
- The task is temporary and operationally private: SSH, sync endpoint,
  filesystem target, and deployment identifiers are supplied through the
  operator channel only and are not copied into repository records.

## Acceptance Criteria

- [ ] A same-device deployment topology is implemented/documented and verified
      without publishing the comments service port directly; `/v1/*` remains
      same-origin at the existing public site origin.
- [ ] Reverse-proxy routing, HTTPS/TLS termination, allowed-origin behavior,
      health checks, and rollback behavior are validated before comments are
      enabled. DNS/TLS changes remain operator-gated.
- [ ] Host-scoped routing proves that the production `/v1/*` path cannot
      accidentally reach a development upstream (or its database), and vice
      versa.
- [ ] Zoho SMTP delivery works with the named sender and a runtime-injected
      password; no password appears in Git, generated artifacts, logs, or task
      records.
- [ ] `config/secrets.env` is ignored, private, permission-checked, and never
      enters the static build or Docker image; a safe template documents the
      required variable names without a real value.
- [ ] `core.db` and plugin-owned storage have explicit ownership, migration,
      backup, restore, integrity, and retention contracts.
- [ ] SQLite is supported for the first deployment and the MariaDB/MySQL
      adapter boundary is explicitly deferred with no change to current
      comments behavior.
- [ ] Comments remain disabled until all deployment gates pass, and a rollback
      to the previous static release remains tested.
- [ ] Task artifacts contain no remote host, synchronization endpoint, secret,
      or operational identifier.

## Out of scope

- Recording or committing the supplied SSH alias, host, remote filesystem,
  synchronization command details, or production release identifiers.
- Reading, testing, copying, or rotating the real Zoho application password.
- Enabling comments in the tracked production configuration before the owner
  reviews the complete staging and public smoke evidence.
- Shipping a MariaDB/MySQL driver or claiming MariaDB/MySQL end-to-end support
  in the SQLite-first rollout.
