# Terminal default palette from the supplied reference

## Goal

Make the default Firefly Terminal presentation use the supplied five-color palette with a clear sense of foreground/background depth and readable text.

## Background

- The supplied image labels five RGB swatches: `#616c8c` (97, 108, 140), `#568c87` (86, 140, 135), `#b2d59b` (178, 213, 155), `#f2de79` (242, 222, 121), and `#d95f18` (217, 95, 24).
- Terminal pages use `data-terminal-theme="firefly"` in `apps/site/src/layouts/TerminalLayout.astro`. The semantic color tokens live in `apps/site/src/styles/terminal.css` and are consumed by Terminal components, including document navigation.
- Terminal is currently dark, with green accents. The owner confirmed that the new palette retains a dark Terminal.
- Article content has a separate authored content-theme boundary; changing that theme is not required for the Terminal palette.
- The mobile homepage uses native browsing and search instead of a command Terminal, while Terminal documents retain their presentation on mobile.

## Requirements

1. Set the Firefly Terminal default palette using the supplied swatches as the visual source, preserving their recognizable hues and the dark canvas.
2. Give the canvas, raised surfaces, borders, text, controls, links, status, and focus states a deliberate hierarchy with legible contrast.
3. Apply the palette consistently across the desktop Terminal home, canonical Terminal documents, inline reading, navigation, and the native mobile homepage surfaces that consume the root tokens. Preserve the mobile homepage's absence of a command Terminal.
4. Keep Terminal behavior and authored content-theme selection intact.
5. Include the existing `favicon.png` and `favicon.ico` in the site publication. Use the PNG as the shared HTML icon and account for both files in the strict static-output inventory.

## Acceptance Criteria

- [x] The default Terminal visibly reflects all five supplied hues in purposeful roles.
- [x] Canvas, surfaces, and interactive foregrounds are distinguishable; representative normal text reaches 4.5:1 contrast and functional control boundaries/focus reach 3:1 in their rendered contexts.
- [x] Desktop home, Terminal document, inline reading, navigation, and mobile homepage surfaces use the same palette contract without unintended old neon-green accents.
- [x] The mobile homepage remains native browsing/search with no command Terminal; authored paper content stays independently themed.
- [x] Existing Terminal theme and behavior checks pass, with a focused visual review of representative states.
- [x] The site build publishes both favicon files, home and document pages reference the PNG icon, and the strict static-output suite passes with the declared files.

## Out of Scope

- New theme picker or per-user theme persistence.
- Changes to the semantic presentation or authored content-theme registry.
- Redesign or regeneration of the existing favicon artwork.
