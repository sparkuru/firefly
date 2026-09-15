# Ship a second article theme

## Goal

Ship one real alternate article-content theme so an author can opt an article
into a warm, paper-like reading surface with `articleTheme: paper`. The same
authored Markdown and route must remain usable by both the semantic and
Terminal website presentations.

## Background and repository constraints

- The previous infrastructure task added a frozen, site-owned article-theme
  registry and strict schema/resolver plumbing. The registry currently contains
  only `default` (`apps/site/src/lib/article-theme.mjs:5-44`).
- `DocumentPresentation.astro` resolves the normalized ID and passes it
  independently to the semantic and Terminal document components
  (`apps/site/src/components/DocumentPresentation.astro:28-64`). Each component
  emits it only on the existing article-content root
  (`SemanticDocument.astro:64-75`; `TerminalDocument.astro:90-99`).
- `article-content.css` is the presentation-neutral baseline and explicitly
  reserves the content root as the future theme seam
  (`apps/site/src/styles/article-content.css:1-23`).
- The configured external blog workspace is an authoring input mounted
  read-only during `./sam`; this task must not edit it.

## Resolved decisions

- Stable alternate ID: `paper`.
- Visual direction: warm paper canvas, ink-like text, muted brown secondary
  text, restrained terracotta/ochre accents, editorial serif body/headings, and
  monospace code. The theme is intentionally a content panel inside either
  presentation; it does not turn the whole Terminal shell into a light theme.
- No external fonts, images, network assets, or new authoring syntax. Use
  system/local font fallbacks and the existing rendered Markdown elements.
- Theme-specific styles live in
  `apps/site/src/styles/article-themes/paper.css`. The shared baseline stays in
  `article-content.css`; there is no duplicated `default.css`.
- Selection is static and build-time only. There is no browser picker, user
  preference, runtime switcher, dynamic stylesheet URL, or path derived from
  front matter.

## In scope

- Register exactly `paper` and extend focused schema/registry coverage for the
  accepted ID, omission/default behavior, and unsafe or wrong-type rejection.
- Add the paper CSS and statically include it in both style delivery paths:
  semantic `global.css` and Terminal `TerminalLayout.astro` inline CSS.
- Style only the existing article-content boundary, including reading text,
  headings, links, blockquotes, callouts, code, tables/wide-content regions,
  media sizing, focus indication, and narrow-screen spacing.
- Add deterministic source/static-build coverage proving `paper` reaches both
  production presentations without changing Markdown, route ownership, or
  X Core metadata.
- Update the relevant durable frontend contract if implementation reveals a
  new reusable theme-registration or CSS-loading rule.

## Out of scope

- Any change to authored Markdown HTML, the sanitizer, X Core context or
  metadata, presentation adapters, routes, navigation, comments, plugins,
  article header/outline, reader status, Terminal chrome, or site-wide tokens.
- A theme picker, runtime switching, persisted preference, user-specific
  theming, dynamic CSS loading, or a theme marketplace.
- Changes to the existing default visual treatment, external content, fonts,
  assets, dependencies, or deployment configuration.

## Requirements

1. `paper` is an exact registered ID. Unknown, malformed, traversal-like,
   URL-like, selector-like, and non-string values fail closed before rendering.
2. Every paper selector is rooted at
   `[data-article-content][data-article-theme='paper']`; no selector targets
   website chrome or relies on author-controlled input as a selector, class,
   URL, or asset path.
3. The paper surface is readable and deterministic in semantic and Terminal
   presentations. It preserves local overflow behavior for wide code/tables,
   keeps code monospace, keeps links/focus distinguishable, and avoids page
   horizontal overflow at the maintained 1440px and 375px viewports.
4. The default/omitted path continues to use the existing shared baseline with
   no visual or HTML contract change.
5. The implementation remains static and portable: the same content elements
   and Markdown body are rendered in both presentations, with no external
   runtime dependency.

## Acceptance criteria

- [ ] The registry exposes exactly one new stable ID, `paper`, and the PRD/
      frontend contract documents its visual and boundary contract.
- [ ] A temporary repository-local fixture with `articleTheme: paper` builds
      to both semantic and Terminal document routes; both output roots carry
      `data-article-theme="paper"` and the paper stylesheet is present in the
      corresponding style path.
- [ ] The default fixture/build output remains on `default`, and the existing
      default content styling is not modified as a side effect.
- [ ] Static/source checks show that all paper selectors stay below the
      article-content root and that comments, navigation, headers, outlines,
      reader status, Terminal shell, and other chrome are not themed.
- [ ] Schema/resolver tests cover exact `paper`, omitted/default values, and
      invalid unsafe/wrong-type values; no input is interpreted as a file path,
      URL, arbitrary selector, or executable setting.
- [ ] `./sam` content, X Core, Astro check/build, static-output, responsive and
      accessibility/browser checks, plus the normal M4 and external-workspace
      gates required by the repository, pass or record an exact unavailable
      environment failure.

## Risks and deferred items

- Existing global and Terminal rules use presentation-specific selectors and
  variables. The design must use content-root specificity and local semantic
  tokens, while leaving those outer variables untouched; the static fixture is
  the proof against cascade leakage.
- The maintained browser profile previews a checked static build and uses
  JavaScript-disabled Chromium at 1440x900 and 375x812. If the pinned browser
  image is unavailable, the implementation report must preserve the exact
  failure instead of treating the check as passed.

There are no blocking product decisions remaining for planning.
