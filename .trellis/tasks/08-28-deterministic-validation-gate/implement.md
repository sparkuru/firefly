# Deterministic validation gate implementation plan

## 1. Reconfirm context and readiness

- Read the parent remediation PRD, this task's PRD/design, the research matrix,
  and the injected runtime, quality, workspace, and privacy specs.
- Confirm the Unicode prerequisite and documentation-convergence child remain
  archived, the mainline points at this planning task, and no unrelated
  worktree edits are present.
- Verify the tracked fixture shape without reading ignored owner configuration or
  owner-local content.
- Before any browser command, confirm `./sam` readiness and the declared
  Playwright image/IPC contract.

## 2. Add deterministic fixture entry points

- Add executable `verify.sh` at the repository root using the shell-script
  contract: strict mode, quoted paths, `--help`/`-h`, bounded argument handling,
  dependency/readability checks, and `exec` of `./sam`.
- Pin the tracked absolute fixture before `sam` loads `config.dev`; default to
  `mcr.microsoft.com/playwright:v1.62.0-noble` and `SAM_IPC=host`, while keeping
  those runtime settings overridable for diagnostics.
- Add root `verify:m51` to `package.json` with the explicit fixture root on each
  phase and the ordered check/test/build/site/NERV/publication browser commands.
  Do not install dependencies, mutate lockfiles, or nest `package-runtime.sh`.
- Add the fixture root to the spawned environment in
  `apps/site/tests/content-build-negatives.test.mjs`; preserve same-filesystem
  output and `finally` cleanup.

## 3. Run the fixture gate and correct only proven drift

- Run focused non-browser checks first, then the complete fixture gate through
  `./verify.sh`.
- Record the exact phase and diagnostic for any missing image, Docker, browser,
  or dependency prerequisite; an unavailable browser surface is not a pass.
- If tracked-fixture Playwright exposes a stale literal assertion, update only
  the expectation proven stale by that fixture and retain the semantic route,
  heading, link, viewport, and accessibility checks. Do not weaken assertions
  to accommodate external owner content. The confirmed fixture corrections are
  limited to the main-site outline count/heading sequence/link name, reader
  search words/link name, Terminal slug title, and the rendered article's
  repeated `build` grep fixture.
- Keep reports and traces in their existing ignored package directories and
  remove no unrelated generated artifacts.

## 4. Reconcile durable guidance

- Update `readme.md`, `.trellis/spec/frontend/development-runtime.md`,
  `.trellis/spec/frontend/quality-guidelines.md`, and, if needed,
  `.trellis/spec/frontend/content-workspace-contract.md` with the two content
  boundaries, command order, image/IPC defaults, report/failure behavior,
  owner-workspace command, and separate `package-runtime.sh` probe.
- Keep the current `sam` read-only mount, symlink safety, guest projection, and
  comments-disabled defaults normative.
- Update `.trellis/mainline.md` only for the already-established child/archive
  status; do not add product authorization or operational values.

## 5. Validation and review gates

Run the checks proportionate to the changed surfaces:

```sh
bash -n verify.sh
shellcheck verify.sh
shfmt -d verify.sh
./verify.sh --help
./verify.sh
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
./package-runtime.sh                 # optional separate release probe
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-28-deterministic-validation-gate
git diff --check
```

The owner-workspace and release-probe commands are run only when their inputs
are available and must remain clearly separate from the fixture evidence. Check
the final diff for generated reports, private paths, operational values,
unexpected product changes, and accidental dependency installation.

Dispatch an independent Trellis quality check after implementation. If it finds
scope drift, a skipped browser surface, or an assertion change not supported by
the tracked fixture, return to the implementation step before committing.

## 6. Completion and rollback points

1. Before adding the wrapper: preserve the clean fixture baseline and research
   evidence.
2. Before changing package/test files: confirm the wrapper fixes input ownership
   before `sam` configuration and that no owner path is recorded.
3. Before changing browser assertions: retain the fixture-only failure output and
   prove the expectation is stale against tracked content.
4. Before documentation edits: keep runtime/spec changes limited to this gate
   and its existing owner-workspace contract.
5. Before commit/archive: pass task validation, privacy/scope review, shell
   checks, and the independent Trellis quality check. A source revert is the
   rollback for all code and documentation changes; generated reports remain
   ignored and are not committed.
