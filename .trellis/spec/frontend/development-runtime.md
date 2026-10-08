# Frontend Development Runtime

## Current Memo Development Path

New Memo uses the coordinated content build and registered Memo adapter.
Root maintained delegates install/build/check/test `presentations/memo` before
site consumers; historical M2 names delegate to the complete M3 graph. Pinned
integrated fixtures/browser tests exercise the new reader. Active preview and
package require version-2 access and refuse `FIREFLY_MEMOS_CANDIDATE`. Independent
publisher/runtime commands below remain recovery tooling only, and old owner
README command guidance is intentionally pending owner-controlled maintenance.
Use [Memo Documents](./memo-document-contract.md) and the current
[validation profile](../trellis-plus/validation-profile.md) for new work.

## Scenario: Containerized Frontend Commands and Browser Validation

### 1. Scope / Trigger

Use this contract for dependency installation, Astro/Node commands, development
servers, browser validation, publication tooling, or changes to `sam` / `preview.sh`.
It applies to the validator, X Core, semantic, Terminal, assembler, main site,
NERV, private comments checks, and the independent owner Memo publisher.

The unified CLI, root dotenv setup and lifecycle output are maintained in
[Trellis Plus development](../trellis-plus/development.md). Read that profile
before changing these entrypoints; this contract retains the publication and
container isolation boundaries.

`./sam` is the Node/npm/browser development-command boundary. Host Node, global
Playwright, and direct host npm are not project validation paths. Explicit host
Docker fixture and packaging boundaries are described below.

### 2. Signatures

```bash
./sam <command> [arguments...]
./preview.sh [start|dev|preview|build|down|stop|status|verify|package]
./preview.sh render <command> [arguments...]

WEB_HOST_PORT=4322 ./preview.sh
WEB_HOST_PORT=4322 ./preview.sh preview
WEB_HOST_PORT=4322 ./preview.sh down

cp .env.example .env

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./preview.sh render npm --prefix apps/site run check
./preview.sh render npm --prefix apps/site run build

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

./preview.sh render npm run check:m4
./preview.sh render npm run test:m4
./preview.sh render npm run build:m4
./preview.sh render npm run publication:m4
./sam npm run install:m51
./preview.sh verify
FIREFLY_CONTENT_ROOT="$PWD/content" \
  SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm run verify:m51
./preview.sh package
tooling/publish-memos/ops/check-runtime.sh
tooling/plugin-access/check-runtime.sh
SAM_CONTENT_MODE=none ./sam npm run check:plugins-contract
SAM_CONTENT_MODE=none ./sam npm run test:plugins-contract
SAM_CONTENT_MODE=none ./sam npm run check:memos
SAM_CONTENT_MODE=none ./sam npm run test:memos
tooling/publish-memos/publish.sh publish --config <owner-only-json>
```

Browser signatures are recorded in the single Playwright profile in
`../trellis-plus/validation-profile.md`.
Root npm scripts are delegators and are valid only when already invoked inside
`./sam` with the appropriate image. `preview.sh verify` is the host-facing complete
repository-fixture gate; it pins the tracked root before `sam` loads the
optional root `.env`. After the inner gate succeeds, it runs the host-owned
disposable independent Memo publication/static fixture and the four-state plugin
public-access fixture. Its inner `verify:m51` form is for phase-level
diagnosis and is valid only through `./sam`; it does not include that Docker
fixture.

Docker Compose configuration syntax is a host Docker boundary, not a wrapped
Node command. Use `docker compose config --quiet` to validate Compose files;
`./sam docker compose ...` makes the wrapper invoke `docker` as a Node entry
point and is not valid evidence. Do not start services merely to perform this
syntax check.

### 3. Contracts

