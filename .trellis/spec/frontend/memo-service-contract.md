# Independent Memo Service

## 1. Scope / Trigger

Read this when changing `services/memos/`, its private database, HTTP/admin
surface, encrypted verification mail, backup/restore or Docker image. The
service imports only the pure `plugins/memos/` contract. It never reads comments
state, renders Firefly pages, exposes a public memo-list API or promotes a
static release. Historical Typecho data is outside this workflow.

The site and publication/runtime integrations own `/memos/`, static export
consumption, Nginx/Compose and comparison with previously published tombstone
epochs. The service also supplies explicit trusted-address and worker plumbing
for that integration, without changing domain/schema semantics. A service-only
gate does not establish deployed proxy/SMTP/publication evidence. See
[Memo Publication and Runtime](./memo-publication-runtime-contract.md).

## 2. Signatures

| HTTP route | Contract |
| --- | --- |
| `POST /v1/memos/submissions` | Unauthenticated visitor write; JSON or URL-encoded form |
| `GET /v1/memos/verify/<token>` | Single-use verification, then private pending moderation |
| `GET /v1/memos/admin/submissions` | Bearer-authenticated bounded list |
| `POST /v1/memos/admin/submissions/<id>/<action>` | Bearer-authenticated approve/reject/delete |
| `GET /v1/memos/admin/export` | Bearer-authenticated public v1 projection |
| `GET /healthz` | Process liveness |
| `GET /readyz` | Database/schema/metadata and configured delivery readiness |

Run package-local Node commands through the repository wrapper:

```bash
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos ci
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run check
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run test
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run build
FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs
```

The package provides `start`, `worker`, `admin`, `deliver:notifications`, `maintain`,
`backup` and `restore` commands. Use host Docker for disposable service-image
checks; `./sam docker ...` is not a valid Docker execution boundary.

```bash
bash -n services/memos/ops/check-image.sh
shellcheck services/memos/ops/check-image.sh
shfmt -d services/memos/ops/check-image.sh
services/memos/ops/check-image.sh
```

The image check creates its own labelled fixture volumes/containers with
network disabled and no host ports. It verifies health/readiness, nonroot file
modes and persistence of approved records, rates and pending encrypted mail
across recreation, then removes only its own fixture containers/volumes.

Inside the deployed service container, use `npm run admin -- list [cursor]`,
`npm run admin -- approve|reject|delete <id>`, `npm run admin -- export`,
`npm run deliver:notifications`, `npm run maintain`,
`npm run backup -- <absent-dir>` and
`npm run restore -- <backup-dir> <absent-dir>`. Restore needs only matching
`MEMOS_ENCRYPTION_KEY`, `MEMOS_TOKEN_KEY` and `MEMOS_ENCRYPTION_KEY_ID` (default
`primary`), not active runtime/SMTP/admin configuration. Other local runtime
operations load the full service config. CLI authentication uses the private
`MEMOS_ADMIN_TOKEN` input and `MEMOS_ADMIN_ORIGIN` (default HTTP loopback).

Schema version 1 has independent `submissions`, `rate_events`, `outbox`,
`audit` and singleton `metadata` tables. Metadata contains safe-integer public
revision and epoch plus an authenticated service-key check. Migration and
schema-version changes are transactional. Startup and backup/restore compare
the full SQLite schema with the canonical migration, including tables, columns,
indexes and absence of unexpected triggers; a matching version alone is
insufficient.

## 3. Contracts

### Visitor and owner data

- Submission fields are exactly `displayName`, `email`, `body`,
  `consentVersion`, `consent` and optional `honeypot`. Consent is `accepted`,
  version matches public config (default `memos-v1`), and honeypot is absent
  or empty. Use the pure memo text normalizers and a bounded mailbox grammar.
- Cap streaming request bodies at 32 KiB. Reject invalid UTF-8, repeated form
  fields, unexpected fields and unsupported content types before persistence.
