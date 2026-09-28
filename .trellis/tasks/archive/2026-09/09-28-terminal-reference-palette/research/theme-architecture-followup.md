# Research: CSS theme registry, code contrast, and mobile quick toolbar

- Query: How can one added CSS theme file become a `theme <theme-config-name>` completion without placing CSS in client JavaScript, while fixing light code blocks and replacing the mobile switch?
- Scope: mixed (repository and official Astro/Vite/Shiki documentation)
- Date: 2026-09-28

## Findings

### Current ownership and files found

- `apps/site/src/layouts/TerminalLayout.astro:28-96` renders every Firefly Terminal page, inlines `terminal.css` plus article/paper/diagram CSS, restores only stored `light` before the style, exposes a global setter with hard-coded `dark | light`, and renders the mobile switch.
- `apps/site/src/styles/terminal.css:17-96` has the dark semantic tokens and light overrides in one file; `:143-180,241-252` positions the current switch at the top right and reserves extra home top space. `:1280-1381` owns code frames and forces dark Shiki token colors.
- `apps/site/src/scripts/terminal-home.ts:35-85` has the site-owned command registry seam. Its command usage, examples, validation, and Tab candidates all hard-code `dark | light`; the core Terminal runtime does not need changes.
- `apps/site/src/build/code-highlighting.mjs:1-10` configures build-time Shiki with `github-light`, `github-dark`, and `defaultColor: false`. The built HTML already contains both `--shiki-light` and `--shiki-dark` on tokens (for example `apps/site/dist/pages/markdown-template/index.html`); no browser code highlighting or new Markdown build work is needed.
- `apps/site/src/scripts/terminal-stream-code.ts:1-47` wraps cloned inline code with the language/copy toolbar and line gutter. Canonical code is static; the white screenshot's inline block is this wrapper. `apps/site/src/styles/content-themes/paper.css:5-65,167-204` scopes the independent paper article style. `apps/site/src/styles/article-content.css:1-16` defines its generic token boundary.
- `apps/site/src/lib/document-navigation.ts` exports the shared touch-primary predicate. `apps/site/src/styles/document-navigation-terminal.css:1-21,136-145` owns a fixed bottom status at z-index 30 when a navigator explicitly supports mobile; otherwise it is hidden. `apps/site/src/lib/presentation-experiences.ts:166-180` defaults `supportsMobile` to false.
- `apps/site/tests/static-output.test.mjs:629-660,743-751`, `apps/site/tests/terminal.spec.ts:1741-1790`, `apps/site/tests/mobile-homepage.spec.ts:81-116`, and `apps/site/tests/site.spec.ts:160-254` currently assert the hard-coded palette selectors, mobile switch, command names, and persistence.

### Recommended theme architecture

Keep `data-terminal-theme="firefly"` as the presentation identity and introduce a distinct `data-terminal-palette="firefly-dark" | "firefly-white" | ...` for the configurable color scheme. Preserve `firefly-dark` as the rendered default so no-JavaScript reading and blocked storage have a dark palette. Move only palette/semantic color assignments from `terminal.css` into one CSS file per palette under `apps/site/src/styles/terminal-themes/`; keep geometry, component layout, and common article token mappings in `terminal.css`. Give each file a safe kebab-case basename and an exact root selector for that name. Validate required semantic tokens and reject malformed/duplicate names at build time, following the site's strict registry pattern (`apps/site/src/lib/presentation-experiences.ts:39-93`). The theme files can also own any per-palette code-highlight selector and code-surface token.

At the Astro/server boundary, use a literal `import.meta.glob('../styles/terminal-themes/*.css', { query: '?raw', import: 'default', eager: true })`. Derive the registry from the matched filenames, sort it, validate it, and inline its small CSS contents alongside the current raw CSS. Serialize **only the validated names** into a safe `data-*` attribute or JSON data island in the head. This makes adding a conforming CSS file enough to register it automatically in both rendered CSS and Tab completion; no CSS text enters `terminal-home.ts` or client JavaScript. Astro already uses raw CSS and inline styles in `TerminalLayout.astro:2-5,91`, so static output and prepaint restoration stay straightforward. The early inline script, before the style, accepts only registered names from that data, reads/migrates the existing `dark`/`light` storage values, sets the root palette attribute, and persists the selected name. Unknown/stale values fall back to `firefly-dark`; storage errors still allow an in-page change. The home command reads the same rendered registry, reports `Usage: theme <theme-config-name>` and available names, and filters that list for Tab completion. The mobile chooser renders options from the same server registry and calls the shared setter. No independent hard-coded name lists should survive in UI code.

