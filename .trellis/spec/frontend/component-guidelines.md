# Astro Component Guidelines

## Component Shape

Both runnable packages use server-rendered `.astro` files. The normal order is
frontmatter, semantic markup/composition, then package-appropriate styling.
There is no React, Preact, Vue, Svelte, or hydrated-component convention.

Define component props in a file-local `interface Props`, destructure
`Astro.props` once, and use literal unions for closed variants:

```astro
---
interface Props {
  position?: 'top' | 'bottom';
}

const { position = 'top' } = Astro.props;
---
```

Use shared types only for a genuinely cross-file domain contract. Content-entry
types come from `astro:content`; do not duplicate their metadata interfaces in
routes.

## Composition and Ownership

- Main site whole-document composition is explicit. `DocumentLayout.astro` owns
  the semantic shell; `TerminalLayout.astro` owns the Terminal shell. Each owns
  `<html>`, metadata, skip link, and `<main id="main-content">` for its route.
- Main-site post/page routes query entries in `getStaticPaths()`, call the shared
  `renderDocument(entry)`, and pass entry/result to
  `DocumentPresentation.astro`. The dispatcher accepts only `semantic` or
  `terminal` metadata and composes the matching layout/document pair. Routes do
  not call Astro `render()` directly, parse metadata, or repeat presentation,
  collection, or heading validation.
- `SemanticDocument.astro` owns the article header/date, conditional outline,
  `.prose` container, and `<Content />`. Show `On this page` only for two or more
  body headings; its links use the exact validated X Core/Astro IDs.
- `TerminalDocument.astro` owns the Terminal path prompt, article metadata,
  conditional outline, `.terminal-prose`, and `<Content />`. It is a complete
  native document and must not import the home command runtime.
- `TerminalHome.astro` owns the server-rendered recovery navigation, one inert
  build-rendered document template per public entry, the hidden-until-ready shell
  session, continuous transcript/prompt, completion hint, and announcer.
  Recovery remains visible before startup, without JavaScript, and after early or
  fatal failure. Only after required-node, index, and exact entry/template
  validation may the controller hide recovery and reveal the prompt-first session.
- `TerminalStreamDocument.astro` owns the compact script-free article fragment
  inside each home template. It receives output already produced by the same
  `renderDocument()` and registered adapter path as the canonical route; it does
  not import a layout, stylesheet, or browser runtime.
- NERV: page entries choose the document layout and feature root;
  `NervPage.astro` composes named feature-local leaf components.
- Component boundaries follow coherent document/feature regions. Do not split
  every element into a component or move a whole feature back into a route.

## Styling Boundaries

- `DocumentLayout.astro` imports `global.css?url` and links the compiled semantic
  stylesheet only on semantic/About/404 routes. It owns Tailwind 4 tokens,
  document primitives, focus styles, and rendered-Markdown `.prose` rules.
- `TerminalLayout.astro` imports `terminal.css?raw` and emits it inline only on
  Terminal home/article routes. Terminal CSS must be final plain CSS: no Tailwind
  directives, external imports, or unresolved asset URLs. Keep every selector
  under the Terminal namespace.
- Astro dev traverses the shared dispatcher CSS graph differently from a static
  build. Judge presentation-style isolation from built output via `astro preview`,
  not from `astro dev`.
- NERV uses component-scoped `<style>` blocks; its `Layout.astro` alone owns
  intentional `style is:global` document effects.
- Never import either package's global stylesheet into the other package.
- Keep responsive rules next to the selectors they modify. Long-form content
  retains a controlled measure; both configured viewports must avoid document
  overflow.

## Markup and Accessibility

- Every route exposes one meaningful `<main>` and one programmatic primary
  `<h1>`. The Terminal home heading is the sole visually hidden route-heading
  exception so successful enhancement begins at the prompt; document and 404
  headings remain visible.
- Keep headings sequential and use native lists, paragraphs, links, `<time>`,
  and `<article>` where their semantics apply.
- Native navigation is keyboard reachable whenever exposed in recovery,
  document, or command-output states. The enhanced home may hide recovery only
  after complete startup validation. Preserve the skip link and visible focus in
  every state.
- Semantic wide-content wrappers use a named `role="region"`, `tabindex="0"`,
  localized horizontal scrolling, and a visible focus outline. Do not hide
  document overflow globally to mask a table/code defect.
- Terminal `pre`/`table` wrappers follow the same named, focusable local-scroll
  contract through `.terminal-wide`. The prompt input row is at least 44 px,
  uses a visually hidden label, native implicit form submission, and
  `enterkeyhint="send"`; no visible submit/Run control is rendered. Results use a
  separate polite atomic announcer rather than a growing live transcript.
- Decorative visuals cannot be the sole carrier of page meaning.
- Do not claim complete accessibility coverage: no automated scanner or
  assistive-technology run is configured.

## Cross-File Contracts

- Main-site route URLs depend on validated `entry.data.slug`; changes to schema,
  collection helpers, links, and `getStaticPaths()` land together.
- X Core outline metadata, Astro `render(entry).headings`, semantic outline links,
  and emitted heading IDs must agree exactly. `renderDocument()` is the runtime
  drift guard.
- NERV's `.logo-container` and `.warning-stripe` classes are queried by its route
  script; selector changes require script and browser-test review.
- Layout/style ownership is a bidirectional artifact contract: semantic routes
  reference only semantic CSS; Terminal routes contain only Terminal styles;
  the one home script is referenced only by `/`.

## Avoid

- Do not hydrate static content or add a client framework for build-time HTML.
- Do not add ad hoc/untyped prop bags or recast collection metadata in routes.
- Do not put package-specific feature styles into the other package's layout.
- Do not render presentation metadata as a CSS variant inside one shared layout;
  dispatch the whole layout/document pair.
- Do not copy PHP composition from the reference-only Typecho prototype.

## Reference Files

- `apps/site/src/layouts/DocumentLayout.astro`
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/posts/[slug].astro`
- `apps/site/src/pages/pages/[slug].astro`
- `apps/site/src/components/SemanticDocument.astro`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/layouts/TerminalLayout.astro`
- `apps/site/src/styles/terminal.css`
- `apps/site/src/lib/render-document.ts`
- `apps/site/src/styles/global.css`
- `presentations/semantic/src/index.ts`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
