# M4 Experiment pipeline — Implementation Plan

## Preconditions and Stop Gates

- Implementation begins only after the owner reviews the latest `prd.md`,
  `design.md`, and this plan and explicitly approves `task.py start` in a later
  message.
- Load the task manifests and current frontend specs before changing product
  files, including `research/ui-ux-pro-max.md`. Reinspect any overlapping dirty
  file and stop on unrecognized changes.
- Keep NERV Astro 4, the site Astro 7, all current exact/direct dependency
  versions, and separate lockfiles. Do not convert the root to a workspace, use
  host npm, bypass `./sam`, or apply a forced audit fix.
- Stop and return to planning if implementation needs remote manifests, runtime
  APIs, a browser catalog fetch, Experiment HTML rewriting, cross-project source
  imports, a changed public mount, a second product Experiment, or staging/live
  deployment authority.

## Ordered Implementation Checklist

### 1. Establish the strict Experiment contract

- Create `tooling/validate-experiments/` as a private Node 22 ESM package with
  its own manifest, exact lockfile, exported library, CLI, and Node tests.
- Implement explicit-root discovery, JSON parsing, exact v1 field decoding,
  directory/ID/mount agreement, safe path/text/token rules, duplicate and
  overlap checks, default-entry ownership, clone/freeze behavior, deterministic
  ordering, and public-catalog projection.
- Cover NERV as the real positive input plus isolated fixture directories for
  unknown fields/version, malformed values, traversal/backslashes/schemes,
  output/license escape, entry mismatch, duplicate IDs/routes/tags, sparse or
  decorated in-memory values, and stable ordering.
- Add root delegate scripts for install/check/test/validate without making the
  repository an npm workspace.
- Checkpoint: validator package install/check/test and real NERV validation must
  pass before the site or assembler depends on it.

### 2. Add build staging and publication assembly

- Create `tooling/assemble-publication/` as a second private ESM package with an
  exact local dependency on the validator, its own lockfile, Node tests, and
  Playwright `1.62.0` for assembled-release browser evidence.
- Implement serial Experiment build orchestration from already validated,
  repository-controlled commands. Preserve child output and non-zero status;
  never accept browser or remote command data.
- Implement transaction-scoped artifact and release candidates with explicit
  repository containment, same-filesystem promotion, cleanup limited to paths
  created by the current run, and prior-output restoration on promotion failure.
- Stage `apps/site/dist/` and each manifest output separately. Reject unsafe
  filesystem node types, symlinks, source maps, missing entries/licenses/assets,
  bad root-relative URLs, escaping relative URLs, prohibited data/path
  signatures, ownership conflicts, case-fold collisions, and stale output.
- Assemble site first and Experiment outputs only under exact mounts. Emit a
  stable inventory/catalog evidence file and prove that repeated fixture inputs
  yield the same normalized path inventory.
- Add root `build:m4`, validation, stage/assemble, and publication-test delegates
  with the order: validate manifests → build M3 graph → build Experiments →
  validate/stage → assemble.
- Checkpoint: negative fixture failures leave an existing sentinel release byte-
  identical; the positive fixture contains no stale sentinel.

### 3. Expose the validated catalog in the site

- Add the validator package as an exact local `file:` dependency of
  `apps/site/`, refresh its lock through `./sam`, and add a build-only catalog
  helper that resolves the repository root from its module path.
- Add JavaScript-free `apps/site/src/pages/lab/index.astro` using the existing
  semantic layout/style boundary, a visible H1, explanatory copy, deterministic
  listed entries, native default-entry links, and an explicit empty state.
- Update site static-output tests to expect the sixth site HTML route and prove
  the catalog exposes only safe listed fields, no unlisted/build/filesystem
  metadata, and no Experiment code, styles, scripts, preload, or dependency in
  ordinary outputs.
- Extend site Playwright static coverage for `/lab/`, NERV's native destination,
  keyboard focus, no-JavaScript readability, and desktop/mobile containment.
- Checkpoint: a clean site install/build succeeds from the exact local tooling
  package and the emitted `/lab/index.html` contains no Experiment asset request.

### 4. Add Terminal lab commands without weakening M3

- Extend the Terminal runtime with a separate exact lab-entry decoder, readonly
  public type, closed list/navigation effects, `ls lab`, `open lab/<id>`, help,
  announcements, and context-aware completion.
- Preserve the document-entry schema and exact document/template bijection.
  Lab entries never acquire `.md` filenames or inert document templates.
- Pass the same site public catalog into `TerminalHome.astro`; render a native
  `lab/` recovery group with minimal safe data attributes and update the browser
  controller to decode it before revealing the shell.
