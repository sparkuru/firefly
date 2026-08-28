# Deterministic validation gate design

## 1. Boundary and data flow

The gate has one host boundary and one container-visible orchestrator:

```text
./verify.sh
  ├─ fixes FIREFLY_CONTENT_ROOT=<repo>/content
  ├─ defaults SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble
  ├─ defaults SAM_IPC=host
  └─ exec ./sam npm run verify:m51
       └─ FIREFLY_CONTENT_ROOT=/app/content
            ├─ check:m51
            ├─ test:m51
            ├─ build:m51
            ├─ apps/site test:e2e
            ├─ experiments/nerv test:e2e
            └─ tooling/assemble-publication test:e2e
```

`verify.sh` is the deterministic host-facing command. It resolves its own
repository directory, rejects unexpected positional arguments, checks the
tracked fixture shape, and assigns the fixture root before `sam` can source an
ignored `config.dev`. The assignment is intentionally fixed rather than
caller-overridable for this entry point. `SAM_IMAGE` and `SAM_IPC` remain
diagnostic overrides so infrastructure errors can be reproduced without
editing the script.

The root `verify:m51` script is also callable inside `./sam` for troubleshooting
and sub-phase diagnosis. Each content-sensitive command receives the fixture
root explicitly, so a future shell environment or package script cannot
silently reintroduce owner-workspace input. The command sequence is linear and
short-circuiting: a failed phase prevents later phases from claiming success.

## 2. Content ownership and negative-build isolation

The tracked `content/` tree is the only input for the deterministic gate. `sam`
continues to mount the selected root read-only and recursively discovers only
the symlink hops already allowed by the content-workspace contract.

`apps/site/tests/content-build-negatives.test.mjs` writes invalid fixtures into
the repository content tree because those cases intentionally test schema and
build rejection. Its spawned Astro process must receive the same absolute
fixture root in `env`, independently of the parent process. Temporary output
stays under the ignored `apps/site/test-results/` tree on the same filesystem;
the existing `finally` cleanup remains the ownership boundary for fixture,
output, and prerender artifacts.

No owner workspace is copied, inspected, or persisted. The existing explicit
owner command remains a separate read-only build path:

```sh
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
```

That path is for authoring validation and must not be treated as evidence for
the deterministic fixture gate or its fixture-specific browser assertions.

## 3. Browser and publication contracts

The aggregate runs the existing Playwright packages rather than introducing a
new browser harness. The site package previews its built `dist/`, NERV owns its
package-local server, and publication serves the assembled `dist/`. The
Playwright image and host IPC defaults are selected at the host boundary because
all three surfaces require browser binaries and the current runtime contract
already declares that image/profile.

Reports, screenshots, and traces remain in the packages' existing ignored
directories. Missing Docker, image, browser binaries, or dependencies are
normal infrastructure failures: the command returns non-zero with the exact
failing command and diagnostic. It never converts an unavailable browser
surface into a pass or a skipped acceptance claim.

`package-runtime.sh` stays outside this graph. It is a host release-image probe
after publication assembly, with its own exact-label cleanup and read-only
runtime checks; nesting it inside the Node/Playwright container would create a
second Docker boundary and hide the release probe's contract.

## 4. Documentation and compatibility

The root README and frontend runtime/quality/workspace specs will describe:

- `./verify.sh` as the complete repository fixture gate;
- `./sam npm run verify:m51` as the inner diagnostic form;
- the exact check/test/build/browser order and default image/IPC;
- the separate owner-workspace `build:workspace` command;
- report retention and honest unavailable-infrastructure failures; and
- `./package-runtime.sh` as a separate host probe.

The change does not alter comments enablement, route semantics, content schema,
publication ownership, Playwright viewports, or the owner-workspace loader. If
the fixture run proves a hard-coded browser assertion is stale, only that
fixture-specific expectation may be corrected while preserving its semantic
check; no assertion is weakened merely to accommodate an external workspace.

## 5. Rollback and failure containment

The implementation is additive plus one test-environment correction. A source
revert removes `verify.sh`, the root orchestrator, documentation updates, and
the negative-build environment pin without touching content or generated
reports. Before changing browser assertions, capture the tracked-fixture result
and revert any assertion change that is not explained by that evidence.

The primary failure modes and controls are:

| Failure | Control |
| --- | --- |
| ignored `config.dev` selects owner content | host wrapper assigns the fixture before `sam` loads config |
| spawned negative build uses a different root | test passes the fixture root explicitly in its child environment |
| browser phase silently omitted | one short-circuiting root orchestrator lists all three package commands |
| browser runtime unavailable | preserve the non-zero command/error; do not skip |
| owner content leaks into records or tree | fixed tracked root, read-only external boundary, privacy review |
| release probe becomes nested Docker | keep `package-runtime.sh` as a post-gate host command |
