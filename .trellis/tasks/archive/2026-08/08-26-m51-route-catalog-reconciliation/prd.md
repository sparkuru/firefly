# M5.1 route catalog reconciliation

## Goal

Make the owner-controlled comments runtime route catalog exactly match the
article documents in the current immutable static release. This removes stale
runtime bindings before any later comments enablement decision while keeping
the static site and its rollback boundary unchanged.

## Confirmed facts

- The approved mainline state is `production_provisioned_pending_enablement`:
  the private service and edge are provisioned, while tracked comments remain
  disabled.
- The latest release-bound preflight found 93 emitted article routes versus
  108 configured routes: 22 emitted routes were missing from configuration and
  37 configured routes were stale. The preflight deliberately retained only
  redacted counts and wrote no route list.
- The emitted static release is the source of truth. Directory indexes are not
  article documents; canonical UTF-8 route encoding and the shared comments
  route predicate remain authoritative.
- The repository-relative comments configuration and the production
  plugin-owned configuration are owner-controlled inputs, not public site
  output. Secrets, SMTP delivery, database data, outbox state, DNS, TLS, and
  public enablement are outside this task.
- A previous quality review left three directly related, uncommitted
  hardening changes in the route preflight: release realpath containment,
  strict `<head>` article metadata parsing, and symlink-safe config/output
  parent checks. They are in scope for validation and the next work commit.
- The site canonical model currently serializes Unicode hrefs directly while
  the comments contract requires canonical percent-encoded routes. This is a
  separate enabled-publication compatibility risk; this task must not claim
  that route-list reconciliation alone makes the enabled Unicode form work.
- The first controlled restart exposed a stale production Compose runtime
  identity: the existing owner-only secret/data mounts belong to a different
  UID:GID than the image's default `node` user. The owner approved a narrowly
  scoped recovery on 2026-08-27 to align only the production comments runtime
  identity with those existing owners, preserving secret/data content and
  permissions.

## Requirements

### R1. Release-bound inventory

Inspect the exact release and current runtime config through the existing
route-catalog boundary. Walk only regular files/directories, reject symlinks,
special files, and realpath escapes, exclude shallow directory indexes, and
derive canonical routes from article documents using the shared predicate.

### R2. Safe candidate configuration

Produce an owner-local candidate in a temporary/private location whose only
semantic change is `runtime.postRoutes`: the complete emitted canonical set.
Validate the candidate before it can replace the active config. No route list,
mailbox, external identity, secret, or private deployment path may enter task
records or command output.

### R3. Controlled remote apply

After candidate validation, preserve an exact rollback copy of the active
owner-controlled config, install the candidate atomically, and restart or
reload only the comments service as required for config pickup. If the
existing owner-only mounts cannot be read by the current runtime identity,
the owner-approved recovery may align the production comments Compose
identity with those owners before the restart. Do not modify the immutable
static release, database, private data, outbox, secret file contents or
permissions, DNS, TLS, or edge configuration; no broader Compose rollout is
part of this task.

### R4. Post-apply verification

Re-run the release-bound preflight and require zero missing, stale, invalid,
or duplicate routes. Verify comments health, loopback binding, generic unknown
API behavior, and existing origin/security boundaries. If any check fails,
restore the rollback copy and leave the service in its prior known-good state.

### R5. Redacted evidence and disabled publication

Record only status/counts and the exact pass/fail/deferred consequence. Keep
tracked site comments disabled and make no public enablement claim. Preserve
the existing SMTP/outbox safety boundary; this task does not send mail.

## Acceptance Criteria

- [x] The preflight hardening changes pass the comments type check and full
      comments test suite.
- [x] A candidate runtime config is generated from the exact current release
      and changes only the canonical `runtime.postRoutes` inventory.
- [x] The active owner-controlled config is backed up and atomically replaced
      only after candidate validation; the original remains restorable.
- [x] The post-apply preflight reports zero missing, stale, invalid, and
      duplicate routes.
- [x] The comments service remains healthy, private, loopback-only, and
      non-public-port-bound after the controlled reload/restart.
- [x] Static release, comments data/database/outbox/secrets, edge, DNS, TLS,
      and tracked comments activation remain unchanged; the only permitted
      Compose change is the owner-approved production runtime UID:GID
      alignment, with its owner-only rollback copy retained.
- [x] Task evidence contains no route values, credentials, mailbox values,
      external identities, private deployment paths, or raw remote output.

## Out of scope

- Enabling tracked comments or publishing an enabled static/browser release.
- SMTP delivery, notification draining, historical comment import, or data
  migration.
- Broad or multi-environment Compose UID:GID rollout, edge/DNS/TLS changes, or
  credential rotation. A single owner-approved production comments runtime
  identity repair is permitted only to restore the existing owner-only mount
  boundary required by this task's restart gate.
- Changing canonical URL policy, article content, or the static release.

## Blocking open questions

None. The owner selected reconciliation against the current emitted release;
the remaining work is execution and verification within these boundaries. The
site href compatibility risk is explicitly deferred with enabled publication.
