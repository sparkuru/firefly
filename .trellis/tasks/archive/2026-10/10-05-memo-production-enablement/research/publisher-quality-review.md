# Static publisher quality review

Date: 2026-10-06. Review covers the approved owner-Markdown publisher,
site/assembler isolation, host orchestration and static-only product boundary.
Main owns the full repository gates, owner inputs, remote cutover and
commit/archive bookkeeping. This reviewer has not inspected owner-local configuration,
performed a remote action, or changed frozen publisher/image source inputs.
Final full-scope quality review passes against the final source/specs and the
separately recorded local and actual production evidence. All AC1–AC6/R1–R7
are covered together; no concrete source/spec finding remains open.

## Findings fixed

1. `preview.sh` accepts and validates `FIREFLY_MEMOS_CANDIDATE` for `dev`, then
   starts Astro with `FIREFLY_MEMOS_PUBLIC_ROOT`. Astro has neither a Memo route
   nor a consumer of that variable; only the assembled static preview server
   consumes it. Thus selected combined dev silently omits the requested mount.
   Fixed by rejecting that unsupported combination before validation or
   Docker/startup and directing the owner to `start`/`preview`. A maintained
   wrapper regression verifies the error and absence of startup/runner effects.
2. `tooling/publish-memos/publish.sh` validates migration metadata through
   `.initialDeletionFloor // 0`. jq treats explicit boolean `false` as absent,
   so a malformed explicit floor passes validation and becomes zero. A direct
   run of the current exact jq predicate with synthetic `false` returned true.
   Fixed by requiring a present floor to be a nonnegative safe integer,
   distinguishing it from the missing default. A present `remoteSudo` must be
   boolean, and present optional connection/assets fields must be nonempty
   strings; explicit null values fail. The host fixture adapter now validates
   config semantics rather than unconditionally returning true. Added invalid
   type regressions and real host-jq predicate evidence.
3. Final full-scope review found `plugins/memos/plugin.json` still pointing its
   site entrypoint to the deleted visitor-era loader. Main authorized correction
   to the existing navigation bridge, `apps/site/src/lib/site-plugins.ts`,
   matching the comments descriptor convention. Added a focused assertion that
   every declared Memo entrypoint exists as a regular file. The focused wrapped
   contract suite passed 10/10. Neither descriptor nor test is an image input.
4. Main's actual production checks exposed a CSS browser TTL despite origin
   `no-cache`. Main corrected only the Memo static cache policy to `no-cache,
   no-store` in the runtime/host templates, with explicit two-directive fixture
   and package assertions. Reviewer checked source/spec scope; main's final
   static fixture, both package profiles and actual external headers/bytes
   passed after the correction. No frozen renderer/image input changed.

Main released the five integration files for coordinated fixes. Updated
`preview.sh`, `apps/site/tests/preview-command.test.mjs`,
`tooling/publish-memos/publish.sh`, `ops/publish.test.mjs` and
`ops/check-runtime.sh`. No frozen remote image inputs changed. The maintained
host runtime fixture now runs real config checks before deployment/static tests;
`--config-check-only` permits the focused delta gate without rebuilding a web
image or rerunning the broader fixture.

## Final documentation reconciliation

The final source/config/examples and updated Memo contracts agree on the
independent publisher, schema 2, navigation-only site, static public subtree,
strict present config types, combined dev refusal and retained legacy/private
history. Main resolved the task/SEO wording updates raised by review:

- Task design now records explicit execution approval, and PRD/mainline reflect
  actual completed production acceptance while keeping commit/archive state
  separate.
- Main corrected the site configuration spec's signature to remove unused
  `memosConfig`, and its general final-build-only sitemap wording now includes
  the narrow approved enabled external `/memos/` exception implemented in the
  SEO integration. Owner operation docs also describe strict present types and
  the combined dev restriction.

The operation guide also correctly distinguishes requested cache semantics from
potential edge overrides; actual origin and CDN headers require separate proof.

## Findings not fixed

None. No concrete source, configuration, documentation or acceptance gap remains
from this final review. Main's operational-value scan/resource cleanup and
scoped commit/archive preparation are separate finish-work steps.

## Production cache delta verification

