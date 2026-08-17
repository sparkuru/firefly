# Frontend State Management

## Current State Model

All frontend units are static-first. There is no shared store, client cache,
server-state layer, event bus, or state-management dependency.

| Category | Implemented example | Owner |
| --- | --- | --- |
| Authored state | Posts workspace plus repository page Markdown | Source file, validated at build time |
| Generated input | Dereferenced ordinary Markdown under `.generated-content/posts` | Transactional materializer |
| Public derived state | Guest-projected canonical documents/tree/routes | Main-site build helpers |
| Experiment discovery | Frozen manifests and listed public catalog from `experiments/*/experiment.json` | Validator at build time |
| Per-document transform state | Summary, references, outline, node IDs, selected adapter | X Core VFile pipeline |
| Render metadata | Versioned JSON-compatible `xCore` payload | Astro `remarkPluginFrontmatter` |
| Render input | Layout titles/descriptions and component variants | Receiving Astro component |
| Terminal public index | Canonical virtual-path fields derived from guest content | Home build, then strict runtime decoder |
| Terminal Experiment index | Canonical `{ id, title, href }` from the listed public catalog | Home build, then strict runtime decoder |
| Terminal document templates | One inert `renderDocument()` fragment per public entry, keyed by filename | Home build; exact bijection validated before startup |
| Terminal command state | Last 50 submissions, cursor, restored draft | Home controller using pure runtime transitions |
| Terminal output | Closed text/document/experiment/navigation/clear effects | DOM controller renderer |
| Reader state | Local mode, active unit, owned Range, query/matches | Canonical document reader controller |
| Ephemeral interaction | NERV `clickCount` | NERV route script |
| Browser-derived value | NERV `window.scrollY` to stripe CSS property | Scroll listener |
| URL/persistence | NERV `from` parameter and `has_visited` cookie | Redirect boundary |

## Build-Time Content State

The main site's collection store is a build input, not a browser store.
`getCanonicalContent()` is the single production projection: it consumes the
fresh materialized posts stage, applies frozen guest access after drafts, rejects
unsupported page layouts and route/path/alias collisions, and builds deterministic
documents and directories. Home and routes consume it rather than reimplementing
filters.

Do not cache or mirror this content in browser JavaScript. Changes to source
Markdown become a new immutable static build.

## X Core Per-File State

The paired remark/rehype plugins share transient state only through the current
VFile. Registry instances, trees, functions, errors, and VFiles never cross into
rendered metadata. The public bridge is a versioned, validated JSON-compatible
`xCore` object read by `renderDocument()`.

Do not use a module singleton for current document context, outline, adapter, or
enhancements. Parallel builds must remain isolated and deterministic.

## Terminal Home State

The Terminal index is a build-derived view of the same public projection used by
routes. It is not a second content store. The serialized browser boundary contains
only `kind`, canonical virtual/relative path, filename/href, title, and
`YYYY-MM-DD` date; it excludes body, description, draft, source path, access, and
presentation metadata.

`decodeTerminalEntries()` accepts only a plain dense array of exact plain data
objects. It inspects property descriptors without invoking accessors or decorated
array methods, clones and freezes entries, and rejects unknown fields, folded
path/href collisions, unsafe path/text, noncanonical routes, and invalid dates.

Experiment discovery is a second build-time source, not a client registry.
`apps/site/src/lib/experiments.ts` loads the validator's frozen `listed` catalog.
`/lab/` uses its validated `entryHref`; Terminal receives only canonical
`{ id, title, href }` records and `decodeTerminalExperiments()` repeats the exact
plain-data, descriptor, cloning, freezing, canonical-route, and uniqueness gate.
Raw manifests, unlisted entries, build commands, tags, filesystem paths, and
Experiment output never cross into the browser.

The browser controller owns one route-local `TerminalState`. Empty submissions do
not mutate it; non-empty submissions retain only the latest 50 commands. Arrow
history preserves the draft entered before traversal. Completion and execution
return readonly-typed values; nested entry/history arrays and decoded entries are
frozen where the runtime contract requires it.

For a `document` effect, the controller selects only the validated matching
template, assigns a monotonically increasing clone scope, rewrites IDs and only
the references whose target belongs to that clone, then appends the DOM. `clear`
removes visible output/completion state but preserves history, recovery links,
and inert templates. Route changes occur only through validated native links or
a closed navigation/document-navigation effect containing one decoded record.

The reader owns route-local ephemeral state only. Its selection is owned only
while the live Range boundaries match its stored clone exactly; user replacement
turns it into native state. Search highlights, modes, and active-unit IDs are not
serialized or persisted.

## Global and Server State

There is no global or server state. Do not introduce Redux, Zustand, Nanostores,
React Query, SWR, a custom event bus, or a singleton for current content, click,
scroll, query, or cookie values.

Terminal history is intentionally in-memory and resets on navigation/reload. Do
not persist it in storage, cookies, query parameters, or a module/global singleton.
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
- Do not serialize Markdown bodies, adapter metadata, or arbitrary objects into
  the Terminal home index, JavaScript, JSON, or `data-*`. Build-rendered body HTML
  is permitted only inside the inert per-entry templates.
- Do not mutate decoded entries/effects or attach Terminal state to `window`.
- Do not mirror the public Experiment catalog in a store, fetch it at runtime, or
  construct an Experiment URL from command input.
- Do not infer production state architecture from reference-only PHP/JavaScript.

## Reference Files

- `apps/site/src/lib/content.ts`
- `apps/site/src/lib/content-access.mjs`
- `apps/site/scripts/materialize-content.mjs`
- `apps/site/src/lib/experiments.ts`
- `tooling/validate-experiments/src/index.ts`
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/posts/[...path].astro`
- `apps/site/src/lib/render-document.ts`
- `packages/x-core/src/pipeline.ts`
- `presentations/terminal/src/runtime.ts`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/scripts/terminal-reader.ts`
- `experiments/nerv/src/pages/index.astro`
- `prototypes/typecho-terminal/prototype.json`
