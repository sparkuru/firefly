# Implementation Plan: Initial Terminal Ctrl+L Ownership

## Preconditions and review gates

- [x] Keep the task in `planning` until this plan and the final summary are
      explicitly approved by the owner.
- [x] Before implementation, validate task manifests and load the frontend
      coding context with `trellis-before-dev`.
- [x] After approval, start the task with:
      `python3 ./.trellis/scripts/task.py start 09-16-ctrl-l-initial-hijack`.

## Ordered implementation checklist

1. [x] Re-read `prd.md`, `design.md`, and the curated manifests; confirm the
       worktree is clean apart from this task and preserve unrelated changes.
2. [x] Update `apps/site/src/components/TerminalHome.astro`:
       - extend the inline startup marker with an exact, cancelable,
         non-composing `Ctrl+L` capture guard;
       - preserve native startup controls;
       - record a pending clear and remove the guard when startup leaves
         `connecting`.
3. [x] Update `apps/site/src/scripts/terminal-home.ts`:
       - generalize the ready-state clear-target predicate to the home
         surface;
       - retain protected target, selection, modifier, composition,
         cancelable-event, and `defaultPrevented` boundaries;
       - consume the pending startup marker after the shell becomes ready;
       - reuse the existing clear state transition and preserve prompt/history
         behavior.
4. [x] Extend `apps/site/tests/terminal.spec.ts` with startup-delivery,
       ready-initial-surface, default-prevention, focus/history, and native
       boundary regressions. Keep existing prompt and inline-`cat` coverage.
5. [x] Update `.trellis/spec/frontend/content-workspace-contract.md` with the
       startup/initial-surface contract and the hard browser pre-DOM boundary.
6. [x] Capture the repeat-bug prevention rule in
       `.trellis/spec/guides/cross-layer-thinking-guide.md`; no template mirror
       exists in this repository.
7. [x] Run focused checks, inspect the final diff, and record exact evidence.

## Validation commands

Run through the repository command boundary:

```text
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
python3 ./.trellis/scripts/task.py validate 09-16-ctrl-l-initial-hijack
git diff --check
```

The site build must complete before the immutable-artifact Playwright run.
Browser/Node checks must use `./sam`; host-side substitutes are not evidence.

## Risk and rollback points

- **Startup capture risk:** keep the inline guard minimal and limited to the
  visible home surface so it does not steal fallback/native controls.
- **State timing risk:** consume the pending marker only after
  `interactiveReady` is true and reuse `clearCommandTranscript()` rather than
  duplicating state changes.
- **Shortcut boundary risk:** do not broaden ownership to canonical reader
  pages or claim control over browser/OS shortcuts consumed before DOM
  delivery.
- **Rollback:** revert the startup marker, controller, browser test, and
  frontend contract together; no persistent data or migration recovery is
  required.

## Validation evidence

- `./sam npm --prefix apps/site run check` — 0 errors, 0 warnings, 0 hints.
- `./sam npm --prefix apps/site run test:content` — 78 passed, 0 failed.
- `./sam npm --prefix apps/site run build` — 125 pages built; static output
  tests 18/18 passed. Existing CSS optimizer warnings for `::highlight`
  selectors remain unrelated.
- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts --reporter=dot` — 90 passed across desktop and mobile interactive projects.
- `python3 ./.trellis/scripts/task.py validate 09-16-ctrl-l-initial-hijack` and
  `git diff --check` passed.
