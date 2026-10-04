# Research: Memo service planning and private runtime precedent

- Query: Resolve the next service child's implementation boundaries, existing operating conventions, missing contracts, and bounded MVP before activation.
- Scope: internal
- Date: 2026-10-03

## Findings

### Files found and related specs

- `.trellis/tasks/10-01-memo-service/{prd,design,implement}.md`: current service requirements and skeletal plan; no product implementation was changed during this investigation.
- `.trellis/tasks/09-28-public-memo-stream/prd.md`: approved independent visitor submission, mailbox verification, private owner API/CLI, export, and separate Docker runtime; no history import, public read API, or web moderation UI.
- `plugins/memos/public.mjs` and `.trellis/spec/frontend/memo-contract.md`: authoritative text normalization, four-field public records, strict versioned export, digest and epoch.
- `plugins/memos/config.mjs:5`: exact configuration key allowlists; runtime secret references currently have only `smtpPassword`, `adminToken`, `tokenKey` (`:41`). SMTP settings and encryption-key references need coordinated additions, not silent service-only TOML keys.
- `services/comments/src/{config,crypto,validation,service,http,sqlite-repository,notifications,smtp}.ts`: operating precedents, not shared implementations or schemas.
- `services/comments/{package.json,Dockerfile}`: package-local Node/TypeScript/build and image layout.
- `services/comments/scripts/{backup,restore,backup-lib}.mjs`: snapshot, permissions, checksums, restore validation.
- `.trellis/spec/frontend/comments-publication-contract.md`: established private-write/static-read boundary and comments-specific requirements; memo must not inherit comment route, thread, homepage, or notification fields.
- `.trellis/spec/trellis-plus/{index,validation-profile}.md`: `./sam` command boundary and package checks.
- `.trellis/spec/guides/project-record-privacy.md`: neutral durable evidence, no owner/provider data.
- `.trellis/workflow.md`: planning precedes code; child activation and task transitions belong to main session.

### Evidence-backed choices available without new product discovery

1. **Independent package and database.** Comments uses Node >=22.13.0, TypeScript 6.0.3, Node types 24.3.0, smol-toml 1.8.0 in its own package/lockfile. SQLite is `node:sqlite`, with foreign keys enabled (`sqlite-repository.ts:299–309`), numbered SQL migrations (`:312–335`) and database mode 0600 (`:35–42`). Reuse this architecture in `services/memos`, with its own migrations; no imports from `services/comments` and no comments storage catalog. Make each migration and schema-version update atomic rather than assuming the precedent runner is an atomic template.
2. **Boundaries and validation.** Comments checks exact submission fields, empty honeypot and `consent: "accepted"` (`validation.ts:112–127`), 320-byte mailbox bound and restricted mailbox syntax (`:87–98`). Memo should use its own exact input keys and the already-approved memo normalizers, `memos-v1` consent version, and 32 KiB HTTP body cap (comments `types.ts:16`). Do not inherit comments body/link restrictions absent from the memo public contract. JSON/form parser must reject malformed UTF-8, repeated form keys, unknown keys, unsupported content type, and oversized streaming bodies before storing anything.
3. **TTL and rates.** Comments verification expires in 24 hours and abuse retention is 30 days (`types.ts:11–13`); defaults are 12 submissions/IP/hour, 12/mailbox/hour, 100/post/hour (`service.ts:102–107`). Use 24-hour verification and 12/IP/hour plus 12/mailbox/hour for memo; there is no post dimension. Optional memo-global 100/hour is a new conservative technical proposal, not an existing approved product fact. Persist accepted-submission rate events in SQLite so restart does not reset them. Comments' in-memory map (`:595–619`) is precedent for the window, not restart-safe behavior.
4. **Origin and client address.** Comments accepts only configured origins when nonempty (`service.ts:568`) and uses socket address, not arbitrary forwarded headers (`http.ts:119–124`). Memo enabled runtime should require a nonempty origin allowlist. Default to socket IP and ignore untrusted forwarding. The later Nginx child must define a trusted proxy/address protocol; otherwise all visitors behind a proxy share a rate bucket. Record this dependency now, do not pretend it is solved by CORS.
5. **Public responses.** Comments returns generic 202 without identity (`http.ts:119–127`); use the same shape for accepted memo submission. Exact duplicate attempts should create no row and no additional mail; generic 202 no-op is preferable to exposing duplicate identity. Update the current PRD wording "duplicate ... rejected" to explicitly mean no additional persistence/delivery if this is selected. Expired submissions should be eligible for a fresh submission/token after rate checks; do not make deduplication permanent.
6. **Crypto and secret loading.** Comments uses 32 random token bytes, HMAC-SHA256 hashes, AES-256-GCM with 12-byte random IV and a 32-byte key (`crypto.ts:5–23,32–63`). Private secret files are regular nonsymlink files with no group/other permissions and explicit environment overrides (`config.ts:87–114`). Memo can use these primitives independently, with separate encryption and token keys and purpose-separated hashes. Admin credentials should be hashed for in-memory comparison with constant-time equality; no credential in SQLite, URLs, argv, responses or logs. Comments itself compares the literal Bearer string (`http.ts:230–236`), so that implementation is not evidence that hashed admin auth already exists.

