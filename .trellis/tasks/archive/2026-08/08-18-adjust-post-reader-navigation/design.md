# Terminal document header and outline design

## Boundary

The change stays inside the Terminal document presentation:

- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/src/styles/terminal.css`
- the existing Terminal route assertions in `apps/site/tests/site.spec.ts` and
  `apps/site/tests/static-output.test.mjs`

The canonical content model, route generation, semantic presentation, and
interactive `tree` command remain unchanged.

## Approved decisions

### Header path

Remove the `Document path` breadcrumb navigation from the article body. Render
the existing `canonical.virtualPath` once in the header with a leading `/`, so
the visible identity is `/posts/<file>.md` or `/pages/<file>.md`. This is a
presentation-only prefix; the canonical virtual path and route contracts keep
their current values.

### Divider hierarchy

Keep the existing one-pixel header bottom border as the single separator. Remove
the Terminal outline's block borders so the header and outline do not create two
nearby horizontal rules. Do not introduce gradients, shadows, animation, or new
color tokens; preserve the existing dark phosphor palette and local JetBrains
Mono assets.

### Tree outline

Keep the outline as a semantic navigation containing an unordered list. Give the
navigation an accessible `Document outline` name, hide the visual tree prefix
from assistive technology, and keep each heading title as a native anchor.

For each flat `metadata.outline` entry:

1. Use the first outline depth as the implicit tree root.
2. Derive the visible level from `item.depth - rootDepth`.
3. For every ancestor level, render `│   ` when a later sibling remains at
   that depth and `    ` otherwise.
4. Render `├── ` when the current item has a later sibling at its depth;
   otherwise render `└── `.

This reuses the branch glyph convention from
`presentations/terminal/src/commands/tree.ts` without changing shell output.
The prefix is a visual aid only; links, heading text, and anchor IDs remain
unchanged.

## Responsive and accessibility rules

- Tree prefixes remain non-wrapping while long linked titles may wrap at word
  boundaries or anywhere as required by the existing Terminal containment rules.
- The list remains keyboard navigable through native links and keeps visible
  focus styling from the existing Terminal stylesheet.
- The outline remains readable with JavaScript disabled.
- No new interaction, motion, loading, error, or disabled state is introduced;
  reduced-motion behavior therefore remains unchanged.
- Validate at the existing 1440px desktop and 375px mobile Playwright projects,
  including no document-width overflow.

## UUPM-derived constraints

The task research at `research/ui-ux-pro-max.md` confirms the applicable design
direction: preserve the dark, high-contrast, monospace, content-first Terminal
system; keep hierarchy text-first; avoid introducing decorative controls or
motion; and retain visible keyboard focus and responsive behavior.
