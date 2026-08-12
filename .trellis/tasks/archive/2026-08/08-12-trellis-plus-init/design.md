# Trellis Plus Initialization Design

## Overview

This task is one coherent repository bootstrap rather than a parent/child task tree. The workflow text, validation profile, Docker wrapper, Playwright setup, and project-local UUPM entry point jointly establish one future-task contract and must be reviewed together.

The design extends the installed Trellis system. It does not introduce a second scheduler, task schema, state, or product roadmap.

## Durable Boundaries

### Trellis workflow

Patch `.trellis/workflow.md` additively:

- extend both `planning` breadcrumbs with the UUPM initialization/design-research decision for UI tasks;
- extend both `in_progress` breadcrumbs with Docker readiness, UUPM context, Playwright evidence, and submit-ready review routing;
- extend `no_task` with a read-only Project Pulse that defaults to guided mode and never creates work without authority;
- add compact phase-level Trellis Plus sections so the full behavior is readable outside prompt injection;
- add the human-review classifier and selective Codex completion-summary/trailer rule before the Phase 3.4 commit commands.

Existing status names, required-once enforcement, sub-agent dispatch, task activation, commit confirmation, archive behavior, and `completed` caveat remain unchanged.

`.trellis/workflow.md` is listed in `.trellis/.template-hashes.json`, so the injected blocks are update-sensitive project customizations. No backup recovery is available. Future `trellis update` conflicts must be resolved by reapplying the blocks to the updated workflow, never by restoring this whole file wholesale or adding it to `update.skip` by default.

### Frontend specification

Append two English sections to `.trellis/spec/frontend/index.md` without filling or rewriting the placeholder guideline files owned by `00-bootstrap-guidelines`:

1. `Trellis Plus: Project Validation Profile` records required Astro check/build commands, shell checks when wrappers change, optional deployment checks, human-only residuals, and unavailable-check handling.
2. `Trellis Plus: Playwright Validation Profile` records the Docker-wrapper execution mode, pinned dependency/image, app readiness, exact focused/full commands, config/test locations, desktop/mobile Chromium projects, fixture boundary, accessibility and visual policies, and failure artifacts.

Future tasks read the profile before rediscovering commands or consulting external documentation. Task-specific results belong in task check evidence rather than the project profile.

## Docker Development Contract

Complete the user-intended wrapper rename by moving the existing root `hako` file to `sam` and keeping `dev.sh`. The implementation already uses the intended identity, so preserve it consistently:

- executable references: `./sam`;
- environment variables: `SAM_IMAGE`, `SAM_IPC`, `SAM_BIND_HOST`, `SAM_SCOPE`, and `SAM_SERVICE`;
- labels and logs: `sam.repo`, `sam.scope`, `sam.service`, and `[sam ...]`.

Retain UID/GID mapping, repository mount, `.devhome`, noninteractive TTY detection, configurable host/container ports, `--rm`, `--init`, and exact-label teardown. `SAM_IPC` defaults to Docker's private mode; only the documented Playwright command sets it to `host`. Reject unsupported or empty-dangerous IPC values rather than constructing raw shell fragments.

Do not create `.codex/rules/default.rules`. The maintained `dev-it-in-docker` contract allows a user-selected wrapper name and treats Codex authorization as session-scoped approval for the `./sam` prefix. No rule may broadly allow raw `docker`, `bash`, `sh`, npm, or another package manager.

## Playwright Architecture

Install the exact development dependency `@playwright/test@1.62.0` in `experiments/nerv/` and update its existing npm lockfile. Add:

- `experiments/nerv/playwright.config.ts`;
- `experiments/nerv/tests/nerv.spec.ts`;
- an experiment-local `test:e2e` script and a root delegating script;
- ignore entries for Playwright reports and test results.

The Playwright command runs in `mcr.microsoft.com/playwright:v1.62.0-noble` through `sam`. The image supplies browsers and system libraries; the lockfile supplies the matching test package. No global browser installation is required.

The config starts Astro through Playwright `webServer` inside the same ephemeral container:

```text
npm run start -- --host 0.0.0.0 --port 4321
        -> readiness/base URL http://127.0.0.1:4321/lab/nerv/
        -> tests/nerv.spec.ts
        -> chromium-desktop and chromium-mobile
```

The test uses deterministic repository content only. It checks semantic load, the page title and main emergency-notice heading, and the absence of viewport-width overflow at desktop and narrow-mobile sizes. No production account, mutable fixture, external request, visual snapshot, or personal session is introduced.

Failure evidence is written under the experiment's `playwright-report/` and `test-results/` directories, including trace and configured diagnostic screenshots. Passing tests do not create or update visual baselines.

## UUPM Integration

Run the installed `uipro 2.10.2` command as `uipro init --ai codex`. Do not use `--force`, `--global`, or `--ai all`.

After initialization:

1. inspect generated paths and preserve unrelated `.codex/` content;
2. read `.codex/skills/ui-ux-pro-max/SKILL.md` completely;
3. verify every required local script/data path from that skill;
4. run the cheapest documented help check, normally `python3 .../scripts/search.py --help`;
5. leave generated assistant-local files ignored/untracked unless the user later requests tracking.

This task does not redesign UI, so it does not generate task-specific UUPM design output. The workflow integration instead requires future UI tasks to create task research, promote approved choices into `design.md`, inject them into implement/check context, and update only stable design rules into project specs.

## Mainline Continuity

Only the conservative workflow behavior is installed. `.trellis/mainline.md` remains absent because no initiative title, objective, ordered child list, or serial authorization was approved.

With no record, a relevant no-task Project Pulse reports the missing authority and asks for one product-priority decision. Guided mode recommends but does not create or implement. Serial mode is accepted only when a future control record contains explicit bounded authorization and stop conditions.

## Compatibility and Rollback

- Removing the titled Trellis Plus blocks restores the previous workflow behavior.
- Removing the appended frontend profiles restores the previous placeholder index.
- The `hako` -> `sam` file rename and `dev.sh` contract are coordinated; rolling back only one side would recreate the current broken path, so they roll back together.
- Playwright adoption is isolated to the NERV experiment and root delegation. Reverting its dependency, lockfile, config, test, scripts, and ignore entries removes browser validation without affecting production output.
- UUPM initialization is assistant-local and ignored; removal does not change application runtime.

## Key Trade-offs

- Chromium-only desktop/mobile coverage establishes a fast deterministic baseline. Cross-engine coverage is deferred until a product requirement or recurring compatibility risk justifies it.
- Semantic/responsive assertions are stable enough for automation. Pixel snapshots are excluded because no reproducible baseline-review environment exists.
- A single integrated task is preferable here because each enhancement changes the meaning of the shared submit-ready flow; splitting would duplicate cross-component validation and approval gates.
