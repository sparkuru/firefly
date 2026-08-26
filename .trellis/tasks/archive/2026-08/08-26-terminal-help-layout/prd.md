# Fix Terminal help command layout

## Goal

Keep the interactive Terminal `help` command readable at desktop widths when
one command has a long usage signature. The `find` usage currently expands the
first CSS grid track to its max-content width, leaving the summary column only
wide enough to render one character per line.

## Background / Confirmed Facts

- `apps/site/src/scripts/terminal-home.ts` renders every help row as one
  `.terminal-help-command` grid item with a `<code>` usage cell and a detail
  cell containing the summary and optional aliases.
- `apps/site/src/styles/terminal.css:436-448` currently uses
  `grid-template-columns: minmax(18ch, max-content) minmax(0, 1fr)`. The
  `max-content` first track is unbounded by the row width, so the long `find`
  usage can consume the whole row and collapse the detail track.
- At narrow widths the existing media query intentionally stacks each help row
  into one column; that behavior should remain unchanged.
- The existing Terminal browser test checks help content and that the `grep`
  usage remains compact on desktop, but does not assert that a long command's
  summary retains readable width.
- Historical Terminal work already establishes the native, responsive,
  no-overflow and focused-browser validation conventions; no prior task found a
  separate help-layout contract to reuse.

## Requirements

1. At desktop help widths, the usage and detail columns must both retain a
   meaningful minimum width. Long usage text may wrap inside its own column,
   but must not squeeze the summary into a vertical one-character column.
2. Preserve the current help content, command order, aliases, semantic
   heading/list structure, typography, mobile single-column layout, and
   reduced-motion behavior.
3. Keep the fix CSS-local to Terminal help layout unless the existing browser
   test needs a focused assertion update. Do not change command metadata or
   shorten the `find` usage to hide the layout defect.
4. Add a browser regression assertion at the configured desktop and mobile
   widths that proves the long `find` row remains readable and contained.

## Acceptance Criteria

- [x] Desktop `help` renders the complete `find` summary in a readable,
      horizontally bounded detail column; it is not reduced to one-character
      vertical text.
- [x] Desktop long usage wraps within the usage column without causing document
      horizontal overflow, and the existing `grep` compactness assertion remains
      green.
- [x] Mobile `help` retains the existing single-column row layout and all
      command summaries remain visible.
- [x] Help headings, command order, aliases, semantic markup, and exact usage
      text remain unchanged.
- [x] Terminal/site checks and focused interactive browser tests pass through
      `./sam`; `git diff --check` is clean.

## Out of Scope

- Changing `find` options, help copy, command order, command registry metadata,
  fonts, global typography, or Terminal information architecture.
- Adding a visual-regression baseline, a new UI component, JavaScript layout
  measurement, or a responsive redesign beyond the affected help grid.
- Repairing unrelated pre-existing Terminal E2E fixture/assertion failures.

The recommended implementation is to replace the unbounded max-content usage
track with bounded flexible tracks that reserve readable space for the detail
column, then prove the result with DOM geometry at the existing browser
viewports.
