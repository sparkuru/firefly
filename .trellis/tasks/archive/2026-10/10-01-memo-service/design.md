# Independent memo service design

## Runtime and ownership

Use the checked-in comments package's Node/TypeScript and `node:sqlite`
operating model, with an independent package, lockfile, migrations, source,
tests, Dockerfile and data root under `services/memos/`. Import only the pure
`plugins/memos/` contract, never comments internals. No site or publication
imports, historical data access, database sharing or public runtime list API.

Planned modules own configuration/secrets, crypto, input validation,
repository/migrations, lifecycle, HTTP, export, encrypted mail queue/SMTP,
server, admin CLI and backup/restore. Node built-ins and the existing
repository dependency conventions are sufficient; do not add a queue server.
Root Compose/Nginx wiring remains the publication/runtime child's work.

## HTTP contract

| Route | Behavior |
| --- | --- |
| `POST /v1/memos/submissions` | Accept JSON or URL-encoded form; generic 202 for a valid new submission or exact unexpired duplicate |
| `GET /v1/memos/verify/<token>` | Single-use verification; no-store HTML with safe `/memos/` return link |
| `GET /v1/memos/admin/submissions` | Authenticated bounded, paginated moderation DTO |
| `POST /v1/memos/admin/submissions/<id>/(approve\|reject\|delete)` | Authenticated idempotent state transition |
| `GET /v1/memos/admin/export` | Authenticated exact public v1 export |
| `GET /healthz` | Process liveness |
| `GET /readyz` | Open migrated DB, valid epoch and configured delivery capability; no SMTP network probe |

Submission keys are exactly `displayName`, `email`, `body`, `consentVersion`,
`consent`, and optional `honeypot`. Consent must equal `accepted`, the version
must match public config (default `memos-v1`), and honeypot must be absent or
empty. Reuse memo name/body normalizers. Bound mailbox text to 320 UTF-8 bytes
with the repository's safe mailbox grammar. Cap the HTTP body at 32 KiB while
streaming; reject malformed UTF-8, repeated form keys, unknown keys and
unsupported content types before persistence.

Use bounded public errors: 400 invalid input/token, 401 absent/invalid admin
auth, 403 disallowed origin, 404 unknown resource, 409 invalid moderation
transition, 413 oversized body, 415 unsupported media type, 429 rate limit and
503 unavailable dependency. Unexpected errors return a generic 500. Failed
verification never distinguishes token identity/expiry/replay in public text.
Native form submissions receive readable no-store HTML; JSON requests receive
bounded JSON. Responses contain no record identifier or token. Verification
pages use `Referrer-Policy: no-referrer` and no external assets/scripts.

Require an explicit origin allowlist for public writes. Derive verification
links from configured public origin, not Host/forwarded input. Use socket IP;
do not trust arbitrary forwarding headers. The later proxy child must define
trusted client-address forwarding so all visitors do not share one proxy IP
rate bucket; this is a recorded integration gate, not solved by CORS.

Admin routes require a separate Bearer credential, hashed and compared in
constant time. No session cookies or browser admin surface. List uses a safe
opaque cursor and bounded limit (default 50, maximum 100); return only ID,
display name, body, creation time, state and verification time. Never return
encrypted email, hashes, abuse keys or raw rows. The CLI reads credentials
from the environment or owner-only secret input, refuses credential argv and
cross-origin redirects, and contacts only the configured private endpoint.

## Lifecycle and atomicity

| Current state | Approve | Reject | Delete |
| --- | --- | --- | --- |
| unverified / expired | conflict | rejected | deleted |
| pending | approved | rejected | deleted |
| approved | unchanged | rejected; epoch +1 | deleted; epoch +1 |
| rejected | conflict | unchanged | deleted |
| deleted | conflict | conflict | unchanged |

Verification moves only an unexpired unverified record to pending. Token
consumption, state update and audit are atomic. Reject/delete invalidate
tokens and cancel queued mail. Delete scrubs recipient, tokens, fingerprints,
body and display name, retaining only minimal audit/tombstone metadata.

Each moderation operation uses one `BEGIN IMMEDIATE` transaction for state
checks, update, public revision, epoch, mail cancellation and audit. A repeated
same action is a no-op. There is no separate persisted idempotency-key API in
this MVP: the state machine provides retry safety. Every `approved` to
nonpublic edge increments the safe-integer epoch, with overflow failing closed.
`approved -> rejected -> deleted` increments once. Failure rolls back all
changes; never increment epoch separately from the record update.