- Require an explicit public-write origin allowlist. Derive verification links
  from configured public origin. Socket IP is authoritative by default.
  `MEMOS_TRUST_PROXY=loopback` is an explicit deployment policy requiring
  loopback bind/local/peer sockets and one validated X-Real-IP overwritten by
  the proxy. Canonical IPv4/mapped IPv6/IPv6 identity prevents spelling-based
  quota splitting. Missing/duplicate/list/bad values fail before write/rates;
  Forwarded/X-Forwarded-For remain untrusted.
- New valid submissions and exact unexpired unverified duplicates return the
  same generic acceptance response. A duplicate creates no record or mail.
  Verification expires after 24 hours; expiry permits a fresh submission
  subject to rates. Persist limits of 12/IP/hour and 12/mailbox/hour across
  restart using purpose-separated keyed fingerprints.
- Owner list DTOs contain only ID, display name, body, creation time, state
  and verification time. Pagination defaults to 50 and caps at 100 with an
  opaque cursor. Never serialize a raw private database row.
- Owner authentication uses a constant-time comparison of credential hashes.
  The CLI obtains credentials from private environment/file input, never
  credential argv or URLs, and refuses cross-origin redirects.
- The CLI decodes successful responses before printing: list pages have only
  `submissions` and `nextCursor`, each row has exactly the six moderation
  fields, and action receipts have only `status: "ok"`. Check canonical text,
  dates, lifecycle/verification shape, ascending IDs and cursor consistency.
  Reject invalid UTF-8 and cap streamed responses at 8 MiB for list, 1 KiB for
  action receipts and 64 MiB for export; public exports still use the strict
  pure decoder. Unexpected/private fields never reach CLI stdout.

### Lifecycle and publication

| State | Approve | Reject | Delete |
| --- | --- | --- | --- |
| unverified / expired | conflict | rejected | deleted |
| pending | approved | rejected | deleted |
| approved | unchanged | rejected; epoch +1 | deleted; epoch +1 |
| rejected | conflict | unchanged | deleted |
| deleted | conflict | conflict | unchanged |

Verification atomically consumes an unexpired token and moves only an
unverified record to pending. Approval requires owner action. Reject/delete
invalidate verification and cancel queued mail; deletion scrubs live private
fields and display text. Rejected records cannot reopen and deletion is
terminal.

Each moderation transaction includes record state, public revision/epoch,
queued-mail cancellation and audit. Every approved-to-nonpublic transition
increments the epoch once. Identical retries have no side effects; overflow
fails closed. Export reads metadata and approved records in one consistent
snapshot and selects exactly `id`, `displayName`, `body`, `createdAt` before
calling the memo producer/serializer. Creation time stays the submission time.

### Private persistence and operations

- Acceptance atomically stores the submission, rate/dedupe state and encrypted
  mail-outbox row. Use AES-256-GCM with fresh 12-byte IVs and authenticated
  purpose/row/key identity. Email and mail payloads containing recipients/raw
  tokens remain encrypted at rest; submission verification tokens are hashed.
- Verify encryption and token-key consistency when reopening state. Do not
  silently regenerate keys or reset existing rate fingerprints. Key rotation
  needs an explicit migration; backups require their original keys.
- Mail uses transactional claims/leases and bounded retries until expiry.
  Delivery is at-least-once across a crash after SMTP acceptance; verification
  remains single-use. Clear queued ciphertext on delivery, expiry, rejection
  or deletion. SMTP requires validated implicit TLS or mandatory STARTTLS.
  Validate sender mailbox bounds at configuration time so readiness cannot
  accept a sender the delivery transport will reject.
- `npm run worker` periodically wraps the existing leased delivery, one message
  per 15-second cycle with no overlap. Shutdown cancels scheduling, awaits the
  active drain and closes SQLite once; forced stop uses lease/retry recovery.
  Its private process/tick health is independent of sibling HTTP readiness.
  Runtime Compose and proxy contracts belong to the linked integration spec.
