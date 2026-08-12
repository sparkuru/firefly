# Frontend Development Runtime

## Scenario: Containerized Frontend Commands and Browser Validation

### 1. Scope / Trigger

Use this contract for dependency installation, Astro/Node commands, development
servers, browser validation, or changes to `sam` / `dev.sh`. It applies to X Core,
semantic, the main site, and NERV.

`./sam` is the single development-command boundary. Host Node, global Playwright,
direct host npm, and raw Docker are not project validation paths.

### 2. Signatures

```bash
./sam <command> [arguments...]
./dev.sh [start|up|down|stop]

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm --prefix packages/x-core ci
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build

./sam npm --prefix presentations/semantic ci
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
```

Browser signatures are recorded in the single Playwright profile in `index.md`.
Root npm scripts are delegators and are valid only when already invoked inside
`./sam` with the appropriate image.

### 3. Contracts

| Input / boundary | Contract |
| --- | --- |
| `SAM_IMAGE` | Defaults to `node:22-alpine`. Browser runs use `mcr.microsoft.com/playwright:v1.62.0-noble`. |
| `SAM_IPC` | Unset means `private`; accepted values are exactly `private` and `host`. Browser runs use `host`; explicit empty is invalid. |
| `SAM_BIND_HOST` | Service host binding, default `127.0.0.1`; do not broaden without an explicit LAN requirement. |
| `WEB_HOST_PORT` / `WEB_CONTAINER_PORT` | `dev.sh` mapping, both default `4321`; adjust host port for parallel services. |
| `SAM_SCOPE` / `SAM_SERVICE` | Wrapper labels; service is empty or `web`. `dev.sh` uses scope `dev.sh` and service `web`. |
| Repository mount | `/app` with caller UID/GID; HOME is ignored `/app/.devhome`. |
| Package boundary | X Core, semantic, site, and NERV use separate manifests, lockfiles, tests, and artifacts; root is not a workspace. |
| M2 dependency order | Build X Core, then semantic, then clean-install/build the site so `file:` dependency copies are current. |
| Main-site browser server | Playwright owns a foreground Astro server at `/`; set `ASTRO_DEV_BACKGROUND=0` and pass `--ignore-lock`. |
| NERV browser server | Playwright owns Astro at `/lab/nerv/`. |
| Browser artifacts | Each package writes ignored `playwright-report/` and `test-results/` below its own root. |

`sam` retains `docker run --rm --init`, UID/GID mapping, repository-local HOME,
exact `sam.*` labels, TTY detection, and child exit behavior.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| no wrapped command | usage to stderr; exit `2` before Docker |
| missing host dependency | name dependency; exit `127` |
| invalid/empty `SAM_IPC` | accepted values to stderr; exit `2` before Docker |
| unsupported `SAM_SERVICE` | fail before publishing a port |
| wrapped command fails | preserve output and exit code |
| `dev.sh down` finds no labeled container | report none and succeed |
| dependency/image Playwright versions differ | browser validation unavailable until aligned |
| browser image/server/fixture cannot start | record exact unavailable error; never report pass |
| browser assertion fails | preserve report/screenshot/trace and review PRD before changing code/test |
| Astro 7 server auto-backgrounds under an agent | force `ASTRO_DEV_BACKGROUND=0`; use Playwright-owned foreground server |
| stale Astro dev lock affects the site server | use `--ignore-lock`, ensure the owned process exits, and assert `.astro/dev.json` is absent afterward |
| negative Astro build uses `/tmp` output on another filesystem | do not use it; Astro staging rename can fail with `EXDEV`; use ignored same-filesystem `apps/site/test-results/` directories and `finally` cleanup |

Astro 7 agent detection can background `astro dev`, allowing Playwright's parent
process to exit while the server and `.astro/dev.json` remain. The foreground
environment plus lock option is required for the site Playwright config; do not
solve this by reusing an unmanaged server.

### 5. Good / Base / Bad Cases

- Good: focused site Playwright uses the matching Noble image, host IPC,
  JavaScript-disabled projects, and a foreground lock-free Astro server.
- Base: site or NERV check/build uses plain `./sam`, private IPC, no published
  port, UID mapping, and repository-local HOME.
- Bad: Alpine Playwright, mismatched image/package, host npm, raw Docker,
  `reuseExistingServer: true`, an unmanaged background Astro process, or broad
  command approval.

### 6. Tests Required

For a package change, install from its lockfile and run its package-local checks.
For X Core/semantic/site changes, validate in dependency order and refresh the
consumer through a clean site install before integration/browser evidence. For
cross-package boundary changes, check/build every affected package plus NERV
isolation. For browser-visible behavior, run the exact focused command before the
full suite and record projects, JavaScript mode, routes/states, fixtures, results,
and failure artifacts.

For site Playwright, also assert no `.astro/dev.json` remains after the final run.

When `sam` or `dev.sh` changes:

```bash
bash -n sam dev.sh
shellcheck sam dev.sh
shfmt -d sam dev.sh
./sam node --version
./dev.sh down
```

Verify invalid IPC cases, executable modes, ignored `.devhome/`, and no stale
`hako` / `HAKO_*` reference.

### 7. Wrong vs Correct

#### Wrong

```bash
docker run --rm node:22-alpine npm --prefix apps/site run check
./sam npx playwright test
SAM_IPC= ./sam npm --prefix apps/site run test:e2e
```

```ts
webServer: {
  command: 'astro dev',
  reuseExistingServer: true
}
```

#### Correct

```bash
./sam npm --prefix apps/site run check

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
```

```ts
webServer: {
  command: 'npm run start -- --host 0.0.0.0 --port 4321 --ignore-lock',
  env: { ASTRO_DEV_BACKGROUND: '0' },
  reuseExistingServer: false
}
```

This preserves the wrapper boundary, package/image match, owned server lifecycle,
and reproducible artifacts.
