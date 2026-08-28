# Deterministic validation gate

## Goal and user value

Make repository verification reproducible and release-complete. A maintainer
should be able to run one documented command that always validates the tracked
repository fixture, runs the non-browser gates in dependency order, and then
executes the site, NERV, and assembled-publication Playwright surfaces without
silently inheriting an owner-local `config.dev` or external content root.

This task is the second child of
`.trellis/tasks/08-27-repository-audit-remediation/`. The Unicode route
compatibility prerequisite is archived at
`.trellis/tasks/archive/2026-08/08-27-m51-unicode-route-compatibility/`, and the
documentation-convergence child is archived at
`.trellis/tasks/archive/2026-08/08-28-repository-docs-convergence/`.

## Confirmed facts

- `sam` sources the ignored `config.dev` before building Docker mounts. An
  explicit `FIREFLY_CONTENT_ROOT` environment value takes precedence, but the
  current root `test:m51` and `build:m51` commands do not force the tracked
  repository fixture.
- `apps/site/tests/content-build-negatives.test.mjs:8-40` writes its temporary
  invalid Markdown under the repository `content/` root, while its spawned
  Astro build inherits the process content-root environment. With an external
  owner workspace selected, those negative fixtures can be written outside the
  active materialized input and produce false failures.
- Root `test:m4`/`test:m51` run package and Node tests only. The existing browser
  surfaces are `apps/site` (`test:e2e`), `experiments/nerv` (`test:e2e`), and
  `tooling/assemble-publication` (`test:e2e`), but no aggregate command invokes
  all three after a clean build.
- The site build derives its output from `FIREFLY_CONTENT_ROOT`; the explicit
  `apps/site run build:workspace` command is the existing owner-workspace build
  boundary. The repository `content/` tree is tracked, clone-ready fixture data
  containing both public and deliberately hidden/private test cases.
- Main-site Playwright previews an already-built site artifact. Publication
  Playwright serves the assembled root `dist/`; NERV owns its own package-local
  server. Their matching browser image is
  `mcr.microsoft.com/playwright:v1.62.0-noble` with `SAM_IPC=host`.
- `package-runtime.sh` is a host Docker/release probe and is intentionally a
  separate boundary. It is not safe to call from inside the Node/Playwright
  verification container and is not silently folded into the npm orchestrator.
- There is no repository-local CI workflow. A complete local verification
  command must therefore fail on unavailable browser infrastructure and retain
  its reports rather than treating a skipped surface as success.

## Requirements

### R1. Isolate repository-fixture tests

- Make the repository fixture an explicit, absolute input for the deterministic
  verification entry point before `sam` constructs mounts, so an ignored
  `config.dev` and an externally supplied `FIREFLY_CONTENT_ROOT` cannot change
  fixture ownership.
- Make negative Astro builds explicitly pass the repository fixture root to the
  spawned build and preserve their same-filesystem temporary output and `finally`
  cleanup behavior.
- Keep fixture content and generated stages repository-owned; never copy owner
  content, ignored exports, or private values into the tracked tree.

### R2. Add one complete verification entry point

- Add a root `verify.sh` host entry that invokes `./sam` with the repository
  fixture, the pinned Playwright image by default, and host IPC by default.
- Add an inner root npm command (`verify:m51`) that sets the container-visible
  fixture root and runs, in order: `check:m51`, `test:m51`, `build:m51`, site
  Playwright, NERV Playwright, and assembled-publication Playwright.
- Preserve non-zero exit status from every phase. No browser project may be
  skipped or replaced with a manual smoke claim; reports, screenshots, and
  traces remain in their existing ignored package directories.
- Require installed package dependencies as a precondition, but do not make
  verification mutate lockfiles or install dependencies implicitly.

### R3. Keep owner-workspace validation explicit

- Document `FIREFLY_CONTENT_ROOT=<absolute-blog-root> ./sam npm --prefix
  apps/site run build:workspace` as the separate configured-workspace build
  path. It must remain distinct from the deterministic fixture gate and must
  not reuse fixture-specific article or route assertions.
- Preserve the existing read-only mount, guest projection, schema, and path
  safety rules for an owner workspace. Do not add a second content loader or
  browser-side filtering mode.

### R4. Reconcile durable guidance

- Document the two verification boundaries, command order, browser image/IPC
  requirements, failure-report behavior, and the separate `package-runtime.sh`
  host probe in `readme.md` and the frontend development/quality specs.
- State that `verify:m51` is valid only through `./sam` (or `verify.sh`) and
  that a direct host npm invocation is not evidence.

### R5. Preserve privacy and scope boundaries

- Do not read, record, or mount owner-local content paths in Trellis records,
  fixtures, logs, or generated tracked files.
- Keep comments disabled, avoid deployment/SMTP/provider calls, and preserve the
  static site, publication, and Experiment architecture.
- Correct only fixture/test orchestration assumptions exposed by this gate;
  defer comments-contract extraction, X Core/plugin cleanup, adapter cleanup,
  and release crash-recovery implementation to their owning children.

## Acceptance criteria

- [x] `verify.sh` fixes the fixture root before `sam` loads `config.dev` and
      invokes the pinned Playwright image/IPC defaults; an external
      `FIREFLY_CONTENT_ROOT` cannot change the deterministic input.
- [x] The spawned negative Astro builds always target the tracked repository
      fixture and still clean temporary files and generated stages on success or
      failure.
- [x] `verify:m51` runs check, test, build, site Playwright, NERV Playwright,
      and publication Playwright in that order, with every failure propagated and
      no silent skip.
- [x] A clean repository fixture run passes all applicable non-browser tests and
      all three existing Playwright surfaces at their declared viewports; any
      unavailable browser/image dependency is reported with the exact command
      and error instead of counted as pass.
- [x] The explicit owner-workspace `build:workspace` command remains documented,
      read-only, and separate from fixture-specific route/content assertions.
- [x] Existing package/build/publication behavior and comments-disabled defaults
      remain unchanged outside the verification/test orchestration.
- [x] Documentation and specs describe the complete gate, its boundaries, and
      the separate host `package-runtime.sh` probe without private values.
- [x] `bash -n`, ShellCheck, shfmt, task validation, privacy/scope review, and
      `git diff --check` pass; no generated reports, external content, or
      operational values enter the final diff.

## Out of scope

- Public comments enablement, SMTP/provider tests, deployment, credentials,
  production data, or owner-local content inspection.
- Comments contract extraction, X Core/plugin-host removal, canonical-route
  refactoring, adapter dependency/mutation fixes, or Terminal decomposition.
- Changing public URLs, content, route semantics, Presentation UX, or the
  Playwright contract itself beyond correcting stale fixture-specific assertions
  proven by the deterministic fixture run.
- Adding CI hosted outside the repository, dependency installation to the
  verification command, or a second runtime/package container strategy.
- Making `package-runtime.sh` run inside the npm container; it remains an
  explicit host release probe after the verification gate when needed.

## Open questions

None block planning. The recommended gate is a small host wrapper plus one root
npm orchestrator; browser infrastructure remains an honest prerequisite whose
unavailability must fail visibly.
