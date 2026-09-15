# Paper article theme — Technical Design

## Status

Planning design for the `paper` variant. The design is intentionally limited
to the site-owned article-content boundary; the implementation remains blocked
until the owner approves the final planning summary.

## 1. Ownership and boundary

`apps/site` owns the registry, front matter validation, content-root attribute,
and theme CSS. X Core and the `semantic`/`terminal` presentation packages do
not need to know that a paper theme exists. `presentation` continues to choose
the outer document adapter; `articleTheme` chooses only the content styling.

The data flow remains:

```text
authored Markdown front matter
  │
  └─ post/page schema: articleTheme = "paper"
       │
       └─ PublicDocumentEntry.data.articleTheme
            │
            └─ DocumentPresentation resolves the site registry ID
                 │
                 ├─ SemanticDocument
                 │    └─ [data-article-content][data-article-theme="paper"]
                 │
                 └─ TerminalDocument
                      └─ [data-article-content][data-article-theme="paper"]
```

The theme value does not enter `CanonicalDocument` as a second projection,
X Core context or metadata, route reservation, comments/plugin payload, home
entry data, or the browser runtime. The existing root attribute is the only
rendering seam.

## 2. File organization and static delivery

```text
apps/site/src/
├── lib/article-theme.mjs                 # registry: default + paper
├── styles/
│   ├── article-content.css                # shared default contract
│   └── article-themes/
│       └── paper.css                      # paper-only rules
├── layouts/
│   └── TerminalLayout.astro               # raw static CSS composition
└── styles/global.css                      # semantic CSS composition
```

The default theme remains the current `article-content.css` baseline; do not
copy it into `article-themes/default.css`.

Use two explicit imports because the two layouts deliver CSS differently:

- Add `@import './article-themes/paper.css';` beside the existing
  `article-content.css` import in `global.css`. The selectors use two
  article-root attributes, so they remain stronger than the generic `.prose`
  rules that follow the imports.
- Import `paper.css?raw` in `TerminalLayout.astro` and append that string after
  `terminalCss` and `articleContentCss` in the existing inline `<style>`. A raw
  CSS string must not depend on a nested relative `@import`; the explicit import
  keeps the generated Terminal document self-contained and deterministic.

Neither path constructs a URL or file path from front matter. The registry ID
selects a precompiled selector that is already present in the site bundle.

## 3. Token architecture

Keep the three layers local to the paper root, following the project's design
system guidance. Raw values belong only to primitives; semantic aliases express
meaning; component aliases keep individual surfaces consistent.

```css
[data-article-content][data-article-theme='paper'] {
  /* primitives: palette, spacing, radius, and shadow values */
  --article-paper-primitive-canvas: ...;
  --article-paper-primitive-surface: ...;
  --article-paper-primitive-ink: ...;
  --article-paper-primitive-muted: ...;
  --article-paper-primitive-border: ...;
  --article-paper-primitive-link: ...;
  --article-paper-primitive-link-hover: ...;
  --article-paper-primitive-focus: ...;
  --article-paper-primitive-code: ...;

  /* semantic aliases */
  --article-paper-canvas: var(--article-paper-primitive-canvas);
  --article-paper-surface: var(--article-paper-primitive-surface);
  --article-paper-ink: var(--article-paper-primitive-ink);
  --article-paper-muted: var(--article-paper-primitive-muted);
  --article-paper-border: var(--article-paper-primitive-border);
  --article-paper-link: var(--article-paper-primitive-link);
  --article-paper-link-hover: var(--article-paper-primitive-link-hover);
  --article-paper-focus: var(--article-paper-primitive-focus);

  /* component aliases */
  --article-paper-panel-background: var(--article-paper-canvas);
  --article-paper-code-background: var(--article-paper-primitive-code);
  --article-paper-callout-background: var(--article-paper-surface);
  --article-paper-wide-background: var(--article-paper-surface);

  /* shared content contract, scoped rather than global */
  --article-content-text: var(--article-paper-ink);
  --article-content-muted: var(--article-paper-muted);
  --article-content-surface: var(--article-paper-canvas);
  --article-content-surface-raised: var(--article-paper-surface);
  --article-content-border: var(--article-paper-border);
  --article-content-link: var(--article-paper-link);
  --article-content-focus: var(--article-paper-focus);
}
```

The concrete palette should be warm but high-contrast: a light cream canvas,
near-black brown ink, muted brown secondary text, terracotta link accent,
ochre focus ring, and a slightly darker cream code surface. Validate the final
values against normal-text contrast before handoff. Do not overwrite global
`--surface`, `--text`, `--link`, `--focus`, Terminal color variables, or the
outer `color-scheme`.

## 4. Visual contract and selector shape

Every rule in `paper.css` must begin with the exact paper content-root scope:

```css
[data-article-content][data-article-theme='paper'] ...
```

`:is()` and `:where()` may group descendants, but the root scope must remain
visible in the selector. No selector may begin with `.site-*`, `.terminal-*`,
`body`, `html`, a global element name, or an interpolated value.

The paper root should provide:

- a warm paper panel background, subtle border/radius/shadow, readable padding,
  `max-inline-size: 100%`, and local serif body typography;
- ink-colored body text and headings, restrained hierarchy, comfortable line
  height, and local-system serif fallbacks with no downloaded font;
- terracotta links with a visibly darker hover state and an ochre focus ring;
- a readable blockquote treatment with a paper-appropriate accent border and
  muted text;
- inline code and fenced code surfaces that remain monospace, preserve Shiki
  token markup, and do not force the page wider than the viewport;
- callouts using the shared `.firefly-content-callout` contract with paper
  surface/border tokens;
- `.wide-content` and `.terminal-wide` as independently scrollable regions for
  wide code and tables, with paper backgrounds and preserved whitespace;
- `img` and `video` constrained to `max-inline-size: 100%` with automatic
  block sizing; tables stay inside their existing wide-content scroll wrapper;
- an explicit content-root and descendant-link focus style using the paper
  focus token, while leaving reader-status and other controls outside the
  theme untouched.

At or below the maintained 375px viewport, reduce panel padding, keep radius
and shadow restrained, allow long words/URLs to wrap, and preserve horizontal
scroll only on the intentional wide-content regions. Do not add a fixed
minimum width or hide overflow on the page/root in a way that makes code or
tables inaccessible.

The article header, outline, comments, reader status, site navigation, Terminal
title bar/shell, and outer presentation background remain governed by their
existing styles. The Terminal result is therefore a paper content panel inside
the existing dark terminal shell, not a global light-mode switch.

## 5. Cascade and compatibility strategy

The shared baseline remains unchanged. In the semantic stylesheet, the paper
selectors are imported before later global rules but have the more specific
two-attribute root scope. In the Terminal stylesheet, paper rules are appended
after the existing Terminal and shared content CSS. This handles existing
`.prose`, `.terminal-prose`, `.wide-content`, and terminal document rules
without changing their selectors or variables.

Do not use `!important` as the cascade strategy. If a rule is not strong enough,
make the content-root scope explicit on that descendant rule. Keep the paper
palette and typography declarations on the content root or its descendants so
inheritance cannot recolor outer chrome.

## 6. Verification design

1. **Registry/schema:** extend the current registry tests for exact `paper`,
   omitted/default fallback, explicit `paper`, and the existing invalid
   path/URL/selector/wrong-type cases. Keep strict unknown-key behavior.
2. **Static source contract:** assert the paper file exists in the theme folder,
   contains only paper-rooted selectors, has no dynamic URL construction or
   outer chrome selectors, and is imported by both CSS delivery paths. Assert
   the shared baseline file is unchanged.
3. **Positive build fixture:** follow the existing same-filesystem
   `content-build-negatives.test.mjs` pattern. In a `finally` block, create a
   temporary repository-local blog root under `apps/site/test-results/` with
   `posts/` and `pages/`. Give the two fixtures the same Markdown body and
   `articleTheme: paper`, using `presentation: semantic` for one and the
   default Terminal presentation for the other. Build to another contained
   `test-results` output directory, then assert both routes, root attributes,
   route stability, emitted semantic CSS, and Terminal inline CSS. Remove all
   fixtures/output even on failure; do not touch the external workspace.
4. **X Core/integration:** use the paper fixture or existing integration
   document to assert the exact X Core context/metadata, heading outline, node
   IDs, sanitizer output, and presentation selection remain unchanged and do
   not contain `articleTheme`.
5. **Browser/responsive:** keep the existing static Chromium matrix at
   `1440x900` and `375x812`. A focused static test may set the paper attribute
   on an existing built article in the test DOM to exercise the emitted CSS
   without publishing a fixture route; assert computed paper colors/typography,
   visible focus, intended local wide-content scrolling, and
   `document.documentElement.scrollWidth <= innerWidth`. The positive build
   fixture remains the evidence that real front matter reaches both routes.
6. **Regression gates:** run the site content/X Core tests, Astro check/build,
   M4 checks/tests/build, and the configured external-workspace build through
   `./sam`. Run the pinned Playwright image for browser evidence.

## 7. Rollback and failure boundaries

The task is additive and can be rolled back by reverting the `paper` registry
entry, paper stylesheet/imports, focused tests, and any updated durable spec.
Do not roll back by deleting or rewriting authored content, generated external
workspace files, or publication artifacts. If the default route, X Core
metadata, or outer chrome changes, stop at that boundary and correct the
scoping/cascade rather than widening the theme.
