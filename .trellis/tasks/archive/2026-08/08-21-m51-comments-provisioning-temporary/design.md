# M5.1 Comments Provisioning and Storage — Technical Design

## 1. Boundary and rollout intent

This task joins the already implemented comments service to a same-device
deployment shape and gives its private data a durable storage boundary. It does
not turn the Astro site into SSR, add a browser-side comments read API, or put
credentials into the public site configuration.

The tracked site remains the public static release. The comments service is a
separate private runtime. The first operational driver is SQLite; the adapter
and migration contracts are dialect-neutral so a later MariaDB/MySQL driver can
be added without moving the current comments data or changing the HTTP/public
export contract.

## 2. Host-scoped same-origin topology

The first deployment uses the owner-configured public site origin for both
static pages and write/verification links. The exact origin is runtime
configuration, not a Trellis project-record value:

`/v1/` is a path namespace inside a selected virtual host. It is not a global
Nginx namespace and it is not owned by the comments plugin across every domain:

```text
Host/SNI selection                    path selection inside that host
<production-host>  ──> production server   /v1/* ──> production comments API
<development-host> ──> development server  /v1/* ──> development API or no route
```

Nginx selects the `server` block by SNI/`Host` before it evaluates
`location /v1/`. Therefore the two URLs do not interfere when their
`server_name` blocks and upstreams are distinct. They can share port 443 and a
certificate, while still using separate service ports, databases, secrets, and
allowed-origin lists. Sharing the same comments database between production
and development is not the default and requires an explicit future decision.

```text
browser
  ├── <public-origin>/       ── TLS edge ──> static web runtime
  └── <public-origin>/v1/*  ── TLS edge ──> static web reverse proxy
                                                   │
                                                   └── private network ──> comments:8787

comments:8787 ──> /var/lib/firefly-comments/core.db
              ├──> /var/lib/firefly-comments/plugins/<plugin-id>/...
              └──> /var/lib/firefly-comments/notifications.jsonl + state
```

- The static web runtime is the only service with a host/public port in the
  Compose topology. The comments service has no host port; it is reachable by
  the web proxy through the private Compose network, or by loopback in an
  equivalent production supervisor.
- The production edge `server` block for the public site owns an explicit
  `^~ /v1/` proxy location and forwards the original path and method to the
  production comments service. It preserves the existing static `try_files`
  behavior for every non-`/v1/` path. A development `server` block may use the
  same path prefix for a different upstream without changing the production
  block.
- A missing comments runtime fails closed for `/v1/*` with a proxy error; it
  does not make static pages SSR or expose a database. The tracked site remains
  `comments.enabled = false` until all gates pass.
- The repository may add an opt-in Compose profile for the comments runtime so
  the existing static-only `docker compose up` remains usable. Starting that
  profile requires a local private secret file and explicit operator intent.
- DNS and TLS are edge/operator responsibilities. Before enabling comments,
  verify that the public origin resolves to the device, the certificate covers
  the origin, `/v1/*` reaches the proxy, `Origin`/CORS behavior allows only the
  intended origin, and no direct comments port is externally reachable. A
  separate development hostname is compatible with this design; it is not a
  second public comments hostname.

### Production edge versus the local image

The supplied deployment configuration follows the correct production pattern:
the production blog virtual host groups its canonical host aliases, while other
hostnames have separate `server` blocks and loopback upstreams. The Firefly repository's
`nginx.conf` currently uses `server_name _` because it is the static image's
container-local default server. If production and development hosts were sent
into that one default server, a single `/v1/` location would apply to both
hosts. It must not be treated as the production host router.

Production deployment therefore keeps host-specific `server_name` and
TLS/upstream selection in the edge Nginx configuration. The repository image
may mirror the `/v1/` proxy for local Compose tests, but it must forward the
original `Host`, `X-Forwarded-Host`, and `X-Forwarded-Proto` values and must not
encode a concrete external hostname or a second application's API into the
Firefly static release.

## 3. Configuration and secret flow

There are three distinct inputs:

```text
config/site.toml                 public/non-secret TOML
  └── [comments] public + SMTP metadata + passwordEnv

config/secrets.env                local ignored file, mode 0600 or stricter
  └── runtime-only variables, including SMTP password and service secrets

production private mount/env-file private deployment input
  └── same variable names as config/secrets.env
```

`config/site.toml` remains the single public site-config source. Its
`passwordEnv` value is only an environment-variable name. The implementation
must not read the real password while editing or testing the repository.

### Loader contract

The comments runtime gets a `COMMENTS_SECRETS_FILE` override. For local
development it may fall back to the repository-relative `config/secrets.env`;
production must use an explicit private path or supervisor-managed env-file.
The loader:

1. accepts only a small dotenv subset (`KEY=VALUE`, blank lines, and comments);
2. never shells out, expands commands, follows variable expansion, or logs
   values;
3. rejects malformed lines, invalid variable names, duplicate keys, and
   non-regular files;
