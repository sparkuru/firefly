# Frontend Development Guidelines

## Scope and Evidence Baseline

These guides describe the frontend that exists now: the autonomous Astro 4 NERV
experiment under `experiments/nerv/`, its containerized development boundary, and
its Playwright coverage. They do not promote the future Astro 7 main-site design in
root `prd.md` to an implemented convention.

`prototypes/typecho-terminal/` is explicitly `reference-only`. Use its behavior and
visual tokens as product research when a task requests that work; do not treat its
PHP templates or JavaScript architecture as current production frontend code.

All files in this directory are written in English and should continue to cite real
repository paths when the implementation evolves.

## Guidelines Index

| Guide | Description | Status |
| --- | --- | --- |
| [Directory Structure](./directory-structure.md) | Autonomous experiment, route, layout, module, asset, and prototype boundaries | Active |
| [Component Guidelines](./component-guidelines.md) | Astro component shape, local props, composition, scoped styles, and markup baseline | Active |
| [Client-Side Behavior](./hook-guidelines.md) | Framework-free route scripts and the explicit absence of a hook/data-fetch layer | Active |
| [State Management](./state-management.md) | Static render inputs, route-local state, URL/cookie boundaries, and absence of a store | Active |
| [Quality Guidelines](./quality-guidelines.md) | Astro checks, browser evidence, accessibility boundary, formatting, and review | Active |
| [Type Safety](./type-safety.md) | Strict Astro TypeScript, local prop types, DOM narrowing, and validation limits | Active |
| [Development Runtime](./development-runtime.md) | Containerized command, service, and browser-validation contracts | Active |

### Trellis Plus: Project Validation Profile

Read this profile before rediscovering validation commands. Record task-specific commands and results in the task's check evidence; keep only durable conventions here.

- Install from the lockfile through the repository wrapper: `./sam npm --prefix experiments/nerv ci`.
- Required Astro type/content validation: `./sam npm --prefix experiments/nerv run check`.
- Required production build validation: `./sam npm --prefix experiments/nerv run build`.
- When `sam` or `dev.sh` changes, run `bash -n sam dev.sh`, `shellcheck sam dev.sh`, and `shfmt -d sam dev.sh`, then verify `./sam node --version` and the safe no-service path `./dev.sh down`.
- Browser-accessible behavior follows the Playwright profile below. Run focused coverage before the full browser command.
- Deployment-only changes may additionally require `docker compose -f f1refly.yaml config`, a container build, `/healthz`, root redirect, and static-route checks. These are not substitutes for task-local Astro or Playwright validation.
- Human-only residuals are limited to genuine subjective visual/product judgment, real-device behavior, assistive-technology assessment, or a private deployment environment. Do not request a generic smoke test after focused automation covers the acceptance criteria.
- If a material command cannot run, record the exact command and error, classify the check as unavailable rather than passed, and name the smallest replacement CI or human evidence required.

### Trellis Plus: Playwright Validation Profile

- execution mode: `docker-wrapper` through the executable root `./sam`; do not require host Node, a global Playwright install, or a raw-Docker test path.
- setup/install and image pair: `./sam npm --prefix experiments/nerv ci` installs the lockfile-pinned `@playwright/test@1.62.0`; browser tests set `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble` and `SAM_IPC=host`, so the package and browser image stay version-matched.
- app readiness and base URL: Playwright `webServer` runs `npm run start -- --host 0.0.0.0 --port 4321` from `experiments/nerv/`, waits for `http://127.0.0.1:4321/lab/nerv/`, and uses that URL as `baseURL`.
- focused test command: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts`.
- full browser command: `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e`.
- test location and config: `experiments/nerv/tests/nerv.spec.ts` and `experiments/nerv/playwright.config.ts`; root `npm run test:e2e:nerv` delegates to the experiment when already running inside `./sam` with the pinned Playwright image.
- browser projects and viewports: `chromium-desktop` at `1440x900` and `chromium-mobile` at `375x812`.
- fixtures and test-data boundary: repository-local static NERV content only; no credentials, external services, production data, storage state, route mocks, or mutable fixtures.
- accessibility policy: use semantic roles, accessible heading names, visible-state assertions, and keyboard/focus assertions when changed behavior requires them. No automated accessibility scanner is configured, so do not claim scan coverage.
- visual baseline policy: no screenshot pass/fail baselines. Screenshots are diagnostic-only because no controlled baseline-review environment is established.
- failure artifacts: HTML report at `experiments/nerv/playwright-report/`; output, retry traces, and failure screenshots at `experiments/nerv/test-results/`. Traces are captured on the first retry, reports never auto-open, and both directories are ignored.
- current baseline coverage: `/lab/nerv/` title, semantic main landmark and emergency-notice heading, plus absence of document-width overflow in both projects.
