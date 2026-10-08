# Metadata and Reading Research

Read-only investigation on 2026-10-07. Product choices below are proposals,
not approved implementation scope. No sources, backups, public candidates,
accepted publication history, or deployment were changed.

## Current Document Metadata

- `apps/site/src/lib/content-schema.mjs:65` defines shared post/page metadata:
  required title, date, description, and draft; optional updated, tags, SEO
  fields, aliases, and namespaced Firefly metadata. Presentation and content
  theme have defaults. Access defaults to public.
- `apps/site/src/lib/content-schema.mjs:95` requires post layout; page schema
  at line 103 requires a slug and supports page/timeline/files layouts.
  Unknown fields are rejected and updated cannot precede date (line 84).
- `apps/site/src/lib/content-schema.mjs:53` defines the strict
  `firefly.markers` namespace. Markers use safe lowercase kebab-case names
  and deduplicate while preserving first occurrence.
- `.trellis/spec/frontend/content-workspace-contract.md:406` distinguishes
  marker data from supported behavior. The current supported marker is
  `featured`; unsupported safe names have no effect. A marker cannot bypass
  draft/access policy or change route identity. Featured does not itself
  establish a pin-to-top requirement.
- `.trellis/spec/frontend/content-workspace-contract.md:340` describes
  generated-stage defaults for entirely absent/empty front matter. This is
  a blog materializer feature, not an existing Memo behavior.

## Current Memo Metadata and Reading

- `tooling/publish-memos/src/source.mjs:11` already reads YAML front matter.
  Syntax alone therefore already matches document authoring; field names,
  validation semantics, and supported behavior differ.
- `tooling/publish-memos/src/source.mjs:19` permits exactly id, createdAt,
  and draft. Adding document-style keys currently fails validation.
- `tooling/publish-memos/src/source.mjs:39` retains creation time for accepted
  IDs. Draft IDs participate in uniqueness checks. Hiding an accepted record
  as a draft withdraws it under the existing publication contract.
- `plugins/memos/public.mjs:9` permits exactly id, displayName, body, and
  createdAt in public schema 2. Timestamp validation at line 46 requires
  canonical UTC milliseconds; sorting at line 63 is newest-first with stable
  ASCII-ID ties. Date authoring alignment must preserve that accepted instant.
- `tooling/publish-memos/src/render.mjs:88` currently renders every full body,
  repeats the owner display name, displays UTC time, and supplies a stable
  `#<id>` reference link. There is no short/long view, archive, or pagination.
- `tooling/publish-memos/src/style.mjs:3` already uses Firefly's paper-colored
  background, system fonts, and public reading palette. Line 6 bounds a
  single reading column to 48rem. Reuse these choices before adding styling.
- `tooling/publish-memos/src/render.mjs:78` runs build-time Markdown parsing,
  raw HTML parsing, sanitization, and asset rewriting. Ordinary Markdown soft
  line breaks may collapse visibly; poems/dialogues need explicit verification.

## Corpus Compatibility

The source is all 180 historical entries approved as owner-authored in the
current conversation, including different historical names. Do not filter or
project those names into the new entries.

An aggregate read of the retained private migration ledger found:

- All 180 creation timestamps are distinct and map to the prior extraction.
- 164 entries are at most 500 characters; a single entry is above 2000.
- 103 entries contain CRLF; Memo canonically normalizes only line endings.
- 35 entries contain 48 total U+200B ZERO WIDTH SPACE characters.
  `plugins/memos/public.mjs:10` rejects all Unicode formatting characters,
  including U+200B. Blind import would fail those 35 entries.
- There are no Markdown images or fenced-code markers in this short corpus.
  This does not remove media/code requirements for the existing 89 notes.

Plan a bounded, reviewable treatment of U+200B with original source retention
and a private conversion report. Do not silently trim, normalize all Unicode,
drop affected entries, or weaken the global decoder merely to pass import.
The exact transformation remains an owner-owned content decision.