4. requires the file to be owner/application-readable only (no group/other
   permission bits; the deployment preflight may require exactly `0600`);
5. merges file values only when the process environment does not already define
   the variable, preserving explicit runtime overrides;
6. returns the same `COMMENTS_*` environment contract used by the existing
   plugin decoder, SMTP worker, and service runtime.

The local file is never automatically loaded by the static build. The Docker
build context excludes it, the static image does not copy it, and the comments
container receives it only as a read-only runtime mount. A tracked
`config/secrets.env.example` documents names and safe placeholders; the actual
`config/secrets.env` is ignored and contains no agent-supplied credential.

Required runtime-only values remain outside `site.toml`: route catalog,
encryption/token/admin material, allowed origins, database path overrides, and
the SMTP application password. The owner supplies the Zoho-specific values and
sender identity at runtime. SMTP delivery is exercised only after the runtime
secret is present, and failures must not print the password.

## 4. Storage boundary

### Core database

The platform-owned database is:

```text
/var/lib/firefly-comments/core.db
```

It contains:

- the existing `schema_migrations`, `service_metadata`, `comments`, and
  `audit_events` tables, preserving current comment behavior and tombstone
  semantics;
- core/plugin registry and storage-catalog metadata needed to discover enabled
  plugins and their storage contracts;
- no plugin-specific business rows beyond the small metadata required to
  manage the plugin boundary.

`COMMENTS_DATABASE_PATH` remains an explicit compatibility override. A legacy
`comments.sqlite` is not silently deleted or renamed: migration first makes an
owner-only verified backup, opens it with the current test suite, applies the
core migrations to a new `core.db`, and switches the runtime only after the
restore/integrity checks pass. If there is no legacy database, the first
runtime creates `core.db` directly.

### Plugin-owned storage

Each future plugin receives a catalog entry with a stable plugin id, dialect,
relative storage location, schema/migration version, and lifecycle state. Its
data lives below a private plugin root, for example:

```text
/var/lib/firefly-comments/plugins/<plugin-id>/data.db
```

The exact filename is an implementation detail, but the catalog must reject
absolute paths, traversal, duplicate ownership, and a path that escapes the
private data root. Plugin code accesses its own adapter/repository boundary;
it does not issue ad-hoc SQL against core tables or rely on cross-database
foreign keys/transactions.

### Dialect-neutral adapter

Define the smallest shared contracts needed by service code and operations:

- `DatabaseDialect = 'sqlite' | 'mariadb' | 'mysql'`;
- a connection/transaction interface for parameterized queries and close;
- a migration manifest/runner with ordered, idempotent versions;
- an integrity probe and backup/restore provider;
- a storage catalog record that binds plugin id, dialect, location, and schema
  version.

Only the SQLite implementation is wired in this task. It uses the existing
`node:sqlite` repository and migration behavior, with `core.db` as the default.
The MariaDB/MySQL dialects are type-level/contract-level extension points only:
there is no driver dependency, network connection, or end-to-end support claim
until a later task supplies one.

The migration source must have one owner. The current inline/standalone schema
representations are reconciled so a new migration cannot be added to one copy
and missed by another. The existing `CommentRepository` interface remains the
service compatibility seam.

## 5. Backup, restore, and rollback

Backups are private operational artifacts, never publication inputs. A backup
set contains:

- a manifest with schema versions, dialects, relative paths, timestamps, and
  SHA-256 checksums;
- a consistent snapshot of `core.db`;
- one snapshot per plugin-owned database;
- the notification outbox and delivery-state files when replay is required,
  recorded as separate private artifacts;
- no SMTP password or runtime secret file.

The first SQLite implementation keeps the current stop-writes/checkpoint/
`VACUUM INTO` behavior, adds catalog-aware iteration, and runs integrity checks
on every produced and restored database. Restore always targets a new path,
refuses overwrite, verifies the manifest/checksums/schema before selection, and
switches the service only after a smoke test. Retention and encryption are
operator-owned requirements for the backup destination; the repository scripts
must not claim to encrypt data they only snapshot.

Static rollback and data rollback stay separate:

```text
bad static candidate  ──> existing immutable release/symlink rollback
bad data migration    ──> verified restored core/plugin set, then service restart
```

The publication tombstone epoch remains authoritative for static comments
rollback. No older public release may be selected merely because its HTML is
otherwise valid.

## 6. Compatibility and failure policy

- Keep the existing HTTP routes, public export schema, route catalog, and
  disabled-build behavior unchanged.
- Do not import database types into `apps/site/`, `dist/`, or publication
  metadata beyond the existing sanitized comments export.
- Missing or incorrectly protected secret files fail the private service
  preflight with a generic path/error description, never with contents.
- Missing SMTP credentials prevent the delivery worker from starting; they do
  not make the static build consume a secret or emit one in logs.
- A failed database migration, backup, restore, proxy check, or TLS/origin
  probe stops promotion and leaves the previously working static release and
  active data path untouched.
