# M5.1 External Comments Provisioning — Technical Design

## 1. Scope and approved decisions

This task takes the already implemented M5.1 comments service through a
cross-layer route normalization and an owner-operated provisioning/verification
sequence. It does not enable comments in tracked configuration or claim a
public product rollout.

Approved decisions:

- `/v1/` is a version root for first-party APIs, not a comments-only catch-all.
- Every current comments route moves below `/v1/comments/` before provisioning.
- The edge forwards only `/v1/comments/` to the comments runtime. Unknown
  `/v1/*` resources fail closed.
- `/healthz` remains a separate bounded health endpoint with its existing
  visibility and response contract.
- Provisioning and verification end with `comments.enabled = false` in tracked
  configuration. Public enablement is a later explicit release decision.
- SQLite is the only first-release runtime driver; MariaDB/MySQL remain a
  deferred adapter boundary.

The task remains one serial task rather than a parent with parallel children.
Route migration and provisioning are independently testable, but the route
migration is a hard prerequisite for edge configuration and the external steps
share privacy, data rollback, and final operator handoff gates. Splitting them
would not permit safe parallel progress and would duplicate the same boundary
review.

## 2. API route boundary

The current implementation is not externally deployed, so the old paths do not
need compatibility aliases. The migration changes every producer, consumer,
proxy, test, and durable contract together:

| Current path | Approved path | Ownership |
| --- | --- | --- |
| `POST /v1/submissions` | `POST /v1/comments/submissions` | public write |
| `GET /v1/verify/<token>` | `GET /v1/comments/verify/<token>` | token verification |
| `GET /v1/control/<token>` | `GET /v1/comments/control/<token>` | reader self-control |
| `POST /v1/control/<token>/delete` | `POST /v1/comments/control/<token>/delete` | reader deletion request |
| `GET /v1/admin/comments` | `GET /v1/comments/admin/comments` | private moderation queue |
| `GET /v1/admin/export` | `GET /v1/comments/admin/export` | private sanitized export |
| `POST /v1/admin/comments/<id>/<action>` | `POST /v1/comments/admin/comments/<id>/<action>` | private moderation |
| `GET /healthz` | unchanged | bounded health |

The service keeps its existing validation, token, moderation, export, and
generic-error semantics. This task changes the path namespace only; it does
not create a public comments read API or change the payload schema.

The edge topology is explicit:

```text
browser / temporary staging form
        │
        ▼
<public-origin>/v1/comments/*
        │ host/SNI selects the server first
        ▼
private comments upstream
        │
        ├── core.db and plugin-owned SQLite data
        ├── private notification outbox
        └── owner-injected SMTP transport

<public-origin>/v1/* (unknown resource) ──> bounded 404
<public-origin>/healthz                ──> existing health owner
all other paths                        ──> immutable static release
```

The container-local Nginx image mirrors the explicit comments prefix for the
opt-in Compose profile. The operator-owned host edge must select the virtual
host before applying the `/v1/comments/` location, preserve the original host
headers, and use separate upstreams/data/secrets for production and
development.

## 3. Cross-layer ownership and data flow

### Static site

`apps/site/` owns only the public comments projection and the form action. A
temporary enabled staging build may receive a sanitized local export, but the
tracked default remains disabled and the site never receives the database,
private email, admin token, SMTP password, or outbox state.

### Comments service

`services/comments/` owns write validation, consent, verification, moderation,
reader control tokens, notification outbox, SMTP delivery, SQLite migrations,
backup/restore, and the sanitized export. It listens privately and has no
publicly published service port.

### Edge and operator boundary

The repository provides neutral container and host-edge examples. The owner
controls the exact host/SNI, TLS certificate selection, upstream target,
runtime secret input, backup destination, and deployment identity. Exact values
must remain in the operator channel or ignored owner-only inputs.

### Publication and rollback

The service export is a local build input, not a browser API. Static release
rollback uses the existing immutable release/tombstone rules. Data rollback
restores a verified new data root and switches only after an operator smoke
test; it never overwrites the active root during restore.

## 4. Configuration and secret flow

```text
config/site.toml                 public/non-secret settings
  └── comments.public + named passwordEnv indirection

owner-only runtime input         SMTP password, tokens, paths, origins
  └── private read-only mount or supervisor environment

comments service                 runtime projection + explicit env overrides
  ├── private core/plugin storage
  └── notification worker

static site/publication          sanitized export only
```

The route migration must not weaken the existing configuration decoder. The
public TOML projection remains the single site-facing source, and a literal
SMTP password remains invalid. Secret values are never read for repository
tests, pasted into task records, or emitted in diagnostics.

## 5. Provisioning and verification gates

The gates are sequential because each later check depends on an earlier
boundary:

1. Route migration is type-checked, tested, built, and statically inspected.
2. The disabled publication still builds and contains no comment surface.
3. The owner-authorized runtime preflight verifies the target through a private
   operational input without recording its identity.
4. The comments runtime is installed beside the static release with private
   networking, read-only root, non-root execution, healthcheck, and protected
   writable data mounts.
5. Host-scoped `/v1/comments/` routing, wrong-host isolation, TLS/origin,
   allowed-origin, direct-port refusal, static-route behavior, and fail-closed
   behavior are verified.
6. SQLite migration/integrity and backup/restore-to-new-location are tested;
   the active data root remains untouched on failure.
7. Controlled SMTP delivery is exercised with owner-injected credentials. Only
   a redacted pass/fail result is retained.
8. If a safe staging or temporary enabled projection exists, browser submission
   and verification smoke coverage exercises the new public path. Otherwise it
   is recorded as deferred and no enablement claim is made.
9. Final repository, privacy, runtime, and rollback evidence is reviewed. The
   tracked site remains comments-disabled.

## 6. Compatibility, risks, and rollback

- No old-path aliases are required because the service has not been externally
  deployed and no production verification links are in circulation.
- A route migration failure stops before any external mutation. The affected
  source changes can be reverted as one bounded code change.
- An edge failure leaves the immutable static release serving non-API paths;
  unknown API resources must not reach comments.
- A missing comments runtime fails closed for `/v1/comments/*` and does not
  turn static pages into SSR.
- A failed migration, backup, restore, SMTP check, or public smoke check stops
  the sequence and leaves the previous static release and active data root
  untouched.
- DNS/TLS, provider account readiness, backup-destination encryption, and
  final comments enablement remain owner decisions. The task must not claim
  these are complete without direct evidence.