### Mail privacy and delivery: precise proposed contract

**Observed precedent:** comments writes the message including `to`, `token`, and `controlToken` to owner-only JSONL (`notifications.ts:14–23,56–63`). The submission row is created before that asynchronous file append (`service.ts:199–207`). Therefore its DB token hashes do not mean that raw tokens never exist on disk, and a queue-write failure can leave a record without mail. The mailer records retries with backoff and delivered IDs (`notifications.ts:87–112`), and SMTP uses implicit TLS or mandatory STARTTLS (`smtp.ts:191–214`).

**Recommended memo MVP:** one SQLite transaction creates the unverified row, token hash, bounded rate/deduplication state, and an encrypted mail-outbox row. The outbox's AES-GCM ciphertext contains the verification recipient and raw token; separate authenticated purpose/row identity prevents ciphertext substitution between email and queued mail. No plaintext recipient/token is persisted in logs, JSONL, audit, backups, or dead-letter files. SMTP worker decrypts only in memory, retries boundedly until expiry, then clears ciphertext on delivery, expiry, rejection, or deletion. Store delivery metadata and bounded error codes, never SMTP transcripts. Delivery is at-least-once across a crash after SMTP acceptance and before marking delivered; a duplicate email carries the same single-use token. Do not promise exactly-once SMTP.

Use a single worker with transactional claim/lease if overlapping invocations are possible. Provide a one-shot drain command that operates locally and can be scheduled by the runtime child; worker scheduling is not a production task in this child. Tests inject a capturing/failing delivery transport, so neither real SMTP nor credentials are needed. Runtime delivery must fail closed if transport configuration is absent rather than silently discarding messages.

Persist encrypted payloads as a versioned envelope with key identifier, random 12-byte IV, authentication tag and ciphertext; authenticate payload purpose and row ID as associated data. Wrong/missing keys must fail closed without plaintext diagnostics. Key rotation is an explicit operator action that must retain old decrypting keys until live queued mail/private email and intended backup retention no longer require them, or atomically reencrypt live data; do not silently regenerate keys at startup. Clearing live ciphertext cannot erase copies from earlier backups; backups stay private and follow owner retention.

A same-database outbox simplifies backup consistency. Existing optional `runtime.outboxPath` must be explicitly reconciled: recommended MVP uses null for database-backed outbox and rejects a nonnull file path with a bounded configuration error until a file transport is supported; preserve the public config projection. Main session must record this limitation in config examples and design, or choose another explicit mapping before implementation.

### Moderation, atomic tombstones, and export

Existing memo design mentions deletion-only epochs, but **every removal from the approved projection** must advance the epoch. Comments covers non-approve transitions out of approved (`service.ts:298–299`), yet increments the metadata in a separate transaction (`sqlite-repository.ts:121–130`) before row save/audit (`service.ts:314–315`). Its per-row `tombstoneEpoch === null` condition must not be copied for repeated approval/removal cycles.

Comments `service.ts:462–502` allows approval only from pending, rejects any nondeleted state, and makes deletion terminal/idempotent. In particular it does **not** allow rejected-to-approved. Follow that existing lifecycle in this bounded memo MVP. Proposed exact matrix:

| Current | Approve | Reject | Delete |
| --- | --- | --- | --- |
| unverified / expired | conflict | rejected | deleted |
| pending | approved | rejected | deleted |
| approved | unchanged | rejected + epoch increment | deleted + epoch increment |
| rejected | conflict | unchanged | deleted |
| deleted | conflict | conflict | unchanged |

Verification only moves an unexpired unverified record to pending; it cannot revive rejected/deleted records. Reject/delete invalidate verification and cancel queued mail. Delete is terminal and scrubs private recipient/token/fingerprint data and the stored text/name where no longer needed; keep only minimal tombstone/audit metadata. Rejected records cannot be reapproved in this MVP, matching comments. No public edit or reopening operation is added.

Use one `BEGIN IMMEDIATE` repository operation for checking current state, idempotency receipt, transition, epoch increment when `old=approved && new!=approved`, row update, public revision update, mail cancellation and audit. Roll back everything on failure. Epoch must remain a nonnegative safe integer, with overflow failure. A reused idempotency key for a different action/record is a conflict. Repeated same transition has no side effects. `approved -> rejected -> deleted` increments once. If a future explicitly approved reopening operation is added, each new approved-to-nonapproved edge must increment again rather than using a permanent per-row tombstone guard. Never decrement the epoch.

