# Optimize grep matching — validation evidence

## Implementation

- grep.ts now recognizes decoded literal-only safe ASTs and delegates them to
  the bounded literal matcher.
- General whole-word safe-regex test() uses one left-to-right NFA state-set
  scan with left/right ASCII word-boundary checks and zero-width exclusion.
- Detailed range collection remains bounded and is reached only after a line
  passes the hit precheck.
- Focused neutral-shell coverage includes long absent input, invalid-then-valid
  boundaries, escaped literal-safe regexes, zero-width repetition, and the
  existing -E/-Ew behavior.

## Quality gates

- Terminal type-check: pass, ./sam npm --prefix presentations/terminal run check.
- Terminal tests: pass, 33/33, ./sam npm --prefix presentations/terminal run test.
- Site Astro check: pass, 73 files with 0 errors, warnings, or hints.
- Site static build: pass with the repository-local content fixture; 17/17
  static-output tests passed. Existing CSS optimizer notices for ::highlight
  remain unrelated.
- Focused Terminal browser suite: pass, 76/76 across desktop/mobile with the
  locked Playwright image and repository-local content fixture.
- Task validation: pass,
  python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-06-optimize-grep-matching.
- git diff --check: pass.

## Benchmark

The benchmark imported the built Terminal command directly, constructed the
same bounded public VFS shape from the configured workspace's posts and pages
Markdown files, and ran each case three times in one Node process. Only
counts, match totals, and timings were printed. Corpus: 153 documents, 27,555
lines, 871,982 line-text characters, maximum line length 1,360.

Command: ./sam node .trellis/tasks/09-06-optimize-grep-matching/research/grep-benchmark.mjs
The wrapper supplies the configured FIREFLY_CONTENT_ROOT; the harness calls
executeGrep(context, commandArguments(...)) for each case. The configured path
is intentionally omitted from this repository evidence.

| Case | Before baseline | After samples (ms) | After min–max (ms) | Last-run matches |
| --- | ---: | ---: | ---: | ---: |
| grep cat | 66.6–77.5 | 7.8, 5.3, 4.9 | 4.9–7.8 | 200 |
| grep -w cat | 680.2–698.4 | 7.3, 6.9, 4.7 | 4.7–7.3 | 44 |
| grep -E 'cat|dog' | 104.0–106.5 | 105.7, 107.9, 103.5 | 103.5–107.9 | 202 |
| grep -Ew 'cat|dog' | 700.4–710.5 | 68.3, 64.5, 59.7 | 59.7–68.3 | 44 |
| grep -w zzzzzz | 677.8–684.3 | 2.5, 2.3, 2.4 | 2.3–2.5 | 0 |
| grep -E zzzzzz | 47.8–48.0 | 1.4, 1.6, 2.9 | 1.4–2.9 | 0 |

The whole-word pause is materially reduced on the same corpus: grep -w cat
falls from roughly 0.68–0.70 seconds to roughly 0.004–0.008 seconds, and
grep -Ew 'cat|dog' falls from roughly 0.70–0.71 seconds to roughly
0.060–0.068 seconds. Matching counts and truncation state stayed stable for
the compared cases.
