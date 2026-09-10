# Implementation plan: deterministic first-visit boot animation

## Ordered changes

1. Add the derived boot duration to `TerminalHome.astro` and make the inline
   marker distinguish an initialized-but-waiting controller from a missing
   controller.
2. Add a one-shot boot gate to `terminal-home.ts`: reduced-motion/completed
   fast paths, named animation-end listener, bounded fallback timer, cleanup,
   interaction guards, and the existing success/failure transition.
3. Extend the static-output contract tests without changing unrelated content
   fixtures.
4. Add fast-timeline and pre-ready interaction tests to the existing desktop /
   mobile interactive Playwright suite; retain the delayed-module and recovery
   coverage.

## Validation checklist

- `git diff --check`
- `./sam npm --prefix apps/site run check`
- `./sam npm --prefix apps/site run build`
- `./sam npm --prefix apps/site run test:content`
- `./sam npm --prefix apps/site run test:x-core`
- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- terminal.spec.ts --project=chromium-desktop-interactive --project=chromium-mobile-interactive --grep 'boot|startup|refresh|Escape'`
- `python3 ./.trellis/scripts/task.py validate 09-10-consistent-first-visit-boot-animation`

## Review gates

- Do not modify the unrelated Majo experiment or its content fixtures.
- Do not move the boot DOM before the visual gate completes.
- Verify the final diff against the current worktree before each containerized
  check so concurrent work cannot silently replace source changes.
- Record any full-suite failures caused by the concurrently changing content
  fixture separately from this boot-lifecycle change.

## Rollback point

The feature is isolated to the home component, its controller, and the related
static/browser assertions. Reverting those feature hunks restores the prior
immediate controller transition while leaving unrelated publication changes
untouched.