- Render `ls lab` with safe DOM-created native links. Navigate for `open` only
  from the validated closed effect; never concatenate a URL from command text.
  Keep exhaustive effect handling and fatal recovery for decoder/renderer
  failures.
- Update Terminal unit tests, site integration/static tests, and interactive
  Playwright for good/bad commands, unlisted/unknown IDs, exact completion,
  navigation, disabled-JavaScript fallback, history/clear preservation, and all
  existing M3 command behavior.
- Checkpoint: targeted Terminal and site browser suites pass at both viewports
  before touching deployment packaging.

### 4b. Apply the owner-reviewed Terminal interaction refinement

- Vendor the official JetBrains Mono v2.304 Regular and Medium WOFF2 files,
  record each SHA-256 and the tagged release/archive source, preserve the complete
  SIL OFL 1.1 text in the published site, and define local `font-display: swap`
  faces with system/CJK monospace fallbacks. Do not source-build the missing
  variable WOFF2 or substitute a file from `master`; add no runtime third-party
  request.
- Add one explicit default theme attribute at the Terminal root. Refactor the
  Terminal stylesheet so color, focus, font, size, line height, measure, and
  record spacing consume semantic theme tokens. Ship only the refined green
  phosphor theme; do not add a picker, persistence, or another theme.
- Extend the pure runtime so `cat ./<filename>` completion preserves `./` while
  exact execution normalizes to the existing public filename. Reject traversal,
  deeper paths, absolute paths, URLs, and arbitrary filesystem behavior.
- Add controller-level output settlement: short outputs focus and reveal the
  active prompt; documents focus and reveal the new scoped reading title.
  Respect reduced motion and avoid blocking input during viewport movement.
- Add the approved document-level typing-to-prompt listener. Capture only an
  unmodified non-Space printable character outside controls/links/editable or
  keyboard-scroll regions, with no selection or IME composition; insert it at
  the current prompt selection and reveal the prompt. Preserve Tab, Space,
  Enter, Escape, navigation keys, modifier/browser/assistive shortcuts, controls,
  selection, and IME unchanged.
- Extend Terminal unit tests for exact `./` normalization/completion and negative
  paths. Extend focused interactive Playwright at desktop/mobile for short-output
  prompt placement, document reading-start placement, printable-key return and
  insertion, protected key/control/selection/IME behavior, theme-token use,
  self-hosted font/license requests, reduced motion, and no overflow.
- Checkpoint: run Terminal check/test/build, site check/build/static scan, focused
  Terminal Playwright, and then the full site Playwright profile before refreshing
  the human-review screenshots.

### 5. Close the NERV mounted-runtime gaps

- Add reduced-motion CSS in `experiments/nerv/src/layouts/Layout.astro` that
  disables continuous scanline/flicker animation while keeping static visual
  layers and readable content.
- Guard the route's scroll-driven stripe updates with the same media preference
  and respond consistently if the preference changes during a session. Do not
  change click count, cookie, `from` redirect, selectors, attribution, license,
  framework version, or base path.
- Expand NERV Playwright for entry, favicon/local assets, desktop/mobile
  overflow, reduced motion, return behavior, and built `404.html`. Keep package-
  local tests independent from publication tests.
- Checkpoint: NERV clean install/check/build and focused/full browser tests pass
  with its existing lockfile.

### 6. Package and serve the complete release

- Update `.gitignore` only as needed for root `artifacts/` and tooling-local
  browser artifacts. Preserve `.private/` and `.dockerignore` protection.
- Rewrite the Docker builder around exact package locks and the M4 pipeline;
  copy only assembled root `dist/` into the existing non-root Nginx runtime.
- Update Nginx so `/` serves the Terminal site, `/lab/` serves the main-site lab
  index, `/lab/nerv/` keeps its assets and independent 404, and main-site misses
  use the site 404. Preserve `/healthz`, headers, gzip, immutable NERV hashed-
  asset caching, trailing-slash redirects, and runtime hardening.
- Build and start the exact compose service on an available loopback task port,
  probe health/site/lab/NERV entry/assets/404 and header behavior, then tear down
  the exact project service. Do not contact or mutate a remote host.
- Checkpoint: runtime image contains no Node/dependency/source/private/reference
  trees and serves the same sorted release inventory produced by the assembler.

### 7. Run the full quality and review gate

- Reinstall/build the complete dependency graph in order, then run all existing
  X Core, semantic, Terminal, site, NERV, tooling, assembled-release, and
  container checks below.
- Inspect exact site, staged artifact, and final release inventories; confirm no
  draft, secret, private path, source map, unknown file, missing local reference,
  or cross-package import/style/dependency edge.
