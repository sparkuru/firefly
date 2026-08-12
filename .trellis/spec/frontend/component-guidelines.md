# Astro Component Guidelines

## Component Shape

Current components are server-rendered `.astro` files. Their usual order is:

1. Frontmatter for imports, a local `Props` interface, and prop destructuring.
2. Semantic HTML markup and child-component composition.
3. A component-scoped `<style>` block.

`src/modules/nerv/NervPage.astro` demonstrates composition, while
`src/modules/nerv/components/WarningStripe.astro` demonstrates a typed prop and
local styles. Components without imports or props, such as `ClassifiedBox.astro`
and `NoticeInfo.astro`, retain an empty frontmatter fence; match the neighboring
component when editing this experiment.

The project has no React, Preact, Vue, or Svelte integration and no hydrated UI
component convention. Do not add framework component syntax or hydration
directives to match a generic Astro pattern.

## Props

Define props in a file-local `interface Props` and read them from `Astro.props`.
Use literal unions for closed visual variants and destructuring defaults for
optional values:

```astro
---
interface Props {
  position?: 'top' | 'bottom';
}

const { position = 'top' } = Astro.props;
---
```

This is the pattern in `WarningStripe.astro`. `src/layouts/Layout.astro` shows the
same convention with a required `title` and optional `favicon` / `faviconType`
strings. Keep a type next to its sole consumer; there is no shared frontend types
module today.

Do not use an open `string` when the component supports a fixed set of variants,
and do not duplicate the default in each caller when the component owns it.

## Composition and Ownership

- Page entry files choose the document layout and feature root.
  `src/pages/index.astro` renders `<Layout>` and `<NervPage />`.
- Feature roots arrange major sections and shared page copy.
  `NervPage.astro` owns the single `<main>`, the primary heading sequence, and the
  placement of its five imported child-component types.
- Leaf components own one visually coherent region. `SecurityLevel.astro` owns the
  MAGI status block; `NoticeInfo.astro` owns seizure metadata; neither reaches into
  another component's markup.
- Layouts expose document content with `<slot />`. `Layout.astro` owns `<html>`,
  `<head>`, and `<body>` rather than making feature components reproduce the shell.

Prefer component boundaries that match a named page region. Do not split every
HTML element into a component, and do not put the whole page back into the route
file.

## Styling

Styles are plain CSS co-located in each Astro component. Normal component styles
remain scoped through `<style>`, as shown in `NervPage.astro`,
`NotFoundPage.astro`, and all NERV leaf components.

Use `style is:global` only for document-wide primitives. The existing global block
in `Layout.astro` resets box sizing/margins and defines body-level background,
typography, and overlays. Feature colors, spacing, media queries, and pseudo-elements
stay with the feature that renders them.

Responsive rules are also co-located: `NervPage.astro` adjusts its card and type at
`768px`, and `NotFoundPage.astro` adjusts its error typography at `640px`. Keep a
new responsive rule beside the base selector it modifies instead of creating an
unrelated global stylesheet.

The route script currently treats `.logo-container` and `.warning-stripe` as DOM
contracts. When changing those classes in `NervLogo.astro` or
`WarningStripe.astro`, update `src/pages/index.astro` and the affected browser
coverage in the same task.

## Markup and Accessibility Baseline

- Preserve one meaningful `<main>` and a visible `<h1>` for each page experience.
  `NervPage.astro` and `NotFoundPage.astro` both follow this shape.
- Keep heading levels in document order. The NERV page uses its emergency notice
  as `h1`, the seizure section as `h2`, and subordinate sections as `h3`.
- Prefer native elements for content: lists for seizure reasons, paragraphs for
  notices, and `<strong>` for emphasized labels. Do not replace semantic content
  with styled generic containers.
- Decorative visuals must not be the only carrier of page meaning. The inline NERV
  logo is followed by a textual emergency-notice heading; the browser test asserts
  that heading by its accessible name.
- Preserve usable narrow layouts. The browser test verifies document-width overflow
  at both configured desktop and mobile viewports.

This is a small existing baseline, not a claim of complete accessibility coverage.
No automated accessibility scanner is configured; see `quality-guidelines.md` for
the validation boundary.

## Avoid

- Do not add a client framework or hydration directive for static markup that Astro
  already renders at build time.
- Do not put feature-global CSS into `Layout.astro`; its global scope affects every
  route, including `404.astro`.
- Do not introduce untyped prop bags or read ad hoc properties repeatedly from
  `Astro.props`; use the local `Props` plus one destructuring statement.
- Do not change selector classes used by the route script without treating the
  change as an interaction-contract change.
- Do not copy PHP template composition from the reference-only Typecho prototype
  into the Astro experiment.

## Reference Files

- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `experiments/nerv/src/modules/nerv/components/SecurityLevel.astro`
- `experiments/nerv/src/modules/error/NotFoundPage.astro`
- `experiments/nerv/tests/nerv.spec.ts`