Main reported an actual external CSS browser lifetime of four hours while the
origin returned `no-cache`. Main changed only the Memo static cache policy in
`nginx.conf` and the matching host Nginx example to `no-cache, no-store`, with
matching operation/spec updates. This reviewer checked those source changes and
confirmed unrelated cache rules and frozen publisher inputs remain unchanged.
The static fixture's HTML/CSS/media assertions and package per-file assertion
now require both directives rather than accepting the old `no-cache` prefix.
Passing earlier runtime checks are not counted as proof of this delta. Main's
final production/local acceptance reports record the new static runtime,
default/combined package and actual external header/inventory checks passing
after the correction. Unrelated blog cache rules remain unchanged.

## Reviewed contracts and paths

- Read the complete saved hook context, check manifest, current PRD/design/plan,
  referenced Memo/architecture/publication/development/privacy policies and
  source-backed owner publisher/UI research. Superseded interactive reports
  were used solely for provenance and retained recovery boundaries.
- Traced strict front matter and raw UTF-8 decoding through schema-2 Markdown
  records, sanitized HTML, referenced owned media, canonical render comparison,
  exact public inventory and private receipt. No article loader, site config,
  X Core document identity, executable Markdown or build-time fetch enters the
  independent publisher.
- Traced immutable creation times, withdrawal/retired IDs, deletion floor,
  expected-base receipt and monotonic sequence through candidate creation and
  promotion. The Memo-only lock rereads accepted state; one atomic pointer
  selects both public output and matching private metadata. Established state
  loss fails closed. Rollback creates a new sequence and refuses retired IDs.
- Checked host path canonicalization/output separation, host-owned SSH/key
  checking, bounded upload, immutable remote image selection, restricted
  ephemeral Docker commands and ambiguous-promotion receipt inspection.
  Routine publishing does not invoke blog build/sync or touch its pointer.
- Checked site activation as navigation/sitemap only, permanent namespace
  reservation, removal of the old Astro/form/service paths, assembler legacy
  floor retention, default blog-only packaging and explicit prevalidated
  public-only static composition. Comments wiring remains separately owned.
- Examined the task record set for local-home paths, credential/private-key
  signatures and exact operational identifiers. Matches were documentation
  URLs in historical/current primary-source research; no concrete owner identity/secret leak was found
  in the reviewed current records. This is a scoped review, not a credential
  discovery scan or proof about unseen owner inputs.

## Verification executed by this reviewer

| Check | Result |
| --- | --- |
| Publisher `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos run check` | Passed |
| `bash -n` on publish/runtime/sam/preview shell entries | Passed |
| `shellcheck -x` on those entries | Passed |
| `shfmt -d` on those entries | Passed |
| `git diff --check` | Passed |
| Synthetic actual jq invalid-floor predicate probe before correction | Reproduced finding 2 |
| Updated preview/host/sam tests through `SAM_CONTENT_MODE=none ./preview.sh render node --test ...` | Passed 32/32: preview 24, host 7, sam 1 |
| `tooling/publish-memos/ops/check-runtime.sh --config-check-only` | Passed with real host jq: 20 malformed config rejections before sam/startup, default-floor 0 and explicit-floor 7 local builds, destination unchanged |
| Five frozen source/Dockerfile hashes against core/image handoff | Matched |
| Final descriptor/contract delta via `SAM_CONTENT_MODE=none ./sam npm run test:memos-contract` | Passed 10/10 |

The initial wrapper check could not access the Docker socket in the sandbox;
its approved Docker execution retry passed. No automatic approval rejection
occurred. TypeScript checks API/declaration fixtures; JavaScript implementation
uses syntax and behavioral checks, not implementation-wide TypeScript analysis.
No additional JavaScript linter is configured in the publisher package. Shell
syntax, ShellCheck, formatting and whitespace checks were rerun after fixes and
passed. The new shell assertion initially triggered ShellCheck SC2251; its
explicit failure branch was corrected before the passing rerun.

## Complete local evidence reviewed

Implementation/image reports separately record focused core, contract, host,
assembler, browser and isolated real static-container results. Those reports
were read and their test paths reviewed; they are not claimed as rerun here.
Main's `research/owner-publisher-local-acceptance.md` records the actual ten
host operations with real sam/Docker and absent blog/SSH inputs, the maintained
complete gate (337 Node passes; 177 browser passes and 139 applicability skips),
the post-review delta, final-source default and combined packaging, and an
actual selected static preview lifecycle with exact public bytes/read-only
mount/repeat-start/exact stop. The complete gate preceded the bounded fixes;
32 wrapper/host/sam tests, real-jq cases and the 10-test descriptor/contract
delta cover those final changes. No passing full build/browser suite was
needlessly repeated by this reviewer. These distinct evidence stages must not
be represented as one unchanged final-source full run.

