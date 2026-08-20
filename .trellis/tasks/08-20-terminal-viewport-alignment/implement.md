# Implementation plan

## Order

1. Add the transient initial-session marker and clear it at the first rendered
   command/clear path without changing history, completion, or document effects.
2. Replace the non-document record-top scroll offset with the approved centered
   reading-band calculation and retain the oversized-output fallback.
3. Add bounded tall-viewport CSS compensation for the boot log plus initial
   prompt; keep the existing empty-session centering rule unchanged.
4. Extend `apps/site/tests/terminal.spec.ts` with a 2048×1244 geometry flow for
   startup, short output, long output, and clear; preserve the existing desktop,
   mobile, reduced-motion, and no-overflow assertions.
5. Promote the stable viewport rule into the relevant frontend specs after
   verification and record the exact browser evidence in the task check.

## Files in scope

- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/styles/terminal.css`
- `apps/site/tests/terminal.spec.ts`
- `.trellis/spec/frontend/hook-guidelines.md`
- `.trellis/spec/frontend/type-safety.md`

## Validation commands

- `./sam npm --prefix presentations/terminal run check`
- `./sam npm --prefix presentations/terminal run test`
- `./sam npm --prefix apps/site run check`
- `./sam npm --prefix apps/site run build`
- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts`
- `git diff --check`

## Risk checkpoints

- Verify centered geometry using `getBoundingClientRect()` after smooth motion
  settles; use reduced motion for deterministic assertions where appropriate.
- Verify the first boot marker does not remain after `pwd`, `help`, `tree`,
  `clear`, `cls`, or `Ctrl+L`.
- Verify document effects still focus their title and that mobile prompt
  visibility/history/completion behavior is unchanged.
