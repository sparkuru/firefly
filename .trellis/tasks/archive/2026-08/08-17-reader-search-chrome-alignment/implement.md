# Implementation plan

## Order

1. Update the reader contract and task research notes with the committed versus
   transient search lifecycle and the prompt-row visual contract.
2. Adjust `ReaderStatus.astro` only if markup needs a stable row hook; otherwise
   keep the existing semantic form structure.
3. Update `terminal-reader.ts` so opening search temporarily removes the
   committed sticky marker, and submitting/cancelling restores the marker or
   clears it atomically without changing match collection behavior.
4. Refactor the shared semantic and Terminal reader form styles to a continuous
   bottom-rule row with `:focus-within`, an in-row fixed prefix, and token-backed
   active sticky surfaces.
5. Extend `apps/site/tests/reader.spec.ts` with repeated `/` and `?` cycles,
   row geometry/focus assertions, and sticky lifecycle checks for Terminal and
   semantic readers.
6. Run focused checks, inspect diagnostic screenshots at configured desktop and
   mobile widths, then run the full main-site validation profile.

## Files in scope

- `apps/site/src/components/ReaderStatus.astro`
- `apps/site/src/scripts/terminal-reader.ts`
- `apps/site/src/styles/global.css`
- `apps/site/src/styles/terminal.css`
- `apps/site/tests/reader.spec.ts`
- `.trellis/spec/frontend/content-workspace-contract.md`

## Safety notes

- Do not alter the canonical Markdown, route generation, CSS Highlight range
  collection, or global keyboard ownership rules.
- Do not claim automated visual-regression or assistive-technology coverage;
  screenshots remain diagnostic evidence and human visual review remains a
  residual.

## Completion evidence — 2026-08-17

- `./sam npm --prefix apps/site run check`: passed, 0 errors, 0 warnings, 0
  hints.
- `./sam npm --prefix apps/site run test:content`: passed, 23/23.
- `./sam npm --prefix apps/site run test:x-core`: passed, 5/5.
- `./sam npm --prefix apps/site run build`: passed; static-output checks passed
  12/12. Astro emitted its existing CSS optimizer warnings for the standard
  `::highlight(...)` pseudo-element syntax.
- Focused reader Playwright: passed 32/32 across desktop/mobile interactive
  projects. This includes both search directions, repeated cycles, sticky
  background/style metrics, command editing, semantic fragment entry, and
  responsive containment.
- Full main-site Playwright: passed 98/98 across static and interactive
  desktop/mobile projects.
- `git diff --check`: passed.
- `python3 ./.trellis/scripts/task.py validate
  .trellis/tasks/08-17-reader-search-chrome-alignment`: passed; only the known
  context-injection size warning for the large content-workspace spec remains.
