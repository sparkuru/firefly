# Research: Resource exception review

- Query: Classify the real M5 resource references from the private migration
  ledger for owner review using aggregate counts, file extensions,
  affected-document counts, and repository/remote-inventory evidence.
- Scope: mixed (private ledger aggregation plus repository evidence; no raw values reproduced)
- Date: 2026-08-14

## Findings

### Aggregate snapshot

The owner-only aggregate report records 961 extracted resource references:

| Current disposition | References | Affected documents |
| --- | ---: | ---: |
| external, credential-free HTTPS | 931 | not needed for exception review |
| deferred, safe relative local asset | 23 | 3 |
| deferred, legacy drive-style local asset | 7 | 4 |
| managed | 0 | 0 |
| exception, blocking | 0 | 0 |

All 30 non-external references occur on posts; no page is affected. The
deferred references are owner-approved local authoring paths and are not
blocking exceptions. The owner has confirmed that authored Markdown bodies are
already public content, so no body-level redaction exception is recorded and no
document/count or resource exception exists in the current inventory.

### Exception classes and recommended decision

| Class (aggregate only) | Count | Extensions | Documents | Ledger reason | Recommended next decision |
| --- | ---: | --- | ---: | --- | --- |
| Relative/local reference | 23 | PNG 19; JPG 4 | 3 posts | Safe relative asset awaits OSS upload. | Owner has approved the intended OSS-upload path. Preserve each reference verbatim as `deferred`; when the corresponding regular file is uploaded, add an exact v1 manifest entry with size/SHA-256 checks and rerun so it can become `managed`. This class is not a current release blocker. |
| Windows-drive-style reference | 7 | PNG 7 | 4 posts | Local asset awaits OSS upload. | Preserve the legacy path string as `deferred`; when the corresponding regular file is uploaded, add an exact v1 manifest entry with size/SHA-256 checks and rerun so it can become `managed`. This class is not a current release blocker. |

The current ledger is `931 external / 30 deferred / 0 exception`; no local asset
has been marked `managed` because no OSS transfer manifest has been supplied.

### Files found and evidence

- `.private/migration/typecho-m5/review-report.json` is the aggregate source for
  the 961/931/30/0 disposition counts and the unblocked promotion state. Only
  aggregate fields were used;
  raw references, bodies, and source correspondence were not copied.
- `.private/migration/typecho-m5/resource-decisions.json` was reduced locally
  to disposition, reason, extension, and opaque-document cardinalities. No
  resource value is included here.
- `.private/migration/typecho-m5/article-manifest.json` was used only to verify
  that every exception belongs to a post and to count affected documents.
- `.private/migration/typecho-m5/exceptions.json` is empty for the current
  owner-approved local-asset policy.
- `tooling/migrate-typecho/src/index.ts:293-320` defines the trust boundary:
  only a manifest match is managed, authored local image paths are deferred,
  only credential-free HTTPS is external, and other URI schemes are exceptions.
- `tooling/migrate-typecho/src/index.ts:433-455` constructs the deterministic
  aggregate report from disposition/reason/code counts and opaque document
  cardinalities; it does not place raw resource decisions in the report.
- `tooling/migrate-typecho/src/index.ts:700-718` adds only blocking resource
  exceptions as `resource-unresolved` and records the aggregate inventory,
  including deferred counts.
- `tooling/migrate-typecho/src/index.ts:739-741` blocks public materialization
  while any migration or blocking resource exception remains; deferred assets do
  not enter that gate.
- `.trellis/tasks/08-14-full-content-migration/research/repository-evidence.md:50-57`
  records the owner-authorized read-only remote inventory: one regular JPEG of
  roughly 4.9 MB, no symbolic links, no transfer yet, and no configuration
  reads. This evidence is consistent with requiring a new manifest/checksum
  transfer; it does not prove that any of the 23 local references map to that
  file and gives no evidence for the seven PNG references.
- `.trellis/tasks/08-14-full-content-migration/research/repository-evidence.md:161-167`
  independently records the aggregate disposition split and the absence of a
  body-signature gate without source values.

### Owner-review outcome

The owner has clarified that non-HTTP Markdown asset references are intentional
local assets awaiting OSS upload. Treat that as approval of intent, not as proof
of asset availability or checksum identity. The importer now records all 30 as
non-blocking `deferred` references and keeps their Markdown unchanged. A future
manifest-listed, read-only transfer can promote each verified match to
`managed`; after it succeeds, rerun the aggregate report and confirm the
managed count increases. No body-signature decision is needed: the owner has
confirmed that these Markdown bodies were already public, so the importer
preserves them.

## Related specs

- `.trellis/spec/frontend/migration-contract.md:9-16` — checked dump/ledger
  intake and exact upload-manifest policy.
- `.trellis/spec/frontend/migration-contract.md:30-45` — private handoff and
  public-materialization boundary.
- `.trellis/spec/frontend/migration-contract.md:47-90` — aggregate report
  schema, privacy requirements, deterministic ordering, and release gate.
- `.trellis/spec/frontend/migration-contract.md:123-129` — required `./sam`
  checks and aggregate-only real-source evidence.
- `.trellis/tasks/08-14-full-content-migration/design.md:76-91` — mixed managed,
  external, deferred, and exception resource policy.

## External references

None. This review is internal-only and relies on the repository contract and
the owner-authorized remote-inventory summary already captured in the task
research. No web lookup or external documentation was needed.

## Caveats / Not Found

- The raw resource ledger remains owner-only by design; this report intentionally
  does not expose references, source paths, bodies, identities, or source IDs.
- The remote inventory was read-only and did not transfer files or produce a
  checked manifest. It cannot establish a one-to-one mapping for the 23 local
  references or validate the seven PNG references.
- The updated importer was rechecked through `./sam` (`check:migrate-typecho`
  and `test:migrate-typecho`), and the owner-local aggregate ledger was rerun
  through the same boundary. The next manifest-transfer/rerun step must use
  the repository `./sam` boundary as well.
- Public promotion is not blocked by the current ledger: all non-HTTP authored
  asset references are deferred, while deferred assets and authored body text
  do not enter the migration gate. Final assembly still requires any referenced
  asset to be uploaded or otherwise resolved before it can be served publicly.