- Validate Trellis task manifests and run `git diff --check`. Do not claim a
  linter/formatter/a11y scanner/visual-regression pass because none exists.
- Dispatch the Trellis check role for an independent spec, data-flow, reuse,
  type, test, and scope audit. Fix verified findings and repeat affected checks.
- In Phase 3.3, update the existing frontend specs and index to replace M3-only
  route/command/inventory facts with implemented manifest/catalog/tooling/stage/
  assembly/container contracts. Do not describe M5–M7 as complete.
- Update `.trellis/mainline.md` to submit-ready only after all runnable evidence
  passes. M4 is `human-required` because `/lab/`, Terminal navigation, and NERV
  reduced-motion behavior have product/visual consequences. Provide focused
  desktop/mobile captures plus exact automated and container evidence; ask only
  for the residual visual/navigation/reduced-motion judgment.
- Do not commit, archive, or advance to M5 until the owner approves that focused
  review in a later message.

## Validation Commands

Run Node/npm/browser commands through the approved wrapper. Exact scripts may be
narrowly renamed during implementation, but the final reproducible gate must
retain equivalent package-local coverage and ordering.

```bash
./sam node --version

./sam npm --prefix tooling/validate-experiments ci
./sam npm --prefix tooling/validate-experiments run check
./sam npm --prefix tooling/validate-experiments run test
./sam npm --prefix tooling/validate-experiments run validate -- --root ../..

./sam npm --prefix tooling/assemble-publication ci
./sam npm --prefix tooling/assemble-publication run check
./sam npm --prefix tooling/assemble-publication run test

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

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

./sam npm run build:m4

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix experiments/nerv run test:e2e

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix tooling/assemble-publication run test:e2e

docker compose -f f1refly.yaml build
F1REFLY_HTTP_PORT=18080 docker compose -f f1refly.yaml up -d
docker compose -f f1refly.yaml ps
docker compose -f f1refly.yaml exec -T web wget --quiet --spider http://127.0.0.1:8080/healthz
F1REFLY_HTTP_PORT=18080 docker compose -f f1refly.yaml down

./dev.sh down
python3 ./.trellis/scripts/task.py validate 08-13-m4-experiment-pipeline
git diff --check
```

If loopback port `18080` is occupied, select and record another explicit port
before `up`; use the same value for probes and teardown. HTTP route/header probes
may be performed from the publication Playwright/static client or the exact
running service, but every claimed endpoint must record its command and result.

## Required Evidence Record

The final check report must record:

- Node, Astro, TypeScript, and Playwright versions actually used;
- validator/assembler unit counts and negative fixture categories;
- discovered manifest count, listed/unlisted count, canonical catalog, and build
  order;
- site, artifact, and final release file/route inventories plus deterministic
  rerun evidence;
- Terminal unit/integration/browser counts and lab command/navigation outcomes;
- owner-review Terminal evidence: `./` completion/execution, prompt/document
  viewport settlement, safe global typing, protected keys/controls/selection/
  IME, theme tokens, self-hosted font/license/provenance, and updated inventory;
- NERV entry/404/favicon/assets/reduced-motion/overflow outcomes at both approved
  viewports;
- main-site and publication Playwright projects, JavaScript modes, routes,
  results, and failure artifacts;
- container build, health, route, headers/cache, runtime user, and teardown
  results;
- isolation/secret/path/source-map scans and any unavailable material command;
- human residuals: subjective visual quality, real devices, and assistive
  technology.

## Review and Rollback Checkpoints

- **After manifest package:** freeze schema/diagnostic behavior before downstream
  consumers depend on it.
- **After assembler transaction:** prove prior-release preservation and exact
  cleanup targets before handling real package output.
- **After catalog integration:** prove site/Terminal use one public projection and
  ordinary output has no Experiment asset edge.
- **After NERV changes:** prove reduced motion without changing identity,
  interaction, base, attribution, or package boundary.
- **After container build:** compare served paths to the assembler inventory and
  tear down the exact local service before review.

Rollback is additive and boundary-scoped. Restore the previous site/Terminal,
NERV, and Nginx/Docker behaviors from normal edits; never use a destructive Git
reset, delete user work, mutate `.private/`, or rewrite Experiment output/source
outside the task-owned changes.

## Start Gate

- `prd.md`, `design.md`, and this plan contain no blocking open question.
- `implement.jsonl` and `check.jsonl` contain real curated spec/task research
  entries and validate successfully.
- The owner reviews the final planning summary in a subsequent message and
  explicitly approves implementation.
