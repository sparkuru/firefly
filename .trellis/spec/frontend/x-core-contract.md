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
  allowAuthoredHtml?: boolean;
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
  `DEFAULT_PRESENTATION_ID` (`firefly`).
- `DocumentContext` contains document ID, optional safe virtual source, canonical
  route, collection, canonical slug, layout, and selected presentation. The
  app resolves it from the guest-projected `CanonicalDocument`; no host workspace
  path enters context or diagnostics. Site-owned `contentTheme` metadata is
  intentionally outside this context and remains a render-boundary concern; it
  never selects an adapter or changes `presentation`.
- Remark rejects authored raw HTML by default, derives the first substantive
  prose summary, and classifies link/resource references as
  fragment/internal/relative/external. A host may set
  `allowAuthoredHtml: true` only when its own processor parses and sanitizes
  authored HTML before the X Core rehype stage; the option does not parse,
  sanitize, or authorize HTML by itself.
- The site-owned Markdown processor runs `rehypeRaw`, then its explicit
  `rehype-sanitize` schema, then the X Core rehype plugin. The site schema keeps
  only structural/semantic HTML, `<center>` for legacy compatibility, safe
  relative/HTTP(S) URLs, and the documented `firefly-content-callout` and
  `firefly-content-center` classes. It removes style elements/attributes,
  scripts, event handlers, unsafe URLs, browser embedding/form primitives, and
  other unsupported content. The final raw-HAST guard remains required even
  for opted-in hosts.
- Rehype assigns GitHub-compatible heading IDs, an ordered outline, deterministic
  `data-node-id` values, applies one registered adapter, validates its output, and
  writes only versioned JSON-compatible `xCore` metadata.
- A transform cannot add/remove/change normalized headings or node identities or
  introduce HAST `raw` nodes. Every enhancement target must exist in emitted DOM.
- Metadata fields are exact: `version`, `presentation`, `summary`, `references`,
  `outline`, and `enhancements`. Site `renderDocument()` also requires exact
  agreement with Astro's heading depths/IDs and canonical heading text
  (whitespace is collapsed and trimmed at the comparison boundary), plus
  sequential body headings starting at level two. `contentTheme` is not an
  X Core metadata field.
- JSON values are finite primitives, plain dense arrays, or plain/null-prototype
  objects with enumerable string data properties. Symbols, accessors, cycles,
  custom prototypes, sparse/decorated arrays, forbidden prototype keys, and
  unexpected metadata fields are invalid; validation must not invoke getters.
- The production semantic and Terminal adapters must both support post/post and
  page/page contexts, clone without mutating input, preserve headings/node IDs,
  recursively wrap `pre`/`table` in presentation-owned named focusable
  local-scroll regions, and emit empty enhancement manifests. Both production
  adapters satisfy the cloning boundary; their focused tests must keep the
  supplied source tree unchanged while checking the transformed output. The
  clone is an adapter-owned build-time detail and must not introduce
  semantic-to-Terminal coupling or a browser transform runtime.
- The Astro registry registers both production adapters; omission resolves
  through the shared default ID to the `firefly` Terminal adapter, while
  explicit `semantic` remains supported.
  `DocumentPresentation.astro` dispatches the exact validated metadata; the
  canonical routes and every inert Terminal-home document template pass through
  `renderDocument()` and the selected X Core adapter at build time. The browser
  command engine and template-cloning controller do not import or execute X Core.
- The durable X Core API ends at framework-neutral document analysis,
  presentation selection, metadata, and diagnostics. The package entrypoint
  exports only that document/Presentation pipeline. Site extensions and
  canonical routes belong to the site: `apps/site` owns its statically
  registered comments site-plugin registry and its pure canonical-route
  projection. Publication and service adapters remain owned and invoked by
  their existing packages; their lifecycle, private state, runtime
  configuration, and publication metadata do not enter X Core.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| malformed or duplicate adapter | `XCORE_INVALID_ADAPTER*` / `XCORE_DUPLICATE_ADAPTER` |
| unregistered presentation | `XCORE_UNKNOWN_PRESENTATION` with document context |
| unsupported or throwing/non-boolean `supports` | typed `XCORE_*` diagnostic with context/cause |
| resolver throws or returns incomplete context | `XCORE_CONTEXT_RESOLUTION` / `XCORE_INVALID_CONTEXT` |
| raw Markdown HTML without host opt-in, or raw transformed HAST | `XCORE_RAW_HTML` / `XCORE_INVALID_TRANSFORM` |
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
  Markdown or stable identities. An opted-in site parses and sanitizes HTML
  before X Core assigns headings and node identities.
