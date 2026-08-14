# Migration contract

The Typecho importer is a build-only, owner-local boundary. It is not a site
runtime dependency and must never be imported by Astro routes or shipped in a
publication artifact.

## Intake

- `migrate:typecho` receives an explicit repository root, checksum-verified
  `.sql`/`.sql.gz` dump, and a ledger path below `.private/`.
- A source adapter, when used, is an ordinary repository-local executable,
  invoked without a shell, and must emit only the exact versioned JSON source
  snapshot. Adapter stderr and unknown snapshot fields are errors.
- Upload manifests are exact v1 JSON and map references to ordinary,
  checksum-verified files below a private upload root. Trusted credential-free
  HTTPS references may remain external. A safe relative `assets/<segments>`
  reference is a deliberate `deferred` decision: preserve it verbatim while
  the owner prepares its OSS upload, and do not count it as a release blocker.
  The same policy applies to authored Markdown image references that are local
  non-URI paths, including legacy drive-style paths. URI schemes other than
  credential-free HTTPS remain explicit `exception` decisions.

## Corpus projection

- Published Typecho posts become `posts/<category-slug>/<slug>.md`; published
  pages become `pages/<slug>.md`. Unsafe, ambiguous, nested, or colliding
  identities are exceptions and cannot be promoted.
- The public front matter allowlist is title, dates, description, tags, draft,
  layout, presentation, and a page slug. `customSummary` is a description
  candidate; missing summaries use a deterministic prose fallback.
- CMS templates, IDs, counters, access flags, passwords, and unreviewed custom
  fields remain private/deferred. Body wrappers are converted to safe Markdown;
  active or unhandled HTML never enters public Markdown.

## Private handoff and promotion

- Each run atomically replaces an ignored, owner-only SQLite/JSONL ledger. It
  contains opaque document/comment/identity/memo correspondence, field
  classifications, raw resource decisions, a separate aggregate review report,
  and aggregate inventory only on stdout. The raw resource/exception files
  remain private ledger data.
- The identity policy records the owner default `wkyuu` plus `mail`/`url`
  source-field mapping. Mail, IP, user-agent, and raw identity values remain
  private; M5 emits no comment or memo route.
- `--materialize-candidate` writes review Markdown only below the ledger's
  `candidates/` directory and may retain unresolved resource references.
  `--materialize-public` is explicit, below `content/`, atomic, and blocked by
  any document/count or blocking resource (`exception`). `deferred` local assets
  do not block this gate and remain unchanged until an OSS/manifest decision.
  The source body is owner-authorized public authored content: the importer
  does not redact or block text because it resembles a credential or local
  path.
  Managed files are copied beside the candidate under their content-addressed
  `/assets/migrated/` paths.

## Aggregate review report contract

### 1. Scope / Trigger

Every successful private ledger write emits `review-report.json`. It exists so
an owner can review the release gate without opening raw resource references,
document bodies, identities, or source paths.

### 2. Signatures

The ledger writer receives the same `MigrationResult` as the SQLite/JSONL
handoffs and writes one owner-only file:

```ts
writeLedger(candidate, snapshot, result, checksum): Promise<void>
```

The report payload is versioned JSON with `schemaVersion: 1`.

### 3. Contracts

The payload contains only:

```text
resources.total
resources.byDisposition[{disposition, count}]
resources.exceptionsByReason[{reason, count}]
resources.documentsWithExceptions
migrationExceptionsByCode[{code, count}]
publicPromotion.{blocked, reasons[]}
```

`byDisposition` includes `managed`, `external`, `deferred`, and `exception` as
present. `exceptionsByReason` includes only blocking `exception` decisions;
deferred local assets are visible through `byDisposition` but never appear in
the blocking reason or document counts. Counts are non-negative integers;
arrays are deterministic and sorted. Raw references and source values remain
in separate ignored handoffs only.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| Any document/count exception or blocking resource (`exception`) | `publicPromotion.blocked` is true and public materialization aborts |
| Safe relative `assets/<segments>` reference without a manifest match | Record `deferred`, preserve the reference, and leave the public gate unaffected |
| Authored local image reference without a URI scheme | Record `deferred`, preserve the reference, and leave the public gate unaffected |
| Owner-authorized body contains credential/path-shaped text | Preserve normalized authored text; do not create a redaction exception or block promotion |
| Missing/partial report during a ledger write | The atomic ledger write fails; no partial ledger is promoted |
| Raw reference, body, identity, or source path in the report | Test/quality failure; remove the value before promotion |
| Repeated run over identical input | Byte-stable report and deterministic ordering |

### 5. Good / Base / Bad Cases

- Good: a managed-only synthetic input reports one managed resource and no
  exceptions, with `publicPromotion.blocked: false`.
- Good: a safe relative `assets/pending.png` input reports one deferred
  resource, preserves the Markdown reference, and leaves the public gate
  unblocked when no other exception exists.
- Base: the real corpus reports grouped external/deferred counts, with local
  authored asset paths deferred and no migration/resource exception.
- Bad: copying `resource-decisions.json` into the review report or treating an
  unsafe URI scheme as a deferred local asset.

### 6. Tests Required

- Managed synthetic fixture: assert exact disposition counts and no raw fields.
- Relative local-resource candidate: assert a deferred disposition, preserved
  reference, empty blocking reason/count, and an unblocked clean promotion.
- Legacy drive-style local-resource candidate: assert a deferred disposition,
  preserved reference, empty blocking reason/count, and an unblocked gate.
- Public-body fixture: assert credential/path-shaped authored text is preserved,
  creates no redaction exception, and does not block a clean promotion.
- Deterministic rerun: compare the report bytes as part of the candidate tree.

### 7. Wrong vs Correct

Wrong:

```ts
report.resources = result.resourceDecisions;
```

Correct:

```ts
report.resources = aggregateByDispositionAndReason(result.resourceDecisions);
```

## Required checks

Use the repository's `./sam` wrapper for `check:migrate-typecho`,
`test:migrate-typecho`, and the full `check:m5`, `test:m5`, and `build:m5`
gates. A real dump run must report the expected 93 posts, 7 pages, 376 memos,
189 comments, current/orphan field counts, and grouped resource dispositions
without printing source values. Authored body text and local authored asset
references are preserved as owner-approved public content; no body redaction
scan is part of M5.