Loaded both discovered spec layer indexes (`frontend` and `trellis-plus`),
the frontend Quality Check section, and the affected topic validation/tests
sections. The project has no separately configured package spec layers. Reviewed
the retained third-party inventory: this publisher uses pinned ordinary package
dependencies and system fonts, with no new retained font/media distribution.
Existing NERV/MAJO notice gaps are unchanged and not claimed resolved here.

## Final requirement-to-evidence mapping

| Acceptance / requirements | Concrete code and local evidence | Actual production evidence reviewed | Result |
| --- | --- | --- | --- |
| AC1 / R1,R2 | Strict source/front matter, drafts and immutable ID/time; core/contract tests; real host create/edit/local publication; nonempty no-form browser fixture | Intentional permitted empty stream; actual static public/no-input surface; no historical record import | Pass |
| AC2 / R3,R4 | Host automatic publish/dry-run/local modes; synthetic SSH failure handling; real host local workflow leaves complete repository blog inventory unchanged | Actual SSH dry-run without destination mutation, initial publish, and routine sequence-2 push preserve every post-integration blog path/type/mode/ownership/content hash, pointer, mirror and comments baseline | Pass |
| AC3 / R4 | Enabled/disabled blog builds without Memo input; permanent namespace reservation; reciprocal filesystem fixture | Actual subsequent default blog build/package and immutable deployment preserve the entire Memo root, history, establishment marker, pointer, ownership/modes/bytes and byte-identical sequence-2 receipt | Pass |
| AC4 / R5 | Canonical empty/nonempty static Markdown; six desktop/mobile/static/interactive Memo browser cases; focus/enlargement/overflow; isolated static/combined package and actual preview inventory | Actual TLS public inventory/digests, redirect, methods, security/cache; actual no-JS desktop/narrow-mobile native discovery, focus, reduced motion, 200% text and bounded overflow | Pass |
| AC5 / R6 | Edit/draft/withdrawal; stale/base/floor/retired/history-loss refusal; immutable accepted times; fresh rollback; SSH-adapter transfer/promotion/ambiguous-result tests; real host local transitions | Actual remote atomic sequence-1/2 receipt/public pairing, retained previous release and independently validated bootstrap floor; destructive fault/nonempty rollback cases intentionally remain isolated | Pass |
| AC6 / R7 | Removed maintained HTTP/mail/UI/proxy wiring; public image excludes receipt/source; scoped privacy review; comments gates retained | Exact old pair stopped cleanly, private listener closed, private/API routes denied; original data/keys/recovery retained, checksum-identical post-stop copy integrity/zero-state pass and original unchanged; complete observed comments baseline preserved | Pass |

Production evidence is `research/owner-publisher-production-acceptance.md`,
reviewed together with source, current task/specs and the local acceptance
report. Its operations were performed by main, not rerun by this reviewer.
Production intentionally has no authored records because none were supplied;
nonempty Markdown/media/edit/withdrawal/rollback requirements are proved with
the approved isolated synthetic/real-host fixtures, not by importing private
data or publishing synthetic notes live.

The existing CDN analytics injection was identified separately from generated
Memo code. Publisher output is script-free; actual no-JS reading and restrictive
CSP pass, with no Memo runtime dependency on that existing edge script.
Comments had no running service at the observed production baseline; preservation
does not imply this task enabled or certified a new comments runtime.

UI automation classification is `playwright-required`, passed; mobile is
`mobile-required`, passed by emulation. Main inspected actual desktop/mobile
captures. Human classification is `human-optional` for owner visual preference;
physical devices/assistive technology are not claimed certified. No additional
generic smoke or cancelled mail-confirmation step is needed.

Current specs/docs reflect the owner-approved implemented boundary and final
cache policy. Frozen key source hashes still match the reviewed image handoff.
No task transition, commit or archive was performed by this reviewer.

## Owner-selected external source follow-up review (historical model)

