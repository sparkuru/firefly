# Frontend Development Guidelines

## Scope and Evidence Baseline

The repository has two runnable Astro applications plus two build-time frontend
packages:

- `packages/x-core/`: private framework-neutral AST, registry, metadata, JSON,
  and diagnostic contract.
- `presentations/semantic/`: private semantic adapter consumed by the main site.
- `apps/site/`: Astro 7 main site. It loads repository-root Markdown, resolves
  X Core context, and emits semantic static article/page HTML.
- `experiments/nerv/`: autonomous Astro 4 experiment mounted at `/lab/nerv/`.

All four own separate manifests, lockfiles, tests, and build artifacts. The
approved dependency direction is X Core → semantic → site; NERV imports none of
them. The root is a command delegate, not an npm workspace.

All files in this directory are written in English and cite implemented paths.

## Guidelines Index

| Guide | Description | Status |
| --- | --- | --- |
| [Directory Structure](./directory-structure.md) | Main-site, content, experiment, route, asset, and prototype boundaries | Active |
| [Component Guidelines](./component-guidelines.md) | Astro props, layouts, semantic composition, and package-local styling | Active |
| [Client-Side Behavior](./hook-guidelines.md) | Static site boundary, NERV route scripts, and absence of hooks/fetching | Active |
| [State Management](./state-management.md) | Build-time content, props, route-local browser state, and absence of a store | Active |
| [Quality Guidelines](./quality-guidelines.md) | Schema, Astro, static-output, browser, accessibility, and isolation gates | Active |
| [Type Safety](./type-safety.md) | Strict TypeScript and the executable content-metadata contract | Active |
| [Development Runtime](./development-runtime.md) | Container commands, service ownership, browser versions, and failure handling | Active |
| [X Core Contract](./x-core-contract.md) | AST pipeline, presentation registry, diagnostics, JSON metadata, and adapter boundary | Active |

### Trellis Plus: Project Validation Profile

Use `./sam` for all Node/npm/browser commands. Install each changed package from
its own lockfile, then run its checks:

| Package | Install | Required non-browser checks |
| --- | --- | --- |
| X Core | `./sam npm --prefix packages/x-core ci` | `run check`, `run test`, `run build` |
| Semantic adapter | `./sam npm --prefix presentations/semantic ci` | `run check`, `run test`, `run build` |
| Main site | `./sam npm --prefix apps/site ci` | `run test:content`, `run test:x-core`, `run check`, `run build` |
| NERV | `./sam npm --prefix experiments/nerv ci` | `run check`, `run build` |

- Build/install changed M2 packages in dependency order: X Core, semantic, site.
- A main-site content or route change must inspect emitted files, draft exclusion,
  and relevant negative content-contract behavior in addition to a successful
  build.
- A package-boundary change must check/build both packages and verify no
  cross-package source, style, config, or dependency import.
- When `sam` or `dev.sh` changes, run `bash -n`, ShellCheck, shfmt, wrapper Node,
  and safe teardown checks from `development-runtime.md`.
- Deployment-only checks do not substitute for package-local Astro or Playwright
  evidence.
- Classify a material unavailable command as unavailable with its exact error;
  never count it as passed.
- Human-only residuals are subjective visual judgment, real devices, assistive
  technology, or private deployment environments. Do not request a generic smoke
  test after applicable automation passes.

### Trellis Plus: Playwright Validation Profile

- Execution boundary: the executable root `./sam`; no host Node, global
  Playwright, or raw-Docker test path.
- Version pair: both packages pin `@playwright/test@1.62.0`; browser commands use
  `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble` and `SAM_IPC=host`.
- Projects: Chromium desktop `1440x900` and mobile `375x812`.
- Main site:
  - config/test: `apps/site/playwright.config.ts`, `apps/site/tests/site.spec.ts`;
  - readiness/base: Astro on `http://127.0.0.1:4321/`;
  - server contract: foreground `ASTRO_DEV_BACKGROUND=0` plus `--ignore-lock`;
  - browser JavaScript is disabled to prove the static reading contract;
  - focused: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts`;
  - full: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e`;
  - baseline coverage: home, generated post/page and fragment deep links,
    unknown-route 404, semantic heading order, conditional outline links,
    keyboard-focusable local code/table scrolling, draft absence, visible skip
    and interaction focus, and no document overflow.
- NERV:
  - config/test: `experiments/nerv/playwright.config.ts`,
    `experiments/nerv/tests/nerv.spec.ts`;
  - readiness/base: `http://127.0.0.1:4321/lab/nerv/`;
  - focused: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts`;
  - full: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e`;
  - baseline coverage: title, main/heading semantics, and no overflow.
- Fixtures are repository-local static content. Do not add credentials, production
  data, remote services, storage state, or mutable mocks without a new contract.
- Prefer roles, accessible names, and visible-state assertions. No automated
  accessibility scanner or approved screenshot baseline exists; screenshots are
  diagnostic-only.
- Failure reports/traces/screenshots stay in each package's ignored
  `playwright-report/` and `test-results/` directories. Reports never auto-open,
  screenshots are failure-only, and traces start on first retry.
