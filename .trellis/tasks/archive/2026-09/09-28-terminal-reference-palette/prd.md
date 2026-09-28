# Terminal default palette from the supplied reference

## Goal

Make the default Firefly Terminal presentation use the supplied five-color palette with a clear sense of foreground/background depth and readable text.

## Background

- The supplied image labels five RGB swatches: `#616c8c` (97, 108, 140), `#568c87` (86, 140, 135), `#b2d59b` (178, 213, 155), `#f2de79` (242, 222, 121), and `#d95f18` (217, 95, 24).
- Terminal pages use `data-terminal-theme="firefly"` in `apps/site/src/layouts/TerminalLayout.astro`. The semantic color tokens live in `apps/site/src/styles/terminal.css` and are consumed by Terminal components, including document navigation.
- Terminal is currently dark, with green accents. The owner confirmed that the new palette retains a dark Terminal, then requested an additional white version to better express the reference palette.
- Article content has a separate authored content-theme boundary; changing that theme is not required for the Terminal palette.
- The mobile homepage uses native browsing and search instead of a command Terminal, while Terminal documents retain their presentation on mobile.

## Requirements

1. Set the Firefly Terminal default palette using the supplied swatches as the visual source, preserving their recognizable hues and the dark canvas.
2. Give the canvas, raised surfaces, borders, text, controls, links, status, and focus states a deliberate hierarchy with legible contrast.
3. Apply the palette consistently across the desktop Terminal home, canonical Terminal documents, inline reading, navigation, and the native mobile homepage surfaces that consume the root tokens. Preserve the mobile homepage's absence of a command Terminal.
4. Keep Terminal behavior and authored content-theme selection intact.
5. Include the existing `favicon.png` and `favicon.ico` in the site publication. Use the PNG as the shared HTML icon and account for both files in the strict static-output inventory.
6. Add a white Firefly Terminal theme alongside the existing dark one. On desktop, use the home Terminal's `theme <theme-config-name>` command and Tab completion; no visible desktop page switch. Theme names come from separately authored CSS theme files (initially `firefly-dark` and `firefly-white`), so adding a valid theme CSS file registers it for both rendering and completion without editing a hard-coded name list. Keep the chosen theme across home and Terminal document pages and keep authored content themes independent.
7. On touch-primary mobile, use one persistent bottom-right `+` floating action button. Opening it reveals compact child actions for each registered CSS theme and back-to-top, without a nested theme menu. Clearly mark the current theme. Give the open state a very light clickable page backdrop and a short staggered upward spring/ease-out reveal; reverse the motion on close and honor reduced-motion preferences. Preserve native mobile browsing/search and avoid covering content or document navigation controls.
8. Make inline and canonical code blocks readable in both themes. Highlighted tokens must derive from the matching Shiki light/dark palette and meet text contrast on a distinct code surface, with legible controls.

## Acceptance Criteria

- [x] The default Terminal visibly reflects all five supplied hues in purposeful roles.
- [x] Canvas, surfaces, code blocks, and interactive foregrounds are distinguishable; representative normal text reaches 4.5:1 contrast and functional control boundaries/focus reach 3:1 in their rendered contexts.
- [x] Desktop home, Terminal document, inline reading, navigation, and mobile homepage surfaces use the same palette contract without unintended old neon-green accents.
- [x] The mobile homepage remains native browsing/search with no command Terminal; authored paper content stays independently themed.
- [x] Existing Terminal theme and behavior checks pass, with a focused visual review of representative states.
- [x] The site build publishes both favicon files, home and document pages reference the PNG icon, and the strict static-output suite passes with the declared files.
- [x] Mobile readers see one `+` action button that expands direct child actions for any registered theme and back-to-top with a subtle backdrop, staggered motion, and an immediate reduced-motion path. The selected theme is clear and the expanded controls remain compact. Desktop readers can use `theme <theme-config-name>` with Tab completion and no visible page switch. The choice persists across navigation and reloads when storage is available.
- [x] The white appearance has a near-white canvas, distinct raised surfaces, readable body/links/status/controls/focus, and visible use of all five supplied hues. The dark appearance remains available and unchanged in intent.
- [x] Theme selection works without breaking other Terminal commands, mobile native browsing, document navigation, no-JavaScript reading, or authored `paper` content.
- [x] A valid new CSS theme file is discovered at build time and appears in static CSS, command completion, and the mobile chooser without a second name registry; invalid theme files fail the build clearly.
- [x] Light and dark inline/canonical code blocks use the corresponding syntax colors and legible code surfaces, including authored `paper` content.

## Out of Scope

- A site-wide theme system beyond the Firefly Terminal presentation.
- Changes to the semantic presentation or authored content-theme registry.
- Redesign or regeneration of the existing favicon artwork.