Reviewed the bounded generic operation-guide, local-evidence, task metadata and
mainline delta after the owner selected an existing external Memo leaf beside
the article collections. The documentation correctly selects the canonical
`memos/` leaf rather than the shared authoring parent or either blog collection.
This is already supported by the publisher's explicit source-root argument,
canonical-directory guards and sam's selected read-only source mount; source,
candidate/output and deployment remain distinct boundaries. `new` deliberately
uses the separate writable authoring flag; build/publish read the leaf.

Main's new evidence records a real host/sam local build from that selected root:
schema 2, Markdown format, zero records, private receipt 0600 and unchanged
complete repository artifacts/dist inventories. The previous and selected
sources had no Markdown, so no owner note was moved, removed or projected. No
SSH or remote promotion occurred; this is local source-selection evidence,
not a new production publication claim.

The records use generic sibling names and omit the owner's actual path and
connection values. This reviewer read no private operational inputs. The five
frozen key source/Dockerfile hashes still match, and `git diff --check` passes.
No source/image implementation changed and no passing full gate was repeated.
No concrete finding is open from this follow-up; the full-scope quality result
remains pass. Commit/archive approval remains pending and is not granted by the
owner's source selection or this review.

## Final repository-default and private-adapter correction review

The owner's latest explicit correction supersedes the configuration-only
external creation model above. Reviewed the corrected host entry, focused
tests, operation/package guides, generic example, ignore/context exclusions,
current task/specs and final local evidence against the prior full-scope result.

Generic host `new NAME` now resolves only the actual checkout's `content/memos/`,
independently of caller cwd. Its compatibility config is never read; unrelated
Memo mount selectors are cleared and only the local authoring source receives
the explicit write flag. `build` without config selects that source, `Owner`
and checkout-local `.firefly/memos/candidates/`. Explicit config requires a
display identity; absent source/output fields get the same defaults, while
present invalid/null fields fail. Lazy default initialization inspects canonical
parents and both source/output boundaries before creation. Existing absent-only
draft, source/output separation, transport, receipt/history and rollback guards
remain intact. The low-level core's explicit-root API remains available only
as documented for controlled operators/fixtures; frozen image inputs did not
change.

Inspected only the expressly permitted private adapter script, with its absolute
source literal redacted before tool output. No private base config or other
operational input was read. The script accepts build/publish/rollback only,
rejects new and caller config selection before projection, checks owner-owned
0600 base configuration and canonical source, creates its own 0700 temporary
directory/0600 jq config projection, and forwards to the shared entry. It removes
only that owned temporary root on exit/signals and adds no processor, rendering,
SSH or promotion implementation. Script and parent modes are 0700. Git ignore
and explicit Docker context exclusion cover `tooling/private/`; the empty
`content/memos/.gitkeep` is trackable for clones, while originals remain excluded
from public Docker context and candidates remain ignored.

Two concrete documentation ambiguities were fixed during this review:

- Package README no longer suggests the private adapter might forward `new`;
  it states the actual supported operations and distinguishes the generic
  compatibility config behavior.
- Operation README no longer requires source/assets to be mutually disjoint;
  it permits assets inside source while keeping both separate from candidate/
  deployment output and blog build/release paths, matching actual validation.

Reviewed the worker's focused 13/13 wrapped host regressions and shell gates;
main's real host-jq 26 invalid-config cases plus floor-0/7 positives; and the
real sam/Docker copied-checkout/unrelated-cwd authoring/no-overwrite evidence.
Four actual local default/configured/private builds produced schema-2 Markdown,
zero records and 0600 receipts, with original source and complete blog output
inventories preserved. Those checks performed no SSH or remote promotion. Main
also verified non-root operational config fields unchanged, all 15 frozen source
files byte-identical, and zero operational-pattern matches across the 110-file
changed/new record set. This reviewer independently confirmed the five frozen
key hashes, exclusion/empty-marker behavior and passing whitespace check.

No concrete code or contract finding remains open. The latest correction
passes and supplements the existing AC1–AC6/R1–R7 mapping; previously completed
static/browser/package/production evidence remains valid because its renderer,
promotion image and deployed state are unchanged. No full or production gate
was repeated for this bounded host/docs correction. No owner path was copied
into this report, and no image/source/private config, commit or task/archive
state was changed by the reviewer. Commit/archive approval is still pending.
