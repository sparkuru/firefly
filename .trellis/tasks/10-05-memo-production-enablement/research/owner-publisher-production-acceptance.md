# Actual owner Memo production acceptance

Date: 2026-10-06. This records actual existing-host operations, separately from
synthetic local fixtures. Exact endpoints, paths, runtime identities, config,
raw logs, screenshots and recovery commands stay in owner-only operational
inputs. No publishable owner Markdown was supplied, so production intentionally
starts with an empty stream, as permitted by AC6.

## Preflight and retained private recovery

Rechecked the authenticated operator identity, exact old release pointer,
healthy task-created private HTTP/worker identities and original key/config/
comments checksums. Fresh live read-only SQL reported zero epoch/revision and
zero submissions, outbox, rate events and audit rows. A fresh legacy schema-1
projection had revision zero, floor zero, no records and a valid digest. The
independent bootstrap floor was therefore explicitly zero, not inferred from
lost or malformed established history.

Stopped only the two verified task-created legacy Memo containers. Both exited
cleanly with code zero, without OOM, and the private Memo HTTP listener closed.
Retained their containers/image, private database, keys, original recovery
artifacts and restricted permissions. A checksum-identical private post-stop
database copy passed read-only integrity and zero-state checks in the isolated
original image, with no keys mounted and original database hash unchanged.
SQLite needed a writable scratch directory beside this copy to establish its
own sidecar locks; the retained original was never opened writable for that check.
Comments had no active runtime at this observed host baseline; this task did
not create or enable one. Complete comment path/mode/ownership/content and
blog-source mirror baselines remained exact throughout.

## Actual independent publication and static mounting

The reviewed minimal immutable publisher image was loaded through the existing
approved SSH channel. First real `publish --dry-run` left the provisioned empty
Memo destination without entries or a pointer. The normal host `publish`
operation then built/validated, automatically uploaded only Memo and atomically
accepted sequence 1, floor 0 and zero records. Public directories/files are
0755/0644; the private receipt is 0600 with the operator's ownership.

A read-only review of the owner's legacy blog permission helper established its
recursive web-root scope. The new Memo deployment root is outside that scope.
No broad helper, source sync, unrelated ownership change or private-parent
permission widening accompanied Memo publication.

Prepared a minimal location insertion in the existing HTTPS virtual host,
validated it in an uninstalled source candidate, retained the original, then
atomically installed it. Full live Nginx validation and reload passed. Existing
DNS, certificates, comments and other locations were preserved.

Actual public TLS checks verified complete Memo public inventory and SHA-256
bytes, GET/HEAD, canonical `/memos/`, restrictive CSP, frame denial, nosniff and
no-referrer. Private/source/API routes returned 404 and Memo POST returned 403.
No Memo form or generated runtime script exists in the publisher output.

## Actual CDN cache finding and correction

The first actual external CSS response had a four-hour browser lifetime while
loopback origin returned `no-cache`; earlier local tests could not certify this
edge behavior. Only the Memo location was strengthened to `no-cache, no-store`.
Both original and intermediate source configs remain privately recoverable.
Candidate/full Nginx checks and reload passed again. Actual external responses
then returned both directives and exact accepted bytes for all public files.
Unrelated blog cache rules were not changed.

