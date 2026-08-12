# Trellis Plus Initialization Plan

## Preconditions

- Keep the task in `planning` until the user approves the final planning summary and the main session runs `task.py start`.
- Snapshot `git status --porcelain` before edits. Treat all pre-existing bootstrap paths as unrecognized unless this task explicitly owns them below.
- Load the task artifacts, curated context, Trellis Plus references, `dev-it-in-docker`, and `code-shellscript` before implementation.
- Do not commit, archive, push, force-track ignored paths, run `trellis update`, or create `.trellis/mainline.md`.

## Ordered Implementation

1. Initialize project-local UUPM for Codex.
   - Run `uipro init --ai codex` without force/global/all flags.
   - Inspect the generated diff and ensure unrelated `.codex/` files remain unchanged.
   - Read the generated UUPM `SKILL.md`, verify its referenced local paths, and run its cheapest help check.
   - Confirm `.codex/` remains ignored/untracked; do not force-add it.

2. Normalize the existing Docker development wrapper.
   - Rename the root `hako` file to `sam`; preserve and synchronize the existing `sam`/`SAM_*`/`sam.*` identity in `sam` and `dev.sh`.
   - Add a validated `SAM_IPC` override while keeping private IPC as the default.
   - Preserve executable bits, UID/GID mapping, `.devhome`, `--rm`, `--init`, port configuration, exact-label teardown, English output, and strict Bash behavior.
   - Do not add a Codex rules file or broaden Docker/shell/package-manager permissions.

3. Bootstrap focused Playwright validation.
   - Through `./sam`, install exact `@playwright/test@1.62.0` as an experiment-local dev dependency and update `experiments/nerv/package-lock.json`.
   - Add the experiment and root npm scripts, Playwright config, focused NERV test, and report/result ignore entries.
   - Configure the Astro `webServer`, `/lab/nerv/` base URL, desktop/mobile Chromium projects, first-retry trace, diagnostic screenshots, HTML report, and stable artifact directories.
   - Keep fixtures credential-free and local; do not add snapshot baselines or change the NERV UI to make the test pass.

4. Inject durable Trellis workflow behavior.
   - Patch `no_task`, both planning variants, and both in-progress variants with concise Trellis Plus routing.
   - Add phase-level Docker/UUPM/Playwright guidance once with short breadcrumb pointers.
   - Add submit-ready human review classification and targeted feedback format before Phase 3.4 commit execution.
   - Add selective Codex completion-summary/trailer logic before `git commit`, excluding mechanical, user-authored, archive, and journal commits.
   - Preserve existing statuses, mandatory phase gates, sub-agent protocol, and commit confirmation.

5. Add repository validation profiles.
   - Append the project and Playwright profiles to `.trellis/spec/frontend/index.md` in English.
   - Record the exact commands, execution mode, setup/image pair, readiness/base URL, browser projects/viewports, fixture boundary, accessibility/visual policy, artifact locations, optional checks, and manual residuals.
   - Do not fill other placeholder frontend specs owned by `00-bootstrap-guidelines`.

6. Review the complete diff for scope and update resilience.
   - Verify each Trellis Plus section exists once and sits in the intended phase.
   - Confirm no lifecycle hook, task schema, new status, `.trellis/mainline.md`, `update.skip`, broad allow rule, or unrelated file change was introduced.
   - Record `.trellis/workflow.md` as an update-sensitive template customization and no backup recovery as used.

## Validation Commands

Run cheap static checks before Docker/network-dependent checks:

```bash
bash -n sam dev.sh
shellcheck sam dev.sh
shfmt -d sam dev.sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-12-trellis-plus-init
git diff --check
```

Then validate the wrapper and application through Docker:

```bash
./sam node --version
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e
./dev.sh down
```

Validate UUPM and policy boundaries:

```bash
test -f .codex/skills/ui-ux-pro-max/SKILL.md
git check-ignore -v .codex
test ! -e .trellis/mainline.md
rg -n "Trellis Plus:" .trellis/workflow.md .trellis/spec/frontend/index.md
test ! -e hako
rg -n "hako|HAKO_" sam dev.sh
```

The final `rg` must return no stale default-wrapper matches. If Docker, image download, npm registry access, or browser startup is unavailable, preserve the exact command and error, classify Playwright as unavailable rather than passed, and request only the smallest replacement evidence.

## Review and Rollback Gates

- Stop and return to planning if UUPM would overwrite existing project-local skill files, the installed CLI output contradicts the approved scope, or Playwright requires a broader runtime/security change.
- Stop before modifying UI behavior merely to satisfy the bootstrap test; adjust the assertion to the existing semantic contract or request a scope decision.
- Patch around all pre-existing work. Never revert unrecognized bootstrap files.
- Roll back the `hako` -> `sam` rename and `dev.sh` contract together if wrapper validation fails.
- Roll back the complete Playwright slice together if its pinned image/dependency contract cannot be made reproducible.

## Submit-Ready Gate

After the Trellis check agent completes a full-scope pass, classify human review as required, optional, or not needed before any Phase 3.4 commit plan. A missing Docker/Playwright/UUPM material check makes review or explicit follow-up required. If all focused automated checks pass and only workflow/configuration files changed, state why additional manual UI review adds no signal.
