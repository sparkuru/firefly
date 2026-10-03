# Memo Public and Configuration Contract

## 1. Scope / Trigger

Read this when changing `plugins/memos/` or implementing its service, site,
or publication consumers. The contract is independent of comments, posts,
pages, and Experiments. It does not register the plugin with the site, expose
HTTP routes, read a database, or promote a publication. Consumer entrypoints
in the manifest describe subsequent integrations, not automatic discovery.

Historical Typecho memo data remains private. Only the separately approved
new-submission workflow may supply public records; shape validation alone
does not prove owner approval or authorize historical import.

## 2. Signatures

`plugins/memos/public.mjs` and `public.d.mts` expose:

```ts
normalizeDisplayName(value: unknown): string
normalizeBody(value: unknown): string
normalizePublicId(value: unknown): string
validatePublicMemo(value: unknown): PublicMemo
comparePublicMemos(left: PublicMemo, right: PublicMemo): number
digestForExport(value: PublicMemosPayload): string
decodePublicMemosExport(value: unknown, source?: string): PublicMemosExport
createPublicExport(value: PublicMemosPayload): PublicMemosExport
serializePublicExport(value: PublicMemosExport): string
```

The decoder accepts a parsed object, JSON string, or UTF-8 `Uint8Array`.
The producer and digest helpers accept an envelope without `digest`.

`plugins/memos/config.mjs` and `config.d.mts` expose
`parseMemosActivation(value?, source?)`,
`parseMemosConfig(value?, source?, { enabled? }?)`,
`parseMemosPublicConfig(value?, source?, { enabled? }?)`, and
`resolveMemosConfigPath(configPath?, repositoryRoot?)`.

## 3. Contracts

### Public wire format

- Envelope keys are exactly `schemaVersion`, `sourceRevision`, `generatedAt`,
  `tombstoneEpoch`, `memos`, and `digest`; every key is required.
- Record keys are exactly `id`, `displayName`, `body`, and `createdAt`.
  Never export email, consent, tokens, moderation state, abuse metadata, or
  local paths. Comments keys such as `postPath` and `parentId` are invalid.
- Schema version is `1`. IDs match `^m_[A-Za-z0-9_-]{3,128}$`; source revisions
  match `^[A-Za-z0-9._~-]{1,256}$`. Dates use valid four-digit-year UTC
  `YYYY-MM-DDTHH:mm:ss.sssZ` strings.
- Producer normalization applies NFC, converts CRLF/CR to LF, and trims outer
  whitespace. Names contain 1–80 Unicode code points and are single-line;
  bodies contain 1–8192 UTF-8 bytes. Malformed Unicode and unsafe control or
  formatting characters are rejected. Bodies are text, never trusted HTML;
  downstream renderers must escape text rather than interpolate markup.
- The wire decoder rejects noncanonical text instead of normalizing it. It
  rejects malformed UTF-8, duplicate IDs, sparse/decorated arrays, unknown
  fields, and accessor-backed data. Accepted records, arrays and envelopes
  are immutable copies.
- Order is descending timestamp, then ascending ASCII ID. Producer helpers
  sort; the decoder rejects wrong order. Do not reuse comments' permissive
  order/digest compatibility behavior.
- Digest input is compact UTF-8 JSON in property order `schemaVersion`,
  `sourceRevision`, `generatedAt`, `tombstoneEpoch`, `memos`, with record
  order `id`, `displayName`, `body`, `createdAt`. Exclude `digest` and any final
  newline. Digest is exactly 64 lowercase SHA-256 hex characters. File
  serialization adds one final newline.
- Tombstone epochs are non-negative safe integers; negative zero is invalid.
  Publication consumers must compare with prior promoted state to reject
  rollback. The pure module does not maintain publication history.

### Configuration

- Activation has only `enabled` and `configPath`. Defaults are `false` and
  `config/plugins/memos/config.toml`. The current site loader does not yet
  accept memo activation; integrate it in the site child before changing
  live `config/site.toml`.
