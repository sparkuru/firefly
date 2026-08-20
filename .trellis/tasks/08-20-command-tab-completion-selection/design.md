# Design — Command Tab completion selection

## Boundaries

`presentations/terminal/src/runtime.ts` remains the pure completion engine.
`apps/site/src/scripts/terminal-home.ts` owns mutable prompt state, DOM,
selection, focus, announcements, and browser shortcut handling. `TerminalHome`
owns only the static, semantic completion markup; terminal CSS owns the vertical
list and visible active state. No dependency, client router, content model, or
command parsing change is needed.

## Completion contract

Extend the typed `ambiguous` completion result with:

- the full prompt value containing the longest shared completion prefix; and
- the full prompt value for every candidate, in the same deterministic order as
  its display labels.

`completeFrom()` derives both values through its existing render callback. Path
completion continues to transform only display labels (`./` and `/`), while the
returned prompt values retain the valid command text. This prevents the DOM
controller from reconstructing command arguments and preserves the current
safe-path boundary.

## Interaction state and flow

The controller keeps an internal nullable completion-panel state containing the
candidate labels, complete prompt values, and an optional active index.

1. First unmodified, non-composing `Tab` calls `completeCommand()`.
2. A unique result retains its existing insertion behavior. A no-match and none
   retain their existing status behavior.
3. For an ambiguous result, write the returned common-prefix prompt value only
   if it extends the current value, save a panel with no active item, and render
   candidates vertically. The input remains focused.
4. A subsequent unmodified `Tab`, while the panel still describes the current
   input, advances the active index (first item first, then wrap-around). It
   changes only the visual active descendant; it does not overwrite the input.
5. `Enter` or `Space` with an active item prevents its default action, writes
   that item's full prompt value, moves the caret to the end, and dismisses the
   panel. A subsequent `Enter` follows the native form path and executes the
   command. `Space` remains ordinary text input when no item is active.
6. `Escape` dismisses the panel without altering the input. Printable input,
   history movement, `Ctrl+C`, `Ctrl+L`, `Ctrl+U`, submission, and an input
   value change clear the panel. A stale panel is never reused.

## Accessibility and presentation

Replace the completion paragraph with a container that can hold a native list.
When candidates are shown, expose a labelled `listbox` with one `option` per
candidate, stable generated IDs, `aria-selected` on the active option, and
`aria-activedescendant` on the focused prompt. Add the matching expanded/list
state to the input and retain its explicit visible-label/help relationship.
Do not move DOM focus into the listbox or create a Tab trap. The active marker
uses both text/ARIA state and a terminal-compatible visible treatment, not color
alone; long candidates wrap and must not cause document-width overflow.

## Shortcut boundary

Handle only prompt-local, unmodified, non-composing events:

- Existing: `Ctrl+C` cancels current input; `Ctrl+L` invokes clear if the event
  reaches the page; Up/Down navigate history; `Tab` completes; `Enter` submits.
- Added: `Ctrl+A` selects the entire input, `Ctrl+E` moves the caret to the end,
  `Ctrl+U` removes text from the start through the current selection/caret, and
  `Escape` dismisses a completion panel. An unmodified `Space` commits only an
  already active completion candidate; otherwise it remains native text input.

Meta/Alt/Shift variants, composition, and all key events outside the focused
prompt remain native. Browser or OS reservations, including address-bar focus,
cannot be made reliable by this application; `clear` and `cls` remain the
guaranteed clear mechanisms.

## Compatibility and rollback

The public command language, candidate order, routes, and static no-JavaScript
recovery do not change. Rollback is limited to the typed completion additions,
home controller/list markup, CSS, and associated tests; removing those restores
the current unchanged-input ambiguous behavior.
