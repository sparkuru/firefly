# Frontend Directory Structure

## Current Scope

The main site and NERV experiment are separate static packages. Repository-root
`content/` is framework-neutral input for the main site, not an Astro source
directory. `prototypes/typecho-terminal/` is reference material only.

## Implemented Layout

```text
content/
├── posts/*.md                    # Post source loaded by apps/site
└── pages/*.md                    # Page source loaded by apps/site
apps/site/
├── package.json                  # Astro 7 package and commands
├── package-lock.json             # Site-only dependency lock
├── astro.config.mjs              # Static, Unified, Tailwind 4 config
├── playwright.config.ts          # Site-owned no-JavaScript browser projects
├── src/
│   ├── content.config.ts         # Explicit external glob loaders
│   ├── lib/
│   │   ├── content-schema.mjs    # Runtime metadata contract
│   │   └── content.ts            # Public filtering and invariants
│   ├── layouts/DocumentLayout.astro
│   ├── pages/                    # Thin static route entries
│   └── styles/global.css         # Tailwind import and site-wide tokens/rules
└── tests/                        # Schema and Playwright coverage
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
- Keep route files thin. The home queries public content; dynamic post/page files
  implement `getStaticPaths()` and `render(entry)`; `404.astro` owns recovery copy.
- Put the document shell, metadata, skip link, navigation, main landmark, and
  footer in `DocumentLayout.astro`.
- Keep main-site tests and Playwright configuration inside `apps/site/`.

The current route surface is exactly `/`, `/posts/<slug>/`, `/pages/<slug>/`, and
`404.html`. Do not create placeholder `timeline`, `files`, `tags`, or `lab` routes
before their milestone supplies real semantics.

## Experiment Boundaries

- Each `experiments/<id>/` is autonomous. Its directory name, manifest id,
  mount path, base path, dependencies, commands, and output must agree.
- NERV feature components remain under `src/modules/nerv/components/`; its pages
  compose feature roots rather than duplicating feature markup.
- NERV public assets stay under its `public/` and respect
  `import.meta.env.BASE_URL` for the `/lab/nerv` mount.

## Package Isolation

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

- Do not create future `packages/`, `presentations/`, `tooling/`, or publication
  trees merely to mirror the root PRD.
- Do not move package-local components into a generic repository component pool.
- Do not rely on content filenames or titles as the public slug contract.
- Do not copy reference-only Typecho PHP/JavaScript into either runtime package.

## Reference Files

- `apps/site/src/content.config.ts`
- `apps/site/src/lib/content.ts`
- `apps/site/src/pages/posts/[slug].astro`
- `apps/site/src/layouts/DocumentLayout.astro`
- `experiments/nerv/experiment.json`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `prototypes/typecho-terminal/prototype.json`