Alternative: Vite `?url` can emit separate CSS assets and a filename-to-URL map, so only the selected nondefault theme is loaded. It needs an early stylesheet swap and careful first-paint/preload handling plus static-asset inventory changes. The existing per-page CSS is already inlined; raw build-time glob is the simpler first step and avoids flash/network races. Its cost is a small amount of CSS per palette repeated in each HTML page, so reassess asset splitting only if the catalog grows materially.

Official references: [Vite glob imports, `?raw`/`?url`, and literal-pattern rules](https://vite.dev/guide/features.html#glob-import); [Astro raw CSS import and inline-style behavior](https://docs.astro.build/en/guides/styling/#raw-css-imports); [Shiki dual-theme variables and `defaultColor: false`](https://shiki.style/guide/dual-themes).

### Why the white code is pale

`siteRehypeShiki` intentionally produces both token palettes with no default CSS color (`apps/site/src/build/code-highlighting.mjs:5-8`). Terminal CSS explicitly selects `var(--shiki-dark)` for every highlighted inline-stream token at `terminal.css:1379-1381`, even while the root is light. `github-dark` tokens such as `#e1e4e8` therefore appear nearly white against the light `#f7f9f6` code canvas. Correct the selector so dark uses `--shiki-dark` and white uses `--shiki-light`; future palette files must declare which Shiki side they use, or a tested common `light-dark(var(--shiki-light), var(--shiki-dark))` rule can follow each theme's `color-scheme`. Also give code bodies a dedicated light raised surface, visibly distinct from the page canvas, while keeping gutter, toolbar, border, and Shiki text legible. Cover both inline-stream and canonical code. Keep authored `paper` code on its own light content root; do not let a dark outer Terminal palette turn paper's token foreground pale. Verify computed token colors against their actual code background rather than only root text contrast.

### Mobile toolbar layout and behavior

Replace the top-right switch with one compact, fixed bottom-right launcher under the same `(hover: none) and (pointer: coarse)` gate. An expanded panel above it can contain a `切换主题` chooser generated from the theme registry and a `回到顶部` action. Keep it hidden without JavaScript, at least 44 x 44 px, named for assistive technology, with `aria-expanded`/`aria-controls`, visible focus, and safe-area bottom/right offsets. Preserve native mobile home search/browse and the desktop's absence of any visible switch. Give flowing content bottom breathing room so the fixed launcher does not cover the last link. If a future Terminal document opts into the fixed mobile document navigator, position the launcher/panel above that status region or otherwise avoid overlap; raising z-index alone would obstruct navigator controls. Test open/close, theme selection, scroll-to-top, keyboard/focus, touch portrait/landscape/tablet, and desktop fine-pointer visibility. The old titlebar right padding and home top-padding reservation at `terminal.css:246-252` can then be removed.

## Suggested validation

1. Static build/check and `static-output.test.mjs`: registry names/selector contract, no CSS text in client JS, default dark no-JavaScript output, all registered theme options, and updated button inventory.
2. Browser: `theme <Tab>` lists `firefly-dark`, `firefly-white`; command help/invalid names; old stored `light` migration; unknown/storage-denied fallback; navigation/reload persistence; no visible desktop chooser.
3. Browser contrast: computed Shiki token foreground and code body background for both schemes on inline and canonical code, with paper content unchanged under both outer palettes.
4. Mobile: collapsed/expanded fixed toolbar, theme picker and back-to-top, safe-area/viewport bounds, no obstruction of home search/friend links or any opted-in bottom navigator; no-JavaScript reading and native browse remain usable.

## Caveats / Not Found

- No existing general Terminal palette registry or icon/toolbar component was found. The presentation registry is an analogous validation pattern, not a ready-made theme loader.
- The current task's PRD/design/implement artifacts still describe `dark | light` and a top switch; they must be updated before implementation and checked against this new owner direction.
- Astro/Vite's `?raw` bypasses ordinary CSS bundling; include the raw CSS explicitly in the inline `<style>` and validate the built HTML. `import.meta.glob` requires a literal pattern.
