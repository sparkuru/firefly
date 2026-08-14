# M5 Full Content Migration — Technical Design

## 1. Boundary and delivery shape

M5 is a one-time, article-first extraction from Typecho into f1refly's long-term
Markdown source. It favors native folder-derived routes and meaningful content
metadata over preserving Typecho's templates, URLs, or runtime behavior. The
production result remains immutable static output: Astro routes do not query a
database, the browser receives no private source data, and Nginx gains no dynamic
upstream or compatibility-only redirect subsystem.

The work remains one task because the importer, article folders, metadata
allowlist, resource decisions, canonical content model, and final static release
must agree in one validated result. M5.1 separately owns public comments and the
future dynamic write service.

## 2. Private intake and migration ledger

`tooling/migrate-typecho/` will be a build-only local tool with synthetic,
non-sensitive fixtures. It accepts explicitly named private inputs: the Typecho
dump, an ignored owner-local ledger root, and an optional local mirror of the
authorized upload source. It rejects release/output destinations, symlinks,
broad roots, and paths outside declared inputs.

The tool creates an ignored SQLite migration ledger under `.private/migration/`.
It records source-to-public correspondence, article route decisions, metadata
candidate classifications, resource decisions, and opaque future-handoff IDs.
The ledger is operational migration state, never a site build/runtime input.

Memo-like rows are exported only below this private ledger after preserving their
source permission and deletion state. M5 creates no memo route or browser data.
Comment rows likewise remain private and produce only a non-sensitive count and
field-classification handoff for M5.1; M5 renders no comment archive.

The same ledger owns an opaque source identity map. It may record the Typecho
author/comment correspondence and the owner-proposed defaults (`wkyuu`, `mail`,
`url`) for later review. M5 does not publish email, IP, user-agent, raw author
fields, or an identity database. A future public alias can contain only an
explicitly approved display name and optional external URL; M5.1 owns consent,
privacy, and any database projection.

The authored body is a separate owner-authorized public-content boundary. M5
normalizes the legacy HTML/Markdown wrappers required by the X Core input
contract, but it does not redact or block body text because it resembles a
credential, local path, or other release-sensitive pattern. Private dump,
ledger, source-transfer, and identity data remain excluded independently.

## 3. Article folders and metadata

The importer emits framework-neutral Markdown into the existing post workspace.
It derives folder identity from the source category relationship and emits one
native canonical route per normalized relative file path. The current source has
seven root categories and exactly one category edge for each post, so the
deterministic proposal is `content/posts/<category-slug>/<slug>.md`; missing,
multiple, or future nested category edges become explicit migration exceptions.
All seven source pages become `content/pages/<slug>.md`. Existing canonical
helpers, guest projection, directory indexes, Terminal paths, and breadcrumbs
remain the sole route/tree authority.

Article metadata flows through a two-stage policy:

1. A fixed safe baseline maps title, first publication time, meaningful update
   time, body, normalized used tags, category-derived folder, layout, and
   optional presentation intent.
2. `customSummary` is a description candidate after safe text normalization;
   documents without it use a derived first-prose summary. Asset fields are
   resolved through the resource manifest rather than copied as opaque strings.
3. A non-sensitive metadata-candidate report classifies every template, custom
   field, parent relation, counter, identity field, or other source field as
   approved, rejected, or deferred. Only explicitly approved semantic fields
   become front matter.

Historic view/star/comment counters are private in M5. Typecho template names,
authorship IDs, passwords, permissions, ping/feed flags, and raw custom-field
values are likewise never automatically exposed. A future owner decision can
promote a counter or other candidate only through a schema change, privacy review,
and fixture coverage.

The site adds a static tag index/detail only if the reviewed migration data
contains public tags; it derives entries from the same guest-projected canonical
documents and uses a deterministic safe tag-path map. Category folders are the
source organization, not a recreation of Typecho URL grammar or theme routes.

## 4. Resources

The importer produces one deterministic disposition for every article resource:
`managed`, `external`, `deferred`, or `exception`. Required regular files from
the verified upload source are transferred to a local candidate using a manifest
and hash/size checks, then copied under a reviewed managed asset input using
collision-safe content-addressed names. Trusted external references retain
  validated `https:` URLs. Authored local image references, including safe
  relative `assets/<segments>` paths and legacy drive-style paths, are
  intentional local authoring paths; they remain verbatim as `deferred` until
  the owner uploads them to OSS and supplies a checked manifest, and do not
  block a clean static promotion. Body image-like references and the small
  number of current `thumb` values share this resource pipeline. URI schemes
  other than credential-free HTTPS enter the non-sensitive exception report.

The site and assembler validate local references, artifact paths, and release
inventory. No migration source path, transfer credential, symlink, private ledger
file, or raw dump can cross into Markdown, browser output, the assembled release,
or the runtime image. Owner-confirmed authored body text remains unchanged by a
secret/path-pattern scan.

## 5. Failure handling and M5.1 handoff

- Invalid private input, source row, path, body, metadata classification,
  resource decision, or candidate promotion aborts before replacing public
  content/assets or generated release artifacts.
- Import and asset candidates are contained under ignored work roots and promote
  atomically after count/reference validation; prior public sources remain
  available on failure.
- M5 writes only the versioned private handoff needed by M5.1: opaque document
  and comment correspondence, field classification, and aggregate evidence.
  M5.1 owns any public comment projection, identity display policy, submission,
  moderation, and database/API deployment.

## 6. Compatibility

Existing guest projection, nested-route/Terminal/Vim-reader contracts,
Experiment catalog/mount, static fallback, fonts, security headers, and
non-root/read-only runtime remain unchanged unless extended through their
documented canonical interfaces. M5 does not create Typecho redirect emulation,
special legacy pages, a file index, a comment UI, a client router, a runtime
Markdown parser, SSR, or direct database access.
