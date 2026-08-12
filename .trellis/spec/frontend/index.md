# Frontend Development Guidelines

> Best practices for frontend development in this project.

---

## Overview

This directory contains guidelines for frontend development. Fill in each file with your project's specific conventions.

---

## Guidelines Index

| Guide | Description | Status |
|-------|-------------|--------|
| [Directory Structure](./directory-structure.md) | Module organization and file layout | To fill |
| [Component Guidelines](./component-guidelines.md) | Component patterns, props, composition | To fill |
| [Hook Guidelines](./hook-guidelines.md) | Custom hooks, data fetching patterns | To fill |
| [State Management](./state-management.md) | Local state, global state, server state | To fill |
| [Quality Guidelines](./quality-guidelines.md) | Code standards, forbidden patterns | To fill |
| [Type Safety](./type-safety.md) | Type patterns, validation | To fill |
| [Development Runtime](./development-runtime.md) | Containerized command, service, and browser-validation contracts | Active |

---

## How to Fill These Guidelines

For each guideline file:

1. Document your project's **actual conventions** (not ideals)
2. Include **code examples** from your codebase
3. List **forbidden patterns** and why
4. Add **common mistakes** your team has made

The goal is to help AI assistants and new team members understand how YOUR project works.

---

**Language**: All documentation should be written in **English**.

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
