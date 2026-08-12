# M2 X Core semantic interface — Technical Design

## Design Summary

M2 adds a small framework-neutral X Core and one semantic presentation adapter,
then integrates both into Astro's existing Unified render pipeline. Astro remains
the static shell and route owner. Content Collections remain the schema/load
boundary. X Core owns document analysis, presentation selection, AST
transformation, stable node identity, enhancement-manifest validation, and
diagnostics.

The approved UI direction is a restrained evolution of M1. It does not add a
brand system, client runtime, or Terminal preview.

## Repository Boundaries

```text
content/*.md
    │  Astro external loaders + strict authored schema
    ▼
apps/site Astro render
    │  app-owned DocumentContext resolver
    ▼
packages/x-core
    ├─ remark analysis / raw-HTML guard
    ├─ rehype identity / registry / diagnostics
    └─ versioned rendered metadata
    │
    ├────────► presentations/semantic (pure adapter)
    │
    ▼
apps/site renderDocument() + SemanticDocument.astro
    ▼
static HTML + CSS, no client script
```

- `packages/x-core/` is a private ESM TypeScript package with its own exact
  dependencies, lockfile, strict config, build, unit tests, and public types.
- `presentations/semantic/` is a private ESM TypeScript package with its own
  lockfile/config/tests and a type-only dependency on X Core's public contract.
- `apps/site/` owns Astro integration, the content-to-route context mapping,
  rendered-metadata narrowing, the outer document shell, semantic document
  composition, and CSS.
- `experiments/nerv/`, deployment files, and reference prototypes are outside
  the dependency graph.
- The root remains a command delegate, not an npm workspace. Root scripts expose
  ordered install/check/build/test commands for the two packages and site.

## Public Contracts

X Core exports types and factories equivalent to:

```ts
type JsonValue =
  | null
  | boolean
  | number
  | string
  | JsonValue[]
  | { [key: string]: JsonValue };

interface DocumentContext {
  documentId: string;
  sourcePath?: string;
  route: string;
  collection: 'posts' | 'pages';
  slug: string;
  layout: 'post' | 'page' | 'timeline' | 'files';
  presentation: string;
}

interface PresentationAdapter {
  readonly id: string;
  supports(context: DocumentContext): boolean;
  transform(tree: HastRoot, context: DocumentContext): HastRoot;
  enhancements(context: DocumentContext): readonly Enhancement[];
}

interface Enhancement {
  nodeId: string;
  feature: string;
  module: string;
  load: 'eager' | 'idle' | 'visible';
  props: Record<string, JsonValue>;
}

interface XCoreDiagnostic {
  severity: 'error' | 'warning';
  code: string;
  message: string;
  document: Pick<DocumentContext, 'documentId' | 'sourcePath' | 'route'>;
  nodeId?: string;
}
```

The real contract should use readonly data where practical, close literal sets
that are controlled by X Core, and avoid `any` or broad assertions. Adapter IDs
are normalized non-empty identifiers. The registry rejects duplicates and owns
the `semantic` default.

## Pipeline and Data Flow

### 1. Authored validation

The existing shared Zod schemas still reject unknown authored keys, invalid
dates/slugs/layouts, and malformed presentation IDs. The schema accepts a valid
presentation identifier; registry membership is checked when a public document
is rendered. Draft filtering and slug uniqueness remain in `getPublicContent()`.

### 2. Paired Unified plugins

`createXCorePlugins({ registry, resolveContext })` returns one remark plugin and
one rehype plugin sharing a private per-VFile state map.

The remark plugin:

- resolves immutable `DocumentContext` through app-owned glue;
- fails on raw mdast HTML with a document-aware diagnostic;
- derives a deterministic plain-text summary from the first substantive prose
  block, leaving the authored `description` unchanged;
- inventories Markdown link/image references and classifies fragment, internal,
  relative, and external references without performing deployment URL policy;
- stores only internal transient state, not trees, in public metadata.

The rehype plugin:

- assigns GitHub-compatible deterministic heading IDs before Astro's built-in
  heading collector;
- builds an ordered outline from the emitted heading nodes;
- assigns deterministic `data-node-id` values to addressable block nodes using
  document identity, node kind, and traversal ordinal;
- resolves and checks the selected adapter, applies its HAST transform, and
  obtains its enhancement declarations;
