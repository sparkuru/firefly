# Firefly Validation Profile

This is a project-specific command profile. It records the existing runtime
boundary and does not authorize dependency installation, deployment, or
credential use.

## Command boundary

Run Node and browser work through `./sam`. A changed package is installed from
its own lockfile before its local checks. The root is a command delegate, not
an npm workspace.

Required package gates are:

| Area | Commands |
| --- | --- |
| `tooling/validate-experiments` | `./sam npm --prefix tooling/validate-experiments ci`; `run check`; `run test`; `run build`; real-manifest `run validate -- --root ../..` |
| `packages/x-core` | `./sam npm --prefix packages/x-core ci`; `run check`; `run test`; `run build` |
| `presentations/semantic` | `./sam npm --prefix presentations/semantic ci`; `run check`; `run test`; `run build` |
| `presentations/terminal` | `./sam npm --prefix presentations/terminal ci`; `run check`; `run test`; `run build` |
| `tooling/assemble-publication` | `./sam npm --prefix tooling/assemble-publication ci`; `run check`; `run test`; `run build` |
| `apps/site` | `./sam npm --prefix apps/site ci`; `run test:content`; `run test:x-core`; `run check`; `run build` |
| `experiments/nerv` | `./sam npm --prefix experiments/nerv ci`; `run check`; `run build` |
| `plugins/memos` | `./sam npm run test:memos-contract` |
| `services/memos` | `./sam npm --prefix services/memos ci`; `run check`; `run test`; `run build` |
| Memo integration | `./sam npm run test:memos:site`; `run test:memos-publication`; `run prepare:test:memos`; pinned browser `run test:e2e:memos` |

For a main-publication run, materialize the configured content workspace,
build and validate every declared manifest, then run the affected package,
site, NERV, and assembly gates. A failed or unavailable command is reported
with its exact error; it is not counted as a pass.

## Browser profile

The main site and NERV use the pinned pair `@playwright/test@1.62.0` and
`mcr.microsoft.com/playwright:v1.62.0-noble`. Browser commands run through:

```text
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix <package> run test:e2e
```

The main site tests are under `apps/site/tests/`, NERV tests are under
`experiments/nerv/tests/`, and assembled-publication tests are under
`tooling/assemble-publication/tests/`. Build the immutable artifact first;
Playwright owns the preview server and must not substitute `astro dev` for
static-publication evidence.

The maintained browser matrix covers JavaScript-disabled static Chromium and
interactive Chromium at 1440x900 and 375x812; both mobile projects enable touch
so static CSS and interactive runtime enforce the same input policy. The mobile
homepage has native browsing/search without Terminal; its absence and transition
suite replaces the obsolete mobile command-session baseline, while the desktop
project retains the complete Terminal regression suite. Fixtures are
repository-local and must not add credentials, production data, remote services,
or mutable mocks.

## Shell and runtime checks

When `sam`, `dev.sh`, `package-runtime.sh`, or `verify.sh` changes, run the
repository's shell syntax, ShellCheck, formatting, wrapper-Node, and exact
teardown checks. Runtime/package checks must prove the expected artifact,
labels, isolation, and cleanup; a deployment-only check cannot replace local
package or browser evidence.

`./verify.sh` runs the inner `verify:m51` Node/browser gate through `sam`, then
the host `services/memos/ops/check-runtime.sh` fixture only after that succeeds.
The inner gate runs service and pure-contract checks, site and assembler
regressions, an isolated real Memo publication, the Memo browser fixture, then
restores the default publication before ordinary site/NERV/publication browsers.
The host fixture owns a disposable HTTPS proxy, persistence root, and validated
TLS SMTP sink; it never starts the owner/default Compose stack. Its native
desktop/mobile form flow covers email verification, moderation, export,
publication, deletion, and stale restore refusal without disabling TLS checks.
The browser fixture rejects its certificate before importing the synthetic CA
into disposable NSS trust. Its owned Playwright-derived image installs
`libnss3-tools`, so fixture preparation requires the image package repository.

Host Docker is also the explicit boundary for `docker compose config --quiet`,
`services/memos/ops/check-image.sh`, and `./package-runtime.sh`. Syntax checks
do not start services. Image and lifecycle fixtures must remove only their own
exact labeled resources and leave default publication history untouched.
