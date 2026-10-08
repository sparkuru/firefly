# Release Review and Self-Fixes

Reviewed the approved PRD, design, execution plan and curated check contracts.
The native hook was truncated, so task artifacts and required boundary context
were read from disk. This review covers release/access/legacy-wrapper ownership;
reader, conversion tooling and durable spec synchronization have separate owners.

## Findings Fixed

1. `tooling/assemble-publication/src/plugins/memos.ts` permitted Memo markup
   in integrated routes but rejected retired submission surfaces with a raw
   HTML regex. Valid attribute spacing/case and entity-encoded class tokens
   could bypass it, while explanatory prose could be rejected. Reused the
   parsed HTML traversal for both the Memo ownership and submission checks.
   Parsing now covers attributes, class tokens and template contents; prose
   naming an old attribute/class remains ordinary text. Added four adversarial
   forms and a positive prose regression in `tests/memos.test.ts`.
2. Root `build:m2`, `check:m2` and `test:m2` retained an obsolete two-adapter
   graph although their current site consumer imports newer adapters. At the
   main session's direction these compatibility command names now delegate to
   the complete corresponding M3 graph. M3/M4/M51 and Docker product ordering
   include Memo before the site consumer.
3. The real Nginx fixture checked integrated route status but did not verify
   Memo reading headers or the bare compatibility route's method behavior.
   Added compatibility/timeline/detail GET/HEAD checks for CSP, Referrer-Policy,
   nosniff, SAMEORIGIN and absence of immutable HTML caching; checked the bare
   redirect and non-reading methods; expanded retained/private-path probes.
4. Retirement of the host publisher removed still-applicable recovery-build
   safety coverage together with obsolete push/new tests. Restored build-only
   regressions for checkout/caller-CWD defaults, configured defaults, exact
   read-only external-source mounts, and unsafe default symlink parents. The
   new refusal-before-config/SSH/write tests remain in place.
5. Added deprecation guidance beside the existing `plugins.memos` compatibility
   input in `config/site.toml`, and documented optional Memo workspace input
   and retired combined-candidate selection in `.env.example`. No owner flag,
   ignored environment value or actual source was changed.

## Inspected Release Contracts

- Strict access decoding preserves the v1 recovery meaning and emits v2 with
  comments only for current configuration. File readers reject mixed snapshots,
  filename/schema mismatch, unexpected or contradictory markers and unsafe
  inputs. Writers cannot reinterpret an existing release version in place.
- Assembly inventories site-owned Memo routes/assets and only the legacy
  compatibility index. The six-field legacy metadata retains the prior
  validated deletion floor; malformed established history still stops a build.
- Nginx and the Node static server use the selected release ownership. V2
  serves site bytes rather than a retained independent alias. The legacy v1
  positive/negative gates and comments behavior remain covered.
- Host new/publish/push/rollback refuse before config or transport. Retained
  low-level candidate/history operations remain explicit recovery tooling.
- Ordinary workspace mount discovery remains read-only. Optional Memo links
  use the same contained discovery; authoring needs the existing exact writable
  Memo override, not a writable blog root.

## Verification Run for These Fixes

- `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/assemble-publication run check`:
  pass (`tsc --noEmit`). The first sandbox invocation could not access the
  Docker socket; the approved Docker execution passed.
- `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/assemble-publication run test`:
  pass, 21 tests, including integrated submission regression and retained
  release/history/rollback/static-serving coverage.
- `tooling/plugin-access/check-runtime.sh`: pass with real disposable Nginx;
  all retained v1 states, integrated comments off/on, repeated cross-version
  pointer switches without reload, the new header/method probes and exact
  source/receipt/pointer/release preservation passed.
- Read-only Docker cleanup query found no remaining container with the exact
  plugin-access-fixture scope label.
- `./preview.sh render npm run test:memos:ops`: pass, 8 tests. This uses the
  maintained pinned image with Bash, with only synthetic temporary fixtures.
- `bash -n tooling/plugin-access/check-runtime.sh`,
  `shellcheck -x tooling/plugin-access/check-runtime.sh`,
  `shfmt -d tooling/plugin-access/check-runtime.sh`: pass.
- `git diff --check`: pass at review time.

Earlier unchanged contract gates are recorded in implementation-release.md;
they were not redundantly rerun here. Full reader/browser verification,
`./preview.sh verify`, integrated runtime packaging and actual corpus acceptance
remain the main session's subsequent gates. This focused result does not claim
those checks passed.

## Remaining Boundaries

No unresolved release code defect was found in this focused review. The owner
README files still describe independent Memo authoring/publication; project
policy reserves those files to the owner, so they were not edited. Durable
access/publication/Memo specs and mainline must reflect v2 ownership and recovery
retirement; the main session owns those changes. No deploy, SSH, real source
installation, commit or archive was performed.
