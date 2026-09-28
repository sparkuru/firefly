# Terminal reference palette — design

## Ownership and boundary

`apps/site/src/styles/terminal.css` owns the Firefly Terminal color contract under `.terminal-root[data-terminal-theme='firefly']`. `TerminalLayout.astro` already selects that theme for home and Terminal documents. Keep the existing theme ID, markup, content-theme resolver, command runtime, and mobile input policy. `document-navigation-terminal.css` and article content consume the existing semantic tokens.

## Color structure

Preserve the reference RGB values as named primitive tokens inside the theme root:

| Reference role | Exact source |
| --- | --- |
| Slate blue | `#616c8c` |
| Teal | `#568c87` |
| Soft green | `#b2d59b` |
| Yellow | `#f2de79` |
| Orange | `#d95f18` |

Keep dark mode. Derive a restrained depth sequence from slate/teal: a deep canvas near `#111923`, a raised shell near `#18232e`, and an upper surface near `#22313d`. Use low-opacity slate and teal ambient gradients so the otherwise full-bleed home has depth without making paragraphs busy. Preserve the existing semantic token names for consumers.

Assign green to command/prompt, yellow to warning/focus, teal to links/markers, slate blue to structural edges, and orange to failure/status. Body text and muted text use neutral hues tinted toward the reference colors. Some source swatches are too dim as small text on every raised surface: use brighter derived teal and orange foreground variants while retaining the exact swatches in visible accents and primitive tokens. Use a dark foreground for green/yellow filled controls. Keep foreground/background contrast at least 4.5:1 for normal text in representative surfaces and 3:1 for visible control boundaries and focus indication.

No new color values belong in scattered component rules. A small number of new semantic tokens is allowed where foreground and border must differ, such as orange error text versus orange accent border. Article content defaults inherit the Terminal root contract; authored `paper` content keeps its content-scoped palette.

## Delivery and compatibility

The terminal CSS is inlined by `TerminalLayout.astro`, so a token update reaches the static home and all Terminal documents without new assets, requests, or JavaScript. The mobile homepage uses the same root theme for native browsing/search and must remain free of a command Terminal. The existing user-edited `readme.md` contains a stale “green accents” description; update only that sentence without overwriting its other edits.

The existing `apps/site/public/favicon.png` and `favicon.ico` are site-wide static assets, not Terminal theme tokens. `SiteHead.astro` already has an uncommitted shared PNG icon link. Include that link and both files in this task, and extend the strict static-output inventory and shared-head assertions to reflect the new publication surface. Preserve the supplied artwork without transforming it.

## Verification and rollback

Run the site check/build and static-output contract, then focused browser checks for home, canonical Terminal document, inline reading/navigation, and mobile native home. Measure computed foreground/background contrast in representative states and inspect desktop/mobile screenshots for depth, visible use of all five hues, and paper-content isolation. Verify both icon files exist in `dist/`, the shared HTML head links the PNG, and the static inventory passes. Rollback is limited to the theme token/style change, favicon inclusion, and corresponding description/assertion changes.

## White appearance extension

Keep `firefly` as the default dark appearance and add one light appearance scoped to the same Terminal root. The root retains the same semantic tokens; the light variant overrides their color values with near-white canvas, pale raised surfaces, dark foregrounds, and contrast-adjusted versions of the five reference hues. Keep source swatches available as exact primitive tokens, but use darker derived colors where the source green/yellow/teal would fail as small text on white. Do not change the authored `paper` content-theme selector.

Move the palette and semantic color assignments into one CSS file per registered name under `apps/site/src/styles/terminal-themes/`: initially `firefly-dark.css` and `firefly-white.css`. Keep shared structure, component rules, and article token mapping in `terminal.css`. A site-owned build-time registry uses a literal eager raw-CSS glob, validates safe file names and required theme selector/tokens, sorts names, and inlines CSS into the Terminal layout. It serializes only the names to the page; client code never bundles the CSS text. Keep `data-terminal-theme="firefly"` as the presentation identity and use `data-terminal-palette="<name>"` for the selected color configuration. Static HTML starts with `firefly-dark`. Migrate prior stored `dark`/`light` values to the corresponding new names, accept only registered names, and fall back to the dark default for unknown values or storage failure.

On desktop, register a site-owned `theme <theme-config-name>` command in the home Terminal using the existing registry/completion seam. `theme ` plus Tab offers the build-registered names; Enter on a complete command selects one. A bare `theme` reports the current and available names, while unknown names explain valid choices without changing the page. Do not show a visible desktop switch, including on Terminal documents. The validated command and the mobile chooser use one site-owned appearance update path.

On touch-primary mobile, replace the top-right button with one fixed bottom-right `+` action button. The owner reviewed both a hamburger-triggered form panel and a two-action dock, then selected a Tumblr/Twitter-like speed dial: pressing the main button reveals direct child actions for each registered CSS theme and back-to-top. Do not nest a second theme menu. Show the selected theme among the child actions. Keep the main button and children hidden on desktop and with JavaScript disabled. Use touch-sized controls, restrained borders/shadow, semantic palette colors, clear accessible names, keyboard focus, Escape/outside closing, and reduced-motion behavior. Honor safe-area insets and any mobile document navigator status region; give the last content enough space not to sit behind the fixed button. The mobile homepage remains native browsing/search without command Terminal.

The owner then supplied a visual-motion reference for the same speed dial. Keep the container visually absent: no card/background enclosing the child actions. Add a very light viewport backdrop while open and close on backdrop/outside click. Animate the `+` into a close mark and let child actions emerge upward from the launcher with opacity/scale and a 40–60ms stagger; reverse their order on close. Keep the total movement short (roughly 220–300ms) and avoid animated layout shifts. Under `prefers-reduced-motion: reduce`, expose/hide the actions without movement. Closed actions must be inaccessible and noninteractive, including during a quick open/close cycle.

Shiki already emits `--shiki-light` and `--shiki-dark` token colors. Select the correct token color for each Terminal palette, including inline streamed code and canonical documents; `paper` retains its own authored content appearance. Give code frames a dedicated surface token distinct from the page canvas, with readable gutter, toolbar, copy control, and borders. Keep this presentational choice in CSS theme files rather than hard-coding color values in components.

Check both registered themes on desktop home, canonical document, inline reading, and mobile native home. Check theme registry validation, dynamic completion/options, old stored-value migration, command-driven persistence, toolbar open/close/theme/top actions, and representative code-token/background contrast. Assert no visible switch on desktop pages, no command Terminal on mobile home, and no fixed-control overlap on narrow mobile documents. Update the strict static-output assertions for the new CSS registry and toolbar.
