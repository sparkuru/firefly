# Repository evidence for the paper article theme

This file records codebase-backed constraints gathered during planning. It is
context for the implementation/check agents, not a second product requirement
source.

## Existing article-theme seam

- `apps/site/src/lib/article-theme.mjs:5-44` owns the frozen ID list,
  `isArticleThemeId`, and `resolveArticleThemeId`. The current list contains
  only `default`; omission resolves to that value and invalid values throw.
- `apps/site/src/lib/content-schema.mjs:57-63` uses the registry predicate in
  the strict post/page schema and defaults the optional field.
- `apps/site/src/components/DocumentPresentation.astro:28-64` resolves the
  entry value independently of `presentation`, then passes the resolved ID to
  both document components.
- `apps/site/src/components/SemanticDocument.astro:64-75` and
  `apps/site/src/components/TerminalDocument.astro:90-99` emit one
  `data-article-theme` attribute on the existing content root. Headers,
  outlines, comments, and reader status are outside that root.

## CSS ownership and delivery

- `apps/site/src/styles/article-content.css:1-23` is presentation-neutral and
  maps generic content behavior through `--article-content-*` variables. It
  explicitly describes the root as the future article-theme seam.
- `apps/site/src/styles/global.css:1-3` imports the shared content CSS before
  global site rules. Its content rules at `:630-686` include generic prose
  links/blockquote and `.wide-content` overflow/table behavior.
- `apps/site/src/styles/terminal.css:17-50` defines Terminal-specific tokens
  and maps them into the generic article-content variables. Its document rules
  at `:1137-1247` style `.terminal-prose`, `.terminal-wide`, code, and tables.
- `apps/site/src/layouts/TerminalLayout.astro:1-4,43` imports Terminal and
  shared content CSS as raw strings and emits them in one inline style. A new
  theme must be imported with `?raw` and appended explicitly; a relative nested
  import would not be a reliable raw inline delivery path.
- `apps/site/src/layouts/DocumentLayout.astro` consumes the compiled
  `global.css?url`, so the semantic path needs a static import in `global.css`.

## Presentation and data boundaries

- `apps/site/src/lib/render-document.ts:57-71` renders Markdown and parses
  X Core metadata. The article theme is site metadata and must not be copied
  into the X Core context or exact metadata.
- `.trellis/spec/frontend/site-configuration-contract.md:188-284` defines the
  strict `articleTheme` registry, content-root-only output, and prohibition on
  dynamic stylesheet/path/selector derivation. The implementation must update
  the deferred “no alternate skin” wording to describe the shipped `paper`
  variant while retaining the boundary rules.
- `.trellis/spec/frontend/x-core-contract.md` keeps site-owned article metadata
  out of X Core context/metadata and preserves presentation/heading identity.
- `.trellis/spec/frontend/content-workspace-contract.md:345-350,392` treats
  article theme as optional site metadata and prohibits it from changing
  workspace materialization, routes, or authoring behavior. The shipped-theme
  wording needs a durable update.

## Test and runtime evidence

- `apps/site/tests/content-schema.test.mjs:57-113` already covers the frozen
  registry shape, default fallback, and unsafe/wrong-type rejection; extend it
  for `paper` rather than creating a second registry test style.
- `apps/site/tests/static-output.test.mjs:26-43,741-785` asserts the content
  root boundary, both document component attributes, CSS import/inline
  delivery, and the absence of presentation/chrome selectors in the shared
  CSS. This is the natural place for static-source regressions.
- `apps/site/tests/content-build-negatives.test.mjs:12-47` demonstrates the
  repository's temporary fixture/build pattern: same-filesystem output under
  `apps/site/test-results`, explicit `FIREFLY_CONTENT_ROOT`, and `finally`
  cleanup of fixture/output/prerender state.
- `apps/site/playwright.config.ts:25-62` maintains JavaScript-disabled static
  Chromium at `1440x900` and `375x812`, plus interactive desktop/mobile
  projects for Terminal/reader tests. Browser evidence must use the pinned
  Playwright image and a checked static build.
- `.trellis/spec/frontend/development-runtime.md` and
  `.trellis/spec/trellis-plus/validation-profile.md` require all Node/Astro and
  browser commands to run through `./sam`; host Node/npm output is not evidence.

## Scope consequence

The smallest coherent change is: add the `paper` registry ID, add one
site-owned scoped stylesheet, wire both existing static CSS delivery paths,
and add schema/build/source/browser regression coverage. No change is needed
in X Core, presentation packages, the sanitizer, route model, comments, or
the external authoring workspace.