- Plugin configuration has only `public` and `runtime`. Public settings are
  `writeOrigin` (nullable, required when enabled), `exportPath` (default
  `artifacts/memos/memos.public.v1.json`), and `consentVersion` (default
  `memos-v1`). Origins must be HTTPS without credentials, path, query or
  fragment. Export/config paths are repository-relative with the required
  `.json`/`.toml` suffix.
- Runtime settings are `allowedOrigins`, `publicOrigin`, `dataRoot`,
  `databasePath`, `outboxPath`, `secretEnv`, `smtp`, and `encryptionKeyId`.
  Origin lists are unique;
  private paths may be absolute. Paths reject traversal, empty segments,
  backslashes, whitespace, controls and unsupported characters.
- `secretEnv` contains only optional `smtpPassword`, `adminToken`, `tokenKey`,
  and `encryptionKey` environment-name references. The module never reads
  environment values or secret files. Secret loading belongs to the service.
- `smtp` defaults to null. When supplied it requires `host`, `user`, and
  `from`; accepts `port`, `secure`, `connectionTimeoutMs`, and
  `commandTimeoutMs`; and rejects every other field. Port defaults to 587,
  `secure` defaults to true only on port 465, and both timeouts default to
  10000 ms (range 100–120000). Passwords remain separate secret inputs.
  Sender mailboxes have at most 64 local-part characters, 253 domain
  characters and 320 total characters, matching the service mailbox checks.
  The runtime requires certificate-validated implicit TLS or STARTTLS.
- `encryptionKeyId` defaults to `primary`, matches
  `^[A-Za-z0-9_-]{1,64}$`, and identifies the encryption envelope. It is a
  nonsecret identifier; changing keys requires a separate migration procedure.
- The pure parser preserves nullable `outboxPath` for contract compatibility.
  The memo service uses its transactional SQLite outbox and rejects nonnull
  file-outbox settings instead of silently ignoring them.
- Public projection validates the supplied config but returns only public
  values. It does not read configuration files. Disabled consumers must
  short-circuit before loading plugin files or exports.
- Path resolution is lexical, not a filesystem security check. Future file
  loaders must reject symlink escapes/non-regular files and establish real
  containment before reading; do not infer that this module does so.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Missing/extra/private field, invalid date/ID/text, duplicate ID | `PublicMemosContractError`; no partial projection |
| Noncanonical wire order/text or mismatched/missing digest | Reject; do not silently repair |
| Malformed UTF-8 or unpaired surrogate | Reject before hashing; no replacement decoding |
| Invalid epoch or unsupported schema | Reject export |
| Epoch below previous publication | Consumer must refuse promotion |
| Unknown config key, unsafe path/origin, literal secret field | `TypeError`; no value-bearing diagnostics |
| Enabled public config has no write origin | Reject config |
| Disabled activation with no supplied config | Pure defaults; no filesystem/service dependency |

## 5. Good / Base / Bad Cases

- **Good:** service selects approved records, builds an export through the
  producer helper, and consumers decode exactly that wire format.
- **Base:** an empty memos array is valid with a matching digest; the default
  activation remains disabled without private inputs.
- **Bad:** spread database rows into public records, pass an unsigned export,
  repair wire order before checking it, or interpret body strings as HTML.

## 6. Tests Required

Run `./sam node --test plugins/memos/tests/*.test.mjs`. Assert exact text
boundaries with supplementary Unicode names and multibyte bodies; malformed
dates/UTF-8/surrogates; required fields; private-field and accessor rejection;
duplicate IDs; ordering; independently calculated digest; deterministic
round trips; immutable output; and strict public/runtime configuration.

Validate declaration consumption using the repository TypeScript compiler
through `./sam`. This contract-only gate requires no running application
service, SMTP, secrets or database. Later consumer tasks own static build,
moderation, publication rollback, and runtime integration tests.

## 7. Wrong vs Correct

Wrong: `decodePublicMemosExport({ ...databaseRow, email: privateEmail })`, or
sorting an incoming export before decoding to hide invalid wire order.

Correct: explicitly select the four approved public fields, pass the unsigned
envelope to `createPublicExport`, then call `serializePublicExport`. At the
read boundary, call `decodePublicMemosExport(bytes)` before rendering or
publication and compare its epoch with the prior promoted metadata.
