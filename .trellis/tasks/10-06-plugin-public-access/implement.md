# Implementation Plan

## Preconditions

- The user approved the final planning summary and current both-off deployment.
- The task is `in_progress`; implementation and the reviewed host changes are authorized.
- Use curated JSONL context and the Trellis implement/check agent contracts.
- The comments contract exceeds the native per-file injection limit. Any child
  touching comments must explicitly read the full contract from disk before
  implementation/review; truncated injected content is not sufficient.
- Current Git tree contains only this task's planning artifacts. Owner private
  scripts/configuration have separate snapshots under owner-only `/tmp`.

## Ordered work

1. Implement the shared exact activation/route registry contract and site build
   producer; add strict projection/override/stale-marker tests.
2. Integrate activation into assembler inventories/history readers and preserve
   established comments floors while disabled. Test migration, repeated builds
   and on/off/on rollback floors.
3. Gate Node static serving, Memo fixture serving and runtime Nginx. Update
   combined preview/package selection and their exact inventory tests.
4. Exercise all four state combinations with retained Memo content and a live
   synthetic comments upstream. Cover GET/HEAD/POST/OPTIONS, bare and descendant
   paths, public JSON/assets, normal blog reading, private-state preservation and
   gate transitions without restarting the Nginx instance.
5. Update the ignored owner sync adapter to consume the release projection,
   verify no-build/current-config agreement, skip disabled publishers, preflight
   enabled runtimes, preserve clear logs, and verify post-promotion routes.
   Use isolated transport stubs for success/dry-run/failure/rollback cases.
6. Main session prepares the narrow host Nginx gate candidate and rollback
   material. Complete applicable local gates and review before any host write.
7. Install/reload the gate and synchronize the reviewed both-off release through
   the owner workflow. Verify canonical origin/edge 404s, retained data/pointers,
   actual ordinary blog reading and unrelated routing preservation.
8. Run full-scope Trellis check, reconcile specs/mainline/evidence, present exact
   code and bookkeeping commit scope for the one-shot Git confirmation.

## Validation commands and environment

- Use `./sam` for Node/npm and `./preview.sh render` for diagram-bearing site
  commands; select maintained package scripts instead of host Node/npm.
- Shared contract syntax/declaration tests; site-config/plugin/static tests;
  assembler check/test/build and focused Memo/comments-history regressions.
- Run the maintained Memo/site browser matrix with pinned Playwright, plus the
  new route-gating matrix using real generated artifacts.
- `bash -n`, ShellCheck and shfmt for touched shell scripts; private behavior
  fixtures stay under `/tmp` and do not execute SSH or publish.
- Run the repository `./preview.sh verify` and affected package/runtime gates
  when source changes are final. Keep a preexisting history guard fail closed;
  distinguish fixture history from current owner evidence.
- Host Docker/Nginx tests use isolated exact-label resources; native host
  `nginx -t` and controlled reload are operator boundaries, not `sam` commands.

## Risk and rollback points

- Existing strict manifest readers, history floor checks and inventory scanners
  must accept the new projection consistently; update real test fixtures rather
  than defaulting missing activation to enabled.
- Explicit alias roots must not be replaced by `$document_root` for gate lookup.
- Preserve raw build/Memo logs, exit codes, signal cleanup and independent Memo
  partial-success reporting when adding state-aware orchestration.
- Private host config/upstream values and backups never enter tracked docs or
  static output. Retain the old host configuration and plugin state hashes.
- A blog pointer rollback includes its access markers, but independently accepted
  Memo history cannot be reversed by that rollback. Report this distinction.
- Existing owner site flags are inputs: do not change their false values for a
  synthetic test or publicly activate the absent comments runtime.

## Final evidence

Record commands that actually ran, state matrices, original/history hashes,
runtime/route results, review classification and any real-versus-synthetic
limits. Do not claim physical-device or enabled production-comments acceptance
from fixture tests. No push or extra product task is authorized by closure.
