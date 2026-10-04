# Private memo service

This independent Node 22/TypeScript package owns new visitor submissions,
mailbox verification, owner moderation and approved-only v1 exports. It never
reads historical Typecho/comments state or writes a static publication.

## Build and test

From the repository root:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run test
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs
```

Tests use temporary private directories, injected clocks and fake mail; no
real mailbox credentials or production hosts are involved. Build before
running operational package commands. Compiled code imports the pure memo
contract from the repository root; the Dockerfile preserves that layout.

## Configuration

Copy `config/plugins/memos/config.toml.example` to the ignored
`config/plugins/memos/config.toml`. Supply an explicit nonempty
`runtime.allowedOrigins`, HTTPS `runtime.publicOrigin`, `runtime.smtp`, and a
private 0700 data root. The database must stay below that root; existing
symlinks, special files, nonprivate files and a nonnull `outboxPath` are rejected.
The queue is encrypted inside SQLite. `publicOrigin` owns verification links;
request Host and forwarding headers are never used to construct them.

Provision distinct random 32-byte lowercase hex `MEMOS_TOKEN_KEY` and
`MEMOS_ENCRYPTION_KEY`, a random `MEMOS_ADMIN_TOKEN` of at least 32 characters,
and `MEMOS_SMTP_PASSWORD`. Secret environment-name references may be changed
in `runtime.secretEnv`. An optional `MEMOS_SECRETS_FILE` is an owner-owned
regular nonsymlink 0600 env file; copy the tracked secret template and replace
its placeholders. It accepts literal `NAME=value` lines and comments, rejects
duplicates/malformed lines, and does not perform shell expansion. Explicit
environment values override the file. Keep keys separately from backups.

`MEMOS_CONFIG_PATH` defaults to `config/plugins/memos/config.toml`, relative
to the repository. The package cwd is `services/memos`. `MEMOS_BIND` defaults
to `127.0.0.1`, `MEMOS_PORT` to `8788`. Root Compose's opt-in `memos` profile
shares the web network namespace; HTTP and worker publish no private port.
See [operator preparation](../../plugins/memos/README.md) before enabling it.
`MEMOS_TRUST_PROXY` accepts `none` (default) or `loopback`. Direct mode ignores
all forwarding headers. Loopback mode requires a loopback listener and socket
peer plus exactly one literal `X-Real-IP`; invalid/missing/duplicate values fail
before persistence. The proxy overwrites that header and removes forwarding
chains. IPv4-mapped IPv6 and equivalent IPv6 spellings share canonical quotas.
The repository proxy does not automatically trust any additional edge.

SMTP uses certificate-validated implicit TLS (`secure = true`) or mandatory
STARTTLS (`secure = false`); failed upgrades never send credentials in plaintext.
Readiness checks migrated storage, key consistency and configured transport,
without contacting SMTP. `/healthz` is process liveness. The server runs bounded
maintenance at startup and every minute. `npm run maintain` runs one local batch.

## HTTP and moderation

Public writes use `POST /v1/memos/submissions` with JSON or URL-encoded fields
`displayName`, `email`, `body`, `consentVersion`, `consent = accepted`, and
optional empty `honeypot`. Bodies are limited to 32 KiB, names to 80 Unicode
code points and normalized memo text to 8192 UTF-8 bytes. A valid submission
or exact active duplicate returns generic 202 with no identity or token.
Verification is single-use `GET /v1/memos/verify/<token>` and expires after
24 hours. Verification creates pending moderation, never public approval.
Rate events survive restart and allow 12 submissions/IP and 12/mailbox in a
rolling hour. Duplicate unexpired unverified submissions consume no new rate
or mail; expired records permit new submissions subject to rates.

Private owner routes require Bearer authentication:

- `GET /v1/memos/admin/submissions?limit=50&cursor=<opaque-cursor>` (max 100).
- `POST /v1/memos/admin/submissions/<id>/approve`, `/reject`, or `/delete`.
- `GET /v1/memos/admin/export` (exact immutable memo public v1 contract).

Only verified pending records can be approved. Approval, rejection and deletion
are idempotent when repeated; rejection cannot reopen and deletion is terminal.
Every approved removal advances the tombstone epoch and revision in the same
transaction. Deletion scrubs text, identity, token and abuse fields immediately.
Private email/abuse fields are purged after 30 days by bounded maintenance;
pending and approved text remain in their existing state. Retention never
approves a record. Administrative list DTOs omit private identity and hashes.

Inside the running service container, with its package cwd and private endpoint,
use the thin CLI. These are operator commands; development checks use `./sam`:

```sh
npm run admin -- list
npm run admin -- approve m_example
npm run admin -- reject m_example
npm run admin -- delete m_example
npm run admin -- export
```

`MEMOS_ADMIN_ORIGIN` defaults to `http://127.0.0.1:8788`. Only HTTPS or explicit
HTTP loopback origins are accepted, with no URL credentials/path. CLI credentials
come from `MEMOS_ADMIN_TOKEN` or its secret-file entry, never argv. Redirects are
refused, so credentials cannot be forwarded to another origin.
The CLI rejects unexpected list/action fields before printing and caps response
bytes at 8 MiB for lists, 1 KiB for action receipts and 64 MiB for exports.