## Contract and Compatibility Implications

- `.trellis/spec/frontend/memo-site-contract.md:34` currently keeps Memo
  outside blog collections, X Core, search, Terminal VFS, RSS, and Lab.
  Sharing metadata conventions need not move Memo into those consumers.
- The independent publisher requires no blog source/config/export dependency.
  Routine Memo publication preserves blog bytes and vice versa, as reaffirmed
  by `.trellis/tasks/archive/2026-10/10-05-memo-production-enablement/prd.md`.
- `tooling/publish-memos/src/index.mjs:76` decodes the public export and
  regenerates exact canonical HTML during candidate validation. Metadata that
  affects rendering must be reproducible from validated publication data.
  Adding front matter alone without public-contract/validator support is
  insufficient for tags, titles, kind-based views, or folding controls.
- `tooling/publish-memos/src/index.mjs:82` validates the exact output inventory;
  archive/pagination/detail routes require a deliberate renderer and inventory
  contract update, rather than extra HTML files copied after validation.
- `tooling/publish-memos/src/history.mjs:27` decodes exact accepted-ID/time
  history; line 45 hashes complete accepted public records. Public-schema
  upgrades need deliberate legacy-reading/rollback compatibility. Do not reset
  existing history, IDs, creation times, deletion floors, or retired IDs.
- Source migration must accommodate the previously imported 89 notes, including
  existing stable fragment links and contained media. Source-field aliasing
  must reject conflicting date/createdAt values rather than choose silently.
- Hiding the rendered author name does not by itself require deleting the
  public displayName field or publisher configuration in this release.

## Metadata Options for Owner Review

Recommended authoring direction: share YAML syntax and the semantics of common
fields, while keeping Memo's stable id and independent processor. Consider
date, updated, draft, optional title/description/tags, and firefly.markers.
Short entries should be possible without fabricated titles or descriptions.
Do not assume all these fields must be implemented at once.

Alternatives and tradeoffs:

1. A Memo-specific strict schema sharing common field validators supports
   optional short-entry metadata and independent publication. Shared validation
   should live below applications; the publisher must not import Astro/Zod
   site modules directly. Exact sharing vs matched semantics remains research
   to finalize once the field set is chosen.
2. Reusing the full document schema would also impose required title,
   description, layout and document-only fields. Their meaning for short Memo
   and allowed presentation behaviors needs explicit approval; accepted fields
   must not imply unsupported X Core/SEO/access behavior.

Possible Memo-specific controls include a short/long entry kind and line-break
or folding treatment, but these are unresolved UX proposals. Do not overload
the already-defined featured marker with pinning or content classification.

## UI Research Interpretation

The project-owned frontend workflow requires the local UUPM design-system
research. Raw output is in `ui-ux-pro-max.md`; the actual CLI also supports
the Astro stack, despite narrower prose in the local skill.

Use its relevant guidance as checks: readable measure, keyboard focus,
touch spacing, predictable links/back behavior, and reduced-motion support.
The generated newsletter signup/subscriber metrics, vibrant blocks, external
fonts, and animation suggestions do not fit this owner-authored static reader
or existing palette. They are not product requirements or an approved design.

Mobile reading/navigation is `mobile-required`; browser validation is
`playwright-required`. Plan separate desktop and narrow-mobile reading with
JavaScript disabled, plus any agreed enhanced interactions. Existing mobile
homepage uses native browsing rather than a Terminal shell.

## Pending Product Decisions

- Metadata alignment degree and the first behavior-driving fields.
- Short/long reading views, their default, folding, and history navigation.
- Terminal directory/function behavior and whether it opens the independent
  page or displays live Memo contents within the shell.
- Exact U+200B conversion policy, and subsequent source installation scope.

Resolve the metadata authoring decision first. Design and execution plans are
not finalized while these decisions remain open.
