# Frontend State Management

## Current State Model

Both packages are static-first. There is no shared store, client cache,
server-state layer, event bus, or state-management dependency.

| Category | Implemented example | Owner |
| --- | --- | --- |
| Authored state | Markdown body/front matter under `content/` | Source file, validated at build time |
| Public derived state | Filtered/sorted posts/pages in `apps/site/src/lib/content.ts` | Main-site build helper |
| Per-document transform state | Summary, references, outline, node IDs, selected adapter | X Core VFile pipeline |
| Render metadata | Versioned JSON-compatible `xCore` payload | Astro `remarkPluginFrontmatter` |
| Render input | Layout titles/descriptions and component variants | Receiving Astro component |
| Ephemeral interaction | NERV `clickCount` | NERV route script |
| Browser-derived value | NERV `window.scrollY` to stripe CSS property | Scroll listener |
| URL/persistence | NERV `from` parameter and `has_visited` cookie | Redirect boundary |

## Build-Time Content State

The main site's collection store is a build input, not a browser store.
`getPublicContent()` is the single public projection: it removes drafts, rejects
unsupported public page layouts, asserts globally unique public slugs, and sorts
entries deterministically. Home and dynamic routes consume that projection rather
than reimplementing filters.

Do not cache or mirror this content in browser JavaScript. Changes to source
Markdown become a new immutable static build.

## X Core Per-File State

The paired remark/rehype plugins share transient state only through the current
VFile. Registry instances, trees, functions, errors, and VFiles never cross into
rendered metadata. The public bridge is a versioned, validated JSON-compatible
`xCore` object read by `renderDocument()`.

Do not use a module singleton for current document context, outline, adapter, or
enhancements. Parallel builds must remain isolated and deterministic.

## Global and Server State

There is no global or server state. Do not introduce Redux, Zustand, Nanostores,
React Query, SWR, a custom event bus, or a singleton for current content, click,
scroll, query, or cookie values.

If a future client experience needs cross-route/shared state, its task must define
ownership, serialization, recovery, no-JavaScript behavior, and browser evidence.

## NERV Persistence Contract

- cookie: `has_visited=true`
- path: `/`
- lifetime: `max-age=31536000`
- same-site: `SameSite=Strict`
- redirect: `from` query parameter, falling back to `/`

Change the route script and browser acceptance coverage together.

## Avoid

- Do not filter drafts or validate public layouts separately in each route.
- Do not mutate `Astro.props` or collection entries as shared state.
- Do not store mdast/hast trees, adapter functions, or mutable registry state in
  `remarkPluginFrontmatter`.
- Do not duplicate `scrollY` in a JavaScript store.
- Do not infer production state architecture from reference-only PHP/JavaScript.

## Reference Files

- `apps/site/src/lib/content.ts`
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/posts/[slug].astro`
- `apps/site/src/lib/render-document.ts`
- `packages/x-core/src/pipeline.ts`
- `experiments/nerv/src/pages/index.astro`
- `prototypes/typecho-terminal/prototype.json`
