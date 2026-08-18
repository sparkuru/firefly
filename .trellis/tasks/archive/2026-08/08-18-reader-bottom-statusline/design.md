# Technical Design: Bottom-anchored reader statusline

## Approved product direction

The reader status is viewport-anchored whenever the reader exposes it. It is
not a document-scoped bottom sticky element: the user explicitly wants the
statusline to remain visible at the bottom while scrolling, like Vim. The
trade-off of reserving viewport chrome is accepted because it keeps the title,
outline, and prose visually continuous.

UUPM research was generated and saved in
`research/ui-ux-pro-max.md`. Its generic newsletter/violet/external-font
recommendation is not applicable to this existing Terminal reader and is
rejected. The approved UI decisions are the useful parts of that research:
content-first hierarchy, minimal motion, visible keyboard focus, WCAG contrast,
and responsive checkpoints at 375/768/1024/1440px. Existing phosphor tokens and
self-hosted JetBrains Mono remain authoritative.

## Boundaries and composition

- Keep `ReaderStatus.astro` as the shared status/form component and keep
  `terminal-reader.ts` as the only reader controller.
- Move `ReaderStatus` below the rendered reader region in both
  `SemanticDocument.astro` and `TerminalDocument.astro`. This makes the visual
  and accessibility reading order content-first even though the status is
  fixed visually.
- Keep the semantic status hidden until `#terminal-reader` and the Terminal
  status visible on direct canonical entry. No route, content, presentation
  registry, or no-JavaScript fallback contract changes.

## Layout contract

Both `.reader-status` and `.terminal-reader-status` will:

- use `position: fixed`, `inset-inline: 0`, and `inset-block-end: 0`;
- retain an opaque inverse/contrasting surface from the existing presentation
  tokens, visible top border, z-index, full-viewport width, and existing
  prompt/input affordances;
- remove the old top-sticky margin and normalize direct status paragraphs so
  the normal status is a compact statusline rather than a tall inserted panel;
- include bottom safe-area padding and horizontal safe-area-aware padding where
  supported; active search/command forms grow upward from the bottom edge;
- keep each form's native label, 44px input target, explicit prefix gap,
  continuous bottom rule, and `:focus-within` treatment.

The article owns reserved space rather than the fixed status element:

- Terminal documents provide a conservative CSS fallback reservation for the
  visible status in JavaScript-disabled output.
- Semantic documents start with no reservation while the status is hidden.
- After reader startup reveals the status, the controller measures its actual
  rendered height and writes a route-local `--reader-status-reserve` custom
  property on the reader article. A `ResizeObserver` refreshes that value when
  search or command chrome changes height or when responsive wrapping changes.
- The article's bottom padding and reading-unit scroll margin consume this
  value, so the fixed bar cannot permanently cover the final content or the
  active unit. No nested scroll container is introduced.

## Runtime data flow

```text
ReaderStatus visibility / form state
  → status rendered height
  → ResizeObserver in terminal-reader.ts
  → article --reader-status-reserve
  → document padding + reader-unit scroll margin
```

The observer is geometry-only. It does not change mode, query, highlights,
selection ownership, focus, announcements, or navigation. Existing search
settlement remains page-viewport-based; its safe viewport bottom should account
for the fixed status edge when necessary.

## Compatibility and rollback

- Static HTML remains complete and readable with JavaScript disabled. Terminal
  output keeps a default bottom reservation; semantic output has no fixed
  status while its section remains hidden.
- Existing status selectors and data attributes remain stable so current
  controller behavior and accessibility locators do not change.
- Rollback is limited to restoring the two component placements, the two
  presentation CSS blocks, the geometry observation, the focused assertions,
  and the reader contract wording. Active content/presentation and shell-path
  task changes are outside this task.

## Verification shape

Browser assertions will prove both the visual geometry and the semantic
contract: fixed bottom anchoring at the initial and scrolled positions, no
document overflow, content/order continuity, usable active/final units,
expanded search/command chrome, visible focus and 44px targets, reduced-motion
behavior, and the existing no-JavaScript/static route behavior.
