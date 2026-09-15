# Implement independently selectable article themes

## Goal

Give authors a safe, explicit way to choose an article-content visual theme
while keeping that choice independent from the website presentation. A theme
should affect the rendered Markdown content region, remain readable in every
supported presentation, and work for the external blog workspace without
per-article code changes.

## Confirmed repository facts

- The completed `09-14-safe-markdown-html` task established a stable
  `[data-article-content]` boundary in both `SemanticDocument.astro` and
  `TerminalDocument.astro`.
- `apps/site/src/styles/article-content.css` is a shared content stylesheet
  using generic `--article-content-*` tokens. Semantic and Terminal website
  styles map their own tokens into that contract.
- The existing front matter `presentation` field selects the outer document
  presentation (`semantic` or the default `firefly` Terminal presentation).
  It is validated in `content-schema.mjs` and dispatched by
  `DocumentPresentation.astro`; it is not an article-theme selector.
- The Terminal document currently has a fixed
  `data-terminal-theme="firefly"` website theme. No article-theme registry,
  theme field, stylesheet selection system, or theme picker exists.
- The prior task explicitly deferred a validated article-theme ID, registry,
  stylesheet selection, picker, and multiple shipped article themes. Its
  intended extension seam is the article-content boundary.
- X Core metadata, heading/node identities, static route generation, and the
  synchronizer build boundary must remain unchanged by an article-theme
  feature.

## Resolved product scope

- This release builds the article-theme infrastructure only. It does not ship
  a second visual skin, a theme picker, browser-side theme switching, or a
  meaningful alternate visual choice.
- The infrastructure must still define a stable article-theme boundary,
  site-owned registry shape, default behavior, and an additive path for a
  later alternate theme.

## Requirements

1. Keep article-content theme selection separate from website presentation and
   the Terminal website theme.
2. Accept only a validated, site-owned theme identifier; unknown or malformed
   identifiers must fail closed at content validation/build time.
3. Apply the selected theme at the existing article-content boundary rather
   than changing authored Markdown HTML or the sanitizer pipeline.
4. Keep theme CSS site-owned and scoped to article content; authors must not
   gain arbitrary CSS or inline-style capabilities through theme selection.
5. Preserve static rendering, accessibility, X Core metadata, presentation
   adapters, canonical routes, and external-workspace compatibility.
6. Provide focused tests for default selection, explicit default selection,
   invalid selection, both production presentations, and theme/content
   boundary isolation.
7. Keep the current/default visual treatment unchanged in this release; adding
   an alternate theme later must not require changing Markdown HTML syntax, the
   sanitizer pipeline, or the website `presentation` contract.

## Acceptance Criteria

- [x] The infrastructure contract and the absence of a shipped alternate skin
  are explicitly documented.
- [x] The default article theme is represented only at the article-content
  boundary and does not alter the website presentation.
- [x] Omitted and explicit `default` selections render deterministically in
  both semantic and Terminal presentations.
- [x] Unknown, malformed, or unsafe theme values cannot select arbitrary CSS,
  stylesheet URLs, selectors, or website chrome styles.
- [x] Article themes do not change `presentation`, X Core metadata, heading or
  node identities, canonical routes, or the synchronizer protocol.
- [x] Static output and accessibility checks cover the selected theme at
  desktop and mobile content surfaces as applicable.
- [x] The external blog workspace builds successfully through the repository's
  Node 22 `./sam` path with the theme feature enabled.

## Scope and decisions

- Expose an optional author-facing `articleTheme` front matter field now.
  Omission and an explicit `default` value resolve to the sole registered
  `default` theme ID in this release.
- Reject every other theme ID through the strict content schema until a later
  task adds a deliberately designed alternate theme and registry entry.
- Keep the current rendered visual treatment unchanged. The only new output is
  the validated theme identity at the article-content boundary, which is the
  future styling hook.

- No alternate theme ID, alternate color palette, theme-specific typography,
  theme picker, browser-side switching, user preference, theme URL, dynamic
  stylesheet loading, or theme-specific Markdown syntax is included.
- The `presentation` field continues to select the existing semantic or
  Terminal website presentation. It is not renamed, reused, or coupled to
  `articleTheme`.

## Technical planning boundary

- `articleTheme` belongs to site content metadata and must not be copied into
  X Core's `presentation`, document context, `xCore` metadata, or plugin
  payloads.
- The first-release registry exposes stable IDs only. Theme IDs must not be
  interpreted as CSS selectors, stylesheet URLs, class names, or executable
  configuration.
- The initial implementation should make adding a later registered theme
  additive: add one validated ID and its site-owned scoped styles without
  changing authored Markdown HTML or the website presentation contract.

There are no remaining blocking product decisions for this planning pass.
