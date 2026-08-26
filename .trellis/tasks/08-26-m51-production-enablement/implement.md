# M5.1 Production Enablement Gates — Implementation Plan

## Review gate before activation

- [ ] Review `prd.md`, `design.md`, and this checklist; the PRD has no
      unresolved product decision.
- [ ] Confirm the worktree contains only the active planning task and preserve
      the owner-local ignored config and secret files.
- [ ] Keep exact SSH/deployment/mailbox/release details out of task records,
      logs, and commits.
- [ ] Obtain explicit approval of the final planning summary before running
      `task.py start`; planning approval is separate from task creation.

## Ordered implementation steps

### 1. Load implementation context

- Run `trellis-before-dev` for the comments service, frontend runtime, and
  publication layers before editing product files.
- Load the curated `implement.jsonl` and `check.jsonl` entries, then re-read
  the active PRD/design/implementation artifacts.
- Confirm `./sam`, Docker, the locked Node image, and the browser image
  boundary are available. Do not use host npm or raw Docker as project
  validation evidence.

### 2. Add the release route-catalog preflight

- Implement the static release walker and article-document classifier in
  `services/comments/scripts/validate-route-catalog.mjs`.
- Derive routes from emitted paths, use uppercase UTF-8 percent encoding, and
  call the shared canonical route validator rather than weakening it.
- Parse only the non-secret `runtime.postRoutes` list from the supplied plugin
  TOML; never load the secret file for this check.
- Fail closed for symlinks, malformed paths, invalid article candidates,
  duplicate canonical routes, missing routes, and stale configured routes.
- Keep normal output redacted to counts/status; write an optional catalog only
  to a caller-selected temporary or owner-local path.
- Add focused tests for ordinary nested posts, directory-index exclusion,
  canonical Unicode routes, malformed/unsafe routes, and mismatch reporting.

### 3. Make the production identity explicit

- Change the plugin Compose template to require an operator-supplied
  `COMMENTS_RUNTIME_USER` UID:GID matching the owner-only secret/data mounts.
- Preserve the existing read-only mounts, loopback host networking, no public
  port, dropped capabilities, no-new-privileges, read-only root, and health
  contract.
- Update the service README and provisioning tests so a missing identity is a
  visible configuration error and a matching numeric identity is the expected
  production shape.
- Keep the Dockerfile's portable non-root default and do not put a secret or
  owner-specific value in the image.

### 4. Run local validation

- Run `git diff --check` and the focused route/Compose tests.
- Run the comments package check/test/build through `./sam`.
- Validate Compose syntax with an explicitly supplied local UID:GID and no
  service startup.
- Run the existing publication/static checks that cover disabled comments,
  canonical routes, privacy scanning, and release rollback metadata.
- Review generated output and test logs for credentials, mailbox values,
  external identities, absolute private paths, or raw remote output.

### 5. Run remote production-shaped ephemeral probes

- Use the remote-server workflow with the owner-authorized target and repeat a
  minimal read-only baseline before any probe.
- Discover the mounted secret owner UID:GID without printing it; use it only as
  an ephemeral container argument. Do not change the long-lived Compose
  project, permissions, secret contents, or active data root.
- Reconcile the exact current static release against the configured route list
  with the new preflight. Exclude directory indexes and verify canonical
  non-ASCII route encoding. Keep only redacted counts and status.
- Start a fresh temporary service with the matching UID:GID, isolated temporary
  data, read-only config/secret mounts, dropped capabilities, no-new-
  privileges, read-only root, loopback-only temporary port, and the reconciled
  route list. Probe health, allowed-origin behavior, generic errors, and
  unknown `/v1/*`; remove the exact temporary container afterward.
- Run the non-sending SMTP TLS/AUTH probe, then the one approved synthetic
  delivery to the configured sender mailbox. Use a temporary outbox/state
  fixture and retain only `{ queued, delivered, skipped, failed }` plus a
  redacted outcome. Never run the real delivery worker against production
  outbox files.
- Probe the owner edge and static publication by status/header labels only.
  Record unavailable checks precisely without exposing the public origin.

### 6. Browser/publication gate

- Attempt the enabled build only with an ignored, repository-relative,
  sanitized fixture and temporary runtime/data boundaries.
- If a safe temporary target exists, run focused form, verification,
  moderation/export, canonical-route, privacy, and static-output checks using
  the locked browser boundary.
- If the enabled projection or browser target is unavailable, record the gate
  as deferred with its consequence: tracked comments remain disabled and no
  public enablement claim is made.

### 7. Finish and hand off

- Run the full applicable Trellis quality check and final privacy scan. Update
  the comments/runtime spec only for durable behavior introduced by the
  implementation.
- Review the complete diff, active task artifacts, ignored-file boundaries,
  and remote evidence. Confirm the immutable static rollback target and active
  data root were not changed.
- Record passed, failed, unavailable, and deferred gates in a redacted
  operator handoff, including the required post-development credential
  rotation and the remaining separate rollout decision.
- Commit and archive only after the quality gate passes; keep tracked comments
  disabled.

## Validation commands

```sh
git diff --check
./sam npm --prefix services/comments run check
./sam npm --prefix services/comments run test
./sam npm --prefix services/comments run build
COMMENTS_RUNTIME_USER="$(id -u):$(id -g)" docker compose -f plugins/comments/compose.yml config --quiet
./sam npm run test:m4
./sam npm run build:m4
```

The route preflight's exact release/config arguments are supplied through the
owner channel or temporary test fixtures. They are not copied into Trellis
records.

## Rollback points

1. Before editing: preserve all ignored owner-local config and secret files.
2. Before any remote probe: use only temporary containers and mounts; retain
   the long-lived service and active data root.
3. Before any owner rollout: retain the prior Compose/data path and immutable
   static release until the handoff is accepted.
4. On any route, secret, SMTP, edge, browser, or privacy failure: stop the
   enablement sequence, remove only exact temporary artifacts, and leave
   tracked comments disabled.