The maintained static fixture now requires both directives for HTML/CSS/media,
and package validation requires both on every composed public file. The final
static fixture, default package and combined package all passed after this fix.
Origin and external observations are distinguished; no claim is made that a
header overrides every possible CDN rule. Relevant primary documentation:
[Cloudflare Origin Cache Control](https://developers.cloudflare.com/cache/concepts/cache-control/).

## One-time discovery and actual reciprocal preservation

Built the real selected article workspace with a contained navigation-only site
projection. Validated the complete 165-file public artifact, existing article
routes, home entry and sitemap, with no physical Memo page in the blog release.
Uploaded only that artifact into an absent immutable blog release and atomically
switched the blog pointer, retaining the previous release. Complete comments and
source mirror checks passed. Actual HTTPS home/sitemap exposed `/memos/`.
Persisted only the Memo enabled section into owner-local site config after
checking its original hash; kept a private original backup. This is intentional
one-time blog integration, not ordinary Memo preservation evidence.

Established the preservation baseline after that integration. A second normal
Memo `publish` automatically pushed through SSH and advanced to sequence 2,
floor 0 and no records. Every blog path/type/mode/ownership/content hash, blog
pointer, source mirror and comment baseline remained exact. No blog build or
upload accompanied that operation.

Then an ordinary default blog build/package used the persisted site flag,
without a Memo candidate selection. A new immutable blog-only release was
uploaded and atomically deployed. The entire independent Memo root—not just
its current page—retained every path/type/mode/ownership/content hash, all
release history, establishment marker, current pointer and byte-identical
sequence-2 receipt. Comments and source mirror remained unchanged. Actual
HTTPS Memo inventory/security/cache/method checks passed after this deployment.

## Actual browser and visual evidence

Pinned Playwright Docker with host IPC exercised the actual HTTPS site at desktop
and narrow-mobile widths, with JavaScript disabled. Native home discovery,
Memo heading/empty state, absence of input/form, keyboard focus, reduced motion,
200% text and bounded horizontal overflow passed. Main inspected captured desktop
and enlarged mobile screenshots: heading, reading text and home/blog links are
visible and unclipped. Nonempty Markdown/media reading is covered separately by
maintained synthetic tests; no synthetic note was published to production.

The existing CDN adds its own external analytics script to browser responses.
It was identified by the known analytics host/path and beacon attribute, rather
than classified as Memo code or silently ignored. Generated public output
remains script-free; actual reading was exercised with JavaScript disabled and
restrictive CSP. No worker was introduced by this task.

Browser classification: `playwright-required`, passed. Mobile classification:
`mobile-required`, passed by emulation, without claiming physical-device or
assistive-technology certification. Human classification: `human-optional` for
owner visual preference only; authentication, promotion, deletion/history,
permissions, exact preservation and deployment checks are automated and passed.
No residual generic manual smoke or mail-confirmation step is required.

## Acceptance mapping

| Criterion | Evidence and result |
| --- | --- |
| AC1 / R1,R2 | Real host local draft/edit/publication plus strict contract/browser fixtures; production static empty stream has no visitor write surface; pass |
| AC2 / R3,R4 | Real automatic SSH dry-run/first/routine publish, local-only workflow and full actual blog preservation; pass |
| AC3 / R4 | Actual subsequent default blog build and immutable deployment preserved entire Memo boundary; pass |
| AC4 / R5 | Actual TLS inventory and no-JS desktop/mobile reading; synthetic nonempty Markdown/media/focus/zoom tests; pass |
| AC5 / R6 | Core and isolated actual host fixtures cover edit/withdraw/stale/interruption/fresh rollback/retired refusal; actual remote monotonic receipts and atomic promotion; pass |
| AC6 / R7 | Exact legacy pair stopped cleanly, read-only retained recovery verified, comments preserved, no enabled write/API routes; actual operational-pattern scan has zero matches; pass |

All 15 frozen publisher image source files remain byte-identical. Final
ShellCheck with sourced files, syntax, formatting, whitespace and task context
validation passed. Operational-value scanning found zero matches in the 108
existing changed/new files checked before this final bookkeeping update.
The final scan including the concrete commit manifest checked 109 files with
zero operational-pattern matches.
Exact task test tags/unused composed image and preview/static/package containers
were removed; original 15 containers and 21 volumes remain. The passed default
blog-only runtime image remains selected. Restricted edge recovery copies were
saved persistently, separately from public Memo state. Operational retention
and recovery paths remain in the owner-local notes. Existing unrelated media notice gaps remain in the
third-party inventory; this task adds no such media and does not claim a whole
repository distribution-license review. Final full-scope quality review passed with no open finding. Scoped
commit/archive bookkeeping follows the required one-shot confirmation.

## Subsequent owner authoring-policy correction

After actual production acceptance, the owner clarified repository/clone-local
creation/default build and a private external reader adapter. The host entry,
examples/docs/specs and ignore boundary were reconciled; the selected external
path no longer redirects generic `new`. Its real local/copy-checkout evidence
is in `owner-publisher-local-acceptance.md`. This follow-up leaves the frozen
renderer/promotion image, deployed Memo/blog/current history and retained private
recovery unchanged and performs no remote publish.
