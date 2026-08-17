# Design: Reader persistent sticky status panel

## Current behavior and boundary

`ReaderStatus.astro` already owns one status row, one committed search-status
paragraph, two native forms, one visible feedback paragraph, and one separate
polite live announcer. The controller updates those nodes through the existing
`updateStatus()` and `announce()` paths for every reader mode. Today CSS makes
the section sticky only while `data-reader-search-active` is present, which
limits useful movement and mode feedback to the search lifecycle.

## Proposed model

The status section becomes sticky whenever it is rendered and active. Its
content has three visible layers:

1. `data-reader-mode` plus `data-reader-position`: persistent orientation;
2. `data-reader-search-status`: committed occurrence context when a query owns
   the current status;
3. the search/command form or `data-reader-message`: current interaction
   feedback and help.

When a committed search status already owns the current feedback, the generic
message paragraph remains visually suppressed by the existing
`data-reader-search-active` state. The separate `data-reader-announcer`
continues to announce `n`/`N`, no-result, command, and mode changes to assistive
technology. This keeps the visual panel single-sourced without losing updates.

`data-reader-search-active` remains useful as a committed-query marker and for
the duplicate-message suppression rule, but it no longer controls `position`,
`z-index`, or the panel surface.

## Style and layout

- Move sticky positioning, z-index, opaque background, and surface treatment
  from the `[data-reader-search-active]` selector to the base semantic and
  Terminal status selectors.
- Keep the panel in normal flow with its existing margins, borders, and
  padding. Sticky positioning therefore reserves its height and avoids a
  hidden fixed-header offset contract.
- Reuse the current semantic `--surface-raised` / border tokens and Terminal
  `--terminal-color-surface-subtle` / border tokens. No raw component color or
  new shadow system is needed.
- Keep search and command rows unchanged from the preceding refinement: flex,
  fixed `1ch` prefix, explicit gap, shared bottom rule, `:focus-within`, and
  native 44px inputs.

## Interaction coverage

The existing controller already emits visible feedback for movement, visual
selection, search open/submit/result/repeat, command open/error, cancellation,
and normal restoration. Tests should assert the state/output contract rather
than add a second message pipeline. Add representative keyboard sequences for
normal movement, visual mode, search prompt/result/repeat, command error, and
Escape, plus initial normal-mode sticky geometry on Terminal and semantic
fragment readers.

## Accessibility and responsive decisions

- Keep the named status section and native labels; do not turn the panel into a
  focus trap or add interactive roles to its visual wrappers.
- Keep the live announcer separate from the visible feedback paragraph and
  preserve `aria-live="polite"` / atomic delivery.
- Use the opaque panel surface to prevent content bleed-through while scrolling.
  The panel remains content-sized and responsive, with no page-level overflow.
- Preserve reduced-motion and global keyboard/native-control boundaries.

## Rollback

If a permanent sticky panel obscures content or causes a route regression,
revert only the base sticky declarations and corresponding browser assertions;
the previous committed-search marker and prompt-row styles remain independent.
