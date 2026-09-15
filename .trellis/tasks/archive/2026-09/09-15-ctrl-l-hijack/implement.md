# Implementation Plan: Inline Cat Ctrl+L Event Ownership

## Preconditions and review gates

- [x] Keep the task in `planning` until the final planning summary is reviewed
      and explicitly approved by the owner.
- [x] Before implementation, validate the task artifacts and real context
      manifests with:
      `python3 ./.trellis/scripts/task.py validate 09-15-ctrl-l-hijack`.
- [x] After approval, start the task with:
      `python3 ./.trellis/scripts/task.py start 09-15-ctrl-l-hijack`.
- [x] Load `trellis-before-dev` and the Phase 2.1 detail before editing.

## Ordered implementation checklist

1. [x] Re-read the approved `prd.md`, `design.md`, and this plan; confirm the
       worktree is clean apart from the task artifacts and preserve unrelated
       changes.
2. [x] Update `apps/site/src/scripts/terminal-home.ts`:
       - factor the existing prompt `Ctrl+L` clear transition;
       - add the exact-key predicate and document-level handler for non-
         interactive inline `cat` stream surfaces;
       - reuse the protected target boundary and collapsed-selection guard;
       - preserve prompt behavior, modifiers, IME, native controls, history,
         announcement, and viewport settlement.
3. [x] Extend `apps/site/tests/terminal.spec.ts` with title/reading-surface
       interception, default-prevention, history retention, and native-boundary
       regressions. Keep the existing prompt-focused test intact.
4. [x] Update `.trellis/spec/frontend/content-workspace-contract.md` so the
       durable shortcut contract describes prompt and inline `cat` ownership,
       protected/native boundaries, and the page-delivery limitation.
5. [x] Run focused checks and inspect the final diff for scope, whitespace, and
       accidental generated artifacts.

## Validation commands

Run through the repository command boundary:

```text
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
python3 ./.trellis/scripts/task.py validate 09-15-ctrl-l-hijack
git diff --check
```

The site build must complete before the immutable-artifact Playwright run. Do
not count an unavailable wrapper, Docker, or browser command as a pass; record
the exact failure and use no host-side substitute as evidence.

## Validation evidence

- [x] `./sam npm --prefix apps/site run check` — 0 errors, 0 warnings, 0 hints.
- [x] `./sam npm --prefix apps/site run test:content` — 78 passed, 0 failed.
- [x] `./sam npm --prefix apps/site run build` — 125 pages built; static output
      tests 18/18 passed. Existing CSS optimizer warnings for `::highlight`
      remain unrelated to this task.
- [x] Fixed Playwright Terminal suite — 86/86 passed across desktop and mobile
      interactive projects.
- [x] `python3 ./.trellis/scripts/task.py validate 09-15-ctrl-l-hijack` and
      `git diff --check` passed.

## Risk and rollback points

- **Event-boundary risk:** a broad document handler could steal browser or
  assistive-technology shortcuts. Keep the exact key/modifier, target,
  protected-control, composition, selection, and cancelable-event guards
  together and test each boundary.
- **State-path risk:** duplicate clear logic could diverge from prompt `Ctrl+L`.
  Use one local clear action and retain the existing `clearTranscript` path.
- **Focus/history risk:** clearing after `cat` removes the focused title from
  the DOM. Assert prompt focus and ArrowUp history immediately afterward.
- **Browser limitation:** real address-bar interception may prevent DOM event
  delivery. The product contract and test evidence must state this explicitly.
- **Rollback:** revert only the controller, Terminal browser test, and frontend
  contract changes; no content, route, or persistent state needs recovery.