- Purge private email and abuse fields after 30 days through startup, periodic
  and explicit maintenance. Cleanup never approves or resurrects records.
  Removing live data does not erase earlier operator backups.
- Default secret inputs are `MEMOS_ADMIN_TOKEN`, `MEMOS_TOKEN_KEY`,
  `MEMOS_ENCRYPTION_KEY`, and `MEMOS_SMTP_PASSWORD`. The service resolves
  overrides through the plugin's `runtime.secretEnv` references.
  `MEMOS_SECRETS_FILE` supplies an owner-only env file with no
  shell expansion; reject malformed/duplicate entries. Explicit environment
  values take precedence. Never emit values in diagnostics.
- `MEMOS_CONFIG_PATH` selects the repository-contained memo TOML config.
  The service consumes SMTP settings, explicit allowed/public origins, private
  data paths and `encryptionKeyId` from the pure config. Its SQLite outbox
  rejects nonnull `runtime.outboxPath`.
- Directories are owner-only 0700; database, secret and backup files are
  owner-only 0600. Reject symlinks and special files and enforce real data-path
  containment. A lexical plugin path check alone is insufficient.
- Backup uses a consistent SQLite snapshot with integrity/schema/checksum
  validation. Restore validates into an absent destination and never replaces
  an active database. Include pending mail, revision and epoch; keep keys
  separately. A restored older epoch still requires publication rollback
  rejection by the later consumer.
- The image runs unprivileged and defaults to loopback on a distinct port.
  Local validation publishes no host service port. Private proxy topology and
  persistent runtime mounts belong to the integration child.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Invalid input or failed/replayed/expired verification | Generic 400; no private record details |
| Missing/invalid owner credential | 401 before owner operations |
| Disallowed public-write origin | 403 before persistence |
| Unknown resource or forbidden state transition | 404 or 409 respectively |
| Oversized request or unsupported media type | 413 or 415 before persistence |
| Persisted rate exceeded | 429; no new row/mail |
| Missing/wrong keys, invalid private input or unavailable dependency | Fail closed with bounded diagnostics |
| Injected acceptance/moderation/verification failure | Roll back all associated writes |
| Corrupt backup or existing restore destination | Reject without overwriting existing state |
| Altered schema/indexes/triggers despite matching schema version | Reject startup or backup/restore |
| Malformed, private-field-bearing or oversized CLI success response | Reject with bounded `invalid_admin_response`; no raw output |
| SMTP failure | Bounded retry state; no recipient/token/transcript in logs |

## 5. Good / Base / Bad Cases

- **Good:** submit, verify, owner approves, export four public fields; service
  restart retains rates, state and pending encrypted mail.
- **Base:** an empty approved set produces a valid v1 export with a matching
  digest without activating a Firefly route.
- **Bad:** publish after email verification, enqueue plaintext tokens, spread
  private rows into export, copy a live database, or restore over active state.

## 6. Tests Required

Assert exact fields/byte limits/origins and generic responses; persisted rates
and expiring duplicate behavior; verification replay and every lifecycle edge;
idempotency and epoch/revision rollback under injected faults; encrypted-at-rest
payloads and wrong-key restarts; outbox claims/retries/expiry/cancellation;
retention; consistent export selection/order/digest; CLI auth/redirect safety;
file modes/symlink rejection; integrity/checksum/no-overwrite backup round trips;
and disposable nonroot Docker health/readiness and recreation persistence.
Use injected clocks/transports, not real mail or production credentials.

## 7. Wrong vs Correct

**Wrong:** commit the unverified row, then append plaintext mail to a file; or
increment the epoch separately before a moderation update.

**Correct:** one SQLite transaction persists submission plus encrypted outbox
and rates. A separate moderation transaction updates state, public revision,
epoch, audit and mail cancellation together, then export selects only the four
public fields in a consistent snapshot.
