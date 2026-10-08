# Integrated Memo Release Implementation

## Boundaries

New release access uses `plugins.public.v2.json`, schema 2 and exactly one gated
plugin: comments. The existing schema-1 decoder, filename and gate meaning remain
available for retained recovery releases. Mixed filenames, mismatched schemas and
contradictory markers fail; a writer cannot silently convert an existing release.

The assembler accepts Memo HTML only in its new document namespace, plus the
site-owned `/memos/` compatibility index. Its six-field legacy Memo metadata still
retains the validated deletion floor. No current independent source or receipt
is read by an integrated build. New runtime routes serve site bytes, even when a
legacy artifact is retained on disk. Comments behavior remains unchanged.

## Entry Points

Use `./sam node tooling/memo-documents/cli.mjs new` for document authoring, then
`./preview.sh build` for the coordinated publication. Independent host `new`,
`publish`, `push` and `rollback` refuse with migration guidance before config,
transport or source effects. Legacy candidate build/validation/history internals
remain explicit recovery tooling, including strict receipts and deletion floors.
`FIREFLY_MEMOS_CANDIDATE` is rejected by active preview/package commands.

The new-entry CLI follows the selected `FIREFLY_CONTENT_ROOT` when present and
uses checkout `content/memos/` otherwise. For a selected external authoring root,
keep the ordinary blog mount read-only and use the
existing exact writable Memo override (the canonical root must already exist):

```sh
SAM_CONTENT_MODE=none SAM_MEMOS_SOURCE_ROOT=<workspace>/memos \
  SAM_MEMOS_SOURCE_WRITABLE=1 ./sam npm run memos -- new \
  --source-root <workspace>/memos
```

The placeholders describe a private operator input; they are not literal shell
arguments or a tracked deployment identity. No blanket writable blog mount is
introduced. The ignored old owner adapter remains untouched recovery tooling.

Root build/install/check/test delegates include `presentations/memo` before the
site. `sam` scans optional Memo symlinks with the same read-only containment
discovery used for existing document collections; required posts/pages behavior
is unchanged. Browser fixture files remain owned by the reader implementer.

Owner-controlled README files were not edited. Their independent publisher,
combined-candidate and old authoring instructions are stale for new documents;
the replacement commands are above.

## Validation Status

Passed focused gates:

- `./sam npm run test:plugins-contract`: 14 tests.
- `./sam npm run check:plugins-contract`: syntax and declaration consumption.
- `./sam npm --prefix tooling/assemble-publication run check` and `run test`:
  build plus 20 tests, including integrated inventories, retained floors,
  comments, rollback and serving site-owned bytes.
- `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run test`:
  16 retained strict candidate/history tests.
- `./sam npm run test:memos-contract`: 11 strict legacy wire/configuration tests,
  including the recovery-only plugin descriptor.
- `./preview.sh render npm run test:memos:ops`: 5 shell-wrapper/retirement tests.
  The default Alpine image lacks Bash, so its earlier invocation failed as an
  environment mismatch; the maintained pinned render profile passed.
- `bash -n`, `shellcheck -x`, `shfmt -d` on changed shell files.
- Root install/build/check/test delegate ordering was inspected and checked:
  the Memo adapter precedes site consumers in each maintained product graph.
- `tooling/plugin-access/check-runtime.sh`: real disposable Nginx validation,
  all retained v1 states, integrated comments on/off, repeated v1/v2 pointer
  changes without reload, exact legacy data/history preservation and cleanup.
- `tooling/publish-memos/ops/check-runtime.sh --config-check-only`: real jq
  recovery configuration types/defaults/deletion-floor checks.

The first broader assembler run found a version-dependent inventory-path
assumption in legacy history decoding; fixed it without relaxing validation.
The initial Nginx run exposed an internal index redirect back into the version
switch; serving the exact compatibility index resolved it. Both complete gates
passed after their respective fixes.

## Full-Gate Follow-up

The first complete `./preview.sh verify` attempt exited 1 in the combined
diagram/preview CLI suite, before browser stages. Its isolated preview fixture
still emitted a version-1 access snapshot, which the new active-preview contract
correctly rejects. Product source hashes were unchanged throughout that attempt.
The private failure log is retained; it is not counted as a full pass.

Updated only the synthetic preview fixture to version 2, preserving explicit
version-1 rejection, comments-state invalidation, CLI/readiness/address and exact
teardown assertions. Retired candidate selection now fails before Docker/address
or package-tool preflight; dev/start/preview/package all have positive refusal
coverage. Focused preview CLI tests: 26 passed. Changed shell syntax, ShellCheck
and shfmt passed.

