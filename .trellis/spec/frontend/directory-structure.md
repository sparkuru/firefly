# Frontend Directory Structure

## Current Scope

The main site, X Core, semantic presentation, Terminal presentation, and NERV
experiment are separately locked packages. Repository-root `content/` is
framework-neutral input for the main site, not an Astro source directory.
`prototypes/typecho-terminal/` is reference material only.

## Implemented Layout

```text
content/
├── posts/*.md                    # Post source loaded by apps/site
└── pages/*.md                    # Page source loaded by apps/site
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
├── src/
│   ├── content.config.ts         # Explicit external glob loaders
│   ├── components/               # Dispatcher, semantic/Terminal documents/home
│   ├── lib/
│   │   ├── assets-inline-limit.mjs # Exact Terminal-home JS externalization
│   │   ├── content-schema.mjs    # Runtime metadata contract
│   │   ├── content.ts            # Public filtering and invariants
│   │   ├── render-document.ts    # Astro/X Core metadata bridge
│   │   └── x-core-context.ts     # App-owned DocumentContext resolver
│   ├── layouts/                  # Semantic and Terminal whole-page shells
│   ├── pages/                    # Thin static route entries
│   ├── scripts/terminal-home.ts  # Home-only progressive enhancement
│   └── styles/                   # Semantic compiled CSS + Terminal raw CSS
└── tests/                        # Schema, negatives, integration, output, E2E
experiments/nerv/
├── experiment.json               # Publication metadata/build contract
├── package.json                  # Astro 4 package and commands
├── package-lock.json
├── astro.config.mjs              # Static `/lab/nerv` build
├── src/{layouts,modules,pages}/
└── tests/nerv.spec.ts
```

Generated `dist/`, `.astro/`, `playwright-report/`, and `test-results/` paths are
ignored. Never put authored source in them.

## Main-Site Boundaries

- Keep Markdown under repository-root `content/posts/` or `content/pages/`.
  Bodies do not import Astro components, use hydration directives, or depend on
  presentation CSS classes.
- Register collections in `apps/site/src/content.config.ts` with explicit
  `glob({ base, pattern })` loaders. Validation belongs in the shared schema;
  public filtering/uniqueness/layout guards belong in `src/lib/content.ts`.
- Keep route files thin. The home derives a validated, canonical Terminal index
  from public content and calls `renderDocument()` once per public entry to emit
  one inert keyed `TerminalStreamDocument` template. Dynamic post/page files
  implement `getStaticPaths()`, call `renderDocument(entry)`, and pass the result
  to `DocumentPresentation.astro`.
- `DocumentPresentation.astro` dispatches the validated X Core presentation to
  `DocumentLayout` + `SemanticDocument` or `TerminalLayout` +
  `TerminalDocument`. Routes do not select layouts independently.
- The home alone renders `TerminalHome.astro` and imports
  `src/scripts/terminal-home.ts`. Only that controller validates and clones the
  inert templates; canonical Terminal documents remain JavaScript-free.
- Keep main-site tests and Playwright configuration inside `apps/site/`.

The current output is exactly five HTML files: home, two public posts, About, and
`404.html`. The route kinds remain `/`, `/posts/<slug>/`, `/pages/<slug>/`, and
the static 404. Do not create placeholder `timeline`, `files`, `tags`, or `lab`
routes before their milestone supplies real semantics.

## Experiment Boundaries

- Each `experiments/<id>/` is autonomous. Its directory name, manifest id,
  mount path, base path, dependencies, commands, and output must agree.
- NERV feature components remain under `src/modules/nerv/components/`; its pages
  compose feature roots rather than duplicating feature markup.
- NERV public assets stay under its `public/` and respect
  `import.meta.env.BASE_URL` for the `/lab/nerv` mount.

## Package Isolation

- `packages/x-core/` contains framework-neutral build-time logic and cannot import
  Astro, the main site, presentations, experiments, or reference prototypes.
- `presentations/semantic/` depends on the X Core public contract through its
  exact `file:../../packages/x-core` dependency. It does not import site source.
- `presentations/terminal/` depends on X Core only for the adapter entry. Its
  exported `./runtime` subpath is side-effect-free and does not import X Core,
  HAST, Astro, the adapter entry, or site code.
- Semantic and Terminal do not import one another. `apps/site/` consumes built
  X Core and both presentation package entries through exact `file:`
  dependencies; rebuild them before clean-installing/building the site.
- Main site and experiments do not import one another's source, CSS, assets,
  configs, or dependencies.
- The root `package.json` delegates commands but is not an npm workspace.
- Publication consumes static artifacts/manifests in a later milestone; neither
  package writes directly into the other's `dist/`.
- Astro versions may differ. Do not upgrade NERV merely because the main site
  uses Astro 7.

## Naming

- Astro components/layouts use PascalCase filenames.
- Feature and content directories use lowercase semantic names.
- Route filenames follow Astro URL semantics: `index.astro`, `404.astro`, and
  `[slug].astro`.
- Browser tests use lowercase `*.spec.ts`; Node schema tests use `*.test.mjs`.
- Stable public routes come from validated front-matter `slug`, not titles.

## Avoid

- Do not create M4 publication assemblers, public experiment indexes, lab
  commands/routes, `tooling/`, or deployment trees merely to mirror the root PRD.
- Do not move package-local components into a generic repository component pool.
- Do not rely on content filenames or titles as the public slug contract.
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
- `apps/site/src/pages/posts/[slug].astro`
- `apps/site/src/layouts/DocumentLayout.astro`
- `experiments/nerv/experiment.json`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `prototypes/typecho-terminal/prototype.json`
