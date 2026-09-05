# Add grep word and extended flags

## Goal

Extend the browser Terminal's bounded `grep` command with familiar whole-word
and explicit extended-regular-expression flags without weakening its safe
custom matcher, changing its public-resource boundary, or breaking existing
regular-expression commands.

## Background

- `grep` currently accepts `-i`, `-n`, and `-F` through the shared bounded argv
  parser.
- Its default matcher is already a custom non-backtracking extended-regex-like
  subset supporting alternation, groups, repetition, classes, and anchors.
- Existing commands rely on those expressions working without `-E`, so changing
  the default to basic regular expressions would be incompatible.
- Structured grep rendering already consumes matched ranges and does not need a
  new effect shape.

## Requirements

### R1. Whole-word matching

- Accept `-w` and `--word-regexp` in leading, trailing, and clustered option
  forms supported by the existing argv parser.
- Apply whole-word selection to both fixed-string and safe-regex modes.
- Define word characters consistently with the existing safe matcher `\w` as
  ASCII `[A-Za-z0-9_]`; a match is accepted only when each adjacent character
  outside the matched range is absent or is not a word character.
- Apply the boundary predicate while searching, not by filtering the final
  bounded highlight list, so earlier rejected candidates cannot hide a later
  valid whole-word match.
- Keep `test()` and rendered `ranges()` consistent. Zero-width matches do not
  count as whole-word matches.

### R2. Explicit extended-regex mode

- Accept `-E` and `--extended-regexp` as an explicit spelling of the existing
  safe extended-regex-like mode.
- Preserve the current safe matcher and all pattern/depth/repetition/state
  bounds; do not use the host JavaScript `RegExp` engine for user patterns.
- Preserve existing regex behavior when `-E` is omitted.
- Reject `-E` combined with `-F` with a bounded deterministic error instead of
  silently choosing a matcher mode.

### R3. Help, compatibility, and validation

- Update registry metadata, help usage, durable Terminal command contracts,
  unit tests, runtime adapter tests, and the browser help assertion.
- Preserve `-i`, `-n`, `-F`, stdin/pipeline behavior, canonical path reporting,
  structured highlights, no-result effects, and all resource/line/match/output
  work limits.
- Keep tracked defaults, site content, and unrelated commands unchanged.

## Acceptance Criteria

- [x] `grep -w` matches standalone ASCII words and punctuation-delimited words,
      but not substrings inside `[A-Za-z0-9_]` words; fixed-string, regex,
      case-insensitive, stdin, and named-resource cases are covered.
- [x] Whole-word matching returns only boundary-valid highlight ranges, can find
      a later valid candidate after an earlier boundary-invalid candidate, and
      treats zero-width regex matches as no match.
- [x] `grep -E 'a|b'` uses the existing safe matcher and existing regex commands
      without `-E` remain compatible.
- [x] `-E` plus `-F`, unsupported regex constructs, and unknown flags fail with
      bounded errors and no partial grep effect.
- [x] Short clusters, interspersed options, both long aliases, `--`, help output,
      and browser help geometry remain covered.
- [x] Terminal check, unit tests, build, applicable browser tests, task
      validation, and `git diff --check` pass through project boundaries.

## Out of Scope

- A basic-regular-expression mode or strict byte-for-byte GNU/POSIX grep
  emulation.
- Unicode word segmentation or locale-dependent word characters.
- Native JavaScript regular expressions, backreferences, lookaround, or other
  constructs outside the existing safe subset.
- Changes to grep's structured effect schema, renderer, resource scope, or work
  limits.
