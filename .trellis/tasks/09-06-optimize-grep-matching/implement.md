# Implementation plan: optimize grep word and extended matching

## Ordered checklist

- [x] Add a safe AST-to-literal helper that recognizes only literal concat nodes
      and delegates decoded literals to `literalMatcher()`.
- [x] Add a one-pass whole-word NFA hit detector that enforces both boundaries,
      excludes zero-width matches, and preserves anchors and safe state bounds.
- [x] Route `compileSafeRegex()` through the new detector while leaving detailed
      range collection bounded and match-only.
- [x] Extend Terminal tests with long absent whole-word input, boundary-invalid
      then valid candidates, zero-width patterns, escaped literal regexes, and
      `-E`/`-Ew` compatibility cases.
- [x] Run Terminal check and tests; measure the same external-workspace benchmark
      before/after and record exact commands/timings in task evidence.
- [x] Run affected site check/build and focused Terminal browser tests with the
      repository-local content fixture, then run task validation and
      `git diff --check`.
- [x] Perform the final full-scope quality review, update the relevant spec if a
      durable matcher-performance contract was learned, commit, and archive.

## Validation commands

```bash
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT="$PWD/content" \
  SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run build
FIREFLY_CONTENT_ROOT="$PWD/content" \
  SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-06-optimize-grep-matching
git diff --check
```

## Review gates

- No host `RegExp` is introduced for user patterns.
- No command/UI branch is added for `grep`, `-w`, or `-E`.
- The benchmark compares the same input corpus and command shapes, but timing
  remains evidence rather than a flaky automated threshold.