- Base: omitted presentation selects `firefly`, emits Terminal static native
  HTML and an empty enhancement list, and remains complete with JavaScript
  disabled.
- Bad: a host enables `allowAuthoredHtml` without its parser/sanitizer, route
  code calls `render(entry)` directly, asserts plugin metadata, trusts adapter
  return values, stores AST/functions in frontmatter, mutates generated
  identities, or adds a browser Markdown/enhancement runtime.

### 6. Tests Required

- `packages/x-core`: registry/diagnostics; deterministic summary/references/IDs;
  raw HTML/HAST; transform/support/context failures; identity collision/drift;
  manifest target checks; adversarial JSON and exact metadata parsing.
- `presentations/semantic`: supported/unsupported contexts, recursive wide-content
  wrapping, native semantics, stable identity preservation, source-tree
  immutability with distinct output identity, and empty enhancements.
- `presentations/terminal`: the same adapter invariants plus a runtime-subpath
  graph check proving browser code does not import X Core/HAST/Astro/adapter code.
- `apps/site run test:x-core`: import the shared schema and run unchanged Markdown
  plus validated front matter through the actual Astro processors/one registry;
  compare semantic and fixture adapters and repeated determinism.
- `apps/site run test:content`: schema/materializer/access plus isolated real
  negative builds for route/path collision, unsupported layout, unregistered
  adapter, and private leakage. Site authored HTML policy coverage belongs to
  `test:x-core`; hosts without the opt-in retain the raw-HTML negative.
- `apps/site run build`: validate the exact HTML route inventory derived from the
  explicitly selected fixture/workspace, one semantic CSS, one home command JS,
  one canonical-document reader JS, zero maps/unknown files,
  JavaScript-free directory routes, and bidirectional presentation-package/
  style closure. Semantic document HTML remains complete without JavaScript and
  activates the reader only for the explicit `#document-navigator` fragment. Home
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

## Site-owned static diagrams

The site processor runs its trusted async Mermaid stage after authored HTML
sanitation and before X Core normalization. Authored policy does not admit SVG:
Mermaid output is validated separately as isolated same-origin image assets.
Set `markdown.syntaxHighlight` at the Astro configuration level to exclude
Mermaid from Shiki; passing it inside `unified()` is silently ignored. Test the
actual `unified().createRenderer()` path. Keep a serialized diagram pipeline
version in plugin options so Astro invalidates cached HTML when the rendering
contract changes.

Both presentation adapters receive ordinary figure/image/details/source nodes;
node identities, headings and the browser X Core boundary remain unchanged.

`apps/site/src/build/mermaid-renderer.mjs` pins strict Mermaid configuration,
64 KiB input and 15-second rendering limits, blocks network requests, rejects
source configuration/callback/resource features, and validates SVG with XML DOM
and CSSOM. Rendering is serial with a fresh browser/page per uncached source;
all browser resources close even on failure. Invalid source is readable with a
route-scoped diagnostic; unavailable renderer infrastructure fails the build.

Astro content storage uses explicit `cacheDir: './.astro/cache/'`; generated
diagrams live in the sibling `.astro/diagrams/`. Clearing the complete site
`.astro/` directory invalidates both rendered HTML and its generated assets.
Do not independently clear only the diagrams subdirectory. The old default
`node_modules/.astro/` is no longer used by site builds.

The ignored `.astro/diagrams/` cache is content/config/policy addressed and
written atomically. `astro:build:done` scans current public HTML (including inert
templates) and copies only referenced `/diagrams/<sha256>.svg` assets. Cached
Astro HTML therefore still resolves assets, while unrelated/private cached
images never enter publication. Missing referenced cache assets fail with a
clear rebuild instruction. Development middleware serves the same immutable
keys. No Mermaid script is shipped to the browser; full-size links and native
source disclosure work without JavaScript. Generated SVGs retain explicit
numeric intrinsic dimensions derived from a validated finite positive viewBox;
remove Mermaid's root size constraints so a native full-size URL does not fit a
long diagram into one unreadable viewport. The surrounding image CSS bounds
inline previews. Validate SVG safety again after dimension normalization. For flowcharts, full-size links
use the existing first node ID as a native SVG fragment so narrow viewports
start on content rather than empty canvas. Store the encoded ID only on the
SVG root, read only that root marker on cache hits, and keep preview image
URLs fragment-free; labels must never be interpreted as navigation metadata.

Run `./render.sh npm --prefix apps/site run test:diagrams` for renderer safety,
fresh-render determinism, both adapter metadata, warm-cache and asset ownership
checks; `mermaid.spec.ts` covers no-JS canonical images/disclosure and repeated
Terminal `cat` isolation in the existing desktop/mobile browser projects.
