# Implementation plan

## Order

1. Update the durable reader contract and task-local UI/UX research with the
   permanent sticky lifecycle and visible-feedback ownership.
2. Move sticky positioning and opaque surface styles from the committed-search
   selector to the base semantic and Terminal reader-status selectors.
3. Preserve the controller's existing feedback paths; only adjust code if the
   browser contract shows a mode/action is not represented by the panel.
4. Extend `apps/site/tests/reader.spec.ts` with normal-mode sticky assertions,
   action-to-message coverage, search duplicate suppression, active-unit
   visibility, semantic fragment entry, and desktop/mobile containment.
5. Run focused checks and inspect diagnostic browser evidence, then run the
   complete main-site validation profile.
6. Update the task completion evidence, commit all task-scoped changes, archive
   the task, and record the session journal.

## Files in scope

- `apps/site/src/components/ReaderStatus.astro` (only if markup needs a stable
  status hook)
- `apps/site/src/scripts/terminal-reader.ts` (only if existing feedback paths
  need a bounded correction)
- `apps/site/src/styles/global.css`
- `apps/site/src/styles/terminal.css`
- `apps/site/tests/reader.spec.ts`
- `.trellis/spec/frontend/content-workspace-contract.md`

## Validation commands

```bash
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-17-reader-persistent-status-panel
```

## Safety notes

- Do not change route generation, canonical Markdown, search-range collection,
  global keyboard exclusions, or the JavaScript-disabled document surface.
- Do not claim automated screenshot-regression or assistive-technology
  coverage; screenshots remain diagnostic and human visual review remains a
  residual.
