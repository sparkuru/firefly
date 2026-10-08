# Coordinated Build and Article-Family Direction

## Owner Decision on 2026-10-07

The owner selected building Memo together with the blog and described Memo as
short-form content that follows article logic, with its reading experience an
active practice under Lab/Pages. This supersedes the earlier independent-Memo
publication requirement for the intended product. It does not authorize an
implementation, production cutover, source deletion, or history reset.

Treat content identity and its reading view separately: individual Markdown
entries can share document semantics while an aggregate page experiments with
short-form presentation. The owner has not yet selected the primary route,
whether each entry has a full standalone reading page, or the exact metadata.

## Verified Reuse and Missing Capabilities

- `apps/site/src/content.config.ts` and
  `apps/site/scripts/materialize-content.mjs:28` currently load only posts and
  pages. Adding a memo source category is a contract change, not a configuration
  toggle. Reusing a collection with an explicit short-form discriminator is
  another design option; do not silently classify all Memo as ordinary posts.
- `apps/site/src/lib/content.ts:26` gives documents a canonical identity,
  collection, path, title-derived display name, route, breadcrumbs, aliases,
  and markers. `createCanonicalDocument` at line 94 projects them centrally.
  This is the existing basis for article-like behavior and shared discovery.
- `apps/site/src/pages/pages/[slug].astro` and
  `apps/site/src/pages/posts/[...path].astro` render canonical entries through
  the common renderDocument and DocumentPresentation boundaries.
- `apps/site/src/components/DocumentPresentation.astro` dispatches document
  presentation, themes, metadata/SEO and navigation; individual Semantic and
  Terminal components currently render a full article header and title.
  Short-card/stream views require deliberate components even if the body
  rendering is shared.
- `apps/site/src/lib/content-schema.mjs:107` admits timeline/files page layout
  names, but `presentations/semantic/src/index.ts:81` and
  `presentations/terminal/src/index.ts:82` support only posts/post and
  pages/page. A timeline reader is not an already implemented layout.
- `packages/x-core/src/contracts.ts:14` limits document collections to
  posts/pages. Its layout type also names timeline/files; a type/schema name
  alone is not evidence of a usable rendering adapter.
- `apps/site/src/lib/content-markers.mjs` resolves editorial featured metadata.
  Short-form classification should have explicit semantics, rather than
  treating an unsupported marker as an implemented content type.

## Candidate Product Shape

One source file per short entry, article-style metadata, shared document
validation and build-time body rendering, and a Memo aggregate reading page.
Date/draft/tags/markers should follow document semantics; title/description
requirements and short-entry display behavior still need owner decisions.

Pages is a natural primary home for a content-driven aggregate reading page;
Lab can host a distinct reading experiment using the same published document
results. A primary Lab reader is also possible, but must define its shared
content input and validated mount rather than creating another divergent
Markdown processor or relying on runtime owner-source reads.

The route/view choice remains open. Both choices must join the coordinated
release, preserve source text and dates, define existing Memo ID/link mapping,
and retain legacy private histories without reactivating withdrawn content.

## Immediate Planning Consequences

- Replace independent publishing as a requirement with coordinated build.
- Retain original sources, assets, stable correspondence, and private history.
- Do not finalize legacy publisher retirement, route forwarding, activation,
  source relocation, or public-schema replacement before the migration design.
- Decide the primary Pages/Lab reading surface next, followed by per-entry
  addressability, metadata, short/long corpus treatment, and import transforms.
