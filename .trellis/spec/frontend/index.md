# Frontend Development Guidelines

## Scope and Evidence Baseline

The repository has two runnable Astro applications, three build-time frontend
packages, and two publication tooling packages:

- `packages/x-core/`: private framework-neutral AST, registry, metadata, JSON,
  and diagnostic contract.
- `presentations/semantic/`: private semantic adapter consumed by the main site.
- `presentations/terminal/`: private Terminal adapter plus a framework-neutral,
  side-effect-free browser runtime subpath.
- `apps/site/`: Astro 7 main site. It safely materializes a configurable nested
  posts workspace, guest-projects canonical content, resolves X Core context,
  dispatches whole-document presentations, and emits Terminal home/document,
  semantic, and directory HTML.
- `experiments/nerv/`: autonomous Astro 4 experiment mounted at `/lab/nerv/`.
- `tooling/validate-experiments/`: strict repository-controlled manifest decoder,
  deterministic discovery, and safe public-catalog projection.
- `tooling/assemble-publication/`: declared Experiment build orchestration,
  static artifact validation, coordinated staging/release promotion, and
  assembled-publication browser evidence.

All seven own separate manifests, lockfiles, tests, and build artifacts. The
approved dependency direction is X Core → semantic/Terminal → site; the two
presentation packages do not import one another. The validator is build-only
input to the site and assembler; the assembler depends on the validator; NERV
imports none of them. The root is a command delegate, not an npm workspace.

All files in this directory are written in English and cite implemented paths.

## Guidelines Index

| Guide | Description | Status |
| --- | --- | --- |
| [Directory Structure](./directory-structure.md) | Main-site, content, experiment, route, asset, and prototype boundaries | Active |
| [Component Guidelines](./component-guidelines.md) | Astro props, whole-page presentation dispatch, and route-local styling | Active |
| [Client-Side Behavior](./hook-guidelines.md) | Terminal-home enhancement, NERV scripts, and absence of hooks/fetching | Active |
| [State Management](./state-management.md) | Build-time content, props, route-local browser state, and absence of a store | Active |
| [Quality Guidelines](./quality-guidelines.md) | Schema, Astro, static-output, browser, accessibility, and isolation gates | Active |
| [Type Safety](./type-safety.md) | Strict TypeScript, content metadata, and Terminal browser-boundary contracts | Active |
| [Development Runtime](./development-runtime.md) | Container commands, service ownership, browser versions, and failure handling | Active |
| [X Core Contract](./x-core-contract.md) | AST pipeline, presentation registry, diagnostics, JSON metadata, and adapter boundary | Active |
| [Experiment Publication Contract](./publication-contract.md) | Manifest/catalog signatures, build trust, safe artifacts, coordinated promotion, lab/Terminal/Nginx behavior | Active |
| [Content Workspace Contract](./content-workspace-contract.md) | Configured Markdown root, authored symlinks, guest projection, virtual paths, command registry, nested routes, and Vim reader | Active |
| [Site Configuration and SEO Contract](./site-configuration-contract.md) | Public TOML identity, Terminal configuration boundary, document metadata, robots, and sitemap generation | Active |

### Trellis Plus: Project Validation Profile

Use `./sam` for all Node/npm/browser commands. Install each changed package from
its own lockfile, then run its checks:

| Package | Install | Required non-browser checks |
| --- | --- | --- |
| Experiment validator | `./sam npm --prefix tooling/validate-experiments ci` | `run check`, `run test`, `run build`, real manifest `run validate -- --root ../..` |
| X Core | `./sam npm --prefix packages/x-core ci` | `run check`, `run test`, `run build` |
| Semantic adapter | `./sam npm --prefix presentations/semantic ci` | `run check`, `run test`, `run build` |
| Terminal presentation | `./sam npm --prefix presentations/terminal ci` | `run check`, `run test`, `run build` |
| Publication assembler | `./sam npm --prefix tooling/assemble-publication ci` | `run check`, `run test`, `run build` |
| Main site | `./sam npm --prefix apps/site ci` | `run test:content`, `run test:x-core`, `run check`, `run build` |
| NERV | `./sam npm --prefix experiments/nerv ci` | `run check`, `run build` |

- For the main publication, materialize the configured content workspace before every site
  collection command. Build the validator and validate every manifest before the M3 graph,
  assembler/site, declared Experiment builds, and assembly. A clean site install
  follows rebuilt local `file:` packages, including the validator.
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
- Version pair: the main site and NERV pin `@playwright/test@1.62.0`; browser commands use
  `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble` and `SAM_IPC=host`.
- Projects: static Chromium with JavaScript disabled and interactive Chromium
  with JavaScript enabled, each at desktop `1440x900` and mobile `375x812`;
  the interactive mobile project also enables touch.
- Main site:
  - config/tests: `apps/site/playwright.config.ts`, `apps/site/tests/site.spec.ts`,
    `apps/site/tests/terminal.spec.ts`, and `apps/site/tests/reader.spec.ts`;
  - build first, then let Playwright own `astro preview` at
    `http://127.0.0.1:4321/`; do not use `astro dev` for route-style isolation;
  - focused static: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts`;
  - focused interactive: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts`;
  - focused reader: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts`;
  - full: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e`;
  - static coverage: native home links/fallback, semantic and Terminal documents,
    post/page/fragment deep links, 404, sequential headings, exact outline links,
    keyboard-focusable local code/table scrolling, draft absence, visible focus,
    and no document overflow;
  - interactive coverage: prompt-only startup, deterministic commands/errors,
    manifest-backed `ls lab` / `open lab/<id>`, history/draft restoration,
    safe unique/ambiguous path completion with prefix preservation, prompt-wide
    Tab prevention and native outside-prompt traversal, prompt Ctrl+C cancellation, IME-safe and mobile
    soft-keyboard Enter submission, inline `cat` with unchanged URL,
    record-start/document viewport settlement, safe printable typing with native/
    ARIA widget and local-scroll exclusions, actual 400/500 font loading,
    repeated-clone ID/reference scoping, nested tree/cat/vim paths, canonical
    document/directory routes, breadcrumb navigation, and the read-only Vim
    reader's movement/search/selection/exit/native-key boundaries,
    clear-to-fresh-prompt behavior, validated native links, latest-only
    announcements, reduced motion, responsive containment, and early/late
    failure recovery.
- NERV:
  - config/test: `experiments/nerv/playwright.config.ts`,
    `experiments/nerv/tests/nerv.spec.ts`;
  - readiness/base: `http://127.0.0.1:4321/lab/nerv/`;
  - focused: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts`;
  - full: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e`;
  - coverage: title, main/heading semantics, mounted favicon/logo, no overflow,
    reduced motion, three-click native return, and independent mounted 404.
- Assembled publication:
  - config/test: `tooling/assemble-publication/playwright.config.ts` and
    `tooling/assemble-publication/tests/publication.spec.ts`;
  - build/assemble first, then serve immutable root `dist/` at
    `http://127.0.0.1:4321/`;
  - full: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix tooling/assemble-publication run test:e2e`;
  - coverage: cross-application navigation, mounted assets, distinct 404
    ownership, native return, overflow, and reduced-motion behavior.
- Fixtures are repository-local static content. Do not add credentials, production
  data, remote services, storage state, or mutable mocks without a new contract.
- Prefer roles, accessible names, and visible-state assertions. No automated
  accessibility scanner or approved screenshot baseline exists; screenshots are
  diagnostic-only.
- Failure reports/traces/screenshots stay in each package's ignored
  `playwright-report/` and `test-results/` directories. Reports never auto-open,
  screenshots are failure-only, and traces start on first retry.
