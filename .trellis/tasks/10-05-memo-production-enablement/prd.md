# Owner-authored static Memo publisher

## Goal and confirmed owner direction

On 2026-10-06 the owner replaced interactive Memo with a local publishing model:
only the site owner authors Memo, as with articles, using a separate processor
and publisher. Publishing can automatically push Memo without affecting blog
itself. Public visitors read a static Memo stream; they do not submit content.

This decision cancels the visitor submission, SMTP receipt, verification and
moderation acceptance sequence, including the proposed POST-verification fix.
The original artifacts and approval are preserved in
`research/superseded-production-plan.md`; their old criteria are historical,
not requirements for this new direction. No real Memo mail was sent and no
public Memo write route was opened in the previous execution.

## Requirements

- R1: Only owner-controlled local content supplies public Memo. No visitor
  form, public write endpoint, mailbox verification or moderation workflow.
- R2: Memo has its own authoring root and processor/publisher, separate from
  blog posts/pages and their document/search pipeline. Preserve stable record
  identity and creation time across edits. Drafts must remain unpublished.
  Generic authoring serves the current repository and clones: `new` creates
  repo-local originals. An ignored owner-only tooling adapter may select an
  external read/build/publication source, without redirecting `new`.
- R3: An explicit owner publish operation builds and validates Memo, then can
  automatically push the result through owner-local SSH configuration. Provide
  local-only and dry-run modes. Automatic push means part of that operation,
  not an unrequested filesystem watcher or background daemon.
- R4: Routine Memo publication does not rewrite, upload or delete blog source,
  blog mirror, blog artifacts or the main static release. Conversely, an
  ordinary blog deployment must preserve the current Memo release. Initial
  site navigation/config integration is a one-time setup boundary, not a
  reason to rebuild the blog during each Memo publish.
- R5: Public Memo is static and readable on desktop/mobile with JavaScript
  disabled. Assets and routing belong to the Memo publication boundary. No
  database, worker, SMTP configuration or verification credential is needed
  to author, build, publish or read it.
- R6: Validate candidates before atomic promotion, retain the prior Memo
  release and durable deletion history, and fail safely on invalid input or
  interrupted upload. An old source/export/release cannot silently resurrect
  removed content. No blog permission or broad ownership changes accompany
  Memo publishing.
- R7: Retire the existing interactive Memo UI/config/runtime wiring coherently.
  Stop only the two exact task-created private Memo services during the reviewed
  cutover. Preserve their private data, keys and initial recovery artifacts;
  deleting them or importing historical private Memo requires separate scope.
  Keep comments behavior and data intact. Private connection/path values stay
  in owner-local inputs, never tracked templates or task records.

## Observable acceptance

- AC1 / R1,R2: Owner creates and publishes local Memo; public page shows it,
  contains no visitor submission form and needs no public write API. Drafts
  stay absent and edits retain record identity.
- AC2 / R3,R4: The independent publish operation updates only owned Memo paths;
  default push behavior and its local-only/dry-run alternatives are documented
  and exercised. Blog sources/mirror and deployed non-Memo inventory remain
  unchanged across ordinary Memo publication.
- AC3 / R4: A normal subsequent blog build/deployment preserves the currently
  deployed Memo release and its history rather than deleting or reverting it.
- AC4 / R5: Actual Memo output is readable with JavaScript disabled on desktop
  and narrow mobile; assets resolve within the independent deployment boundary.
- AC5 / R6: Edit/remove and republish behave correctly; stale candidates are
  refused, failed upload/promotion preserves prior live targets, and Memo-only
  rollback preserves blog and the deletion floor.
- AC6 / R7: Cutover leaves no enabled Memo public-write proxy or running Memo
  HTTP/mail worker. Comments and retained private recovery material are
  preserved; public output and project records contain no private inputs.
  Production may initialize an empty stream; nonempty owner authoring is proved
  with synthetic local/isolated deployment fixtures unless the owner supplies
  actual publishable Markdown.

## Scope and exclusions

In scope: independent owner authoring/publication, static Memo page and main
site entry, public contract/config adaptation, strict candidate/history gates,
independent remote static deployment and retirement of interactive wiring.

Exclude historical Typecho import, accounts, SSR, public APIs, notification
email, an admin web UI, automatic watching, unrelated comments work, DNS or
certificate changes, generic plugin frameworks and deletion of retained
private recovery inputs. Reuse the existing host and authenticated owner
operational channel. The old verification-log blocker no longer controls this
model because it has no verification URLs.

## Key decisions

The owner selected rendered Markdown on 2026-10-06, including links, lists and
code. Each Memo uses an independent Markdown file with explicit stable ID, UTC
creation time and draft flag; author display identity comes from publisher
configuration. Basic safe Markdown is in scope; article presentation extensions,
Mermaid/browser rendering and executable Markdown are not. Explicit `publish`
builds and automatically pushes; `build` and `publish --dry-run` provide local
validation without remote promotion. No user-owned decision remains open for
this MVP; the final amended planning review passed and the owner approved execution.

## Current artifact and runtime status

Independent revised planning review and explicit owner execution approval are
recorded on 2026-10-06. Implementation, maintained local gates, actual automatic
SSH publishing, static HTTPS cutover, one-time discovery integration and actual
two-way publication preservation have passed. Exact legacy Memo services are
stopped; their data/keys/recovery remain retained. Production is an intentional
empty Markdown stream. Comments retain the observed baseline. Evidence lives in
`research/owner-publisher-local-acceptance.md` and
`research/owner-publisher-production-acceptance.md`; operational identities stay
private. Task remains in progress until final quality/commit/archive bookkeeping.
