# Frontend Development Runtime

## Scenario: Containerized Frontend Commands and Browser Validation

### 1. Scope / Trigger

Use this contract for dependency installation, Astro/Node commands, development
servers, browser validation, publication tooling, or changes to `sam` / `dev.sh`.
It applies to the validator, X Core, semantic, Terminal, assembler, main site,
and NERV.

`./sam` is the single development-command boundary. Host Node, global Playwright,
direct host npm, and raw Docker are not project validation paths.

### 2. Signatures

```bash
./sam <command> [arguments...]
./dev.sh [start|up|down|stop]

WEB_HOST_PORT=4322 ./dev.sh
WEB_HOST_PORT=4322 ./dev.sh down

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm --prefix tooling/validate-experiments ci
./sam npm --prefix tooling/validate-experiments run check
./sam npm --prefix tooling/validate-experiments run test
./sam npm --prefix tooling/validate-experiments run validate -- --root ../..

./sam npm --prefix tooling/assemble-publication ci
./sam npm --prefix tooling/assemble-publication run check
./sam npm --prefix tooling/assemble-publication run test
./sam npm --prefix tooling/assemble-publication run build

./sam npm --prefix packages/x-core ci
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build

./sam npm --prefix presentations/semantic ci
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build

./sam npm --prefix presentations/terminal ci
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

./sam npm run check:m5
./sam npm run test:m5
./sam npm run build:m5
./sam npm run publication:m5
./package-runtime.sh
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
| `F1REFLY_CONTENT_ROOT` | Optional absolute readable posts workspace; defaults to `<repo>/content/posts`. `sam` resolves and passes it into the container. |
| Repository mount | `/app` with caller UID/GID; HOME is ignored `/app/.devhome`. |
| Content mounts | Same-path read-only configured root plus recursively discovered link hops/targets only; never `/`, a broad home/system ancestor, or repository ancestor. |
| Root development entry | `dev.sh start` validates M5 dependency binaries, materializes the configured workspace, builds a fresh complete M5 publication, then serves unchanged root `dist/` at `/`, including nested content, `/lab/`, and NERV. It is restart-to-refresh, not hot reload. |
| Package-local development | `npm run dev:nerv` is the autonomous NERV hot-development entry at `/lab/nerv/`; it must not be presented as the root publication because its Astro base does not own `/` or `/lab/`. |
| Package boundary | Validator, X Core, semantic, Terminal, assembler, site, and NERV use separate manifests, lockfiles, tests, and artifacts; root is not a workspace. |
| M5 dependency order | Plan content mounts before Docker; materialize before every site collection command. Build validator and validate manifests first; then X Core, semantic, Terminal, assembler, site, declared Experiments, and fresh assembly. |
| Runtime packaging | `package-runtime.sh` runs the M5 build, requires exact manifest/release equality, creates a minimal context containing only Dockerfile/Nginx/release, then probes the non-root read-only image and tears down its exact labeled container. |
| Main-site browser server | Run the site build/static scan first. Playwright owns `astro preview` of that same `dist/` at `/`; `start:e2e` must not rebuild or run `astro dev`. |
| NERV browser server | Playwright owns Astro at `/lab/nerv/`. |
| Publication browser server | Build/assemble first; assembler Playwright owns a static server for unchanged root `dist/`. |
| Browser artifacts | Each package writes ignored `playwright-report/` and `test-results/` below its own root. |

`sam` retains `docker run --rm --init`, UID/GID mapping, repository-local HOME,
exact `sam.*` labels, TTY detection, and child exit behavior.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| no wrapped command | usage to stderr; exit `2` before Docker |
| invalid/broad/unreadable content root or broken/cyclic/special link target | fail before Docker; do not broaden mounts |
| missing host dependency | name dependency; exit `127` |
| invalid/empty `SAM_IPC` | accepted values to stderr; exit `2` before Docker |
| unsupported `SAM_SERVICE` | fail before publishing a port |
| wrapped command fails | preserve output and exit code |
| `dev.sh down` finds no labeled container | report none and succeed |
| a required M5 package binary is missing | fail before building and name the locked install delegate as recovery |
| root publication build fails | preserve the wrapped failure, do not start the web service, and allow exact `sam.scope=dev.sh` cleanup |
| a developer expects source hot reload from `dev.sh` | restart `dev.sh` to rebuild the immutable snapshot, or use the explicit package-local development command when only that package is in scope |
| dependency/image Playwright versions differ | browser validation unavailable until aligned |
| browser image/server/fixture cannot start | record exact unavailable error; never report pass |
| browser assertion fails | preserve report/screenshot/trace and review PRD before changing code/test |
| site `dist/` is missing or stale before Playwright | run the complete site build/static-output gate; do not make `start:e2e` mutate the artifact under test |
| manifest validation fails | stop before every product build; do not run a direct NERV/Docker build shortcut |
| publication candidate validation/promotion fails | preserve prior `artifacts/` and `dist/`, clean only current contained candidates, and report the exact phase |
| runtime manifest, release, or image inventory differs | fail packaging; do not report/deploy the image |
| presentation isolation differs under `astro dev` | treat dev output as non-evidence; inspect the static build through `astro preview` |
| negative Astro build uses `/tmp` output on another filesystem | do not use it; Astro staging rename can fail with `EXDEV`; use ignored same-filesystem `apps/site/test-results/` directories and `finally` cleanup |

Locked Astro dev graph traversal can load semantic `?url` CSS on a Terminal route
even when the production static graph is isolated. Main-site browser validation
therefore previews a previously checked build. Keep `reuseExistingServer: false`
so Playwright owns and terminates that preview process.

### 5. Good / Base / Bad Cases

- Good: the site build/static scan passes, then focused Playwright uses the
  matching Noble image, host IPC, and an owned preview of the unchanged artifact.
- Good: `F1REFLY_CONTENT_ROOT=/absolute/notebook WEB_HOST_PORT=4322 ./dev.sh`
  uses exact read-only content mounts, rebuilds the M5 release, and the same
  loopback origin returns `200` for `/`, `/lab/`, and `/lab/nerv/`; the matching
  `down` command stops only the exact repository/scope containers.
- Base: site or NERV check/build uses plain `./sam`, private IPC, no published
  port, UID mapping, and repository-local HOME.
- Bad: Alpine Playwright, mismatched image/package, host npm, raw Docker,
  `astro dev`, build-inside-`start:e2e`, `reuseExistingServer: true`, an unmanaged
  server, or broad command approval.
- Bad: root `dev.sh` launches only NERV's package-local Astro server. The
  `/lab/nerv` base may work, but `/` and `/lab/` are outside that application and
  cannot satisfy the root publication contract.
- Bad: mounting `$HOME`, `/`, or a broad ancestor so an authored link happens to
  resolve, or building a runtime image from a stale/unmanifested site `dist/`.

### 6. Tests Required

For a package change, install from its lockfile and run its package-local checks.
For X Core/presentation/site changes, validate in dependency order and refresh
the consumer through a clean site install before integration/browser evidence.
For cross-package boundary changes, check/build every affected package plus NERV
isolation. For browser-visible behavior, run the exact focused command before the
full suite and record projects, JavaScript mode, routes/states, fixtures, results,
and failure artifacts.

When `sam`, `dev.sh`, or runtime packaging changes:

```bash
bash -n sam dev.sh package-runtime.sh
shellcheck sam dev.sh package-runtime.sh
shfmt -d sam dev.sh package-runtime.sh
./sam node --version
WEB_HOST_PORT=4322 ./dev.sh
# From another shell: assert 200 and expected titles/links at /, /lab/, /lab/nerv/.
WEB_HOST_PORT=4322 ./dev.sh down
./dev.sh down
```

Verify invalid IPC cases, executable modes, ignored `.devhome/`, and no stale
`hako` / `HAKO_*` reference. For the root development entry, also verify the
exact `sam.repo`, `sam.scope=dev.sh`, and `sam.service=web` labels, loopback-only
port mapping, closed port after teardown, and zero matching containers.
For workspace changes, also prove chained file/directory mounts are read-only,
broad/broken/FIFO inputs fail, the generated stage has zero symlinks, and host
paths/private sentinels do not enter output. For packaging, compare the manifest,
release, and image inventories exactly before route/header probes.

### 7. Wrong vs Correct

#### Wrong

```bash
docker run --rm node:22-alpine npm --prefix apps/site run check
./sam npx playwright test
SAM_IPC= ./sam npm --prefix apps/site run test:e2e
WEB_HOST_PORT=4322 ./sam npm --prefix experiments/nerv run start -- --host 0.0.0.0 --port 4321
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
WEB_HOST_PORT=4322 ./dev.sh
./package-runtime.sh

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
```

```ts
webServer: {
  command: 'npm run start:e2e -- --host 0.0.0.0 --port 4321',
  reuseExistingServer: false
}
```

With `"start:e2e": "astro preview"` and a prior successful build, this preserves
the wrapper boundary, package/image match, immutable artifact under test, owned
server lifecycle, and reproducible evidence.
