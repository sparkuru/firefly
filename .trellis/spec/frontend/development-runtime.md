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
./dev.sh [start|up|preview|build|down|stop]

WEB_HOST_PORT=4322 ./dev.sh
WEB_HOST_PORT=4322 ./dev.sh preview
WEB_HOST_PORT=4322 ./dev.sh down

cp config.dev.example config.dev

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

./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
./sam npm run publication:m4
./package-runtime.sh
```

Browser signatures are recorded in the single Playwright profile in `index.md`.
Root npm scripts are delegators and are valid only when already invoked inside
`./sam` with the appropriate image.

Docker Compose configuration syntax is a host Docker boundary, not a wrapped
Node command. Use `docker compose config --quiet` to validate Compose files;
`./sam docker compose ...` makes the wrapper invoke `docker` as a Node entry
point and is not valid evidence. Do not start services merely to perform this
syntax check.

### 3. Contracts

| Input / boundary | Contract |
| --- | --- |
| `SAM_IMAGE` | Defaults to `node:22-alpine`. Browser runs use `mcr.microsoft.com/playwright:v1.62.0-noble`. |
| `SAM_IPC` | Unset means `private`; accepted values are exactly `private` and `host`. Browser runs use `host`; explicit empty is invalid. |
| `SAM_BIND_HOST` | `dev.sh` defaults to `0.0.0.0` for LAN-accessible development; direct `sam` defaults to `127.0.0.1`; override with a narrower address when needed. |
| `WEB_HOST_PORT` / `WEB_CONTAINER_PORT` | `dev.sh` mapping, both default `4321`; adjust host port for parallel services. |
| `SAM_SCOPE` / `SAM_SERVICE` | Wrapper labels; service is empty or `web`. `dev.sh` uses scope `dev.sh` and service `web`. |
| `config.dev` | Optional ignored shell defaults file loaded by `sam` and `dev.sh`; copy `config.dev.example` and edit it for the current machine. Explicit environment variables take precedence. |
| `FIREFLY_CONTENT_ROOT` | Optional absolute readable blog root containing `posts/` and `pages/`; it may be set in `config.dev` and otherwise defaults to `<repo>/content`. `sam` resolves and passes it into the container. |
| Repository mount | `/app` with caller UID/GID; HOME is ignored `/app/.devhome`. |
| Content mounts | Same-path read-only configured root plus recursively discovered link hops/targets only; never `/`, a broad home/system ancestor, or repository ancestor. |
| Root development entry | `dev.sh start`/`up` validates the site Astro dependency, stops its exact labeled containers, removes the generated `apps/site/.astro/dev.json` lock, materializes the configured workspace, and starts `apps/site` through `astro dev` without a publication build; source changes hot-reload. `dev.sh preview`/`build` is the explicit assembled-publication server path. |
| Package-local development | `npm run dev:nerv` is the autonomous NERV hot-development entry at `/lab/nerv/`; it must not be presented as the root publication because its Astro base does not own `/` or `/lab/`. |
| Package boundary | Validator, X Core, semantic, Terminal, assembler, site, and NERV use separate manifests, lockfiles, tests, and artifacts; root is not a workspace. |
| Publication dependency order | Plan content mounts before Docker; materialize before every site collection command. Build validator and validate manifests first; then X Core, semantic, Terminal, assembler, site, declared Experiments, and fresh assembly. |
| Runtime packaging | `package-runtime.sh` runs the assembled publication build, requires exact manifest/release equality, creates a minimal context containing only Dockerfile/Nginx/release, then probes the non-root read-only image and tears down its exact labeled container. |
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
| generated Astro dev lock is stale after a container stop | remove only `apps/site/.astro/dev.json` before starting and during teardown; do not pass `astro dev --force`, because a container PID can collide with the stale PID and terminate the new Astro process |
| `dev.sh down` finds no labeled container | report none and succeed |
| a required M5 package binary is missing | fail before building and name the locked install delegate as recovery |
| root publication build fails | preserve the wrapped failure, do not start the web service, and allow exact `sam.scope=dev.sh` cleanup |
| a developer needs immutable publication evidence | use `dev.sh preview`/`build`; the default `dev.sh` Astro server is for fast visual review and is not build/static-output evidence |
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
- Good: `FIREFLY_CONTENT_ROOT=/absolute/path/to/blog WEB_HOST_PORT=4322 ./dev.sh`
  uses exact read-only content mounts and starts the Astro development server;
  the same host port can be checked for `/` and native content links while
  source changes hot-reload.
- Good: `SAM_BIND_HOST=127.0.0.1 WEB_HOST_PORT=4322 ./dev.sh preview` keeps the
  assembled publication preview loopback-only when LAN access is not wanted;
  the default `dev.sh` binding is `0.0.0.0` for review from another host.
- Good: `cp config.dev.example config.dev` followed by editing the local root
  and port values configures both `./sam` and `./dev.sh`; explicit environment
  variables still override the file, and no config file preserves clone-safe
  repository defaults.
- Base: site or NERV check/build uses plain `./sam`, private IPC, no published
  port, UID mapping, and repository-local HOME.
- Bad: Alpine Playwright, mismatched image/package, host npm, raw Docker,
  using `astro dev` as static/browser-isolation evidence, build-inside-`start:e2e`,
  `reuseExistingServer: true`, an unmanaged server, or broad command approval.
- Bad: root `dev.sh` launches only NERV's package-local Astro server. The
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

When `sam`, `dev.sh`, or runtime packaging changes:

```bash
bash -n sam dev.sh package-runtime.sh
shellcheck sam dev.sh package-runtime.sh
shfmt -d sam dev.sh package-runtime.sh
./sam node --version
# Fast visual review; no M5 build.
WEB_HOST_PORT=4322 ./dev.sh
# Immutable assembled-publication preview; performs the M5 build.
WEB_HOST_PORT=4322 ./dev.sh preview
# From another shell: assert 200 and expected titles/links at /, /lab/, /lab/nerv/.
WEB_HOST_PORT=4322 ./dev.sh down
./dev.sh down
```

Verify invalid IPC cases, executable modes, ignored `.devhome/`, and no stale
`hako` / `HAKO_*` reference. For the root development entry, also verify the
exact `sam.repo`, `sam.scope=dev.sh`, and `sam.service=web` labels, the configured
host binding (default `0.0.0.0`), closed port after teardown, and zero matching
containers. The Astro dev lock must be absent after teardown and a subsequent
start with a pre-existing stale lock must reach `astro ... ready` without
passing `--force`.
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

## Scenario: Temporary Remote Reverse-Tunnel Rehearsal

### 1. Scope / Trigger

Use this contract only after an owner explicitly authorizes a time-bounded remote
staging rehearsal. It proves the packaged public release behind a real TLS/Nginx
edge; it is not a production deployment, persistent tunnel, DNS/CDN change, or
substitute for the standard package validation path.

### 2. Signatures

```bash
./package-runtime.sh

ssh -F /dev/null -o StrictHostKeyChecking=yes -o ExitOnForwardFailure=yes -N \
  -R 127.0.0.1:<remote-port>:127.0.0.1:4321 <operator>@<staging-host>
```

The local source is the read-only `firefly:m5-runtime` image produced by
`package-runtime.sh`, mapped only as `127.0.0.1:4321:8080`. Do not use `dev.sh`
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
- **Base:** local `./package-runtime.sh` alone remains the normal release-image
  preflight and creates no remote state.
- **Bad:** `-R 0.0.0.0:...`, a tunnel supervisor/systemd unit, a shared-Nginx
  rewrite, public plaintext credentials, `dev.sh` as header evidence, or a
  cleanup claim without separate listener/configuration checks.

### 6. Tests Required

- Before exposure: run `./package-runtime.sh` and prove the selected host/port
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