| Input / boundary | Contract |
| --- | --- |
| `SAM_IMAGE` | Defaults to `node:22-alpine`. Browser runs use `mcr.microsoft.com/playwright:v1.62.0-noble`. `preview.sh render` explicitly selects this image plus host IPC for diagram-bearing site build/check/dev commands and delegates to `sam`. |
| `SAM_IPC` | Unset means `private`; accepted values are exactly `private` and `host`. Browser runs use `host`; explicit empty is invalid. |
| `SAM_BIND_HOST` | Root `.env` supplies the preview host bind; `.env.example` uses `0.0.0.0` for trusted-LAN development. Direct `sam` uses the same file and retains clone-safe defaults without it. |
| `WEB_BIND_HOST` | Root `.env` selects the container listener (`0.0.0.0` or `::`), passed to Astro or the publication server; host publishing remains separate. |
| `WEB_HOST_PORT` / `WEB_CONTAINER_PORT` | `preview.sh` mapping, both default `4321`; adjust host port for parallel services. |
| `SAM_SCOPE` / `SAM_SERVICE` | Wrapper labels; service is empty or `web`. `preview.sh` uses scope `preview.sh` and service `web`. |
| `.env` | Ignored literal root settings loaded by `tooling/shared/dev-env.sh` in both `sam` and `preview.sh`; copy `.env.example`. Explicit environment variables take precedence. The old local `config.dev` is preserved but no longer loaded. |
| `FIREFLY_CONTENT_ROOT` | Optional absolute readable blog root containing `posts/` and `pages/`; it may be set in `.env` and empty/omitted selects `<repo>/content`. `sam` resolves and passes it into the container. |
| `preview.sh verify` / `verify:m51` | Fixes tracked `<repo>/content`, defaults to pinned Playwright Noble and host IPC, runs plugin access/comments/contract/publisher/site/assembler checks and static Memo plus ordinary site/NERV/publication browsers, then host independent-publication and four-state plugin-access Nginx fixtures. Short-circuit on failure; direct host npm is not evidence. |
| `SAM_CONTENT_MODE` | `blog` default discovers existing blog mounts; `none` skips blog, comments export and site override probing for independent publisher commands. Explicit Memo source/assets/history/output/deployment mounts remain narrowly validated. |
| `FIREFLY_MEMOS_CANDIDATE` | Explicit existing validated candidate for combined preview/package; only public bytes enter the static runtime. Missing selected input fails, default blog operation remains independent. |
| `FIREFLY_SITE_CONFIG_PATH` | Optional repository-relative `.toml` override for contained build/test projections. `sam` requires an existing readable file whose real path stays inside the repository, then passes the same relative path into the container; the site loader additionally rejects a symlinked file and unsafe segments. |
| Repository mount | `/app` with caller UID/GID; HOME is ignored `/app/.devhome`. |
| Content mounts | Same-path read-only configured root plus recursively discovered link hops/targets only; never `/`, a broad home/system ancestor, or repository ancestor. |
| Root development entry | Default/`start` serves existing assembled output at `/` in the background without build/install/pull/test; repeated healthy starts retain the same configured container. `dev` is main-site-only Astro hot reload; `build` only builds; `preview` explicitly builds then starts. `status` probes the owned listener; `stop`/`down` stops only exact owned web containers and clears the generated dev lock. |
| Package-local development | `npm run dev:nerv` is the autonomous NERV hot-development entry at `/lab/nerv/`; it must not be presented as the root publication because its Astro base does not own `/` or `/lab/`. |
| Package boundary | Validator, X Core, semantic, Terminal, assembler, site, and NERV use separate manifests, lockfiles, tests, and artifacts; root is not a workspace. |
| Publication dependency order | Plan content mounts before Docker; materialize before every site collection command. Build validator and validate manifests first; then X Core, semantic, Terminal, assembler, site, declared Experiments, and fresh assembly. |
| Runtime packaging | Runs the assembled blog build and exact manifest/release checks, creates a minimal Dockerfile/Nginx/release context, optionally copies only selected validated Memo public bytes into the separate static mount, probes non-root/read-only confinement and exact inventories, then tears down exact owned resources. |
| Plugin activation | Validate the release-bound JSON and positive markers before serving or packaging. Disabled retained Memo bytes and a live comments upstream cannot override false. A selected combined Memo candidate does not imply activation; verify both flags and all public routes. |
| Main-site browser server | Run the site build/static scan first. Playwright owns `astro preview` of that same `dist/` at `/`; `start:e2e` must not rebuild or run `astro dev`. |
| NERV browser server | Playwright owns Astro at `/lab/nerv/`. |
| Publication browser server | Build/assemble first; assembler Playwright owns a static server for unchanged root `dist/`. |
| Browser artifacts | Each package writes ignored `playwright-report/` and `test-results/` below its own root. |

