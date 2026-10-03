# Memo contract and plugin configuration design

## Ownership

The contract is a dependency-light JavaScript module under `plugins/memos/`.
It is imported by the service, the Astro build adapter, and the publication
assembler. It owns decoding, normalization, ordering, digest calculation, and
serialization; consumers must not reimplement those rules.

Planned files:

- `plugins/memos/plugin.json`
- `plugins/memos/public.mjs` and declaration file
- `plugins/memos/config.mjs` and declaration file
- `plugins/memos/tests/public.test.mjs` and config tests
- `config/plugins/memos/config.toml.example`

The service child owns the final secret vocabulary and
`config/plugins/memos/secrets.env.example`. This child defines the configuration
boundary and safe environment-name references without reading secret values.

## Public export

The v1 envelope contains exactly:

```json
{
  "schemaVersion": 1,
  "sourceRevision": "revision",
  "generatedAt": "2026-09-30T00:00:00.000Z",
  "tombstoneEpoch": 0,
  "digest": "sha256-hex",
  "memos": [
    {
      "id": "m_opaque",
      "displayName": "Reader",
      "body": "Plain text",
      "createdAt": "2026-09-30T00:00:00.000Z"
    }
  ]
}
```

The digest is the SHA-256 hex digest of the canonical JSON serialization of
`schemaVersion`, `sourceRevision`, `generatedAt`, `tombstoneEpoch`, and the
already sorted public `memos` array, excluding `digest` itself. The helper
must use one explicit property order and append a trailing newline only to the
serialized file, not to the digest payload.

`tombstoneEpoch` is a non-negative integer increased whenever a deletion or
other public removal creates a new publication tombstone. The publication
consumer compares it with the last promoted metadata and refuses a lower
epoch. The contract does not persist the last promoted value; that belongs to
publication state.

## Configuration boundary

This child defines the activation parser and a documented activation example;
`memo-site` owns integration into the live site loader and configuration.
The current loader rejects plugin keys other than `comments`
(`apps/site/src/lib/site-config.mjs:245`). Do not add `[plugins.memos]` to
`config/site.toml` during the contract-only child. Manifest consumer entrypoints
describe the planned integration; executable entrypoint existence is checked
by the owning consumer child after its files exist.

`config/site.toml` contains only the activation projection. The plugin-owned
config file separates `[public]` build values from `[runtime]` service values.
Secrets are names or mounted secret inputs, never literal values in static
configuration. A disabled plugin must be representable without loading the
plugin-owned config or export.

## Decoder and producer behavior

The wire decoder rejects noncanonical text and unsorted records instead of
silently repairing them. Separate producer helpers normalize NFC text, convert
CRLF/CR to LF, trim outer whitespace, sort records, and calculate the digest
before decoding the completed envelope. Invalid UTF-8 bytes and unpaired UTF-16
surrogates must be rejected before hashing; no replacement-character repair.
Decoded records, the records array, and the envelope are frozen.

Use descending canonical UTC timestamps and ascending ASCII opaque IDs for
ties, without locale-dependent comparison. Require all envelope fields,
including a lowercase 64-character hexadecimal digest. Tombstone epochs must
be non-negative safe integers; comparing them against publication history is
the publication child's responsibility. Apply the owner-approved text limits
from the PRD after producer normalization and during strict wire validation.

The comments implementation is precedent, not wire compatibility: its decoder
sorts incoming records and permits an absent digest
(`plugins/comments/public.mjs:335`), whereas the memo requirements reject
invalid wire order and require the complete envelope.

## Compatibility

The contract intentionally resembles the comments contract's exact-key and
digest safeguards, but it does not accept `postPath`, `parentId`, `homepage`,
or any comments identifier. The v1 schema is standalone and can evolve only
through an explicit new schema version.
