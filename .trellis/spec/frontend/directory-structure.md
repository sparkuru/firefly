# Frontend Directory Structure

## Current Scope

The main site, private comments service, X Core, semantic presentation, Terminal
presentation, NERV experiment, manifest validator, and publication assembler are
separately locked packages. The internal comments plugin is a repository-owned
capability manifest whose entrypoints remain in their owning packages.
Repository-root `content/` is framework-neutral input for the main site, not an
Astro source directory. `prototypes/typecho-terminal/` is reference material
only.

## Implemented Layout

```text
content/
├── posts/**/*.md                 # Default nested posts collection
└── pages/**/*.md                 # Default nested pages collection
plugins/comments/
├── plugin.json                   # Internal Firefly capability manifest
├── config.mjs                    # Comments configuration namespace owner
├── config.d.mts                  # Configuration declaration for service consumers
├── public.mjs                    # Pure sanitized public/build contract
├── public.d.mts                  # Shared public model and helper declarations
├── tests/public.test.mjs         # Package-independent public contract tests
├── compose.yml                   # Plugin-local runtime template
└── README.md                     # Ownership and private/public boundary
packages/x-core/
├── package.json + package-lock.json
├── src/                          # Contracts, pipeline, registry, metadata
└── tests/x-core.test.ts
presentations/semantic/
├── package.json + package-lock.json
├── src/index.ts                  # Pure semantic PresentationAdapter
└── tests/semantic.test.ts
presentations/terminal/
├── package.json + package-lock.json
├── src/index.ts                  # Pure Terminal PresentationAdapter
├── src/runtime.ts                # Browser-safe index/command state machine
└── tests/terminal.test.ts
apps/site/
├── package.json                  # Astro 7 package and commands
├── package-lock.json             # Site-only dependency lock
├── astro.config.mjs              # Static, two adapters, route-scoped assets
├── playwright.config.ts          # Static + interactive Chromium projects
├── public/
│   ├── fonts/                    # Pinned same-origin Terminal WOFF2 assets
│   └── licenses/                 # Published font license + provenance/hashes
├── scripts/
│   └── materialize-content.mjs   # Safe workspace/link scanner and transaction
├── .generated-content/posts/     # Ignored ordinary-file stage consumed by Astro
├── .generated-content/pages/     # Ignored ordinary-file stage consumed by Astro
├── src/
│   ├── content.config.ts         # Generated posts + repository pages loaders
│   ├── components/               # Dispatcher, semantic/Terminal documents/home
│   ├── lib/
│   │   ├── assets-inline-limit.mjs # Exact Terminal-home JS externalization
│   │   ├── content-schema.mjs    # Runtime metadata contract
│   │   ├── content-access.mjs    # Pure guest/user/admin projection
│   │   ├── content.ts            # Canonical paths/tree/routes/breadcrumbs
│   │   ├── experiments.ts        # Build-only validated public catalog
│   │   ├── render-document.ts    # Astro/X Core metadata bridge
│   │   ├── site-plugins.ts        # Static plugin registry and post extensions
│   │   └── x-core-context.ts     # App-owned DocumentContext resolver
│   ├── plugins/comments/          # Comment plugin UI and site adapter
│   │   ├── CommentSection.astro
│   │   ├── CommentForm.astro
│   │   └── site.mjs               # Build-only comments export entry
│   ├── layouts/                  # Semantic and Terminal whole-page shells
│   ├── pages/                    # Thin nested document/directory route entries
│   ├── scripts/
│   │   ├── terminal-home.ts      # Home command progressive enhancement
│   │   └── terminal-reader.ts    # Canonical-document Vim reader enhancement
│   └── styles/                   # Semantic compiled CSS + Terminal raw CSS
└── tests/                        # Schema, negatives, integration, output, E2E
experiments/nerv/
├── experiment.json               # Publication metadata/build contract
├── package.json                  # Astro 4 package and commands
├── package-lock.json
├── astro.config.mjs              # Static `/lab/nerv` build
├── src/{layouts,modules,pages}/
└── tests/nerv.spec.ts
tooling/validate-experiments/
├── package.json + package-lock.json
├── src/{index,cli}.ts             # Strict manifest/catalog contract
└── tests/validator.test.ts
tooling/assemble-publication/
├── package.json + package-lock.json
├── src/                           # Build, validation, staging, transaction, server
├── playwright.config.ts
└── tests/{assembler.test,publication.spec}.ts
services/comments/
├── package.json + package-lock.json
├── src/                          # Private service, plugin factory, SMTP worker
└── tests/                        # Storage, HTTP, privacy, and delivery tests
artifacts/                          # Ignored staged evidence after success
dist/                               # Ignored complete assembled release
package-runtime.sh                  # Runtime-only image/inventory/probe delegate
```