`sam` retains `docker run --rm --init`, UID/GID mapping, repository-local HOME,
exact `sam.*` labels, TTY detection, and child exit behavior.
Detached preview adds `SAM_DETACH=1` and `--pull never`, with mode/config labels;
ordinary commands retain foreground output and exit status.

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| no wrapped command | usage to stderr; exit `2` before Docker |
| invalid/broad/unreadable content root or broken/cyclic/special link target | fail before Docker; do not broaden mounts |
| missing host dependency | name dependency; exit `127` |
| invalid/empty `SAM_IPC` | accepted values to stderr; exit `2` before Docker |
| unsupported `SAM_SERVICE` | fail before publishing a port |
| wrapped command fails | preserve output and exit code |
| generated Astro dev lock is stale after a container stop | remove only `apps/site/.astro/dev.json` before owned dev startup and during teardown; do not pass `astro dev --force`, because a container PID can collide with the stale PID and terminate the new Astro process |
| `preview.sh down` finds no labeled container | report none and succeed |
| a required package binary is missing in build mode | preserve the build failure; preparation remains explicit with `./sam npm run install:m51` |
| the assembled publication output is missing for default `preview.sh`/`start`/`up` | fail before stopping existing services and tell the developer to run `./preview.sh render npm run build:m4` or `./preview.sh preview` |
| root publication build fails | preserve the wrapped failure and do not start a new web service |
| `dev` selects a combined Memo candidate | Refuse before startup and direct the caller to static `start`/`preview` |
| lifecycle .env keys are absent/empty, addresses cannot be discovered, or readiness fails | return nonzero without a success banner; remove only the new failed-start container |
| repeated start requests a different configuration/mode | preserve the running preview and require explicit stop/start |
| a developer needs fast main-site hot reload | use `preview.sh dev`; the default `preview.sh` serves the existing assembled publication without rebuilding, while browser/static evidence still uses the dedicated build and Playwright gates |
| dependency/image Playwright versions differ | browser validation unavailable until aligned |
| browser image/server/fixture cannot start | record exact unavailable error; never report pass |
| browser assertion fails | preserve report/screenshot/trace and review PRD before changing code/test |
| complete fixture gate is invoked without installed dependencies | fail at the exact missing phase; do not install or mutate lockfiles implicitly |
| `preview.sh verify` receives an unexpected argument or incomplete tracked fixture | print usage/error and fail before Docker |
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
- Good: after `./preview.sh render npm run build:m4`, `WEB_HOST_PORT=4322 ./preview.sh`
  validates the existing assembled output, does not rebuild it, and serves `/`,
  `/lab/`, and listed Experiment mounts including `/lab/majo/`.
- Good: `FIREFLY_CONTENT_ROOT=/absolute/path/to/blog WEB_HOST_PORT=4322 ./preview.sh dev`
  uses exact read-only content mounts and starts the main-site Astro
  development server for fast source-change hot reload.
- Good: `SAM_BIND_HOST=127.0.0.1 WEB_HOST_PORT=4322 ./preview.sh preview` keeps the
  assembled publication preview loopback-only when LAN access is not wanted;
  the default `preview.sh` binding is `0.0.0.0` for review from another host.
