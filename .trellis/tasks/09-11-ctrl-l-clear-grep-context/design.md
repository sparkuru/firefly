# Technical Design: Ctrl+L and grep context output

## Scope and boundary

The `Ctrl+L` behavior is already implemented in the site controller and is
treated as a regression-only requirement. No new shortcut abstraction or
configuration surface is needed.

The implementation target is the framework-neutral Terminal package, with the
site runtime and renderer updated as consumers of the resulting typed payload:

```text
argv
  -> grep argument parser
  -> executeGrep / GrepReport
  -> neutral stdout + structured grep rows
  -> Terminal runtime adapter
  -> text pipeline or site DOM renderer
```

The command layer remains the single owner of matching, context-window
calculation, output limits, and GNU-style delimiters. The runtime and browser
layers only adapt or render the typed result; they must not recalculate context
ranges.

## Command arguments and semantics

`grep` will expose:

```text
grep [-inFwE] [-A NUM] [-B NUM] [-C NUM] <pattern> [path ...]
-A NUM, --after-context NUM    trailing context
-B NUM, --before-context NUM   leading context
-C NUM, --context NUM          leading and trailing context
```

The existing generic argv parser already supports required option values,
interspersed options, short-option clusters, attached short values (`-A2`),
and long values (`--after-context=2`). `grep` will add the three option
definitions and validate their values at command execution.

`NUM` is an ASCII decimal, non-negative integer from `0` through `256`. Empty,
negative, signed, non-decimal, missing, and greater-than-256 values fail with a
usage-oriented diagnostic. The bound prevents a single command from requesting
unbounded in-memory context while the existing scan, resource, output-row, and
text-size limits remain the final output guards.

The effective window is calculated per direction:

- If `-A/--after-context` is present, its value is the after count; otherwise
  `-C/--context` supplies the after count.
- If `-B/--before-context` is present, its value is the before count; otherwise
  `-C/--context` supplies the before count.
- Repeating one option retains the generic parser's last-value behavior.
- A context option being present, including a value of zero, enables GNU-style
  block separators between distinct selected blocks.

This gives `-C1 -A0` one line of before-context and no after-context, while
`-C1 -B0` gives one line of after-context and no before-context.

## Structured grep contract

Keep the existing `GrepMatch`/`TerminalGrepMatch` names and match-array shape
for compatibility. Extend each line row with optional marker fields:

```ts
interface GrepMatch {
  readonly path: string;
  readonly lineNumber?: number;
  readonly line: string;
  readonly ranges: readonly (readonly [number, number])[];
  /** Present only when this row is non-matching context. */
  readonly context?: true;
  /** Present only when a `--` separator precedes this row. */
  readonly separatorBefore?: true;
}
```

`GrepReport.matches` continues to carry the ordered output rows. Matching rows
retain their existing shape and highlight ranges. Context rows carry
`context: true` and an empty frozen `ranges` array. The existing `noResults`
field remains true only when no matching row was emitted; UI summaries count
rows without `context`, so context rows do not inflate the match count.

This avoids introducing a second parallel line collection or making every
consumer parse a text sentinel. A separator is metadata on the first row of a
new block rather than a fake match row, so path and line-number types remain
valid.

## Context-window algorithm

For each source resource independently:

1. Scan the source in its existing deterministic order and record matching line
   indexes and matcher ranges.
2. Expand every matching index to
   `[max(0, index - before), min(last, index + after)]`.
3. Sort in source order and merge overlapping or adjacent intervals. A line
   matching inside an interval remains a matching row; all other rows in the
   interval are context rows.
4. Emit merged intervals in order. When context mode is enabled, mark the
   first row of every block after the first emitted block with
   `separatorBefore: true`; this includes a transition to another selected
   resource.
5. Apply the existing output-row and text-size limits while emitting. A
   separator consumes one text output line; truncation stops further emission
   and preserves the existing `truncated` signal.

Context never crosses a resource boundary, never duplicates a line, and never
changes source ordering. With no context option, the current match-only path
and output shape remain unchanged.

## Text and DOM projections

The command's plain stdout and the runtime's `stdoutForEffect` projection use
the same row metadata:

- matching row: existing `:` location delimiter;
- context row: `-` location delimiter when a path or line number is present;
- `separatorBefore`: prepend a standalone `--` line.

When no `-n` is requested, stdin rows retain their existing raw-line form;
structured metadata still lets the browser distinguish context. Named rows
retain the existing shell-visible path format.

The site renderer will:

- add a context class to context rows;
- render the marker-less context text without `<mark>` highlights;
- render a dedicated separator list item when `separatorBefore` is present;
- compute the summary from actual match rows only.

The CSS change is limited to muted/context and separator presentation and must
preserve the existing mobile single-column layout and no-overflow contract.

## Compatibility and safety

- Existing `clear`, `cls`, and `Ctrl+L` behavior is not routed through the grep
  changes.
- Public-resource resolution, stdin-vs-named-resource exclusivity, command
  substitution, redirect policy, and all existing resource boundaries remain
  unchanged.
- Context values and emitted rows remain bounded. No host path or raw external
  input is introduced into the payload.
- The durable Terminal/content-workspace contract must document the two marker
  fields and the text/UI projection together with the implementation.

## Rollback shape

The change is contained to the Terminal command contract, grep implementation,
runtime projection, site renderer/style, tests, and the corresponding spec.
Rollback can revert these files as one unit; no content, configuration,
database, or migration state changes are involved.
