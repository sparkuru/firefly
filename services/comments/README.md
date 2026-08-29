# Firefly comments service

This package is the private `comments` runtime. It owns write, verification,
moderation, notification, and storage state; it is not a public comment-read
API and it is never part of the static publication image. The site receives
only an owner-reviewed `comments.public.v1.json` export.
The static build consumes that contained artifact only when the operator sets
`FIREFLY_COMMENTS_EXPORT`; the service never writes the publication tree.

## Same-device runtime

The default Compose service is static-only. The opt-in `comments` profile adds
the private service beside Nginx without publishing port `8787`:
The container uses a read-only root filesystem (`--read-only`) with only the
private data volume and temporary filesystem writable.

```sh
docker build --tag firefly-comments:local -f services/comments/Dockerfile .
./sam npm run build:m4
docker compose --profile comments up --build -d
docker compose --profile comments ps
docker compose --profile comments down
```

The comments process and the web proxy share a private network namespace. The
proxy forwards only same-origin `/v1/comments/*` requests to its loopback
listener; unknown `/v1/*` resources fail closed and all other paths continue
to use the immutable static release. If the comments process is absent,
`/v1/comments/*` fails closed with a proxy error and static pages do not become
SSR.

The plugin-local production Compose template requires
`COMMENTS_RUNTIME_USER` as an explicit numeric UID:GID. It must match the
owner of the owner-only `secrets.env` file and the private `data/` directory;
the image's portable default remains `USER node`. Discover the identity from
the mounted entries with `stat` rather than reading or copying their contents:

```sh
test -f secrets.env && test ! -L secrets.env || exit 1
test -d data && test ! -L data || exit 1
runtime_user="$(stat -c '%u:%g' -- secrets.env)" || exit 1
data_user="$(stat -c '%u:%g' -- data)" || exit 1
test -n "$runtime_user" && test "$runtime_user" = "$data_user" || exit 1
COMMENTS_RUNTIME_USER="$runtime_user" docker compose --profile comments up --build -d
unset runtime_user data_user
```

Keep the discovered value in the owner-operated environment only. Do not put
an owner UID:GID, secret, mailbox, or deployment path in the image, tracked
configuration, task records, or logs.

Production Nginx must select a host-specific `server` block before routing
`/v1/comments/`. The neutral example in `ops/nginx-hosts.conf.example`
demonstrates distinct production/development upstreams, an explicit
fail-closed unknown `/v1/` location, and deliberately contains no real
hostname, certificate path, or deployment identifier. DNS, TLS, certificate
selection, and the operator-owned edge include remain outside this repository.

## Private observability

The service keeps `/healthz` as its liveness endpoint and preserves its
existing `200` response, `{"ok":true,"status":"ok"}`. The process-local
`GET /readyz` endpoint checks that the service is open and that its repository
can answer the existing metadata query. It returns
`{"ok":true,"status":"ready"}` with `200`, or
`{"ok":false,"status":"not_ready"}` with `503`; dependency details are never
returned. `GET /metrics` is a private Prometheus text endpoint. Neither
`/readyz` nor `/metrics` is added to the public Nginx proxy route.

After every completed request, the process emits one newline-delimited JSON
record to its process stream with only these fields:

```json
{"requestId":"opaque-uuid","method":"GET","route":"liveness","statusCode":200,"outcome":"success","durationMs":3}
```

`method` is one of `GET`, `POST`, `OPTIONS`, or `OTHER`. `route` is one of the
fixed classes `liveness`, `readiness`, `metrics`, `submission`,
`verification`, `control`, `admin_queue`, `admin_export`,
`admin_moderation`, or `unknown`. Records never contain raw URLs or query
strings, request bodies, headers, tokens, public IDs, email addresses, IP
addresses, user agents, origins, secrets, filesystem paths, or exception text.

Metrics use the same finite labels and numeric status codes for request totals
and duration sum/count series. They are held in memory only and reset when the
process restarts. A metrics scrape is rendered before that scrape is counted,
so it does not include itself in its response.

Request records and metrics are private operator evidence. Retention, access
control, collection, and deletion follow the existing private host/container
policy; this package does not create a log file or persistent telemetry store.
Repository-local candidate promotion and rollback remain the assembler
boundary. Immutable deployment releases, `current` switching, crash recovery,
and production rollback remain deferred to the operator-owned deployment
boundary and require a separate approved operational task.

## Configuration and secrets

`config/site.toml` is public core/build configuration. Its single
`[plugins.comments]` projection keeps `enabled = false` by default and points
to the repository-relative `config/plugins/comments/config.toml`. The comments
service reads that plugin-owned file read-only for its private runtime
projection; the static site receives only the file's `[public]` section.

