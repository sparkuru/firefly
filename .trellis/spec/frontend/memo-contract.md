# Owner Markdown Memo Contract

## 1. Scope / Trigger

Read when changing `plugins/memos/` or the independent owner publisher.
Memo is owner-authored Markdown, separate from posts, pages, comments and
Experiments. The pure module neither reads files nor publishes releases.
The former visitor submission/mail service is retired; its private records
remain operational recovery data. Historical owner notes require separate
explicit corpus/visibility approval and offline conversion; the pure decoder
never imports or reinterprets a legacy export.

## 2. Signatures

`plugins/memos/public.mjs` and its declaration expose
`normalizeDisplayName`, `normalizeBody`, `normalizePublicId`, `timestamp`,
`validatePublicMemo`, `comparePublicMemos`, `digestForExport`,
`decodePublicMemosExport`, `createPublicExport`, and `serializePublicExport`.
`MAX_BODY_BYTES` is the shared literal `131072` (128 KiB) UTF-8 body bound.
Decoding accepts an object, JSON string or UTF-8 `Uint8Array`; producer helpers
accept a payload without its digest. The producer returns an immutable export.

Configuration exposes `parseMemosActivation(value?, source?)`,
`parseMemosConfig(value?, source?)`, `parseMemosPublicConfig(value?, source?)`,
and `resolveMemosConfigPath(configPath?, repositoryRoot?)`.

## 3. Contracts

- Envelope keys, in digest order, are exactly `schemaVersion`, `bodyFormat`,
  `sourceRevision`, `generatedAt`, `tombstoneEpoch`, `memos`; serialized output
  appends `digest`. Schema is **2**, format is **markdown**. Schema 1 plain text
  is rejected, never silently interpreted as Markdown.
- Record keys are exactly `id`, `displayName`, `body`, `createdAt`.
  Private identity, paths, consent, moderation and comments fields are rejected.
  IDs match `^m_[A-Za-z0-9_-]{3,128}$`; revisions are 1–256 ASCII characters
  from letters, digits, `.`, `_`, `~`, `-`. UTC dates use valid canonical
  `YYYY-MM-DDTHH:mm:ss.sssZ` strings.
- Display names are NFC, trimmed, single-line, 1–80 Unicode code points.
  Markdown bodies contain 1–131072 UTF-8 bytes with meaningful nonwhitespace
  input. Normalize CRLF/CR to LF only: preserve authored code points, leading
  indentation, trailing spaces and outer line breaks. Reject malformed Unicode,
  unsafe controls and formatting characters. Rendering separately rejects a
  body whose sanitized result has no visible content.
- Decoding rejects noncanonical input, malformed UTF-8, unpaired surrogates,
  unknown fields, accessor-backed objects, sparse/decorated arrays, duplicate
  IDs, wrong ordering and incorrect digests. No repair, sorting or partial
  projection occurs at this boundary. Producers may normalize and sort.
- Records sort newest timestamp first, then ascending ASCII ID. SHA-256 hashes
  compact UTF-8 JSON in the property order above, with record order
  `id`, `displayName`, `body`, `createdAt`. Exclude the digest and final newline;
  serialization adds one newline. Digest is 64 lowercase hex characters.
- `tombstoneEpoch` is a nonnegative safe integer; negative zero is invalid.
  Its retained floor and retired IDs belong to the independent private receipt,
  described in [publication/runtime](./memo-publication-runtime-contract.md).
- Activation allows only `enabled` and legacy-compatible `configPath`;
  defaults are false and `config/plugins/memos/config.toml`.
  `configPath` is a safe repository-relative TOML path. It is compatibility
  metadata, not a physical file dependency for either enabled or disabled blog
  builds. The site flag controls public access and discovery through the
  [shared plugin-access projection](./plugin-public-access-contract.md).
- Optional plugin configuration permits only `public.route`, fixed `/memos/`.
  Unknown runtime, SMTP, secret, consent, write-origin and export-path keys fail.
  Publisher source/display/output/deployment settings belong to its own CLI
  and owner-local operational configuration, not site props.

Host authoring defaults are defined by the independent publication runtime
contract: generic `new` creates under the actual checkout's `content/memos/`.
Owner-specific external reading is supplied by ignored private tooling; it does
not become the default creation path for clones or a site content collection.

An explicitly approved historical owner corpus may be converted to the same
exact source/wire contract, keeping private identities and source correspondence
outside public output. The 2026-10-06 owner decision covers only 89 nonempty
HedgeDoc Notes retained with the Typecho backup; 287 empty notes are skipped.
Current Notes content is authoritative, not an arbitrary nonempty old revision.
The owner confirmed UTC+8 for source DATETIME values: subtract eight hours to
emit canonical UTC `createdAt`, retaining the raw value/policy privately.
This decision does not authorize other historical datasets or remote publishing.

## 4. Validation & Error Matrix

| Condition | Result |
| --- | --- |
| Schema 1, missing format, private/extra fields | Reject the entire export |
| Invalid Unicode/date/order/digest/ID or duplicate ID | `PublicMemosContractError`; no repair |
| Noncanonical name or CR-containing wire body | Reject rather than normalize |
| Significant Markdown whitespace or decomposed body Unicode | Preserve exactly |
| Body exactly 131072 UTF-8 bytes / one byte above | Accept / reject for producers and every strict wire form |
| Unapproved historical source or private metadata projection | No automatic import; require explicit bounded conversion |
| Unknown config/runtime key or unsafe config path | `TypeError` without input values |
| Missing physical Memo config with either activation value | Blog remains independent |

## 5. Good / Base / Bad Cases

- Good: owner Markdown sources become schema-2 records, then sanitized static
  HTML and a separately validated publication receipt.
- Base: a validated empty schema-2 stream is valid; default navigation is disabled.
- Bad: reinterpret a legacy text export, trim code indentation, expose a private
  receipt or spread historical database rows into public fields.

## 6. Tests Required

Run the maintained Memo contract and publisher commands through `./sam` with
an explicit no-blog-content profile. Assert exact schema/format/fields,
Unicode and whitespace preservation, strict byte decoding, digest/order and
immutable output; reject legacy/private/accessor/sparse input. Check declaration
consumption, ASCII/multibyte exact-body bounds and pure config defaults/rejections. Full reading, deployment
history and blog-preservation checks belong to the linked consumer contracts.

## 7. Wrong vs Correct

Wrong: normalize a Markdown body with `.trim().normalize('NFC')`, or accept
schema 1 as Markdown because its body is a string.

Correct: preserve the body except LF normalization, require explicit schema 2
and `bodyFormat: 'markdown'`, decode before rendering, and maintain publication
history at the independent Memo pointer.