- validates JSON safety, duplicate/missing node IDs, and manifest-to-DOM targets;
- publishes a versioned `xCore` metadata object under
  `file.data.astro.frontmatter` for Astro's supported
  `remarkPluginFrontmatter` result.

Only serializable analysis/output crosses the plugin boundary. Trees, registry
instances, errors, functions, and VFiles do not.

### 3. Presentation and route composition

The semantic adapter supports post/page document contexts, preserves native
HTML semantics, and adds only presentation-owned structure needed for stable
wide-content regions or node addressing. It emits no enhancements in production
for M2.

`apps/site/src/lib/render-document.ts` wraps `render(entry)`, validates the
versioned X Core metadata, and returns a typed result. Post/page routes call this
single helper and compose a shared `SemanticDocument.astro` component. The
component owns article metadata, the optional on-page outline, and `<Content />`;
routes continue to own only path generation and entry selection.

Home and 404 do not synthesize document contexts. They receive the compatible
restrained shell/CSS and remain Playwright regression routes.

## Semantic UI Contract

- Keep the existing neutral light palette and system font stack. Token changes
  require measured contrast or clearer hierarchy, not branding preference.
- Retain the visible skip link, native navigation, one route-level `<h1>`, and
  visible `:focus-visible` outline.
- Maintain approximately `65–75ch` prose measure and generous vertical rhythm.
- Show an `On this page` navigation only when at least two body headings make it
  useful; links target the exact X Core/Astro heading IDs.
- Give tables and code blocks localized horizontal scrolling without clipping
  the document. Focusable scroll regions need an accessible name and visible
  focus treatment.
- Use no external fonts, icon package, decorative animation, dark-mode branch,
  hydration, or browser script.

## Diagnostics

Error codes use a stable `XCORE_*` prefix. Required classes include invalid or
duplicate adapter registration, unknown/unsupported presentation, raw HTML,
context failure, heading/node identity collision, non-JSON/unsafe enhancement
props, and missing manifest targets.

Thrown build errors carry the diagnostic message and document context so Astro's
existing file-prefix behavior remains helpful. Tests assert codes and owner
details, not brittle full stack traces. Successful output may contain warnings,
but M2 must not silently downgrade an invariant required for valid static output.

## Compatibility and Migration

- Existing `/`, `/posts/<slug>/`, `/pages/<slug>/`, and `404.html` URLs remain
  unchanged.
- Missing `presentation` continues to mean `semantic`.
- Existing Markdown bodies require no component import, class, directive, or
  rewrite. The public sample may gain ordinary Markdown nodes needed for coverage.
- No authored `xCore` field is added. Generated metadata is namespaced and
  versioned separately from the strict authored schema.
- M3 registers Terminal against the same public adapter contract; M2 ships only a
  fixture second adapter in unit tests.

## Validation Design

1. X Core unit tests cover deterministic analysis/IDs, registry behavior,
   diagnostics, unsafe manifest values, and target matching.
2. Semantic adapter unit tests cover supports/transform behavior and empty
   production enhancements.
3. Main-site integration tests run the actual Astro markdown processor/plugins,
   validate generated metadata, and preserve content-schema negatives.
4. Static-build inspection checks routes, heading IDs/outline targets, draft
   absence, bundle isolation, and forbidden strings/assets.
5. JavaScript-disabled Playwright covers all four route classes on desktop/mobile
   plus outline links, wide code/table containment, focus, deep links, and no
   document overflow.
6. NERV check/build proves the new package graph does not cross experiment
   boundaries.

## Risks and Rollback

- **Plugin ordering:** tests assert that X Core IDs equal Astro's reported IDs.
- **External package resolution:** clean installs and the documented X Core →
  semantic → site build order must pass in dev/build/Playwright modes.
- **Metadata drift:** a runtime validator at `renderDocument()` rejects missing or
  wrong-version plugin output.
- **Over-broad AST mutation:** fixtures snapshot meaningful structure, while
  browser tests assert semantics instead of cosmetic markup.
- **Scope creep:** Terminal, experiment publication, branding, and later routes
  remain explicit exclusions.

Rollback is additive and data-safe: revert the new private packages, restore the
M1 Unified config and direct `render(entry)` helper calls, and revert semantic UI
composition/CSS. No content migration, database, deployment, or irreversible
state is involved.
