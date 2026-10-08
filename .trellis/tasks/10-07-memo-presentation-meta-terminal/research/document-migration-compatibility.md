# Shared Document Migration Compatibility

Read-only research after approval of the unified 269-entry timeline.

## Current Publication Controls

`apps/site/src/lib/content-access.mjs:3` performs draft-first public document
projection using validated access metadata. Memo additionally has a global
plugin activation today. `plugins/public-access.mjs:6` gates /memos and its
descendants; this does not automatically apply to the approved /pages/memos/
route. The owner has changed publication ownership to the coordinated build,
but has not selected retention or retirement of the global Memo switch.

Resolved by the owner: the new experience follows ordinary document publication
controls, without a separate global Memo switch. Legacy-path gating and
configuration compatibility require an explicit migration design. Document the
new visibility contract; do not claim an old disabled flag still hides all
new document routes.

## Metadata and Headings

The shared article schema currently requires title and description. The
approved display direction permits brief entries without forced title chrome;
how authoring omission maps into canonical/SEO metadata needs explicit design.
Common metadata key names/semantics can remain consistent without making brief
entry authoring as elaborate as a long article.

`apps/site/src/lib/render-document.ts:46` requires body headings to begin at
level two and remain sequential. An aggregate scan of the retained nonempty
note ledger found 76 of 89 bodies contain a column-zero Markdown H1, and all
89 have a nonempty historical title. This regex is an inspection signal, not
the full Markdown-parser heading inventory; previous actual-corpus parser
research found 77 H1 notes. Neither count implies missing content.

`apps/site/scripts/blog-meta.mjs:378` can infer title from a body H1 and line
411 fills missing metadata; do not blindly run it over the imported corpus or
remove authored H1 paragraphs. Further inspection found an existing staging
normalizer at `apps/site/scripts/materialize-content.mjs:308`: it upgrades
column-zero '# ' headings outside its detected fences to H2 while preserving
original source files. Reuse/evaluate this actual path before introducing
another converter. Its simple fence/ATX handling does not prove correct handling
of all imported heading structures; validate the real Markdown corpus and
stable link correspondence in aggregate and individual output.

The existing 89 migrated sources include materialized assets and rewritten
internal links. Use current installed sources and retained conversion evidence
when adapting them; the original raw note ledger alone is not the final
publishable corpus. Keep all source/backup hashes and accepted private histories.

## Other Retained Compatibility Items

- Thirty-five historical short entries contain U+200B. The rejection found
  earlier belongs to the legacy Memo wire decoder, which the new document
  experience will replace. Inspection of the ordinary content materializer
  and X Core path found no blanket U+200B body rejection; path/metadata safety
  checks remain separate. Prefer preserving those source/body code points
  through shared document processing rather than requesting destructive cleanup
  just to satisfy a retired decoder. Corpus validation must prove this route;
  if it exposes another incompatibility, resolve it explicitly before changing
  text. No character removal is authorized or planned from this observation.
- Canonical dates must preserve actual creation instants and display UTC+8 in
  the imported historical reading experience unless another display policy is
  approved. Do not use source mtime/default article calendar dates for import.
- Existing note IDs and fragment links need a stable mapping to timeline
  anchors and detail routes. Do not silently regenerate identity from title.
- Article-like source processing and the accepted new presentation need a
  central validated projection; the app currently supports posts/pages only.
  Classification and sharing validators must be designed without treating
  body length or legacy origin as owner-facing categories.
