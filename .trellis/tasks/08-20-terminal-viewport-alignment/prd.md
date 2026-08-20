# Terminal home viewport alignment

## Goal

Keep the Terminal home prompt visually continuous across startup, the first
command, subsequent output, and `clear`/`Ctrl+L`, especially on tall desktop
viewports such as 2K displays. The user should not see the empty-session
centering rule and the output-scrolling rule fight each other.

## Confirmed facts

- The empty session uses `[data-terminal-session-empty]` and CSS grid alignment
  to center the command row within the home viewport.
- Non-document command output currently calls `settleCommandOutput()` from
  `apps/site/src/scripts/terminal-home.ts`, which scrolls the current record
  start near the viewport top whenever the record and prompt fit together.
- `clear`, `cls`, and prompt `Ctrl+L` remove the transcript, restore the empty
  session state, and center the prompt again.
- Existing browser coverage asserts centered empty-session geometry and keeps
  the fresh prompt visible after output; those assertions must remain valid.
- The user's 2K screenshots show the resulting discontinuity: startup/short
  output, long output, and post-clear states occupy visibly different vertical
  bands even though they are all the same Terminal session.
- The approved product decision is a stable reading band: initial/empty prompt
  centered, short output and prompt kept in that band, long output scrolled only
  as needed to keep the output start and fresh prompt readable, and clear
  returning to the same empty-state placement.

## Requirements

- R1: Establish one documented viewport policy for the home prompt across the
  empty startup state, non-document output, and transcript clearing. The
  approved stable reading band must preserve readable command output while
  avoiding a gratuitous jump between the centered empty state and the first
  settled output. The connecting boot staging surface and the ready session
  must also share their initial log geometry when the boot record is relocated.
- R2: Keep the prompt focused after command submission and preserve the current
  behavior for document results, reduced-motion preferences, mobile viewports,
  history, completion, and keyboard shortcuts.
- R3: Do not introduce document-level horizontal overflow or a permanently
  scroll-locked page. Existing native recovery/static markup must continue to
  work without JavaScript.
- R4: Add browser geometry assertions that exercise startup, a short command,
  a long command, and `clear`/`Ctrl+L` at a tall desktop viewport; retain the
  existing mobile and empty-session coverage.

## Out of scope

- Redesigning Terminal colors, typography, prompt text, command output, or
  completion behavior.
- Changing document-reader settlement or the virtual filesystem/runtime.
- Replacing native page scrolling with a third-party terminal viewport.

## Acceptance Criteria

- [x] The final planning decision defines an observable vertical policy for
      connecting/ready startup, short output, long output, and clear states.
- [x] At the configured tall desktop viewport, the prompt and the relevant
      output occupy the intended readable band without the current top/center
      discontinuity; repeated commands remain stable.
- [x] `clear`, `cls`, and `Ctrl+L` return to the same intentional empty-state
      placement, while history and focus behavior remain intact.
- [x] Existing Terminal type-check, unit tests, site check/build, and desktop
      plus mobile Playwright suites pass; the new geometry assertions pass.
- [x] `git diff --check` passes and no unrelated task changes are included.

## Decision status

Resolved: use the stable centered reading band described above. Traditional
bottom-of-output cursor positioning is out of scope for this task.

## Completion evidence

- Terminal TypeScript check and unit suite: passed, 29/29.
- Main-site Astro check: passed with 0 errors, 0 warnings, and 0 hints.
- Main-site build/static output checks: passed, 14/14.
- Terminal home Playwright: passed, 66/66 across desktop and mobile projects,
  including the 2048×1244 reduced-motion geometry flow and pending-startup
  staging-to-session log-top continuity assertion.
- Full site Playwright: passed, 122/122 across static, Terminal, and reader
  projects.
- `git diff --check`: passed. Existing CSS optimizer warnings for `::highlight`
  remain unrelated and unchanged.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
