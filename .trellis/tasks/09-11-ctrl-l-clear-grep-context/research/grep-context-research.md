# Research Notes: existing Terminal grep and Ctrl+L behavior

## Repository evidence

- `apps/site/src/scripts/terminal-home.ts` already handles an unmodified
  Ctrl+L at lines 1212-1224. It prevents the browser default, cancels the
  draft state, dismisses completion, clears the transcript, and restores focus.
- `apps/site/tests/terminal.spec.ts` covers Ctrl+L and the `clear`/`cls`
  equivalence at lines 995-1018 and 1057-1071. The implementation should not
  replace this path with a new shortcut abstraction.
- `presentations/terminal/src/commands/grep.ts` currently scans each source
  line, emits only matching rows, and stores ranges for highlighting. Its
  limits are 256 resources, 50,000 scanned lines, 240 emitted match rows, and
  24,000 output characters.
- `presentations/terminal/src/shell/contracts.ts` and
  `presentations/terminal/src/runtime.ts` duplicate the grep-row type at the
  neutral-shell and site-runtime boundaries. The site renderer consumes that
  typed row in `apps/site/src/scripts/terminal-home.ts`.
- The generic command argument parser supports required option values,
  interspersed options, short clusters, attached short values, and
  `--option=value`. It stores repeated options by their last value.

## GNU grep behavior checked locally

For input lines `a b c d e f g h i`:

- `grep -n -A1 b` emits `2:b` and `3-c`.
- `grep -n -B1 e` emits `4-d` and `5:e`.
- `grep -n -C1 b` emits `1-a`, `2:b`, and `3-c`.
- Separate selected blocks are separated by a standalone `--` line.
- Adjacent/overlapping windows are emitted once.
- `-C1 -A0` keeps the before count from `-C` and overrides only the after
  count; `-C1 -B0` behaves symmetrically.
- A zero context value still enables block separators when multiple matching
  blocks are selected.

These observations support the task decision recorded in `prd.md` and the
typed row-marker design in `design.md`.