Generated `dist/`, `.astro/`, `playwright-report/`, and `test-results/` paths are
ignored. Never put authored source in them.

## Main-Site Boundaries

- Keep Markdown under `content/posts/<category>/<safe-slug>.md` or
  `content/pages/<safe-slug>.md`. The absolute `FIREFLY_CONTENT_ROOT` points to
  their containing blog root and defaults to `content/`.
  Bodies do not import Astro components, use hydration directives, or depend on
  presentation CSS classes. See `content-workspace-contract.md` for link/mount
  and virtual-path safety.
- The scanner dereferences validated authored links into one ignored
  `.generated-content/{posts,pages}/` stage; Astro loads only those ordinary-file
  trees. Schema validation, access projection, and canonical route/tree
  invariants stay in their shared helpers rather than routes.
- Keep route files thin. The home derives a validated, canonical Terminal index
  from public content and calls `renderDocument()` once per public entry to emit
  one inert keyed `TerminalStreamDocument` template. Dynamic post/page files
  implement `getStaticPaths()`, call `renderDocument(entry)`, and pass the result
  to `DocumentPresentation.astro`.
- `DocumentPresentation.astro` dispatches the validated X Core presentation to
  `DocumentLayout` + `SemanticDocument` or `TerminalLayout` +
  `TerminalDocument`. Routes do not select layouts independently.
- The home renders `TerminalHome.astro` and imports `terminal-home.ts`; only that
  controller validates and clones inert templates. Canonical document routes
  import `terminal-reader.ts` as progressive enhancement: Terminal documents
  are reader-capable when focused, while semantic documents activate it only
  for the explicit `#terminal-reader` entry fragment. Every document's semantic
  content and breadcrumb remain complete without JavaScript.
- Keep main-site tests and Playwright configuration inside `apps/site/`.
- Keep public comment UI and its build adapter under
  `apps/site/src/plugins/comments/`; generic document components may invoke the
  plugin entry but must not own comment data loading or storage behavior.
- Keep vendored public fonts under `apps/site/public/fonts/` and their complete
  license/provenance evidence under `apps/site/public/licenses/`. Provenance
  names the immutable upstream tag/commit, exact source and published paths, and
  SHA-256 digests. Do not replace tagged assets with an unrecorded package,
  convenience download, or locally generated derivative.
- `src/lib/experiments.ts` loads the validator's frozen listed catalog at build
  time. `/lab/` uses default-entry `entryHref`; Terminal uses canonical mount
  `href`. Neither route imports or preloads Experiment source/assets.

The default M5 site output includes home, every guest-visible post and page
document, each non-empty post/page directory index, `/lab/`, and `404.html`.
Post documents and directory indexes preserve their nested virtual paths;
front-matter slugs provide canonical post routes while pages remain
`/pages/<slug>/`. Do not create placeholder `timeline`, `files`, or `tags`
routes before their milestone supplies real semantics.

## Experiment Boundaries

- Each `experiments/<id>/` is autonomous. Its directory name, manifest id,
  mount path, base path, dependencies, commands, and output must agree.
- NERV feature components remain under `src/modules/nerv/components/`; its pages
  compose feature roots rather than duplicating feature markup.
- NERV public assets stay under its `public/` and respect
  `import.meta.env.BASE_URL` for the `/lab/nerv` mount.
- Every Experiment is discovered only through its strict source-controlled
  `experiment.json`. Builds remain package-local; publication copies validated
  output under the exact mount and preserves declared license evidence.

## Publication Boundaries

- `tooling/validate-experiments/` owns manifest parsing, exact schema/path/
  ownership checks, deterministic discovery, and public projection. It imports
  no application, adapter, or Experiment source.
- The target boundary for `tooling/assemble-publication/` is the validator plus
  static, versioned publication contracts. It invokes already validated
  repository-controlled build commands, copies safe trees, validates a fresh
  candidate, and promotes `artifacts/` plus `dist/` together. Its comments
  publication bridge consumes `plugins/comments/public.mjs` directly and has
  no dependency on site source.