Export reads approved rows, revision and epoch in one consistent transaction;
explicitly select the four public fields before calling `createPublicExport`
and `serializePublicExport`. Persist a monotonically increasing public revision
such as `r_<counter>` and change it with the public projection. `createdAt`
remains the original submission time. Only publication compares the exported
epoch with prior promoted state; a restored older DB is not automatically safe
to publish.

## Private storage, rates and mail

Create numbered, transactional migrations. Submission acceptance atomically
persists the unverified record, purpose-separated HMAC token hash, rate/dedupe
state and encrypted outbox row. Use random 32-byte verification tokens and
AES-256-GCM with a random 12-byte IV. Email and outbox ciphertext authenticate
their purpose and row ID as associated data; envelopes contain version, key
ID, IV, tag and ciphertext. No raw recipient/token in logs, audit or disk.

The mail worker decrypts only in memory. One-shot `deliver:notifications`
drains the queue through an injectable transport, with transactional claims
and leases to prevent simultaneous workers from sending the same unclaimed
item. Use bounded exponential retry delays until expiry. SMTP must use implicit
TLS or mandatory STARTTLS with certificate validation. Missing transport
configuration fails closed. Crash after SMTP acceptance may cause a retry of
the same message: delivery is at-least-once, token use is single-use.

Clear queued ciphertext on delivery, expiry, rejection or deletion. Do not
silently regenerate keys. MVP uses one configured encryption key and key ID;
rotation/migration is a separate operator procedure, and old backups require
their matching key. Deleting live ciphertext does not erase prior backups.

Persist rolling hourly IP/mailbox rate events; purpose-separated keyed
fingerprints keep raw IPs out of storage. Exact dedupe covers mailbox +
normalized name/body + consent version while an unverified token is valid.
Do not permanently prevent a fresh submission after expiry. Implement the
PRD's retention cleanup on startup, bounded periodic maintenance and an
explicit local maintenance command. Pending public text is not automatically
approved or removed merely because its verification email is purged.

## Configuration and operations

Extend memo runtime config/types/tests/examples with SMTP nonsecret settings
and `secretEnv.encryptionKey`; keep public v1 export unchanged. Use separate
`MEMOS_ADMIN_TOKEN`, `MEMOS_TOKEN_KEY`, `MEMOS_ENCRYPTION_KEY`, and
`MEMOS_SMTP_PASSWORD` secret inputs. An owner-only env file is read without
shell expansion and with duplicate/malformed entry rejection. Explicit
environment values take precedence. Secret files must be regular, nonsymlink,
and inaccessible to group/other; errors never print values.

The outbox is inside SQLite. Existing `runtime.outboxPath` remains parseable
by the pure config module, but the service rejects nonnull values as unsupported
instead of silently using a file queue. Update the example to explain this.
Filesystem loaders enforce real containment and reject symlinks/special files;
the pure lexical path resolver is not sufficient. Data directories use 0700,
databases/secrets/backups 0600.

Backup uses SQLite snapshot facilities plus integrity/schema/checksum
validation, not copying a live file. Include pending encrypted mail, epoch and
revision in the same snapshot. Keys are retained separately by the operator.
Restore validates before writing to a new absent destination and never replaces
an active database; failure cleans only the newly created candidate.

Build an unprivileged image containing the compiled package and memo modules
at the paths required by emitted imports. Use a distinct loopback listener
and a persistent private data mount. Local disposable-container checks validate
health/readiness, nonroot operation and recreation without publishing a host
port. Root Compose, public proxy, worker scheduling, SMTP account setup and
production enablement belong to later integration/deployment work.

## Compatibility, risks and evidence

- Preserve comments code, live site config and disabled static builds.
- Run memo contract regressions for all coordinated runtime config additions.
- Transaction failure, verification replay, outbox restart/lease races,
  restore of older epochs and missing keys require explicit tests.
- Private diagnostics use bounded status/error codes, never raw requests,
  headers, SMTP transcripts, token-bearing paths or exception contents.
- Evidence: `../09-28-public-memo-stream/research/memo-service-findings.md`.
  SMTP delivery/retry is a real service capability; local tests inject delivery
  and do not establish production mail deliverability.
