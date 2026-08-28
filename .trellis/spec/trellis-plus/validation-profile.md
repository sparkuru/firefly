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
interactive Chromium at 1440x900 and 375x812; the interactive mobile project
also enables touch. Fixtures are repository-local and must not add credentials,
production data, remote services, or mutable mocks.

## Shell and runtime checks

When `sam`, `dev.sh`, `package-runtime.sh`, or `verify.sh` changes, run the
repository's shell syntax, ShellCheck, formatting, wrapper-Node, and exact
teardown checks. Runtime/package checks must prove the expected artifact,
labels, isolation, and cleanup; a deployment-only check cannot replace local
package or browser evidence.
