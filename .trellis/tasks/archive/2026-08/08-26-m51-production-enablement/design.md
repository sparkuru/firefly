# M5.1 Production Enablement Gates — Technical Design

## 1. Scope and decisions

This task closes the remaining production gates around the already implemented
static comments projection and private comments runtime. It adds a reusable
release route-catalog preflight, makes the production Compose identity
explicit, and exercises the owner-operated runtime through ephemeral probes.
It does not enable comments in tracked configuration and does not change the
active production process or data root during development.

The exact SSH target, deployment root, public origin, mailbox, release
identifier, and runtime secret values stay in the owner-operated channel. Task
records contain only placeholders, counts, redacted statuses, and command
shapes.

## 2. Release-bound route catalog

The current service accepts a configured `postRoutes` list, while the static
release is the authority for which public post documents exist. A new
`services/comments/scripts/validate-route-catalog.mjs` preflight joins those
boundaries without making the service read the static site at request time.

The preflight will:

1. walk a supplied static release using regular-file checks and no symlink
   traversal;
2. inspect only `posts/**/index.html` files and classify documents by the
   generated article metadata marker, excluding directory indexes;
3. derive the public route from the emitted path, encoding non-ASCII segments
   as uppercase UTF-8 percent escapes;
4. validate every derived and configured route through the shared
   `isCanonicalCommentsPostRoute` predicate;
5. compare the two sets, fail on invalid candidates, missing routes, stale
   routes, or duplicate canonical routes, and emit counts without route values;
6. optionally write a temporary `{ schemaVersion: 1, routes: [...] }` catalog
   for an operator to review and transfer into the owner-local runtime input.

The check is a deployment prerequisite. A filtered result is never reported
as complete coverage: invalid output or a set mismatch is a hard preflight
failure. The runtime retains the current `postRoutes` configuration shape for
compatibility; the operator runs this check against each exact release before
starting or enabling the service.

## 3. Container identity and secret boundary

The comments image keeps its portable default `USER node`. The production
Compose template changes from an implicit image user to a required
`COMMENTS_RUNTIME_USER` value supplied by the operator as the owner UID:GID of
the mounted secret and private data directory. Requiring the value prevents a
successful-looking start with a process that cannot read a `0600` secret.

The secret and config mounts remain read-only. The data mount remains the only
writable application boundary. The template keeps host networking with a
loopback listener, no published comments port, a read-only root, dropped
capabilities, no-new-privileges, and a healthcheck. The repository does not
guess or record the owner UID:GID.

The remote verification uses the current image with the discovered owner UID
in a temporary container, a temporary data root, a temporary route override,
and a non-production port. It proves a fresh process can load the same config
and secret without restarting the long-lived production container. Applying
the Compose template to the persistent runtime is an owner-operated follow-up
and is not performed by this task without a separate mutation gate.

## 4. SMTP and data probes

SMTP checks use the existing owner-local config and secret only inside a
production-shaped ephemeral container:

```text
protected config + secret (read-only)
        ├── non-sending TLS/AUTH probe
        └── isolated temporary outbox/state + one synthetic message
```

The synthetic message recipient is resolved inside the container as the
configured sender mailbox, which is the explicitly approved test boundary.
The real outbox and state file are never mounted. The temporary message uses a
valid route from the reconciled catalog, contains no production comment, and
is removed with the container. Only a redacted summary is retained; SMTP
authentication is not treated as proof of delivery.

Existing SQLite data and the active production container are read-only inputs
for these probes. No migration, backup overwrite, outbox drain, service
restart, credential rotation, DNS change, TLS change, or edge configuration
mutation is part of the development run.

## 5. Edge, static, and browser boundaries

The host edge remains owner-managed. Verification records status classes only:

- private health and `/v1/comments/*` reachability;
- unknown `/v1/*` fail-closed behavior and generic error responses;
- allowed-origin behavior and direct-port refusal;
- static route status, security headers, and separate site/experiment 404s.

The tracked site stays static and comments-disabled. An enabled browser run is
attempted only against an ignored, repository-relative sanitized fixture and a
temporary service/data root. If a safe enabled build or browser target cannot
be created without touching owner files, the browser/public enablement gate is
recorded as deferred and no rollout claim is made.

## 6. Rollback and compatibility

The route preflight is additive and leaves the existing service route payload,
outbox format, export schema, and static-disabled default unchanged. The
Compose identity is explicit but operator-configurable, so a deployment with a
different owner UID:GID can set its own value without changing image content.

All remote temporary containers are labeled and removed by exact name. The
active static release, previous release, production data root, production
outbox, and owner secrets remain untouched. A failed local check leaves the
tracked configuration disabled. A later owner rollout can revert to the prior
Compose/data path and immutable static release independently.

## 7. Expected implementation surface

- `services/comments/scripts/validate-route-catalog.mjs` and its focused test;
- `plugins/comments/compose.yml` and operator README wording for the explicit
  runtime identity;
- provisioning/ops contract tests for the new Compose requirement;
- the active task's redacted gate evidence and, if the implementation reveals
  a durable contract change, the relevant Trellis spec update.

No UI design or UUPM research is needed: the task does not add or restyle a
user-visible interface.
