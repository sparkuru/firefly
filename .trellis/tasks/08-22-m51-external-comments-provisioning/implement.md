# M5.1 External Comments Provisioning — Implementation Plan

## Review gate before activation

- [ ] The owner has approved the final planning summary and the task remains
      in `planning` until `task.py start` is explicitly authorized.
- [ ] The existing user changes in `.trellis/spec/guides/` are preserved and
      excluded from route-migration staging unless explicitly intended.
- [ ] Exact deployment targets, hostnames, accounts, mailbox values, private
      paths, release IDs, and credentials remain in the operator channel or
      owner-only ignored inputs.
- [ ] The real SMTP password is never read, printed, copied, tested by the
      repository agent, or committed.
- [ ] The route namespace decision and the no-enablement decision are recorded
      in `prd.md` before implementation begins.

## Ordered implementation steps

### 1. Refresh project context

- Load `trellis-before-dev` and the frontend specs named in
  `implement.jsonl` before editing source.
- Confirm the Node/Docker boundary through `./sam`, the current task pointer,
  the dirty worktree, and the exact route-reference file set.
- Preserve archived task records as historical evidence; update only current
  contracts and the active task evidence when the implementation teaches a
  durable rule.

### 2. Normalize the comments route namespace

- Update `services/comments/src/http.ts` to recognize the approved
  `/v1/comments/*` paths while preserving method, payload, auth, token, and
  generic-error behavior.
- Update notification links in `services/comments/src/smtp.ts` and the static
  form action in `apps/site/src/plugins/comments/CommentSection.astro`.
- Update container and operator edge examples so only `/v1/comments/` is
  proxied; add an explicit fail-closed unknown `/v1/` location where required.
- Update service/site/provisioning tests, `services/comments/README.md`, root
  `readme.md`, and the current comments/publication contract.
- Search source and current specs for stale unscoped routes. Do not rewrite
  archived task history merely to make historical evidence match the new
  contract.

### 3. Run route and static validation

- Run comments type-check, tests, and build through `./sam`.
- Run site content/config/static-output checks and build with the tracked
  comments-disabled configuration.
- Run the focused publication/assembler checks that consume the comments
  contract.
- Verify old routes return 404 in service tests, new routes are present in
  generated notification/form output, and unknown `/v1/*` routes do not reach
  the comments upstream.

### 4. Build the production-shaped local artifacts

- Run the repository M5.1 check/test/build sequence and the runtime packaging
  probes before any remote mutation.
- Validate Compose configuration, image confinement, private mounts, health,
  no host-published comments port, static route behavior, headers, 404s, and
  teardown.
- If browser smoke needs an enabled projection, create only an ignored,
  temporary, sanitized staging fixture. Never alter tracked enablement or add
  private data to the fixture.

### 5. Perform owner-authorized operational preflight

- Load the remote-server workflow only when the owner supplies an approved
  operational target through the private channel.
- Run the smallest read-only baseline first: runtime availability, current
  static release/rollback state, edge configuration shape, private storage,
  and service supervisor/container capabilities.
- Keep target details and raw output outside task/spec/journal files. Stop if
  the target, credentials, or rollback authority is missing.

### 6. Provision the private comments runtime

- Install or stage the comments runtime beside the immutable static release
  using the already-tested Compose or supervisor shape.
- Use private networking/loopback, no public comments port, non-root execution,
  read-only root filesystem, protected data volume, healthcheck, dropped
  capabilities, and no-new-privileges.
- Mount public configuration and private secrets read-only with permission
  preflight. Do not put the secret file in a static image or build context.
- Initialize or migrate SQLite storage only through the existing checked
  migration/legacy-copy boundary.

### 7. Configure and verify the host-scoped edge

- Apply the owner-managed host/SNI selection before the explicit
  `/v1/comments/` proxy location.
- Preserve original host/proto forwarding, static route handling, security and
  cache headers, and distinct 404 ownership.
- Verify production/development upstream and database isolation, unknown
  `/v1/*` failure, missing-runtime failure, direct-port refusal, and normal
  static serving.
- Verify DNS/TLS/origin and allowed-origin behavior. Record only redacted
  outcomes; leave operator-specific configuration outside Git.

### 8. Exercise SMTP and storage operations

- Run the controlled owner-authorized SMTP test with runtime-injected secrets;
  inspect only success/failure and generic logs.
- Stop writes, create a complete private backup set, verify checksums and
  SQLite integrity, restore to a new absent root, run a smoke test, and prove
  that the active root is unchanged on failure.
- Verify retention metadata and owner-controlled backup protection without
  claiming repository-provided encryption.

### 9. Run staging/public verification without enablement

- If an owner-approved staging or temporary enabled projection exists, exercise
  form submission, verification link, moderation/export handoff, and browser
  behavior through `/v1/comments/*`.
- Confirm the public artifact contains only the sanitized export and no private
  sentinels.
- Keep tracked `comments.enabled = false`, do not promote the temporary
  projection as production, and record browser validation as deferred if no
  safe staging path exists.

### 10. Final quality review and handoff

- Run the full validation matrix below and classify each unavailable command
  with its exact non-sensitive error.
- Run a repository privacy scan over the complete diff and all active task
  artifacts. Confirm no operational identity or credential was captured.
- Update current frontend specs only with durable route/runtime contracts and
  update `.trellis/mainline.md` to the post-provisioning, enablement-pending
  state only after external evidence exists.
- Review the exact file list, commit the route/runtime work according to the
  project commit convention, archive the task only after the quality gate, and
  report that final public enablement remains a separate decision.

## Validation commands

```sh
./sam node --version
git diff --check

./sam npm --prefix services/comments run check
./sam npm --prefix services/comments run test
./sam npm --prefix services/comments run build
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm run check:m51
./sam npm run test:m51
./sam npm run build:m51
docker compose config --quiet
./package-runtime.sh

bash -n sam package-runtime.sh services/comments/ops/*.sh
shellcheck sam package-runtime.sh services/comments/ops/*.sh
shfmt -d sam package-runtime.sh services/comments/ops/*.sh
```

Run the repository's focused service/site/publication Playwright suites through
the declared `SAM_IMAGE`/`SAM_IPC` boundary when the relevant static or
temporary staging fixture is available. Do not substitute host Node, global
Playwright, raw Docker tests, or an unrecorded manual result.

## Risk and rollback points

- Before route edits: record the exact source/test/spec file set and leave the
  pre-existing Trellis guide changes untouched.
- After route edits: stale unscoped paths or mismatched notification links are
  a stop condition; do not provision an edge against a partially migrated API.
- Before remote mutation: require a private operational target and a verified
  rollback target; otherwise stop with a blocker.
- Before data migration: make a verified owner-only backup and never overwrite
  the active destination.
- Before edge cutover: prove private listener health and host isolation; keep
  static serving independent of comments health.
- Before any staging/public smoke: use a temporary non-tracked projection and
  ensure no private data enters the publication.
- On any failed gate: preserve the previous immutable static release and active
  data root, remove only unreferenced candidates, and record a redacted reason.
