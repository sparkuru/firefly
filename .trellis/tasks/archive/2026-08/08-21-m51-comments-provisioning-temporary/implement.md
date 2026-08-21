# M5.1 Comments Provisioning and Storage — Implementation Plan

## Review gate before activation

- [ ] Review `prd.md`, this design, and the context manifests.
- [ ] Confirm the working tree contains only this temporary planning task and
      no unrelated owner changes are overwritten.
- [ ] Obtain explicit approval of the final planning summary before running
      `task.py start`. Task creation approval is not implementation approval.
- [ ] Keep all SSH/sync target details in the operator channel or a temporary
      runtime profile only; do not copy them into this task or project specs.
- [ ] Never read, print, test, copy, or commit the real SMTP application
      password.

## Ordered implementation steps

### 1. Refresh project-specific context and establish evidence

- Read the frontend configuration, comments publication, development-runtime,
  directory-structure, quality, reuse, and cross-layer specifications through
  `trellis-before-dev`.
- Re-check Node/Docker availability through the repository boundary `./sam`.
- After activation, use the remote-task workflow for a minimal read-only host
  baseline. Keep the address and returned private identifiers out of files,
  logs committed to the repository, and final task artifacts.

### 2. Establish the private configuration boundary

- Add an exact `config/secrets.env` ignore rule and Docker build-context
  exclusion.
- Add a tracked `config/secrets.env.example` containing comments and safe
  placeholders only; create the ignored local `config/secrets.env` as an
  owner-only, empty/template input without a real password.
- Add a safe dotenv reader to the comments runtime. Validate file type and
  permissions, reject malformed/duplicate keys, merge explicit process
  variables with documented precedence, and keep values out of diagnostics.
- Add tests for file discovery, permission rejection, malformed input,
  duplicate keys, environment precedence, and secret non-leakage.
- Make the local/production path explicit through `COMMENTS_SECRETS_FILE` and
  document a read-only runtime mount. Do not make generic static `./sam`
  builds load the file.

### 3. Make the service runtime use `core.db`

- Change the first-release default from the legacy filename to
  `/var/lib/firefly-comments/core.db` while preserving the explicit
  `COMMENTS_DATABASE_PATH` override.
- Reconcile the migration source with the repository initialization path so
  the current comments tables remain in the platform database and are not
  duplicated or silently discarded.
- Add the core/plugin storage catalog and dialect-neutral adapter contracts.
  Keep the existing `CommentRepository` service seam and implement SQLite only.
- Add a verified legacy-database migration/upgrade path or documented command
  that copies `comments.sqlite` to `core.db` without destructive replacement.
- Add tests for fresh core creation, current comment round-trip, catalog path
  isolation, migration ordering, unsupported MariaDB/MySQL runtime failure,
  and SQLite integrity.

### 4. Extend backup/restore for the storage catalog

- Preserve current no-overwrite, owner-only, integrity-checked SQLite backup
  behavior.
- Add a manifest/checksum layer for core and plugin databases and a separate
  outbox/state artifact policy.
- Ensure restore is into an unreferenced destination, validates before switch,
  and leaves an existing active database untouched on failure.
- Add offline tests for backup, restore, checksum/integrity failure,
  permission checks, retention metadata, and rollback selection.

### 5. Wire same-device reverse proxy and runtime composition

- Add the production host-scoped `/v1/` reverse-proxy location while preserving
  static route handling and the existing security headers. Model the edge
  behavior from the owner-provided Nginx layout: select `server_name` first,
  then route `/v1/` to the matching environment. Do not make the repository's
  container-local `server_name _` a global router for `www` and `dev`.
- Test the production and development `/v1/*` paths with distinct Host/SNI
  inputs; prove that no request crosses the intended upstream, secret set, or
  database boundary.
- Add the comments runtime to the production-shaped Compose topology without a
  public port. Keep it opt-in or otherwise fail closed while the tracked site
  remains disabled; mount `site.toml` and the secret file read-only.