- Package-local `dist/` paths are build inputs, never the public release. Root
  `artifacts/` and `dist/` are generated ignored outputs, never authored source.
- The assembler never rewrites Experiment HTML, combines bundles, follows
  symlinks, or treats package-local success as publication success. See
  `publication-contract.md` for the executable path and rollback contract.

## Package Isolation

- `packages/x-core/` contains framework-neutral build-time logic and cannot import
  Astro, the main site, presentations, experiments, or reference prototypes.
- `presentations/semantic/` imports the X Core public contract through the exact
  local `file:../../packages/x-core` package edge. It does not import site source.
- `presentations/terminal/` imports X Core only for the adapter entry. Its
  exported `./runtime` subpath is side-effect-free and does not import X Core,
  HAST, Astro, the adapter entry, or site code. Both presentation manifests
  currently classify X Core under `devDependencies`, while the Terminal adapter
  entry imports `DEFAULT_PRESENTATION_ID` at runtime. The later
  adapter-boundary cleanup owns validating and correcting that package metadata;
  the current classification must not be copied to a new runtime consumer.
- Semantic and Terminal do not import one another. `apps/site/` consumes built
  X Core and both presentation package entries through exact `file:`
  dependencies; rebuild them before clean-installing/building the site.
- Main site and experiments do not import one another's source, CSS, assets,
  configs, or dependencies.
- The site and assembler consume the validator as an exact local dependency.
  The assembler may execute/copy an Experiment only after discovery; Experiments
  never import either tooling package.
- The root `package.json` delegates commands but is not an npm workspace.
- `plugins/comments/plugin.json` is the ownership index for the internal
  comments capability. Its site/publication/service entrypoints may live in
  their package boundaries; the manifest is not a runtime loader or a public
  npm distribution mechanism.
- `services/comments/` is private runtime code. Its SQLite database, outbox,
  SMTP settings, delivery state, and admin routes never enter `apps/site/`,
  `artifacts/`, or the assembled release.
- Publication consumes static artifacts/manifests only through the M4 tooling;
  no package writes directly into another package's or the root release `dist/`.
- Astro versions may differ. Do not upgrade NERV merely because the main site
  uses Astro 7.

## Naming

- Astro components/layouts use PascalCase filenames.
- Feature and content directories use lowercase semantic names.
- Route filenames follow Astro URL semantics: `index.astro`, `404.astro`,
  `[slug].astro`, and the posts catch-all `[...path].astro` that consumes only
  prevalidated canonical route props.
- Browser tests use lowercase `*.spec.ts`; Node schema tests use `*.test.mjs`.
- Post source paths come from validated workspace-relative Markdown paths; an
  optional post `slug` supplies the stable route segment and otherwise the
  physical filename stem is used. Page source paths are physical Markdown paths
  while page routes retain their validated front-matter slug. Titles determine
  physical filenames for readability, never canonical routes.

## Avoid

- Do not bypass the M4 validator/assembler with ad hoc manifest casts, direct
  Experiment imports, NERV-specific copy commands, or writes into root `dist/`.
- Do not move package-local components into a generic repository component pool.
- Do not bypass the canonical document model by separately decoding collection
  IDs, raw catch-all parameters, command operands, aliases, or host paths.
- Do not copy reference-only Typecho PHP/JavaScript into either runtime package.

## Reference Files

- `apps/site/src/content.config.ts`
- `apps/site/src/lib/content.ts`
- `apps/site/src/lib/render-document.ts`
- `apps/site/src/components/SemanticDocument.astro`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `packages/x-core/src/index.ts`
- `presentations/semantic/src/index.ts`
- `presentations/terminal/src/index.ts`
- `presentations/terminal/src/runtime.ts`
- `apps/site/scripts/materialize-content.mjs`
- `apps/site/src/lib/content-access.mjs`
- `apps/site/src/pages/posts/[...path].astro`
- `apps/site/src/pages/posts/index.astro`
- `apps/site/src/pages/pages/index.astro`
- `apps/site/src/components/ContentDirectoryIndex.astro`
- `apps/site/src/scripts/terminal-reader.ts`
- `apps/site/src/layouts/DocumentLayout.astro`
- `experiments/nerv/experiment.json`
- `tooling/validate-experiments/src/index.ts`
- `tooling/assemble-publication/src/index.ts`
- `apps/site/src/lib/experiments.ts`
- `apps/site/src/pages/lab/index.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `prototypes/typecho-terminal/prototype.json`
