# X Core and Presentation Contract

## Scenario: Build-Time Document Presentation

### 1. Scope / Trigger

Use this contract when changing Markdown analysis, document context, presentation
selection/transformation, stable node identity, rendered metadata, enhancements,
or the Astro bridge. X Core is a build-time boundary; it does not own content
loading, drafts, routes, browser command state, experiments, or deployment.

### 2. Signatures

```ts
new PresentationRegistry(defaultId?: string)
  .register(adapter: PresentationAdapter)
  .resolve(context: DocumentContext): PresentationAdapter

createXCorePlugins(options: {
  registry: PresentationRegistry;
  resolveContext: DocumentContextResolver;
}): { remarkPlugin; rehypePlugin }

parseXCoreMetadata(value: unknown, owner?: string): XCoreMetadata
validateJsonValue(value: unknown, path?: string): asserts value is JsonValue
renderDocument(entry: PublicPost | PublicPage)
type SiteRenderedDocument = Awaited<ReturnType<typeof renderDocument>>
```

```ts
interface PresentationAdapter {
  readonly id: string;
  supports(context: DocumentContext): boolean;
  transform(input: NormalizedDocumentInput): HastRoot;
  enhancements(input: NormalizedDocumentInput): readonly Enhancement[];
}
```

### 3. Contracts

- Adapter IDs are normalized lowercase kebab-case; omission selects the shared
  `DEFAULT_PRESENTATION_ID` (`f1refly`).
- `DocumentContext` contains document ID, optional safe virtual source, canonical
  route, collection, canonical slug, layout, and selected presentation. The
  app resolves it from the guest-projected `CanonicalDocument`; no host workspace
  path enters context or diagnostics.
- Remark rejects authored raw HTML, derives the first substantive prose summary,
  and classifies link/resource references as fragment/internal/relative/external.
- Rehype assigns GitHub-compatible heading IDs, an ordered outline, deterministic
  `data-node-id` values, applies one registered adapter, validates its output, and
  writes only versioned JSON-compatible `xCore` metadata.
- A transform cannot add/remove/change normalized headings or node identities or
  introduce HAST `raw` nodes. Every enhancement target must exist in emitted DOM.
- Metadata fields are exact: `version`, `presentation`, `summary`, `references`,
  `outline`, and `enhancements`. Site `renderDocument()` also requires exact
  agreement with Astro's heading metadata and sequential body headings starting
  at level two.
- JSON values are finite primitives, plain dense arrays, or plain/null-prototype
  objects with enumerable string data properties. Symbols, accessors, cycles,
  custom prototypes, sparse/decorated arrays, forbidden prototype keys, and
  unexpected metadata fields are invalid; validation must not invoke getters.
- The production semantic and Terminal adapters both support post/post and
  page/page contexts, clone without mutating input, preserve headings/node IDs,
  recursively wrap `pre`/`table` in presentation-owned named focusable
  local-scroll regions, and emit empty enhancement manifests.
- The Astro registry registers the `f1refly` Terminal adapter as default and
  semantic second; explicit `semantic` remains supported.
  `DocumentPresentation.astro` dispatches the exact validated metadata; the
  canonical routes and every inert Terminal-home document template pass through
  `renderDocument()` and the selected X Core adapter at build time. The browser
  command engine and template-cloning controller do not import or execute X Core.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed or duplicate adapter | `XCORE_INVALID_ADAPTER*` / `XCORE_DUPLICATE_ADAPTER` |