A second complete attempt passed all preceding Node suites, including the
combined 39-test diagram/preview suite, then exited 1 in static output validation
(17 of 18 tests passed). The exact expected HTML inventory derived only post/page
documents, while actual output included a Memo detail. The equality check is
retained. Follow-up review established a real stale-cache leak: both current
Memo source roots were empty, but Astro's persistent content store retained a
prior synthetic record. Its glob loader returns early on empty input before
pruning old records. The reviewer is implementing an empty-input loader guard,
dynamic expected Memo routes and a warm populated-to-empty build regression.
No browser stage was reached, and this attempt is not counted as a full pass.
Product source hashes remained unchanged across this attempt as well. Both
private failure logs are preserved; the next attempt awaits the corrected
fixture's focused pass.

The third attempt passed all Node/static stages and Memo browsers (13 passed,
7 applicability skips). Ordinary-site browsers ended with 151 passed, 139 skips
and 6 failures, each at the same native-home fixture assertion: expected 16
links, received 17 after adding the approved Memo Pages introduction. No
case-specific lifecycle/focus/history assertion failed before this shared
inventory check. Exact source-projection proof is required before updating its
fixture. NERV/publication browsers and host fixtures were not reached.
Preserved 49 browser failure files privately before subsequent reruns.

For this attempt, an incorrect prelaunch helper-path assertion prevented the
intended initial hash file. The recorded baseline honestly begins during Node
suites after the main/reviewer product freeze; its 94 product source hashes
matched at exit. No stronger prelaunch hash claim is made. Task/spec record
updates are excluded from product hashing. A new complete attempt remains
required after the remaining fixture correction.

The native-home fixture was subsequently proven to contain exactly 17 public
entries (12 posts and 5 pages), including one compact canonical Memo aggregate
and its matching template. Its lifecycle/focus/history/module assertions and
timeouts were retained. The focused four-project matrix passed 11 cases with
29 existing applicability skips.

## Completed Full Gate

The fourth `./preview.sh verify` attempt exited 0 on the reviewed frozen sources
at that point, in approximately 272 seconds:

- Node: 398 tests across 18 suites.
- Memo browsers: 13 passed, 7 applicability skips.
- Ordinary site browsers: 157 passed, 139 applicability skips.
- NERV browsers: 8 passed.
- Assembled-publication browsers: 6 passed.
- Combined browsers: 184 passed, 146 applicability skips, zero failures.
- Retained legacy static recovery and v1/v2/comments runtime fixtures passed,
  including pointer switches without reload and exact source/history retention.
- All 95 prelaunch/post product source hashes matched, with no source inventory
  additions or removals. This attempt has a genuine prelaunch hash baseline.
- Exact disposable fixture container scopes and the fixture image-tag namespace
  were empty after successful cleanup. Default services were not started.

Previous failed attempt logs and 49 browser failure files remain owner-only
recovery evidence. They are not counted as passes. Task/spec record edits were
excluded from product hashing. No SSH or production deployment occurred.

## Real-Workspace Follow-up

The main session's installed-workspace build subsequently exposed one static
miscellaneous-inventory test omission: all 269 Memo HTML routes passed, while
211 referenced Memo assets were missing from the expected asset closure. The
reviewer owns a test-only correction derived from parsed public HTML; exact
inventory equality remains required. No runtime failure is inferred from this
expectation mismatch. A further full gate is required after that source change.

Global build/stage work is paused for the main session's installed-workspace
build and real-corpus reading acceptance. Final runtime packaging awaits
explicit coordination and has not been run by this worker. Production
deployment, SSH and source installation remain outside this worker's scope.

## Final Repeat and Daemon-Recovery Evidence

After the test-only attachment inventory correction and successful actual-reader
acceptance, the fifth complete verification ran on a genuine 95-file prelaunch
hash baseline. Its saved log contains all 398 passing Node tests and all browser
results: Memo 13/7 skips, ordinary site 157/139 skips, NERV 8 and publication 6
(184 passes, 146 applicability skips, no failures). Both host fixture success
messages, including the final retained-state/version-switch assertion, are
present at the end of the log.

The daemon restart removed the worker/process handle before its exit status and
post-run report could be collected. The main session found no surviving owned
verification containers, compared all 95 prelaunch hashes successfully, and
preserved the recovered post-run snapshot. The original process exit status is
unavailable; it is not manufactured as zero. Both host runtime fixture commands
were repeated after recovery and jointly exited zero, preserving their sources,
receipts/pointers/history and exact cleanup. Completed Node/browser stages were
not repeated solely to recreate a lost process handle.

The main session then started the previously unexecuted actual-source runtime
package under normal build permissions with an absent, isolated image tag and
owner-only log. Its outcome and final source/output reconciliation belong in
the final acceptance record; this paragraph does not claim packaging passed.

That actual-source package subsequently exited zero. Publication/runtime exact
inventory, integrated Memo/compatibility and ordinary/Experiment routes, privacy
closures, headers/404s, non-root and read-only assertions passed. The uniquely
created test tag and temporary runtime container were removed; fixture scopes
and legacy fixture tags were absent. Final source/output reconciliation and
the intentional local static review preview are recorded in final-acceptance.md.
