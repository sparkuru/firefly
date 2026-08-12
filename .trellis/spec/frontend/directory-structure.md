# Frontend Directory Structure

## Current Scope

The only runnable frontend package currently in the repository is the autonomous
Astro 4 experiment at `experiments/nerv/`. The root `prd.md` describes future
directories such as `apps/`, `packages/`, and `presentations/`; those directories
are milestone intent, not existing organization rules.

`prototypes/typecho-terminal/` is also present, but
`prototypes/typecho-terminal/prototype.json` marks it as `reference-only`. Its PHP,
CSS, and JavaScript may inform later interaction or visual work; they are not part
of the static site's runtime and must not be imported into NERV.

## Implemented Layout

```text
experiments/nerv/
├── experiment.json             # Publication metadata and build contract
├── package.json                # Experiment-owned dependencies and commands
├── astro.config.mjs            # Static output and /lab/nerv base path
├── playwright.config.ts        # Browser projects and local web server
├── public/                     # Files copied as public assets
├── reference/                  # Design reference material, not runtime source
├── src/
│   ├── env.d.ts                # Astro environment declarations
│   ├── layouts/
│   │   └── Layout.astro        # Document shell and intentional global styles
│   ├── modules/
│   │   ├── error/
│   │   │   └── NotFoundPage.astro
│   │   └── nerv/
│   │       ├── NervPage.astro  # Feature composition root
│   │       ├── NOTICE.md       # Feature-local attribution
│   │       └── components/     # Feature-local presentational pieces
│   └── pages/                  # Astro file routes
│       ├── index.astro
│       └── 404.astro
└── tests/
    └── nerv.spec.ts            # Route-level Playwright coverage
```

Build output and tool state (`dist/`, `.astro/`, `playwright-report/`, and
`test-results/`) are generated and ignored. Do not place authored source in them.

## Route, Layout, and Module Boundaries

- Keep files under `src/pages/` thin. `src/pages/index.astro` composes
  `Layout.astro` with `NervPage.astro`; `src/pages/404.astro` delegates the error
  experience to `modules/error/NotFoundPage.astro`.
- Put a complete page experience under `src/modules/<feature>/`. The NERV module
  owns its page composition, feature-specific styles, attribution, and leaf
  components.
- Put reusable pieces inside the owning feature's `components/` directory.
  `NervPage.astro` imports `WarningStripe.astro`, `NervLogo.astro`,
  `NoticeInfo.astro`, `SecurityLevel.astro`, and `ClassifiedBox.astro` with local
  relative paths.
- Put the HTML document shell in `src/layouts/`. `Layout.astro` owns metadata,
  favicon resolution, the default slot, and the only `style is:global` block.
- Keep route-owned browser behavior next to its route until a real shared client
  module exists. The current click and scroll behavior lives in the `<script>` of
  `src/pages/index.astro`; there is no hooks or client-utilities directory.
- Keep browser tests outside `src/`, under `tests/`, and keep the matching runtime
  configuration at the experiment root.

## Experiment Isolation

Each `experiments/<id>/` is a self-contained static package. For NERV, the directory
name, `experiment.json` id, Astro `base`, and publication mount all agree on
`nerv` / `/lab/nerv`. Dependencies and build commands belong to
`experiments/nerv/package.json`, not to source in another experiment or a future
main-site package.

Public assets belong under the experiment's `public/` directory. Code that emits a
root-relative asset must respect Astro's configured base path, as
`src/layouts/Layout.astro` does with `import.meta.env.BASE_URL` for the favicon.

## Naming

- Astro components and layouts use PascalCase filenames: `NervPage.astro`,
  `WarningStripe.astro`, and `Layout.astro`.
- Feature directories use lowercase identifiers that match the feature or
  experiment: `modules/nerv/` and `modules/error/`.
- Astro route filenames follow URL semantics: `index.astro` for the experiment
  entry and `404.astro` for the not-found route.
- Tests use a lowercase feature name with `.spec.ts`, as in `tests/nerv.spec.ts`.
- Static asset names use lowercase kebab-case, as in `public/nerv-logo.svg`.

## Avoid

- Do not create the future `apps/`, `packages/`, `presentations/`, or `tooling/`
  trees early just to mirror `prd.md`; create them when their milestone lands.
- Do not move feature-only components into a generic repository-level components
  directory. The current boundary is feature-local.
- Do not import NERV source, styles, or dependencies into the future main site, or
  import main-site source into NERV. Publication consumes static artifacts and
  `experiment.json`, not cross-package source imports.
- Do not treat `prototypes/typecho-terminal/terminal/*.php` as production frontend
  source. Its manifest explicitly limits it to reference use.

## Reference Files

- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/error/NotFoundPage.astro`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/experiment.json`
- `prototypes/typecho-terminal/prototype.json`
