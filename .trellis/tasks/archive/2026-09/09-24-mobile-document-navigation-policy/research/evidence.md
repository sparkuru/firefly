# Planning evidence — mobile document navigation

## Observed behavior

- 2026-09-24 Pixel 5 Playwright touch simulation: tapping semantic `Read document` entered `#document-navigator`, showed status `1/13`, and did not expose a visible search or movement control. No page errors or horizontal overflow were observed in that run.
- 2026-09-24 USB PLR110 (Android 16) Via: the tracked demo semantic page loaded from a local isolated build; tapping `Read document` showed `-- NORMAL -- 1/13` and Exit navigation. The later status-tap observation was interrupted by a page switch and is not acceptance evidence. The task-owned reverse mapping and server were removed.
- 2026-09-24 local Playwright media probe: `(hover: none) and (pointer: coarse)` was true on Pixel 5 at 393x727 and 727x393, false on a 393x727 fine-pointer desktop context.

## Code contracts inspected

- `apps/site/src/lib/presentation-experiences.ts` owns the presentation-to-navigator profile and validates/freeze its records. Both built-ins currently use the same navigator, with `always` for Firefly and `fragment` for semantic.
- `apps/site/src/lib/document-navigation-composition.ts` combines site `navigator = "none"` overrides with the presentation profile and creates a public destination lookup.
- `apps/site/src/lib/document-navigation.ts` strictly validates and serializes that canonical-path lookup. `apps/site/src/scripts/terminal-home.ts` appends `#document-navigator` when the lookup says enabled, both for document `open` and inline Open document links.
- `apps/site/src/components/SemanticDocument.astro`, `TerminalDocument.astro`, and `DocumentNavigationStatus.astro` render entry/status/region hooks from the resolved composition. The navigator script currently starts without an input-capability check.
- `apps/site/src/styles/document-navigation-semantic.css` and `document-navigation-terminal.css` own the fixed status and bottom reservation. `TerminalStreamDocument.astro` currently promises navigation in its inline guidance.
- `.trellis/spec/frontend/content-workspace-contract.md` and `site-configuration-contract.md` codify the current desktop entry/composition behavior and must be updated with the mobile exception while preserving X Core and authored-data boundaries.

## Exact contract sections for Phase 2

`content-workspace-contract.md` exceeds the context-injection file limit, so an injected prefix will omit the navigator section. Read these sections directly before implementation or review:

```text
sed -n '255,290p' .trellis/spec/frontend/content-workspace-contract.md
sed -n '1270,1375p' .trellis/spec/frontend/content-workspace-contract.md
sed -n '1384,1393p' .trellis/spec/frontend/content-workspace-contract.md
sed -n '89,105p' .trellis/spec/frontend/site-configuration-contract.md
```

The existing `none` composition is build-time and omits navigator DOM/assets. The proposed mobile default is a browser/input policy on otherwise enabled static pages, so it must not be described as equivalent to `none` in the specs or tests.
