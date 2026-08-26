# Design: Bounded Terminal help columns

## Boundary

The bug is owned by the Terminal home stylesheet. The DOM contract already
separates a help row into a usage `<code>` cell and a detail `<span>` cell, so
no command registry, runtime, or renderer change is required.

## Layout contract

At the wide breakpoint, replace the unbounded `max-content` usage track with
two bounded flexible tracks:

```css
grid-template-columns: minmax(18ch, 1.6fr) minmax(18ch, 1fr);
```

The usage column keeps enough space for ordinary command signatures and wraps
long signatures within the row. The detail column retains an 18-character
minimum so summaries cannot collapse into a one-character vertical strip. The
existing narrow breakpoint continues to use one column, and all other help
styles remain unchanged.

## UUPM planning decisions

Project-local UUPM research is recorded in `research/ui-ux-pro-max.md`. It
confirms JetBrains Mono, visible focus, low motion, responsive checkpoints at
375/768/1024/1440, and no horizontal overflow as relevant constraints. Its
generic portfolio pattern, blue palette, oversized typography, and Google Font
import are explicitly rejected: Firefly's existing terminal tokens, local
font assets, density, and visual language remain authoritative.

## Data flow and compatibility

`help` command metadata remains unchanged:

```text
registry metadata -> neutral help value -> runtime help effect -> DOM help row
```

Only CSS track sizing changes. Existing semantic headings/lists, text content,
aliases, keyboard behavior, reduced-motion rules, and no-JavaScript recovery
are preserved.

## Verification shape

Extend the existing `commands render continuous typed results...` browser test
to locate the `find` row and check at desktop widths that its summary has a
real readable width and at most a few normal text lines, while the row stays
within the viewport. Keep the existing `grep` compactness assertion. At mobile
widths assert the `find` summary remains visible under the established stacked
layout.

## Trade-off

The usage column no longer grows to its full intrinsic width. This intentionally
trades some horizontal command-signature space for a stable detail column and
is preferable to hiding or shortening the command's documented usage.

## Rollback

Revert the single CSS track declaration and the focused geometry assertions;
there is no data or runtime migration.
