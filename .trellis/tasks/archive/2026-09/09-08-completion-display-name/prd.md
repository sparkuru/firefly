# Fix metadata-aware Terminal completion

## Goal

Make Terminal Tab completion agree with the metadata-first labels now shown by
`ls`, while preserving physical Markdown paths as the only values inserted and
resolved by `cat`, `vim`, and `ls`.

## Requirements

- A document completion can match its non-empty metadata title/display name as
  well as its physical path or filename. Title matching is case-insensitive;
  physical path matching keeps its existing behavior.
- When a title match is selected, completion inserts the corresponding safe
  physical virtual path, so command execution remains unchanged and existing
  links/routes are not reinterpreted.
- Completion candidates remain useful when multiple documents share a title:
  the visible candidate includes enough physical-path context to distinguish
  them, while the inserted value remains the exact physical operand.
- Directory and experiment completion keep their current path-only behavior.
- A missing/empty metadata title continues to use the physical filename stem
  as its display label and completion fallback.
- Keep the change bounded to the presentation completion contract and its
  browser rendering/tests; do not rewrite blog source files or change route
  resolution.

## Acceptance Criteria

- [x] `cat`/`vim` completion matches a title prefix such as `do` and inserts
      the matching physical Markdown path.
- [x] `ls` completion matches the same display names shown by `ls`, while
      physical filename/path completion still works.
- [x] Ambiguous title matches show human-readable labels with physical context
      and selecting one commits the corresponding physical operand.
- [x] Directory, experiment, unsafe-input, and existing physical-path
      completion behavior remains unchanged.
- [x] Unit tests cover unique title matches, ambiguous duplicate titles,
      filename fallback, nested/root path forms, and inserted physical values.
- [x] Relevant Terminal/site checks and `git diff --check` pass.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.

## Verification Note

- The Terminal/site unit, type, content, build, and static-output checks pass.
- Terminal Playwright was attempted, but the `node:22-alpine` test container
  cannot launch the downloaded glibc Chromium binary (`ENOENT` for the dynamic
  loader); all 76 failures occur before a test starts.

### Follow-up verification — 2026-09-08

The browser blocker is resolved with the repository's pinned
`mcr.microsoft.com/playwright:v1.62.0-noble` image and `SAM_IPC=host`.
The tracked content fixture build passed Astro check with zero diagnostics,
generated 28 pages, and passed all 17 static-output checks. The existing two
CSS optimizer notices for `::highlight` remain unrelated.

The first browser run passed 72/76 and exposed two test locator defects on
both desktop and mobile: the `ai/` directory substring also matched document
accessible paths, and the prompt locator retained the old cwd-dependent name
after `cd ai`. Directory matching is now exact; the prompt uses its stable ID
with explicit accessible-name assertions before and after cwd changes.
The complete Terminal rerun passed 76/76 in 18.3 seconds without retries,
including the case-insensitive title completion and physical-path assertion.
No product runtime code changed in this follow-up.

Reproduce from the repository root:

```sh
FIREFLY_CONTENT_ROOT="$PWD/content" \
  SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" \
  SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- terminal.spec.ts --workers=2
```
