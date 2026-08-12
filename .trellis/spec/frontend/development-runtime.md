# Frontend Development Runtime

## Scenario: Containerized Frontend Commands and Browser Validation

### 1. Scope / Trigger

Use this contract whenever a task installs dependencies, runs Astro commands, starts the NERV development server, changes `sam` or `dev.sh`, or validates browser-accessible behavior.

The repository uses `./sam` as its single development-command boundary. Host Node, global Playwright, and direct package-manager commands are not the project validation contract. Raw `docker` remains an implementation detail of the wrapper and is not an agent allow target.

### 2. Signatures

```bash
./sam <command> [arguments...]
./dev.sh [start|up|down|stop]

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e
```

The root `npm run test:e2e:nerv` delegates to the experiment only when the caller is already inside the pinned Playwright `./sam` environment.

### 3. Contracts

| Input / boundary | Contract |
| --- | --- |
| `SAM_IMAGE` | Optional image override. Defaults to `node:22-alpine`. Browser tests must use `mcr.microsoft.com/playwright:v1.62.0-noble`, matching the lockfile-pinned `@playwright/test@1.62.0`. |
| `SAM_IPC` | Optional Docker IPC mode. Unset defaults to `private`; accepted values are exactly `private` and `host`. Browser tests set `host`; ordinary commands retain `private`. An explicitly empty value is invalid. |
| `SAM_BIND_HOST` | Optional service bind address, default `127.0.0.1`. Do not broaden it to `0.0.0.0` unless LAN access is an explicit requirement. |
| `WEB_HOST_PORT` | Optional host port for `dev.sh`, default `4321`; change this for parallel agents. |
| `WEB_CONTAINER_PORT` | Astro container port, default `4321`; it must match the port passed to Astro. |
| `SAM_SCOPE` / `SAM_SERVICE` | Wrapper-internal label inputs. `dev.sh` uses scope `dev.sh` and service `web`; manual commands default to an empty service and publish no port. |
| Repository mount | The repository is mounted at `/app` with the caller's UID/GID. Container HOME is `/app/.devhome`, which must remain ignored. |
| Service lifecycle | `dev.sh` calls `./sam`; `down` selects containers by both `sam.repo=<absolute repo path>` and `sam.scope=dev.sh`. It never stops processes by port or a broad name match. |
| Browser readiness | Playwright starts Astro inside its own container and waits for `http://127.0.0.1:4321/lab/nerv/`, which is also the test `baseURL`. |
| Browser artifacts | HTML report: `experiments/nerv/playwright-report/`. Test output, failure screenshots, and retry traces: `experiments/nerv/test-results/`. Both remain ignored. |

`sam` must retain `docker run --rm --init`, UID/GID mapping, repository-local HOME, exact `sam.*` labels, noninteractive TTY detection, and child-command exit behavior.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| `./sam` receives no command | Print usage to stderr and exit `2` before running Docker. |
| Required host command is missing | Print the missing command and exit `127`. |
| `SAM_IPC` is empty or not `private|host` | Print the accepted values and exit `2`; do not construct the Docker command. |
| `SAM_SERVICE` is neither empty nor `web` | Print the unsupported service and exit `2`; do not publish a port. |
| Wrapped command fails | Preserve its stdout/stderr and exit code through `exec`; do not reinterpret a failure as success. |
| `dev.sh start` cannot find executable `./sam` or installed Astro | Fail before starting a service and print the exact recovery command. |
| `dev.sh down` finds no matching container | Report that no dev containers exist and return success. |
| Playwright dependency and image versions differ | Treat browser validation as unavailable; align the pinned package and image before rerunning. |
| Image, browser, fixture, or service cannot start | Record the exact command/error as `playwright-unavailable`; never report a pass or replace it with a generic visual smoke test. |
| A browser assertion fails | Preserve HTML report, screenshot, and retry trace; compare the failure with the task PRD before changing code or assertions. |

### 5. Good / Base / Bad Cases

- Good: run the focused NERV test with the version-matched Noble image and `SAM_IPC=host`; both desktop and narrow-mobile projects execute against repository-local static content.
- Base: run Astro check or build with plain `./sam`; it uses `node:22-alpine`, private IPC, no published port, UID mapping, and `.devhome`.
- Bad: run Playwright in the Alpine default image, use mismatched package/image versions, call raw Docker as the normal workflow, or broaden agent approval to `docker`, `bash`, `sh`, or npm.

### 6. Tests Required

When `sam` or `dev.sh` changes, assert:

```bash
bash -n sam dev.sh
shellcheck sam dev.sh
shfmt -d sam dev.sh
./sam node --version
./dev.sh down
```

Also verify that empty and unsupported `SAM_IPC` values exit `2` before Docker execution, both scripts remain executable, `.devhome/` is ignored, and no stale `hako` / `HAKO_*` reference remains.

For frontend changes, run Astro check and build. For browser-accessible behavior, run the focused Playwright command before the full command. Assert the changed route, states, interactions, semantic names, and relevant desktop/mobile viewports. Task check evidence must record the exact commands, projects, fixtures, result, artifact paths on failure, and residual human-only risk.

### 7. Wrong vs Correct

#### Wrong

```bash
docker run --rm node:22-alpine npm --prefix experiments/nerv run check
./sam npx playwright test
SAM_IPC= ./sam npm --prefix experiments/nerv run test:e2e
```

These bypass the repository contract, use an image without the pinned browsers, or supply an invalid IPC boundary.

#### Correct

```bash
./sam npm --prefix experiments/nerv run check

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts
```

This keeps the wrapper as the approval and runtime boundary and keeps the Playwright package, browser image, IPC mode, and artifact policy reproducible.
