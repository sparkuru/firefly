# Implementation Plan: Terminal help layout

## Ordered Checklist

1. [x] Re-read the Terminal style/test contracts and confirm the clean worktree
      baseline.
2. [x] Replace the desktop `.terminal-help-command` max-content track with
      bounded flexible usage/detail tracks; preserve the mobile override.
3. [x] Add focused Playwright geometry/readability assertions for the long
      `find` help row at desktop and mobile viewports.
4. [x] Run the Terminal/site checks, production build, focused Terminal E2E,
      and diff/task validation.
5. [x] Review the final diff, update the durable frontend spec if the layout
      rule is reusable, and prepare the commit.

## Expected Files

- `apps/site/src/styles/terminal.css`
- `apps/site/tests/terminal.spec.ts`
- `.trellis/spec/frontend/hook-guidelines.md` (only if the bounded help-row
  rule is worth promoting beyond this task)
- `.trellis/spec/frontend/quality-guidelines.md` (only if a new test contract
  is needed)

## Validation Commands

```text
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts -g "commands render continuous typed results"
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-26-terminal-help-layout
```

## Review Gates

- Long `find` usage wraps, while its summary does not become vertical text.
- Existing help content and `grep` geometry remain unchanged.
- Mobile stacked help rows remain readable and contained.
- No command/runtime/metadata behavior changes are introduced.
