# Reader persistent sticky status panel

## Goal

Make the reader status panel a permanent, useful viewport companion rather
than a search-only overlay. It should remain visible while the reader is
active and reflect the latest mode, movement, search, selection, or command
feedback without obscuring the document.

## Requirements

- Keep the status panel sticky whenever the reader is active. Terminal readers
  show it on direct entry; semantic readers show it after the existing explicit
  `#terminal-reader` activation.
- Use an opaque, token-backed surface and existing border/focus colors for both
  semantic and Terminal presentations. The panel remains visually distinct
  from the document canvas at rest, not only after a search is committed.
- Keep the first status row live for mode and semantic-unit position. The
  visible feedback area must reflect the latest reader action: movement,
  visual selection, search prompt/result, command prompt/error, cancellation,
  and normal-mode restoration.
- Keep one visible search-result line. A committed occurrence count owns
  `data-reader-search-status`; the generic message line must not visibly repeat
  the same text, while the dedicated polite `aria-live` announcer continues to
  receive announcements.
- Preserve native search/command forms, their prompt-style bottom rule,
  direction labels/placeholders, 44px target, keyboard focus, occurrence-based
  highlights, `n`/`N`, reduced motion, and JavaScript-disabled recovery.
- Keep the sticky panel in normal document flow so its own height is reserved;
  it must not introduce horizontal overflow or obscure the active reading unit.

## Acceptance Criteria

- [ ] Terminal and semantic reader status panels are sticky before any search
  is committed, have an opaque contrasting surface, and remain within the
  viewport while scrolling.
- [ ] `j`, `k`, `g`, `G`, `v`, `/`, `?`, `n`, `N`, `:`, Escape, successful
  search submission, no-result search, and unsupported command paths expose
  the expected current mode/status/message without duplicate search lines.
- [ ] Search and command forms continue to use the shared prompt-style row,
  retain accessible native labels, visible focus, explicit prefix spacing, and
  minimum 44px controls inside the permanent panel.
- [ ] Browser coverage proves the panel is sticky at initial normal mode,
  updates after representative movement/search/visual/command actions, keeps
  the active unit readable, and preserves semantic fragment activation and
  native fallback boundaries at desktop and mobile widths.
- [ ] Astro check/build/static-output, content/X Core, focused reader, full
  main-site browser, `git diff --check`, and Trellis validation pass.

## Constraints

- Keep this within the existing reader component, route-local controller,
  semantic/Terminal styles, and reader browser tests.
- Do not add a client store, route request, animation, or new UI dependency.
- Keep `data-reader-search-active` as committed-search state; it must no longer
  be the switch that determines whether the entire status panel is sticky.
- Update the durable reader contract and task evidence to record the permanent
  sticky lifecycle and visible feedback ownership.
