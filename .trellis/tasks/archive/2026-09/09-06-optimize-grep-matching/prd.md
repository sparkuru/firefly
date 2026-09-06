# Optimize grep word and extended matching

## Goal

Remove the synchronous terminal pause caused by `grep -w` (and the `-Ew`
combination) when scanning the public workspace, without changing grep's safe
matching language, boundary semantics, structured highlights, or resource
limits.

## Background and confirmed facts

- The current safe matcher calls `collectRanges()` from `test()` for every line
  when whole-word mode is enabled. `collectRanges()` starts a complete NFA
  search at each character position, so long non-matching lines can take
  quadratic time.
- A local benchmark over the configured workspace (153 Markdown documents,
  27,555 lines, approximately 872k characters) measured roughly 70 ms for
  `grep cat`, 105 ms for `grep -E 'cat|dog'`, and 680–700 ms for
  `grep -w cat` / `grep -Ew 'cat|dog'`.
- `-E` is currently an explicit spelling of the existing safe extended-regex
  subset; changing the language or switching to the host JavaScript `RegExp`
  engine would be incompatible with the prior command contract.

## Requirements

### R1. Linear whole-word hit detection

- Replace the whole-word `test()` path with a single left-to-right safe-NFA
  scan that starts candidates only at valid word boundaries and accepts only at
  valid ending boundaries.
- Preserve ASCII word characters (`[A-Za-z0-9_]`), punctuation boundaries,
  case-insensitive matching, anchors, alternation, repetition, classes, and
  the existing safe pattern/state bounds.
- Zero-width regex matches must remain non-matches in whole-word mode.
- Keep `ranges()` and `test()` consistent. Existing bounded range collection may
  remain the source of detailed highlight ranges after a hit, but it must still
  report every accepted range and must not reintroduce an all-line quadratic
  precheck.

### R2. Avoid redundant NFA work for literal-safe patterns

- When a safe regex parses to a literal string (including escaped literal
  characters), use the existing bounded literal matcher for matching and
  ranges. This optimization must not reinterpret regex metacharacters or alter
  the reported source pattern.
- Patterns that use regex operators, classes, anchors, or unsupported syntax
  continue through the safe NFA compiler and its existing limits.

### R3. Compatibility and safety

- Preserve `-i`, `-n`, `-F`, `-w`, `-E`, option clustering/permutation, stdin and
  named-resource behavior, canonical paths, truncation limits, and all current
  error messages unless a test demonstrates an existing inconsistency.
- Do not use native JavaScript regular expressions for user pattern execution,
  add asynchronous UI machinery, or widen the public-resource scope.

### R4. Validation and evidence

- Add focused unit coverage for long non-matching whole-word input, mixed
  boundary candidates, zero-width patterns, escaped literal-safe regexes, and
  the existing `-E` combinations.
- Run the Terminal check/tests and the affected site check/build/browser tests
  through `./sam`; record a repeatable before/after benchmark without making a
  wall-clock assertion part of the test suite.

## Acceptance Criteria

- [ ] Whole-word matching produces the same accepted lines and highlight ranges
      as before for existing fixtures and new boundary/zero-width cases, while
      its per-line hit test is one-pass rather than one full search per
      character position.
- [ ] Literal-safe regexes, including escaped literals, use the bounded literal
      matcher without changing their observable output; operator-bearing
      patterns still use the safe NFA and reject unsafe constructs.
- [ ] `grep -E`, `grep -w`, and `grep -Ew` remain compatible with current parser,
      pipeline, resource, and error behavior, including `-E` + `-F` rejection.
- [ ] Terminal type-check/tests, site check/build, focused browser coverage,
      task validation, and `git diff --check` pass; benchmark evidence shows
      the reported whole-word pause is materially reduced on the same content
      fixture.

## Out of scope

- Basic-regular-expression compatibility, Unicode word segmentation, or a new
  regex dialect.
- Native JavaScript regex execution, worker-thread/off-main-thread execution,
  renderer redesign, command registry changes, or changes to public-resource,
  line, match, and output limits.
