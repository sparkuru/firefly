# Technical design

## Boundaries and ownership

`presentations/terminal/src/commands/` becomes the authoring boundary for
neutral command descriptors. Each command module exports its descriptor (and
the handler/parser/constants it needs), so adding a command means adding a
module plus one explicit registry import/list entry. Existing command behavior
may be moved into smaller modules where that is necessary to make ownership
clear; this is a refactor, not a new command implementation.

`commands/contracts.ts` extends the neutral descriptor/help types with a typed,
immutable example record and the context needed by descriptor-owned completion.
The completion context stays neutral (virtual paths/VFS and cwd); it must not
import terminal UI types. Shared completion/path helpers belong below the
command boundary and preserve the current safe-prefix, alias, ambiguity, and
candidate rendering rules.

`commands/registry.ts` keeps the explicit `CORE_COMMAND_SPECS`,
`SESSION_COMMAND_SPECS`, and `NEUTRAL_COMMAND_SPECS` composition lists. Its
responsibilities remain validation, cloning/freezing, collision detection, and
lookup. It no longer owns command-specific parsers, metadata literals, or
completion routing.

## Help data flow

1. A command descriptor supplies usage/summary/aliases/examples.
2. The neutral shell runner projects active definitions into
   `ShellCommandMetadata`, including examples and session aliases.
3. The Help executor groups/sorts that metadata for the compact view. With one
   optional operand it resolves canonical names and aliases, then returns a
   structured Help value containing the selected command detail. Detail stdout
   is still produced by the same bounded text projection used by pipelines.
4. `runtime.ts` adapts the neutral Help value to `TerminalEffect`; the effect
   gains only the generic optional detail field needed by the renderer.
5. `terminal-home.ts` renders groups and, when present, the detail/examples
   using generic fields. It does not inspect command names. CSS changes, if
   needed, use existing terminal-help classes or a single generic detail class.

The compact `help` view carries descriptor examples in the structured model so
the same metadata is available to detail rendering, but its row renderer and
stdout projection remain compact. `help <command>` is the only view that
prints/renders the examples.

## Completion data flow

The existing neutral `CommandSpec.complete` hook becomes the source of truth.
Command modules bind their own completion callback to shared neutral helpers.
The terminal adapter supplies a neutral completion context derived from the
current VFS/index and invoked token, then delegates directly to
`spec.complete`; no `neutralCompletion(name)` switch remains. Runtime-only
`TerminalEntry`/experiment shapes stay in the adapter, converted to safe
virtual paths before delegation. Custom terminal command definitions retain
their existing optional completion API.

## Compatibility and invariants

- `CommandSpec` validation continues to reject unsafe metadata, invalid policy,
  non-callable handlers, malformed examples, duplicate names/aliases, and
  mutable descriptor input. Examples are cloned/frozen at the same registry
  boundary as aliases/policy.
- `help` with no operand keeps current group names/order and compact row text;
  only the usage string and optional detail path are new. Existing aliases and
  custom registries continue to be represented by the active registry metadata.
- Unknown `help <command>` targets use a stable non-zero failure result and do
  not leak arbitrary input into HTML. Detail text is bounded by the existing
  shell output limits.
- Existing `ls`, `find`, and other command-level `--help` output remains valid;
  examples are additional descriptor metadata, not a replacement for command
  option validation.
- Structured effect unions, neutral/runtime adapters, stdout and announcement
  projections, DOM rendering, unit tests, and browser tests are updated
  together so no consumer reconstructs command metadata from display strings.

## Rollout and rollback

Implement in ordered slices: descriptor contract and one representative
command, migrate all registry entries, move completion ownership, then add Help
detail/examples and tests. Keep each slice compiling so a partial change can
be reverted without changing command semantics. If the structured detail
shape proves too invasive, retain the same descriptor metadata and fall back to
the generic bounded-lines projection while preserving the no-name-switch and
no-placeholder requirements.