Export reads epoch, persisted public revision, and approved rows in a consistent read transaction, explicitly selects only `id`, `displayName`, `body`, `createdAt`, and calls memo `createPublicExport` / `serializePublicExport`. A revision such as `r_<counter>` fits the current contract and changes with public projection changes. Timestamp is original accepted submission time; approval does not silently reorder old submissions. Admin queue output is a separate bounded/paginated DTO and never returns encrypted email, token hashes, abuse keys or raw DB rows.

### Persistence, backups and Docker acceptance

- Comments snapshots databases, checks integrity and records schema version/checksum (`scripts/backup.mjs:47–71`); restore requires an absent destination, checks integrity/checksum and removes only newly created output on failure (`scripts/restore.mjs:29–53`). Use an independent memo snapshot plus required checksum manifest; do not copy a live DB file. Restore into a fresh private directory, never overwrite an active DB. Keys are backed up separately by the owner, not embedded into the database bundle. Restore test must prove lifecycle, pending encrypted mail, public revision and epoch survive, and publication must reject an older restored epoch later.
- Directory 0700, database/backup/secret 0600; reject symlink escape and nonregular files using real containment. File-path syntax validation in the plugin does not establish filesystem security.
- Comments Dockerfile builds from repository context, copies compiled service plus shared plugin contract files, runs unprivileged, and checks `/healthz`. Mirror layout for memo, distinct loopback port and data volume, copy memo contract modules (including their imported helpers) at the emitted import path. `/healthz` is process liveness; `/readyz` checks open/migrated DB and configured delivery capability without contacting SMTP.
- Tests must cover fresh migration, restart/recreation persistence, default private binding, nonroot data access, no public port configuration, health/readiness, backup round-trip and corrupt/symlink rejection. This child can validate its image and local fixture runtime independently; root Compose/Nginx remain the publication/runtime child's responsibility.
- Correct planned commands to `./sam npm --prefix services/memos ci`, then package `run check`, `run test`, `run build`; include `./sam node --test plugins/memos/tests/*.test.mjs` if config contract changes. Shell scripts require project shell checks. No commands were executed as validation in this research.

### Planning gaps to close before activation

1. Freeze input/response shapes, error status map (400/401/403/409/413/415/429), generic verification failure, no-store HTML and restrictive referrer policy, strict decoding and safe site return origin.
2. Add the lifecycle matrix, expired status, atomicity/idempotency semantics, and all-public-removal epoch rule above.
3. Define encrypted transactional outbox and reconcile `outboxPath`; record retry/expiry/crash semantics and a real injectable SMTP transport.
4. Add runtime SMTP/encryption secret configuration through coordinated plugin parser/types/tests/examples; no secret values in TOML, no comments env names.
5. Specify dedupe expiry, persisted rate windows and retention cleanup invocation. Thirty-day abuse/email retention follows precedent; purge must actually run on startup and bounded periodic maintenance, not merely store deadlines. Retain only minimum dedupe fingerprints needed by the active window, and cancel inaccessible/expired mail payloads.
6. Specify consistent export source revision and admin list pagination; add independent CLI auth/redirect protection and import-path packaging tests.
7. Keep Compose activation, proxy trust, publication rollback against previously promoted epoch, and static build checks as explicit later-child dependencies.

### User-owned decisions versus technical defaults

Already decided: visitor submission, email verification, explicit consent, owner API/CLI moderation, no web admin UI, no historical import, no public runtime reads, 80-code-point names and 8192-byte text. Do not ask these again.

No new feature-choice question is intrinsically required for this bounded service MVP. The defaults above can be offered together in the final planning summary. Real sender identity, SMTP provider/credential, public origin and owner token are deployment inputs, not reasons to block local service implementation. Retention durations have product/privacy effects; identify the precedent-based 30-day default explicitly in the planning review rather than pretending it was previously separately approved. Rejection remains non-reopenable, following the existing comments lifecycle. If the owner rejects these defaults, amend planning before code. Optional moderation notification emails, self-service deletion links, editing and historical import are outside this MVP and should not be introduced as implied scope.

## External references

No external references or web access were needed; this report describes repository evidence and proposed contracts, not independently verified current upstream behavior. Versions above are the checked-in comments package versions, not recommendations of latest releases.

## Caveats / Not Found

- `.trellis/spec/backend/index.md` does not exist; service conventions currently live in frontend comments/memo and Trellis Plus contracts.
- Research did not execute tests, Docker, SMTP, production probes, or read credentials. No claim of current runtime success is made.
- Comments is precedent, not a security guarantee: its plaintext private outbox, in-memory rates, separate epoch transaction and literal admin comparison need deliberate memo replacements.
- Only this research file is owned by this agent; main session owns final planning edits, manifests, review and child activation.