| unregistered presentation | `XCORE_UNKNOWN_PRESENTATION` with document context |
| unsupported or throwing/non-boolean `supports` | typed `XCORE_*` diagnostic with context/cause |
| resolver throws or returns incomplete context | `XCORE_CONTEXT_RESOLUTION` / `XCORE_INVALID_CONTEXT` |
| raw Markdown HTML or raw transformed HAST | `XCORE_RAW_HTML` / `XCORE_INVALID_TRANSFORM` |
| transform is not a HAST root or throws | typed transform diagnostic with document context |
| heading/node ID collision or adapter identity drift | typed collision/drift diagnostic; no partial output |
| malformed/non-dense enhancement output or missing target | typed manifest/target diagnostic |
| unsafe JSON/props | `XCORE_UNSAFE_JSON` without executing accessors |
| missing/wrong-version/extra rendered metadata | `XCORE_INVALID_METADATA` |
| X Core outline differs from Astro headings | `XCORE_HEADING_METADATA_DRIFT` |
| body heading starts at h1 or skips a level | `XCORE_SEMANTIC_HEADING_ORDER` |

All invariant failures abort the build and name the document/route/source when
that context exists. Do not let native `TypeError` escape an adapter boundary.

### 5. Good / Base / Bad Cases

- Good: one schema-validated Markdown document passes through the actual Astro
  processor and the same production registry; semantic, Terminal, and a fixture
  adapter produce deterministic adapter-specific output without changing the
  Markdown or stable identities.
- Base: omitted presentation selects `f1refly`, emits Terminal static native
  HTML and an empty enhancement list, and remains complete with JavaScript
  disabled.
- Bad: route code calls `render(entry)` directly, asserts plugin metadata, trusts
  adapter return values, stores AST/functions in frontmatter, mutates generated
  identities, or adds a browser Markdown/enhancement runtime.

### 6. Tests Required

- `packages/x-core`: registry/diagnostics; deterministic summary/references/IDs;
  raw HTML/HAST; transform/support/context failures; identity collision/drift;
  manifest target checks; adversarial JSON and exact metadata parsing.
- `presentations/semantic`: supported/unsupported contexts, recursive wide-content
  wrapping, native semantics, stable identity preservation, empty enhancements.
- `presentations/terminal`: the same adapter invariants plus a runtime-subpath
  graph check proving browser code does not import X Core/HAST/Astro/adapter code.
- `apps/site run test:x-core`: import the shared schema and run unchanged Markdown
  plus validated front matter through the actual Astro processors/one registry;
  compare semantic and fixture adapters and repeated determinism.
- `apps/site run test:content`: schema/materializer/access plus isolated real
  negative builds for route/path collision, unsupported layout, unregistered
  adapter, private leakage, and raw HTML.
- `apps/site run build`: validate ten default site HTML, one semantic CSS, one
  home command JS, one canonical-document reader JS, zero maps/unknown files,
  JavaScript-free directory routes, and bidirectional presentation-package/
  style closure. Semantic document HTML remains complete without JavaScript and
  activates the reader only for the explicit `#terminal-reader` fragment. Home
  template bodies must be `renderDocument()` output while remaining absent from
  JavaScript/index data.
- Focused then full Playwright: static semantic/Terminal heading/outline and
  focusable local overflow at `1440x900` and `375x812`; interactive projects test
  the site-owned Terminal home controller consuming build-rendered templates,
  never a browser X Core runtime.

### 7. Wrong vs Correct

#### Wrong

```ts
const { Content } = await render(entry);
const metadata = rendered.remarkPluginFrontmatter.xCore as XCoreMetadata;
registry.register(adapter).resolve(context).transform(input);
```

#### Correct

```ts
const { Content, metadata } = await renderDocument(entry);
const adapter = registry.resolve(context); // normalizes failures to XCoreError
```

The shared pipeline, runtime parser, and diagnostics make the adapter boundary
executable and keep future presentations from weakening static content safety.

## Reference Files

- `packages/x-core/src/contracts.ts`
- `packages/x-core/src/pipeline.ts`
- `packages/x-core/src/registry.ts`
- `packages/x-core/src/json.ts`
- `packages/x-core/src/metadata.ts`
- `presentations/semantic/src/index.ts`
- `presentations/terminal/src/index.ts`
- `presentations/terminal/src/runtime.ts`
- `apps/site/astro.config.mjs`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/lib/x-core-context.ts`
- `apps/site/src/lib/render-document.ts`
- `apps/site/tests/x-core-integration.test.mjs`