In production, the service is owned by `<deploy-root>/plugins/comments/`, with
`compose.yml`, `config.toml`, `secrets.env`, and owner-only `data/` beside one
another. The repository-relative `config/plugins/comments/` path is the local
build input/template path; it is not the production data directory.

Create the ignored plugin-local input from the tracked name templates only when
a private staging run is authorized:

```sh
mkdir -p plugins/comments/data
cp config/plugins/comments/config.toml.example plugins/comments/config.toml
cp config/plugins/comments/secrets.env.example plugins/comments/secrets.env
chmod 600 plugins/comments/secrets.env
```

`plugins/comments/secrets.env` is a small dotenv file containing only
secret values. `COMMENTS_SECRETS_FILE` selects an explicit path; otherwise the
service may use the owner-local plugin file for local development. The loader
rejects symlinks, non-regular files, broad permissions, malformed lines,
duplicate keys, known non-secret settings, and controls; it treats values
literally and never performs shell or variable expansion. Process environment
values take precedence over file values. The comments container mounts the
file read-only at `/run/secrets/comments.env`; the Docker build context
excludes both local files. Production may provide the same variable contract
through a private read-only mount or supervisor-managed environment file.

The plugin TOML keeps post routes, allowed/public origins, SQLite/data paths,
outbox paths, SMTP host/port/security/mailbox/from-name values, and the named
`passwordEnv` reference. A literal SMTP password is invalid in either public
or runtime TOML.

The SMTP worker is separate from the HTTP process. Use the owner-supplied
Zoho-compatible host and sender values only through the private runtime input,
with port `465` for implicit TLS or `587` for STARTTLS. No SMTP operation is
automated here, and no credential is required for the static build.

## Storage contract

The first runtime uses SQLite and stores the platform database at:

```text
/var/lib/firefly-comments/core.db
```

`COMMENTS_DATABASE_PATH` remains an explicit compatibility override and
`COMMENTS_DATA_ROOT` can select the private root for plugin-owned files. The
core database contains the current comments tables plus the platform-owned
plugin registry/storage catalog. Migration SQL under `migrations/` is the
single source of schema changes; the repository applies ordered, idempotent
versions and records them in `schema_migrations`.

Plugins own independent files below:

```text
/var/lib/firefly-comments/plugins/<plugin-id>/<relative-path>
```

The catalog validates a lowercase plugin id, a safe relative path, dialect,
schema version, and lifecycle state. Plugin business tables do not move into
`core.db`, use cross-database foreign keys, or issue ad-hoc core SQL. The
dialect contract names `sqlite`, `mariadb`, and `mysql`; only SQLite is wired
in this release. MariaDB/MySQL registration is a future adapter boundary and
fails closed if selected as a runtime driver.

Existing installations with a legacy `comments.sqlite` must be copied into a
new path before switching the service. The migration command verifies the
source, refuses an existing destination, applies current migrations, verifies
the new database, and leaves the old file untouched:

```sh
services/comments/ops/migrate-legacy.sh \
  /private/operator-input/comments.sqlite \
  /var/lib/firefly-comments/core.db
```

The exact source path belongs only in the operator channel.

## Backup, restore, and rollback

Stop writes before a snapshot. Backups are private operational artifacts and
must live on an encrypted, owner-only destination; these scripts provide
SQLite consistency, permissions, SHA-256 manifests, and integrity checks but
do not provide encryption.

For a complete storage set, pass the private data root. The manifest records
core and plugin files independently, schema versions, checksums, outbox/state
artifacts when present, and operator-managed retention metadata:

```sh
services/comments/ops/backup.sh \
  /var/lib/firefly-comments \
  /private/operator-backups/comments-set

services/comments/ops/restore.sh \
  /private/operator-backups/comments-set \
  /private/restore-candidates/comments-data
```

Restore always targets an absent new root. It validates the complete manifest,
checksums, and SQLite integrity before copying, refuses overwrite, and removes
only its unreferenced candidate on failure. The active data root is untouched
until the operator has run a smoke test and selected the candidate. The
single-database two-argument form remains supported for compatibility and
writes a sidecar manifest.

Static rollback and data rollback are separate actions: the existing
immutable publication release/symlink rollback governs HTML, while a verified
restored core/plugin set governs service data. Never select an older static
release solely because its HTML is valid; the publication tombstone epoch
remains authoritative.

## Operator gates

Before enabling comments in tracked configuration, the owner must accept the
private health check, host-scoped proxy behavior, TLS/origin and allowed-origin
probes, direct-port refusal, SMTP delivery with runtime-injected credentials,
backup/restore drill, and browser submission/verification smoke test. This
repository does not perform DNS changes, remote deployment, SSH, or external
SMTP operations.