- Good: `cp .env.example .env` followed by editing the local root
  and port values configures both `./sam` and `./preview.sh`; explicit environment
  variables still override the file. One-off `sam` retains defaults without
  a file; the preview lifecycle requires complete root configuration.
- Base: NERV-only check/build uses plain `./sam`, private IPC, no published
  port, UID mapping, and repository-local HOME. Site and aggregate commands
  that can render diagrams use `./preview.sh render`.
- Bad: Alpine Playwright, mismatched image/package, host npm, raw Docker,
  using `astro dev` as static/browser-isolation evidence, build-inside-`start:e2e`,
  `reuseExistingServer: true`, an unmanaged server, or broad command approval.
- Bad: root `preview.sh` launches only NERV's package-local Astro server. The
  `/lab/nerv` base may work, but `/` and `/lab/` are outside that application and
  cannot satisfy the root publication contract.
- Bad: mounting `$HOME`, `/`, or a broad ancestor so an authored link happens to
  resolve, or building a runtime image from a stale/unmanifested site `dist/`.
- Bad: adding `--force` to the containerized Astro dev command while retaining a
  stale `.astro/dev.json`; the old container PID can equal the new Astro PID,
  causing Astro to terminate itself with exit `143`.

### 6. Tests Required

For a package change, install from its lockfile and run its package-local checks.
For X Core/presentation/site changes, validate in dependency order and refresh
the consumer through a clean site install before integration/browser evidence.
For cross-package boundary changes, check/build every affected package plus NERV
isolation. For browser-visible behavior, run the exact focused command before the
full suite and record projects, JavaScript mode, routes/states, fixtures, results,
and failure artifacts.

When `sam`, `preview.sh`, or runtime packaging changes:

```bash
bash -n sam preview.sh tooling/shared/dev-env.sh
shellcheck sam preview.sh tooling/shared/dev-env.sh
shfmt -d sam preview.sh tooling/shared/dev-env.sh
./preview.sh --help
./sam node --version
# Build once, then serve the complete local publication without rebuilding.
./preview.sh build
WEB_HOST_PORT=4322 ./preview.sh
# Probe and stop before switching mode.
./preview.sh status
./preview.sh stop
# Fast main-site-only hot reload; no publication build.
WEB_HOST_PORT=4322 ./preview.sh dev
./preview.sh stop
# Explicit assembled-publication rebuild and preview.
WEB_HOST_PORT=4322 ./preview.sh preview
# Assert 200 and expected titles/links at /, /lab/, /lab/nerv/.
WEB_HOST_PORT=4322 ./preview.sh down
./preview.sh down
```

Verify invalid IPC cases, executable modes, ignored `.devhome/`, and no stale
`hako` / `HAKO_*` reference. For the root development entry, also verify the
exact `sam.repo`, `sam.scope=preview.sh`, and `sam.service=web` labels, the configured
host binding (default `0.0.0.0`), closed port after teardown, and zero matching
containers. The Astro dev lock must be absent after teardown and a subsequent
start with a pre-existing stale lock must reach `astro ... ready` without
passing `--force`.
For the deterministic gate, run `./preview.sh verify` after installation and retain any
package-local Playwright reports on failure. The negative Astro build fixtures
must write and spawn their child build with the same container-visible
`/app/content` root; the tracked fixture gate remains separate from the
explicit owner-workspace `build:workspace` command. For workspace changes, also
prove chained file/directory mounts are read-only,
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
./preview.sh render npm --prefix apps/site run check
WEB_HOST_PORT=4322 ./preview.sh
./preview.sh package

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

## Scenario: Temporary Remote Reverse-Tunnel Rehearsal

### 1. Scope / Trigger

Use this contract only after an owner explicitly authorizes a time-bounded remote
staging rehearsal. It proves the packaged public release behind a real TLS/Nginx
edge; it is not a production deployment, persistent tunnel, DNS/CDN change, or
substitute for the standard package validation path.

