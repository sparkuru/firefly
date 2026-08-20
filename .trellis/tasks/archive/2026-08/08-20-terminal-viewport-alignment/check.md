# Terminal viewport alignment check

## Scope reviewed

- Stable centered reading-band settlement for fitting non-document output.
- Prompt-visible fallback for output taller than the viewport.
- Bounded high-viewport startup offset shared by the connecting staging surface
  and ready boot session, with marker removal after the first result or any
  clear path.
- Preservation of document-title settlement, focus, reduced motion, mobile
  containment, history, completion, IME, and native fallback behavior.

## Verification

- `./sam npm --prefix presentations/terminal run check` — passed.
- `./sam npm --prefix presentations/terminal run test` — passed, 29/29.
- `./sam npm --prefix apps/site run check` — passed, 0 errors/warnings/hints.
- `./sam npm --prefix apps/site run build` — passed, static checks 14/14.
- Focused startup/2K geometry Playwright — passed, 4/4 across desktop/mobile;
  pending startup runs at 2048×1244 and asserts staging/ready `logTop` parity.
- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts` — passed, 66/66 across desktop/mobile interactive projects.
- Full site Playwright (`./sam npm --prefix apps/site run test:e2e`) — passed,
  122/122 across static, Terminal, and reader projects.
- `git diff --check` — passed.
- Shared frontend contracts were re-scanned and synchronized: the former
  record-start settlement wording in `content-workspace-contract.md`,
  `index.md`, and `quality-guidelines.md` now describes the stable reading band.

The focused geometry tests use a controlled 2048×1244 viewport with reduced
motion and cover connecting startup, the ready boot record, `pwd`, long `grep`,
and `clear`; the pending-startup assertion also requires the relocated log's
top edge to remain within 1px of its staging position. No screenshot baseline
or automated accessibility scanner is configured; the remaining residual is
subjective visual review on the owner's actual 2K browser.
