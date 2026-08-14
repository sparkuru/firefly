# M5 full content migration

## Goal

Extract the established Typecho corpus into the repository's framework-neutral
Markdown workspace as f1refly's long-term source. Articles are the primary
deliverable: organize them into meaningful folder routes, retain valuable
metadata, and publish them through the existing static site without reintroducing
a CMS runtime. This is a one-time source migration, not a Typecho compatibility
replica.

## Confirmed Facts

- The root product PRD records 93 posts, 7 pages, and 189 approved comments.
  The owner now prioritizes articles, defers public comments, and requests that
  memo-like source records be pulled for later product discovery.
- A SHA-256-checked Typecho database backup exists only under ignored
  `.private/backups/`. It contains the source content, comment, metadata,
  relationship, field, option, and user tables. Private backup data may never
  enter Git, browser data, static output, task evidence, or CI.
- Disposable MariaDB analysis confirms 100 published content rows (93 posts and
  7 pages), 36 taxonomy rows, 107 relationships, 2,276 custom-field rows, 189
  comments, and 376 memo-like `Notes` rows. The field-level and privacy-safe
  classification is recorded in
  `research/sql-source-analysis.md`; raw values remain private.
- The current repository holds a small public fixture, not the migration corpus.
  The archived workspace prelude already provides transaction-safe materialization,
  guest projection, nested post routes, directory indexes, and source-path
  isolation.
- An owner-authorized read-only inventory verified an accessible live upload
  source. It must be acquired only through a manifest-listed checksum-verified
  transfer; exact remote paths and configuration data are not tracked.

## Requirements

### R1 — Private, reproducible intake

- Read the private backup only through a local migration workflow. Keep raw SQL,
  migration credentials, private metadata, source/server paths, and unapproved
  fields out of version control and publication artifacts. The authored body is
  owner-confirmed public content and is not subject to a secret/path-pattern
  redaction pass; this exception does not apply to migration metadata or
  private handoffs.
- Produce non-sensitive migration inventories and exception reports for corpus
  counts, selected metadata, source correspondence, and resources.

### R2 — Article-first Markdown corpus

- Generate or curate public Markdown with stable title, date, description, tags,
  layout, presentation intent, canonical path identity, and only approved legacy
  aliases.
- Use the source category relationship to derive post folders and canonical
  f1refly routes. The current corpus has seven root categories and exactly one
  category per post, so the default route is
  `posts/<category-slug>/<normalized-slug>`. Preserve only used, reviewed tags;
  do not recreate Typecho URL grammar for compatibility.
- Preserve authored body semantics without Astro imports, client directives,
  presentation classes, CMS templates, or database identifiers. Preserve the
  owner-confirmed public body text; do not redact it merely because prose
  resembles a credential or local filesystem path.
- Extract source metadata only through an explicit allowlist and reviewed
  candidate report; unknown, presentation-only, private, or Typecho-specific
  fields never enter public front matter automatically.
- Migrate all 93 posts and 7 pages as real content inputs for the existing
  semantic and Terminal-compatible content model. Special Typecho template names
  are evidence for review, not automatic special routes.

### R3 — Native static presentation

- Assign every public document one stable f1refly canonical route from its
  normalized folder identity. Compatibility redirects are optional migration
  evidence, not a release requirement.
- Migrated documents must be directly loadable and readable without JavaScript;
  directory, tag, and Terminal surfaces consume the same public model.

### R4 — Memo, comment, and resource source retention

- Pull memo-like source records into an ignored, private, non-public discovery
  export with stable opaque correspondence to source records. No memo route or
  presentation is added in this task.
- Keep comments in the private migration ledger and report their count and field
  classification for M5.1. Do not render or publish historical comments in M5.
- Keep the proposed author/comment identity map private. A future public alias
  may expose only an owner-approved display name and optional URL; mail, IP,
  user-agent, raw identity fields, and moderation data remain database/ledger
  data. The suggested defaults (`wkyuu`, `mail`, `url`) are configuration inputs
  for review, not a public identity contract.
- Follow the approved mixed resource policy: required local article resources may
  become managed immutable static assets; trusted external URLs remain external;
  authored local image references (including relative `assets/...` and legacy
  drive-style paths) remain verbatim as deferred OSS-upload work and do not
  block a clean migration release; URI schemes other than credential-free HTTPS
  are explicit exceptions. A standalone legacy file-index page is not assumed
  by this task.

### R5 — Future dynamic-comment compatibility boundary

- Keep the main site and immutable release image static-only. M5.1 will own the
  first public comment projection, reader submission API/database, consent,
  abuse controls, moderation, and export/rebuild handoff.
- Preserve opaque comment/document correspondence privately for that handoff;
  no Typecho IDs, emails, IPs, user agents, moderation data, or identity maps
  reach a browser.
- This task creates no runnable API/database service or public comment archive.

## Acceptance Criteria

- [ ] The migration report accounts for exactly 93 posts and 7 pages, or lists
  every owner-approved exception with a reason.
- [ ] Every migrated document passes the content schema, has a stable canonical
  route, and has no framework/CMS implementation leakage.
- [ ] Canonical routes reflect the approved category-folder organization; used
  tags and selected metadata are explicit, validated public fields.
- [ ] A non-sensitive metadata-candidate report makes every accepted, rejected,
  or deferred source field auditable.
- [ ] Public output contains no database dumps, raw SQL, migration credentials,
  private migration paths, or unapproved email/IP fields from source metadata,
  drafts, private records, or CMS-only metadata. Owner-confirmed authored
  Markdown body text is preserved, including path-, email-, IP-, or
  credential-shaped examples that were already public.
- [ ] A private memo discovery export and private comment handoff report exist;
  neither record type is publicly rendered in M5.
- [ ] A private identity correspondence/map exists for the future comment task;
  no email, IP, user-agent, or raw source identity reaches public output.
- [ ] Every local-source resource is published as a managed static asset,
  retained under the approved external-reference policy, or preserved as an
  owner-approved deferred local asset awaiting OSS upload. Unsafe URI schemes
  remain in the exception report with a reason.
- [ ] Existing M1–M5-prelude route, projection, Terminal, experiment, assembly,
  and runtime contracts remain green alongside migration-specific checks.

## Out of Scope

- Recreating Typecho permalink behavior, themes, templates, widgets, or URL
  grammar as a compatibility surface.
- Public historical-comment rendering; new comment submission, moderation,
  accounts, authentication, or any dynamic CMS/service runtime.
- Public memo presentation, staging/production rollout, remote server mutation,
  or deletion of the Typecho installation/private backup.
- Redesigning existing Presentation adapters, the Experiment pipeline, or the
  workspace security model except where corpus integration requires a compatible
  extension.

## Planning Status

- This material scope revision superseded the earlier final plan. The refreshed
  design and implementation review was approved for implementation on
  2026-08-14; authored local asset references are owner-approved deferred work
  and public materialization remains an explicit owner action.
- SQL structure and aggregate field classification are recorded in
  `research/sql-source-analysis.md`; historic counters are explicitly private in
  M5 and any later public projection requires a separate schema/display decision.
- No new product decision is assumed for legacy special-page behavior, standalone
  file indexes, public identity fields, or historical comment display; they are
  deferred unless explicitly reintroduced in a later task.