### 2. Signatures

```bash
./preview.sh package

ssh -F /dev/null -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -N \
  -R 127.0.0.1:<remote-port>:127.0.0.1:4321 <operator>@<staging-host>
```

The local source is the read-only `firefly:m5-runtime` image produced by
`preview.sh package`, mapped only as `127.0.0.1:4321:8080`. Do not use `preview.sh`
as the edge-runtime source: it is a Node preview and does not reproduce Nginx
response-header behavior.

### 3. Contracts

| Boundary | Contract |
| --- | --- |
| SSH forward | The remote bind is explicitly `127.0.0.1`; `GatewayPorts no` must remain effective. Nginx is the only public ingress. |
| Remote Nginx | Add one uniquely named temporary server configuration and one password-hash file only; run `nginx -t` before every reload. |
| TLS | Reuse an already validated certificate covering the staging hostname. Do not issue, renew, copy, or commit a certificate/key for a rehearsal. |
| Access | Require temporary Basic Auth (or an owner-approved equivalent). Plaintext credentials stay in a mode-restricted temporary local file; only the hash reaches the remote host. |
| Runtime | The container is non-root/read-only, has an exact M7 label, and publishes no non-loopback listener. |
| Cleanup | Remove only the M7-named Nginx/auth files; terminate the exact SSH PID and exact labelled container; remove temporary credentials before reporting success. |

### 4. Validation & Error Matrix

| Condition | Required behavior |
| --- | --- |
| remote port, hostname, or M7 path is already occupied | stop before creating a tunnel or writing a file |
| local packaging/runtime check fails | do not expose the remote entry point |
| SSH forward cannot bind or is not loopback-only | stop and remove any local runtime; never retry with `0.0.0.0` or `GatewayPorts yes` |
| Nginx syntax check fails | do not reload; remove the temporary files and revalidate the prior configuration |
| unauthenticated public request is not denied | stop and roll back the site |
| route/TLS/header/browser probe fails | roll back and retain only non-secret diagnostic evidence |
| interruption or any command failure | the same trap/finally path removes Nginx/auth files, tunnel, runtime container, and temporary credentials |
| post-cleanup listener/configuration check fails | report failure; do not claim a completed rehearsal |

### 5. Good / Base / Bad Cases

- **Good:** validated image → loopback container → `-R 127.0.0.1` tunnel →
  one Basic-Auth Nginx site → direct/public/TLS/browser checks → verified
  cleanup.
- **Base:** local `./preview.sh package` alone remains the normal release-image
  preflight and creates no remote state.
- **Bad:** `-R 0.0.0.0:...`, a tunnel supervisor/systemd unit, a shared-Nginx
  rewrite, public plaintext credentials, `preview.sh` as header evidence, or a
  cleanup claim without separate listener/configuration checks.

### 6. Tests Required

- Before exposure: run `./preview.sh package` and prove the selected host/port
  and M7 paths are unused.
- During exposure: prove remote loopback reachability, `nginx -t`, authenticated
  and `401` paths, public and direct-origin TLS, expected routes/redirects/two
  404 owners, runtime headers/cache behavior, and desktop/mobile browser paths
  with JavaScript disabled and enabled as appropriate.
- After cleanup: independently check that the remote temporary files/site/port
  are absent, `nginx -t` still passes, the local mapped port is closed, and no
  exact-labelled runtime container remains.

### 7. Wrong vs Correct

#### Wrong

```bash
ssh -R 0.0.0.0:9450:127.0.0.1:4321 staging
# leave a remote Nginx site/auth file and autossh process after testing
```

#### Correct

```bash
ssh -F /dev/null -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -N \
  -R 127.0.0.1:9450:127.0.0.1:4321 staging
# remove the exact temporary Nginx/auth paths, then prove port/config/container absence
```