- Configure the service to use the internal hostname/private network, the
  `core.db` volume, healthcheck, non-root user, read-only root filesystem,
  dropped capabilities, and no-new-privileges settings already used by the
  project’s runtime contracts.
- Document the same-device startup, local secret permissions, SMTP worker,
  private admin access, and stop-writes backup procedure.
- Do not automate DNS changes, TLS certificate issuance, or remote promotion.

### 6. Run staged validation before any enablement

- Static and source checks: `git diff --check`, stale-route/privacy scans,
  configuration tests, service type-check/tests/build, and shell syntax/lint.
- Container checks through Docker: static image build must not contain
  `config/secrets.env`; comments image must not contain runtime data; comments
  port must have no host publication; read-only/private mounts and healthchecks
  must be inspectable.
- Runtime checks: private comments health, same-origin `/v1` proxy behavior,
  direct-port refusal, allowed-origin rejection, generic auth errors, and no
  secret values in logs.
- Database checks: create/write/export current comments, backup, restore to a
  new location, integrity-check, and verify static export compatibility.
- SMTP checks: use an owner-supplied controlled test window and runtime-injected
  Zoho credentials only. The agent reports success/failure without exposing the
  credential and does not rotate or delete it.
- Public checks: operator verifies DNS/TLS, reverse-proxy certificate/origin,
  and a browser submission/verification smoke test. Keep comments disabled until
  these checks are explicitly accepted.

### 7. Final review and handoff

- Run the full M5.1 checks/build and the existing publication/runtime probes
  using `./sam`; do not use host Node/npm as evidence.
- Run `trellis-check`, perform a final repository privacy scan, and update only
  durable configuration/storage contracts in `.trellis/spec/`.
- Review the exact file list. Confirm no secret, remote address, sync detail,
  backup payload, or private operational identifier is tracked.
- Record residual risks: MariaDB/MySQL remains deferred, DNS/TLS is operator
  owned, and comments remain disabled unless the owner authorizes enablement.
- Commit and archive only after the quality gate passes; retain rollback notes
  and remind the owner that production promotion is a separate approval.

## Planned file areas

Expected implementation areas, subject to `trellis-before-dev` and reuse
review:

- `.gitignore`, `.dockerignore`, `config/secrets.env.example`;
- `services/comments/src/config.ts` and focused config/secret tests;
- `services/comments/src/plugin.ts`, repository/migration/storage contracts,
  migrations, backup scripts/tests, and service README;
- `services/comments/Dockerfile`, `compose.yml`, and `nginx.conf`;
- relevant comments/publication/development specs and this task’s evidence.

No file under `tooling/sync-server/` is changed by the design unless a later
operator-approved deployment investigation finds a strictly necessary,
host-agnostic change. Its local host/sync data is never copied into project
records.

## Validation commands

```sh
node --version                         # repository requires Node >= 22.13.0
git diff --check
./sam npm run check:m51
./sam npm run test:m51
./sam npm run build:m51
./package-runtime.sh
bash -n sam dev.sh package-runtime.sh services/comments/ops/backup.sh services/comments/ops/restore.sh
```

Also run the project-prescribed ShellCheck/shfmt, Docker image/runtime probes,
publication Playwright checks, and targeted comments storage/secret tests when
their dependencies are available. A missing tool is recorded as unavailable;
acceptance criteria are not weakened to turn an unavailable check into a pass.

## Rollback points

1. Before implementation: leave all pre-existing owner changes untouched.
2. Before database switch: retain the verified legacy database and backup; do
   not delete or rename it in place.
3. Before service enablement: keep comments disabled and the previous static
   release active.
4. Before public promotion: require private health/proxy/origin/SMTP/restore
   evidence and owner confirmation.
5. If any gate fails: stop, preserve the active release/data path, and report
   the exact failing boundary without exposing private values.
