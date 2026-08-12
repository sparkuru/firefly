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

- Main site: `DocumentLayout.astro` owns `<html>`, metadata, skip link, header,
  navigation, `<main id="main-content">`, and footer. Home/post/page/404 routes
  supply page-specific semantic content through its slot.
- Main-site post/page routes query entries in `getStaticPaths()`, call
  `render(entry)`, and render `<Content />` inside `<article>`. They do not parse
  Markdown or repeat collection validation.
- NERV: page entries choose the document layout and feature root;
  `NervPage.astro` composes named feature-local leaf components.
- Component boundaries follow coherent document/feature regions. Do not split
  every element into a component or move a whole feature back into a route.

## Styling Boundaries

- Main site imports `src/styles/global.css` from `DocumentLayout.astro`. That file
  owns Tailwind 4's `@import 'tailwindcss'`, semantic tokens, document primitives,
  shared layout classes, focus styles, and rendered-Markdown `.prose` rules.
- NERV uses component-scoped `<style>` blocks; its `Layout.astro` alone owns
  intentional `style is:global` document effects.
- Never import either package's global stylesheet into the other package.
- Keep responsive rules next to the selectors they modify. Long-form content
  retains a controlled measure; both configured viewports must avoid document
  overflow.

## Markup and Accessibility

- Every route exposes one meaningful `<main>` and visible primary `<h1>`.
- Keep headings sequential and use native lists, paragraphs, links, `<time>`,
  and `<article>` where their semantics apply.
- Main-site navigation remains keyboard reachable. Preserve the skip link and
  visible focus outline when changing the document shell.
- Decorative visuals cannot be the sole carrier of page meaning.
- Do not claim complete accessibility coverage: no automated scanner or
  assistive-technology run is configured.

## Cross-File Contracts

- Main-site route URLs depend on validated `entry.data.slug`; changes to schema,
  collection helpers, links, and `getStaticPaths()` land together.
- NERV's `.logo-container` and `.warning-stripe` classes are queried by its route
  script; selector changes require script and browser-test review.
- Layout-level global styling affects every route in its package, including 404.

## Avoid

- Do not hydrate static content or add a client framework for build-time HTML.
- Do not add ad hoc/untyped prop bags or recast collection metadata in routes.
- Do not put package-specific feature styles into the other package's layout.
- Do not copy PHP composition from the reference-only Typecho prototype.

## Reference Files

- `apps/site/src/layouts/DocumentLayout.astro`
- `apps/site/src/pages/index.astro`
- `apps/site/src/pages/posts/[slug].astro`
- `apps/site/src/pages/pages/[slug].astro`
- `apps/site/src/styles/global.css`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
