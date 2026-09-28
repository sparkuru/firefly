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
