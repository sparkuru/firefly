# Memo runtime and publication operation

The public contract stays independent of the private service. The root static
runtime works with memos disabled. Provisioning a service does not activate
`/memos/`; enabling the site does not publish unverified or pending submissions.

## Prepare private inputs

Copy `config/plugins/memos/config.toml.example` and `secrets.env.example` to
owner-controlled configuration files outside public release directories. Set
the allowed/public HTTPS origin, certificate-validated SMTP transport, private
data path and independent random keys. Use the secret-file format described in
[the service guide](../../services/memos/README.md). Never put private data or
backup inputs below `artifacts/` or `dist/`.

Data directories must already exist as 0700 and secret files as 0600, owned by
the numeric UID:GID selected by `MEMOS_RUNTIME_USER`. Config must be a readable
regular nonsymlink file. Root Compose defaults to `1000:1000`; set the override
when owner mount identity differs. Both runtime services use the same identity,
config/secrets and private SQLite root. Missing bind inputs are refused, and
ownership mismatch fails startup; do not loosen permissions to make startup work.

For root Compose set `MEMOS_DATA_ROOT` to the private data directory and
`MEMOS_CONFIG_ROOT` to the directory containing `config.toml` and `secrets.env`,
then enable `--profile memos`. HTTP and worker share the web namespace, with
HTTP bound at `127.0.0.1:8788`. Comments remains on 8787. The web process sees
no memo config, secrets or database mounts. No private host port is published.

The standalone [Compose template](compose.yml) uses host networking for an
operator's same-host edge and requires `MEMOS_RUNTIME_USER` explicitly. Copy it
into the owner deployment directory with separate private data/config inputs,
or set the two path variables. Both templates drop capabilities, prevent
privilege escalation, use a read-only root filesystem and bounded temporary
storage. Stop the HTTP/worker services without deleting the persistent data.

## Proxy and delivery

The root Nginx proxy forwards only `/v1/memos/`, retains Host and Origin,
overwrites `X-Real-IP` from its socket peer, and removes forwarded chains.
The service's opt-in loopback policy rejects missing/malformed/duplicate
address headers. Its default direct mode ignores forwarding. Requests and
responses use restrictive security headers and no-store; absent services fail
within bounded timeouts. Owner routes still require Bearer authentication.
Memo access and error URI logs are disabled because verification URLs carry
tokens. Service and worker diagnostics contain fixed codes only.

[The host-scoped edge example](../../services/memos/ops/nginx-hosts.conf.example)
uses placeholders. Configure it only in the matching owner-managed HTTPS
server block. Do not expose `/readyz`, private metrics or unrelated service
routes. The container proxy does not establish trust in an upstream CDN/edge;
real client identity, host isolation and TLS need operator validation.

The worker drains one leased encrypted message per 15-second cycle. Graceful
shutdown waits for the active drain before closing SQLite; the templates allow
200 seconds against a 180-second SMTP deadline. Forced stops recover after the
five-minute lease expires. Delivery is at-least-once across SMTP acceptance
followed by a crash. Worker-specific process/tick health cannot be replaced by
the HTTP sibling's healthy listener. Readiness/health never send mail.

## Export, enable and remove

Use the authenticated service CLI for list/moderation and approved-only export.
Stage only its decoded public JSON as a contained repository-relative `.json`
file. Keep staging outside the two promotion targets when path preservation is
needed; inputs inside `artifacts/` or `dist/` are consumed by successful
promotion. The assembler retains only the canonical public snapshot at
`artifacts/memos/memos.public.v1.json`, never service inputs or neighboring files.
That snapshot is build input and stays out of the browser/runtime release.

Use a separate contained public-only TOML for the site handoff, containing only
`[public]` settings for write origin, consent version and export path. Select
that file through `[plugins.memos].configPath` in the selected site TOML.
The full owner runtime configuration at `config/plugins/memos/config.toml`
is excluded from Docker build contexts; the disabled example's default path
does not make that private file an enabled web-build input.

Enable `[plugins.memos].enabled` only after providing that public config/export;
run the normal tracked-content build and publication gate. Export selection is
explicit override, `FIREFLY_MEMOS_EXPORT`, then public
`exportPath`. A service change requires a fresh owner export and build to update
static reading. The assembler compares actual generated records/form/envelope
identity and rejects stale, unsafe or swapped output before promotion.

Package the validated publication with `./preview.sh package`; its minimal web
image context contains only the Dockerfile, Nginx configuration and public
`dist/` tree. An enabled full root Docker build instead requires separate
contained public TOML/export inputs at paths included in that build context,
with the site's activation pointing to them. Default `artifacts/` snapshots
and prior deletion history are excluded from that context, so that builder
validates a fresh build and cannot enforce the prior host publication floor.
Use the wrapped assembler with retained durable history, then the minimal
runtime packager, for a release that preserves that floor. Local publication
history does not establish the history of an external deployed release.
Never reinclude owner runtime config, secrets,
private data or backups to satisfy a web build.

After approved removal, export and rebuild. Its tombstone epoch must meet the
previously promoted high-water mark. Disabling removes the memo surface and
needs no service/config/export access, while retaining that mark. Re-enabling
an older export is refused. Do not delete durable publication metadata or use
an older history-unaware assembler to bypass the epoch guard. Corrupt or lost
publication history requires explicit operator recovery.

## Backup and restore

Use the service's consistent snapshot command and retain matching keys
separately, with owner-managed encryption and retention for backups. A backup
contains nonpublic text plus encrypted recipients and queued token payloads.
Deleting live data cannot erase earlier backups. Restore only into an absent
private destination; validate it before repointing runtime mounts. Never copy a
live database or restore over active state. Restored older DB/export epochs
cannot replace a newer promoted publication. See the service guide for exact
commands and required key identity.

Local fixture gates prove repository wiring only. Production SMTP delivery,
edge host/client-IP/TLS behavior, provisioning, immutable release switching and
crash recovery are owner deployment work and remain unperformed by these gates.

The maintained runtime fixture builds disposable service and pinned Playwright
images. Its browser image installs `libnss3-tools` from the image package
repository, so a cold build requires package-network access. Chromium first
rejects the untrusted synthetic certificate, then trusts only the fixture CA
through a disposable NSS database and performs the native form/static reading
checks with normal TLS validation. Browser mounts contain only dependencies,
the fixture script, the public certificate and an owned screenshot directory.
Cleanup verifies the exact owned containers, anonymous volumes and image tags.
