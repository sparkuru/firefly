# Terminal Command Descriptor Refactor — Validation Evidence

All evidence below is limited to repository-relative paths, bounded counts, and
pass/deferred labels. It contains no credentials, private content, or external
workspace paths.

## Implementation

- Every built-in command now exports a complete descriptor from its command
  module. The registry remains an explicit import/composition allowlist with
  validation, collision detection, cloning, and freezing.
- `grep.ts` owns its parser options, including `-w` and `-E`, and two typed Help
  examples. Help detail, neutral/runtime adapters, and browser rendering carry
  examples through one generic structured shape.
- Existing completion behavior moved to descriptor callbacks and shared neutral
  helpers; the runtime name-based completion dispatch table was removed.
- The frontend code-spec records the descriptor, Help detail, validation matrix,
  test obligations, and wrong/correct extension pattern.

## Quality gates

- Terminal type-check: pass through `./sam`.
- Terminal unit and neutral-shell suites: pass, 33/33, through `./sam`.
- Site Astro check: pass, 73 files with 0 errors, warnings, or hints.
- Site static build and artifact tests: pass, 17/17. Existing CSS optimizer
  notices for the `::highlight` feature remain unrelated.
- Focused Terminal browser suite: pass, 76/76 across desktop/mobile, using the
  repository-local content fixture and the locked Playwright image.
- Task context validation: pass.
- `git diff --check`: pass.

## Environment note

The default local configuration points at an external content workspace whose
legacy filenames include numeric prefixes; existing browser assertions use the
repository fixture's unprefixed filenames. A default preview therefore reports
pre-existing fixture/content-name mismatches. The focused browser gate above
rebuilt and served the repository fixture, where all assertions pass; no source
or external content was changed.
