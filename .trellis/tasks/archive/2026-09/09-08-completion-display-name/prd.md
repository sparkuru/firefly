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
