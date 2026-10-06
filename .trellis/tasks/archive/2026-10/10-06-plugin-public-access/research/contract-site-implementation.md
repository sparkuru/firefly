# Shared activation contract and site implementation

## Completed boundary

- Added framework-independent `plugins/public-access.mjs` and filesystem adapter,
  with declarations and focused pure/filesystem tests. The finite current registry
  covers comments and Memo and is checked against every tracked plugin manifest.
- Exact schema-1 activation uses true booleans, frozen normalized records and
  deterministic JSON. Only enabled plugins get `plugin-access/<id>.enabled` with
  exact `enabled\n` bytes. Missing, contradictory, oversized, symlinked or extra
  marker state fails closed. Emission refuses unowned reserved collisions and
  deletes stale markers only after validating an existing owned snapshot.
- Astro emits that snapshot from the same selected frozen site configuration
  used by rendering. Blog builders still never read Memo inputs.
- The site config namespace allowlist uses the shared IDs. Canonical content
  aliases cannot occupy comments/Memo routes or activation artifact namespaces.
- Added `apps/site/scripts/plugin-access.mjs` current/check/compare commands.
  Check is release-only. Compare refuses a changed current activation and directs
  the operator to rebuild without `--no-build`. Optional expected-comments-origin
  validation blocks enabled comments outside the deployment's managed boundary.
  Stdout contains only the strict activation projection; failures use stderr.
- The Memo fixture server gates all plugin-owned decoded namespaces before
  redirects or methods, including a retained nonempty independent publication.

## Focused evidence

Commands ran through project Docker wrappers; no host Node/npm was used:

- `./sam node --test plugins/tests/public-access.test.mjs plugins/tests/public-access-files.test.mjs`:
  final eleven tests passed, including stale-empty-directory and oversized
  snapshot rejection, registered exact/prefix Nginx inventory alignment, and
  exact public file modes under restrictive owner umask.
- `./sam node --experimental-strip-types --test --test-concurrency=1 apps/site/tests/plugin-access.test.mjs apps/site/tests/memos.test.mjs apps/site/tests/site-config.test.mjs`:
  20 tests passed. Coverage includes alternate selected config, missing Memo inputs,
  stale build refusal, managed-origin mismatch, all four activation combinations,
  retained public HTML/JSON/CSS and private receipt preservation, percent-encoded
  route spelling, redirect/method ordering and normal blog access.
- Rerun after duplicated-slash handling and empty marker-directory validation:
  shared plus site activation/Memo suites passed 14 tests (before the final extra
  bounded-snapshot case).
- `./sam npm exec --prefix tooling/assemble-publication -- tsc --noEmit --strict --module NodeNext --moduleResolution NodeNext --target ES2022 plugins/tests/declarations.mts`:
  passed.
- `./preview.sh render npm --prefix apps/site run check`: Astro checked 123 files;
  zero errors, warnings or hints. It did not build or replace `dist`.
- `./preview.sh render node --test apps/site/tests/preview-command.test.mjs`:
  26 tests passed, covering the new strict static preflight, missing selected
  enabled Memo artifact, release activation changed under a running preview,
  independent runtime gate ordering and the existing lifecycle/address checks.
  The initial Node-Alpine invocation could not spawn Bash; the maintained
  browser-image invocation supplied that declared shell dependency and passed.
- `./preview.sh render node --test apps/site/tests/static-output.test.mjs`:
  18 tests passed after adding the shared snapshot and selected positive markers
  to the exact output inventory, with decoded equality against `SITE_CONFIG`.

The actual Astro build producer/alias-collision test is maintained in
`apps/site/tests/memos-build.test.mjs`; the coordinated main-session build gate
owns its execution. This evidence alone does not claim an enabled comments
upstream, host Nginx behavior, physical-device review or remote deployment.

## Preserved scope

The final runtime check exposed a restrictive caller umask. The shared public
writer now sets exact 0755 for its newly created marker directory and 0644 for
its validated owned snapshot/marker files after creation. The regression restores
the process umask in `finally` and proves unrelated root permissions and a private
0600 sentinel remain unchanged. It does not broaden directory-tree permissions.

No owner config flags, remote files, Git history, plugin data or independent
Memo receipts were changed by this implementation subtask. Main session owns
specs/assembly/runtime/private synchronization and production acceptance.
