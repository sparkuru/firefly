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
| `tooling/publish-memos` | `SAM_CONTENT_MODE=none ./sam npm --prefix tooling/publish-memos ci`; `run check`; `run test`; `run build` |
| Memo integration | `./sam npm run test:memos:site`; `run test:memos-publication`; `run prepare:test:memos`; pinned browser `run test:e2e:memos` |

For a main-publication run, materialize the configured content workspace,
build and validate every declared manifest, then run the affected package,
site, NERV, and assembly gates. A failed or unavailable command is reported
with its exact error; it is not counted as a pass.

## Browser profile

### Trellis Plus: Playwright Validation Profile

- execution mode: `docker-wrapper`; every Node/browser command uses `sam`.
- setup/install: `./sam npm run install:m51`; the pinned Playwright Noble image
  provides matching Chromium binaries/libraries. Docker/image access is a
  prerequisite, not granted by this profile. Do not use global browsers.
- application readiness/base URL: after `./preview.sh build`, the site config
  owns `npm run start:e2e -- --host 0.0.0.0 --port 4321`, probing
  `http://127.0.0.1:4321/`; NERV probes `/lab/nerv/` on 4321; assembler owns
  `npm run start:e2e`, probing `http://127.0.0.1:4322`. Memo fixture preparation
  uses `./preview.sh render npm run prepare:test:memos`, and its browser config
  owns `node scripts/serve-memos-fixture.mjs` on 4321. These servers live inside
  the browser container and are independent of the root user preview port.
- focused commands: `./preview.sh render npm --prefix apps/site run test:e2e -- tests/home-browse.spec.ts`;
  `./preview.sh render npm --prefix experiments/nerv run test:e2e`;
  `./preview.sh render npm --prefix tooling/assemble-publication run test:e2e`;
  `./preview.sh render npm run test:e2e:memos` after preparing its fixture.
- full/CI-equivalent gate: `./preview.sh verify`. No separate CI browser job
  is declared in this repository. The maintained host static Memo fixture runs
  only after the inner package/build/browser gate succeeds.
- tests/config: `apps/site/tests/` and `playwright.config.ts` plus
  `playwright.memos.config.ts`; `experiments/nerv/tests/` and its config;
  `tooling/assemble-publication/tests/` and its config. MAJO's independent
  `experiments/majo/playwright.config.ts` uses `/lab/majo/` on 4321 and runs via
  `./preview.sh render npm --prefix experiments/majo run test:e2e` when affected.
- browser projects/viewports: main site has `chromium-desktop-static`,
  `chromium-desktop-interactive` at 1440x900 and `chromium-mobile-static`,
  `chromium-mobile-interactive` at 375x812; static disables JS, mobile enables
  touch. Memo has desktop-static/mobile-static/mobile-interactive; NERV/MAJO
  have `chromium-desktop`/`chromium-mobile`; publication has
  `publication-desktop`/`publication-mobile`, at the same widths/heights.
- mobile applicability: ordinary changed reading/navigation/forms require
  separate desktop and narrow-mobile interaction/final-state evidence even
  without CSS edits. Pure shell/config/spec maintenance is non-UI. For a
  mobile-focused site run append `-- --project=chromium-mobile-static
  --project=chromium-mobile-interactive` to the existing `test:e2e` command.
  Device/touch emulation does not prove physical phones/browser engines.
- fixtures/data: tracked `content/`, disabled plugin baseline, isolated public
  Markdown Memo fixture and disposable independent-publication/static mount. No owner credentials,
  production data, real mail delivery or personal browser sessions.
- accessibility: use existing role/name/focus/keyboard assertions; no separate
  accessibility scanner is configured. Assistive technology remains human-only.
- visuals: screenshots are diagnostic; no automatically accepted screenshot
  baseline. Any intentional future snapshot change needs approved comparison.
- failure artifacts: package-local ignored `test-results/` and
  `playwright-report/`; Memo uses `apps/site/test-results/memos-browser/`.
  Ordinary configs retain screenshot-on-failure and trace-on-first-retry;
  Memo retains trace-on-failure. Preserve runner stdout and console/network
  evidence when investigating failures, and report exact artifact paths.

Read this profile before external browser documentation. Classify each changed
UI acceptance as required/equivalent/not-effective/unavailable and mobile
required/not-applicable/unavailable before implementation. Missing automation
is not evidence of success. The submit-ready gate in `commit-policy.md` handles
only residual human judgment after all runnable automated checks.

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

When `sam`, `preview.sh`, or `tooling/shared/dev-env.sh` changes, run the
repository's shell syntax, ShellCheck, formatting, wrapper-Node, and exact
teardown checks. Runtime/package checks must prove the expected artifact,
labels, isolation, and cleanup; a deployment-only check cannot replace local
package or browser evidence.

`./preview.sh verify` runs the inner `verify:m51` Node/browser gate through `sam`,
then `tooling/publish-memos/ops/check-runtime.sh` only after that succeeds.
The inner gate checks comments, pure contracts, owner publisher, site and
assembler, then the Markdown Memo browser fixture and ordinary publication/
site/NERV browsers. The host fixture verifies independent Memo promotion/history,
reciprocal byte preservation and an actual read-only Nginx static mount, with no
Memo HTTP/SMTP process. It never starts the owner/default Compose stack.
Synthetic host SSH/dry-run/failure fixtures do not prove production access.

Host Docker is also the explicit boundary for `docker compose config --quiet`,
the static Memo image fixture, and `./preview.sh package`. Syntax checks
do not start services. Image and lifecycle fixtures must remove only their own
exact labeled resources and leave default publication history untouched.
Publisher work selects `SAM_CONTENT_MODE=none` with narrow explicit source/
assets/history/output/deployment mounts; SSH credentials remain with host-only
`tooling/publish-memos/publish.sh`. `FIREFLY_MEMOS_CANDIDATE` selects explicit
combined preview/package; default blog commands do not build/read Memo.
Publisher image preparation uses its minimal allowlist, not the whole workspace.

## Runtime packaging with private logs

### 1. Scope / Trigger

Apply when capturing `./preview.sh package` output in owner-only logs.

### 2. Signatures

Precreate a 0600 log in a 0700 temporary directory, then invoke
`(umask 022; ./preview.sh package) > "$package_log" 2>&1`.

### 3. Contracts

The public-only build context copies `nginx.conf`; its image copy remains
root-owned and must be readable by image user `nginx`. Restrict logs and
operational inputs independently rather than applying `umask 077` to this
public build subprocess. Never relax private service/config/secret modes.

### 4. Validation & Error Matrix

| Invocation | Observed result |
| --- | --- |
| Packaging under `umask 077` | Copied config becomes 0600; Nginx exits with permission denied; later port discovery fails |
| Packaging under `umask 022`, precreated private log | Full runtime gate passes; log remains 0600 |

### 5. Good / Base / Bad Cases

Good: private logs and readable public context. Base: normal public packaging
without captured logs. Bad: assume a missing port proves a network fault when
the container may have exited before inspection.

### 6. Tests Required

Inspect actual runtime startup/config readability when port discovery fails;
rerun the full corrected gate and verify exact resource cleanup, unchanged
publication metadata and retained log permissions. A trivial HTTP container
does not reproduce the publication image's configuration permissions.

### 7. Wrong vs Correct

Wrong: `umask 077; ./preview.sh package > "$package_log" 2>&1`.
Correct: precreate the private log, then scope `umask 022` to packaging as above.
