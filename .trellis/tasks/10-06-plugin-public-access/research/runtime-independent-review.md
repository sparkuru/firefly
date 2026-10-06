# Independent core/site and private-sync cross-review

## Scope and result

**PASS for the reviewed scope; no blocking findings.** This is a read-only
cross-review of the shared plugin contracts, Astro producer, selected-config
CLI, content reservations and ignored synchronization adapter written by the
other implementer/main session. It supplements the main session's full-scope
Trellis check fallback; it does not substitute for independent review of this
reviewer's own assembler/runtime changes or actual host acceptance.

The reviewer read the complete plugin-public-access contract, task design/plan
and untruncated comments publication contract from disk. No source, owner flag,
remote configuration or deployment pointer was modified during review.

## Findings checked

- Exact descriptor-based decoding refuses coercion, unexpected plugins/fields,
  decorated input and accessors before reading public envelope fields. The
  frozen deterministic projection contains only booleans and schema version.
- Shared file reading validates canonical contained roots, regular snapshot and
  marker files, exact contents and a complete expected marker inventory. Unknown,
  empty, directory and symlink entries fail closed. Re-emission validates its
  previous owned snapshot before removing stale markers, and refuses unowned
  collisions rather than deleting them.
- The Astro build integration captures the selected frozen site configuration
  used for site rendering and emits only into the completed build directory.
  Publication consumes a build-bound snapshot rather than re-reading TOML to
  invent runtime activation. Immutable release switching avoids exposing a
  partially rewritten live marker set.
- The owner CLI's independent `check` mode does not import current site config;
  `compare` checks selected effective flags before no-build synchronization.
  Enabled comments additionally requires a canonical managed HTTPS write origin;
  disabled comments does not fabricate a runtime prerequisite.
- Content reservations reject Memo/comments owned namespaces and activation
  artifact paths, including normalized case collisions. Registry tests compare
  tracked manifests with policy IDs and require both exact/prefix Nginx gates.
- Static output tests now include the snapshot and exact enabled markers in the
  existing complete inventory assertion. Actual Astro fixtures assert selected
  Memo on/off UI/SEO, no blog-owned Memo bytes, and reserved-alias rejection.
- Private sync validates current/built activation and complete local publication
  inventory before transport publication. Disabled Memo skips the publisher;
  enabled comments preflights readiness, runtime-origin policy and its matching
  static article catalog. It never starts/provisions the absent service.
- Remote stage/current checks bind activation JSON and exact marker inventory
  to local hashes before declaring success. A failed route post-check restores
  the source mirror and blog release/gates while preserving independently
  accepted Memo history and reporting that partial result.
- Dry-run takes its early return before staging/upload/promotion. INT/TERM use
  the same cleanup/rollback path. Current-pointer guards preserve a deployment
  that changed outside this run rather than forcibly replacing it.
- Permission changes are scoped to the new release/source mirror. The former
  recursive shared-web-root chown invocation is absent, so normal synchronization
  does not intentionally change retained private plugin ownership or modes.

## Evidence examined and limits

The reviewer inspected the other implementer's targeted tests and the passing
shared/site portions of the main session's current wrapper verification output,
including **8 plugin/Memo site tests**. The reviewed ignored orchestration fixture
contains **29 passing cases**: four activation combinations, disabled/enabled
publisher absence, stale no-build flags, gate/readiness/catalog/origin/inventory
failures, both dry-run modes, build/Memo/upload errors, corrupted activation or
markers, mirror/post-check rollback, outside-current preservation, signals and
help with no effects. Fixture code explicitly asserts retained prior pointers
and mirror bytes, no upload/mutation in dry-run, private log modes, and Memo
partial-success warnings. These are inspected existing results, not a claimed
new execution of a broad build by this reviewer.

Transport/runtime doubles prove orchestration ordering and failure handling;
they do not prove real SSH, Nginx/TLS behavior or enabled production comments.
Real host/edge acceptance and final broad-gate results remain the main session's
separate evidence. No additional human review requirement arose from this
scoped code review.

The later public-mode correction was also reviewed: the shared writer explicitly
chmods only its validated owned snapshot, newly created marker directory and
enabled files, preserving unrelated private/root modes. Its new restrictive
umask regression asserts those exact modes plus an unchanged private 0600
sentinel. The main session's restrictive caller umask exposed a separate fixture
Nginx-config mode issue; that isolated issue was reproduced and corrected by the
runtime implementer, with a passing affected-phase rerun rather than a claimed
new execution of all browser suites.
