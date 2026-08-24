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

Production Nginx must select a host-specific `server` block before routing
`/v1/comments/`. The neutral example in `ops/nginx-hosts.conf.example`
demonstrates distinct production/development upstreams, an explicit
fail-closed unknown `/v1/` location, and deliberately contains no real
hostname, certificate path, or deployment identifier. DNS, TLS, certificate
selection, and the operator-owned edge include remain outside this repository.

## Configuration and secrets

`config/site.toml` is public build configuration. The tracked default keeps
`comments.enabled = false` and contains no mailbox or password. The comments
service reads the same TOML file read-only for non-secret settings.

Create the ignored local input from the tracked name template only when a
private staging run is authorized:

```sh
cp config/secrets.env.example config/secrets.env
chmod 600 config/secrets.env
```

`config/secrets.env` is a small dotenv file. `COMMENTS_SECRETS_FILE` selects an
explicit path; otherwise the service may use the repository-relative file for
local development. The loader rejects symlinks, non-regular files, broad
permissions, malformed lines, duplicate keys, and controls; it treats values
literally and never performs shell or variable expansion. Process environment
values take precedence over file values. The comments container mounts the
file read-only at `/run/secrets/comments.env`; the Docker build context
excludes it. Production may provide the same variable contract through a
private read-only mount or supervisor-managed environment file.

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
