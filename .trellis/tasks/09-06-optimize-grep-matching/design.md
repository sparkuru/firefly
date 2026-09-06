# Design: optimize grep word and extended matching

## Boundaries

The change is confined to `presentations/terminal/src/commands/grep.ts` and
its Terminal unit tests unless validation exposes a contract-level regression.
The command remains synchronous and bounded; the browser/UI and command registry
do not change.

## Current data flow

`executeGrep()` compiles one matcher per command, walks the bounded public VFS
resources, calls `matcher.test(line)` for each source line, and only then calls
`matcher.ranges(line)` to build the structured `GrepMatch`. In whole-word mode,
`test()` currently computes all ranges for every line, even when no match exists.

## Proposed matching flow

1. Parse the pattern with the existing safe parser and compile the same AST/NFA
   limits.
2. If the AST is a concat of literal atoms only, reconstruct its decoded literal
   value and delegate to `literalMatcher()`; this covers escaped literals while
   leaving metacharacters/operators in the NFA path.
3. For a general safe NFA with whole-word enabled, run a left-to-right search:
   - before consuming a position, add the NFA start closure only when the
     preceding character is absent or non-word;
   - inspect an already-running closure for an accepting state only when the
     following character is absent or non-word;
   - advance consuming states once, carrying all candidate starts together;
   - do not accept before at least one input character has been consumed, which
     excludes zero-width matches.
4. Keep the existing bounded range collector for detailed ranges after `test()`
   succeeds. It is now paid only by matching lines (and remains capped at 64
   ranges), not by every scanned line.

The NFA state set does not need to retain each candidate's origin: every origin
added by the new start rule has a valid left boundary, and an accepting state at
a valid right boundary therefore represents at least one valid whole-word
candidate. The existing range pass still determines exact source offsets.

## Compatibility notes

- `-E` remains an explicit parser flag and conflict check; it does not switch to
  JavaScript regex or change the existing default syntax.
- The decoded-literal fast path must use AST values, not the raw source pattern,
  so `grep '\+'` matches `+` exactly as the safe parser already does.
- Existing `literalMatcher()` range offsets and case-folding behavior are reused
  rather than duplicated.
- Resource walking, truncation, structured effects, announcements, and browser
  rendering remain untouched.

## Risks and rollback

- The main risk is a boundary or zero-width mismatch between the one-pass hit
  detector and the detailed range collector. Add focused tests and compare both
  outputs before committing.
- If the literal reconstruction changes an edge case, remove only that fast path
  and retain the independent whole-word scan; the NFA behavior remains the
  compatibility fallback.
- Rollback is a single-file implementation revert plus test revert; no persisted
  data or generated publication artifacts are involved.