Inside the service container, `npm run deliver:notifications` runs a one-shot bounded
mail drain. Claims have five-minute leases and bounded exponential retries
until expiry. SMTP is at-least-once: a crash after remote acceptance may resend
the same email. Its token remains single-use. Rejection/deletion/verification
cancel queued mail; delivery and expiry clear queued ciphertext. SMTP delivery
and DNS/TLS/provider setup require separate operator validation.

`npm run worker` runs the same encrypted lease operation continuously, one
message per 15-second cycle, without overlapping drains. Errors produce only
fixed status codes and recover on subsequent cycles. SIGINT/SIGTERM stop future
ticks and wait for in-flight delivery before closing SQLite. The SMTP operation
has a 180-second total deadline; Compose allows 200 seconds for shutdown.
Forced termination leaves the existing five-minute lease to expire, after which
the message retries. A crash after SMTP acceptance can duplicate mail; this is
at-least-once delivery, with single-use verification tokens.

Worker health checks its own process and private tick file, allowing 45 seconds
idle or 190 seconds during a drain. It neither probes SMTP nor uses the HTTP
sibling's readiness. Compose explicitly replaces the image's HTTP healthcheck
for the worker. The image defaults to HTTP; `dist/src/worker-server.js` is its
explicit worker command.

## Backup and restore

Run these operator commands inside the service container with private writable
backup/recovery mounts (package cwd `services/memos`):

```sh
npm run backup -- /private/backups/new-snapshot
npm run restore -- /private/backups/new-snapshot /private/new-data-root
```

Backup creates an absent 0700 directory with a SQLite snapshot and required
0600 checksum/schema/epoch/revision manifest. It includes rates and encrypted
pending mail consistently and validates integrity. This is a private database
snapshot with encrypted recipient/token fields; use operator-managed encrypted
backup storage to protect the whole database, including nonpublic memo text.
Keys are not embedded in the backup. Retain backups and their matching keys
under an operator-defined retention policy; deleting live ciphertext cannot
erase earlier backups.

Restore requires `MEMOS_ENCRYPTION_KEY`, `MEMOS_TOKEN_KEY`, and the matching
`MEMOS_ENCRYPTION_KEY_ID` (default `primary`) from environment/secret file.
It does not open the active runtime or require SMTP/admin credentials. It checks
manifest checksum, integrity, schema and both key identities before creating a
new absent directory; it never overwrites live state. Point the runtime config
at the restored `memos.sqlite` only after operator review. A restored older DB
may have an older epoch: publication must compare with prior promoted state
and reject rollback. Restore does not authorize publication or rotate keys.

Build the nonroot image at the host Docker boundary:

```sh
docker build -f services/memos/Dockerfile -t firefly-memos:local .
services/memos/ops/check-image.sh firefly-memos:local-check
```

Mount owner-readable config/secrets and a private writable data volume, without
published ports. Keys are checked at every database open; replacing either key
or key ID fails closed. Key rotation and migration are explicit future operator
procedures. The runtime image includes the imported memo validation helper and
checks both health and readiness from inside its loopback namespace.

After the package and publication builds, run the maintained host-Docker gate:

```sh
services/memos/ops/check-runtime.sh
```

It uses the nonroot caller's UID:GID and requires installed repository packages, Docker,
OpenSSL and the matching Playwright image. It creates exact-labelled disposable
containers with no host ports, private fixture inputs and an isolated publication
root. It proves proxy failures/headers/auth/spoof-resistant quotas, recreation
of persistent rates/outbox, certificate-validated local TLS mail, real native
desktop/mobile no-JavaScript POSTs, moderation/export/assembly/removal, stale
HTML/export/restored-database refusal, and private log/output exclusion.
It serializes actual site builds and must not run alongside another Astro build.
Cleanup removes only its containers/image and owned fixture roots. This is
repository integration evidence; real SMTP, edge client identity/TLS and release
operations remain separate operator checks.
