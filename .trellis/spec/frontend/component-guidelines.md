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
- Main-site post/page routes consume the shared canonical model in
  `getStaticPaths()`, call `renderDocument(entry)`, and pass canonical/result to
  `DocumentPresentation.astro`. The dispatcher accepts only `semantic` or
  `firefly` metadata and composes the matching layout/document pair. Routes do
  not call Astro `render()` directly, parse metadata, or repeat presentation,
  collection, or heading validation.
- `SemanticDocument.astro` owns the article header/date, conditional outline,
  fragment-entry reader status/region, `.prose` container, and `<Content />`.
  Show `On this page` only for two or more body headings; its links use the
  exact validated X Core/Astro IDs. Its reader status is hidden and its region
  is not ordinarily focusable until `#terminal-reader` is present.
- `TerminalLayout.astro` owns the single visible `~/blog/<virtual-path>`
  title-bar identity. `TerminalDocument.astro` owns article metadata,
  conditional Terminal tree outline, `.terminal-prose`, reader status/forms,
  and `<Content />` without a duplicate body path marker. The outline remains a
  semantic `<nav aria-label="Document outline">` containing native links and
  aria-hidden `├──`/`└──`/`│` prefixes derived from validated
  `metadata.outline`; it must remain JavaScript-free and keyboard navigable.
  The component no longer renders a body breadcrumb or a separate current
  filename item. Shared `ReaderStatus.astro` imports only the bounded
  `terminal-reader.ts` controller, never the home command runtime. The document
  remains complete when that module does not run.
- `TerminalHome.astro` owns the synchronous home-only startup marker and direct
  boot-log staging surface, the server-rendered recovery navigation, one inert
  build-rendered document template per public entry, the hidden-until-ready shell
  session, continuous transcript/prompt, completion hint, and announcer. The
  staging surface contains the bounded startup lines and a non-interactive
  prompt; it does not render a separator or a separate live `connecting...`
  status node. The staging prompt reserves the command-row geometry but stays
  hidden until the final bounded log-line reveal completes; reduced motion
  reveals it immediately. Without JavaScript, recovery remains visible because
  the marker does not run. A DOM-ready guard restores recovery when the
  controller never starts; only after required-node, index, and exact
  entry/template validation may the controller move the boot log into the first
  transcript record, mark startup ready, hide recovery, and reveal the live
  session prompt. The transcript record must force the moved boot lines to their
  final visible state with animation disabled, so moving the same DOM node cannot
  replay the startup animation. Fatal runtime errors mark startup failed and
  restore the same recovery target.
- `pages/lab/index.astro` is a thin JavaScript-free semantic catalog. It loads the
  frozen listed projection through `lib/experiments.ts`, uses validated default-
  entry links, renders an explicit empty state, and imports no Experiment asset,
  component, style, package, preview, or client behavior.
- `TerminalStreamDocument.astro` owns the compact script-free article fragment
  inside each home template. It receives output already produced by the same
  `renderDocument()` and registered adapter path as the canonical route; it does
  not import a layout, stylesheet, or browser runtime. Its inline stream ends at
  the trusted document content; do not add a redundant prompt-return footer when
  the active command prompt already follows the stream.
- The current published main-site corpus uses the `firefly` Terminal default for
  `/pages/about/` and the article `/posts/main/379/`; its physical source
  identity is `/posts/main/llm-workflow-with-trellis.md`. The semantic adapter
  remains an explicit generic package contract for future authorized consumers;
  `#terminal-reader` selects reader entry behavior only and never changes the
  document presentation. When the published corpus changes, update the route,
  static-output, and browser assertions that prove this presentation closure.
- `ContentDirectoryIndex.astro` owns JavaScript-free immediate-child directory
  and document navigation. `/posts/`, nested post directories, and `/pages/`
  pass only canonical guest-projected directory props.
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
- `TerminalLayout.astro` selects the Terminal theme through one root
  `data-terminal-theme` value. Theme selectors own semantic color, typography,
  measure, spacing, shadow, and `color-scheme` tokens; component selectors
  consume those tokens instead of hard-coding theme values. A future theme may
  add one root token block without changing component rules. M4 ships no picker
  or persistence contract.
- Terminal typography uses the self-hosted, unmodified JetBrains Mono v2.304
  Regular/Medium WOFF2 assets with `font-display: block` and CJK/system
  monospace fallbacks. The layout preloads both same-origin faces so a hard
  reload does not paint fallback glyphs and then reflow when the Medium face is
  applied; it must not add a runtime font CDN or cross-origin dependency.
- Astro dev traverses the shared dispatcher CSS graph differently from a static
  build. Judge presentation-style isolation from built output via `astro preview`,
  not from `astro dev`.
- NERV uses component-scoped `<style>` blocks; its `Layout.astro` alone owns
  intentional `style is:global` document effects.
- Never import either package's global stylesheet into the other package.
- Keep responsive rules next to the selectors they modify. Long-form content
  retains a controlled measure; both configured viewports must avoid document
  overflow. Terminal document frames may grow fluidly beyond the established
  desktop baseline on very wide viewports, but must use a bounded cap and keep
  prose readable; wide code/table surfaces retain localized overflow. Grouped
  Terminal help uses a content-sized usage track rather than a fixed narrow
  command column; its group grid auto-fits only when each group has
  enough width for the usage/description relationship, and collapses before
  tablet-width wrapping becomes noisy.

## Markup and Accessibility

- Every route exposes one meaningful `<main>` and one programmatic primary
  `<h1>`. The Terminal home heading is the sole visually hidden route-heading
  exception so successful enhancement begins at the prompt; document and 404
  headings remain visible.
- Keep headings sequential and use native lists, paragraphs, links, `<time>`,
  and `<article>` where their semantics apply.
- The Terminal home recovery catalog renders configured friend records as a
  labelled native-link list. Preserve same-tab anchors, visible focus, and a
  bounded `No friend links.` empty state; the interactive controller may hide
  this catalog only after complete startup validation. Friend rows use the
  `ls`-style aligned name/description/URL columns on wide screens and stack in
  that same order on narrow screens; keep an empty description cell when the
  optional field is absent.
- Native navigation is keyboard reachable whenever exposed in recovery,
  document, or command-output states. The enhanced home may hide recovery only
  after complete startup validation; the marker's internal connecting state
  exposes the direct boot log and prompt staging view while its
  bounded lines may reveal with a short non-blocking CSS animation. It does not
  add a separate live status line. A ready session preserves the boot log as its
  first transcript record, disables animation on that historical record, and
  failed startup restores the native recovery links.
  Preserve the skip link and visible focus in every state.
- The lab catalog keeps one visible H1, sequential headings, native list/link
  semantics, readable measure, visible focus, and a native home path. It remains
  useful at `375×812` without JavaScript or document-level overflow.
- Semantic wide-content wrappers use a named `role="region"`, `tabindex="0"`,
  localized horizontal scrolling, and a visible focus outline. Do not hide
  document overflow globally to mask a table/code defect.
- Terminal `pre`/`table` wrappers follow the same named, focusable local-scroll
  contract through `.terminal-wide`. The prompt input row is at least 44 px,
  uses a visually hidden label, native implicit form submission, and
  `enterkeyhint="send"`; no visible submit/Run control is rendered. Results use a
  separate polite atomic announcer rather than a growing live transcript.
- Standard native controls and ARIA widgets retain their keyboard behavior even
  inside the enhanced Terminal session. Page-level shell typing must exclude
  them, editable/selected content, links, and local-scroll regions.
- The Terminal reader region is one focusable named region with active-unit and
  status feedback; its search/command forms are labeled native inputs. It does
  not put every reading unit in the Tab order. Document source paths and tree
  outline entries remain readable native text/links; tree prefixes are
  decorative and hidden from assistive technology.
- When `clear`, `cls`, or unmodified prompt `Ctrl+L` leaves the transcript empty,
  the session exposes its explicit empty-state layout and centers the fresh
  command row within the home viewport without relying on scrollable document
  height. The first subsequent rendered command result removes that state.
- Decorative visuals cannot be the sole carrier of page meaning.
- Do not claim complete accessibility coverage: no automated scanner or
  assistive-technology run is configured.

## Cross-File Contracts

- Main-site route URLs depend on `CanonicalDocument`: physical relative paths
  drive source-tree identity, while validated front-matter slugs drive stable
  canonical routes when present. Changes to materialization, schema,
  canonical helpers, links, Terminal entries, and `getStaticPaths()` land
  together.
- X Core outline metadata, Astro `render(entry).headings`, semantic outline links,
  and emitted heading IDs must agree exactly. `renderDocument()` is the runtime
  drift guard.
- NERV's `.logo-container` and `.warning-stripe` classes are queried by its route
  script; selector changes require script and browser-test review.
- Layout/style ownership is a bidirectional artifact contract: semantic routes
  reference only semantic CSS; Terminal routes contain only Terminal styles;
  the Terminal home script is referenced only by `/`, and the reader script only
  by canonical Terminal documents.

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
- `apps/site/src/pages/lab/index.astro`
- `apps/site/src/lib/experiments.ts`
- `apps/site/src/pages/posts/[...path].astro`
- `apps/site/src/pages/posts/index.astro`
- `apps/site/src/pages/pages/index.astro`
- `apps/site/src/components/ContentDirectoryIndex.astro`
- `apps/site/src/pages/pages/[slug].astro`
- `apps/site/src/components/SemanticDocument.astro`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/components/TerminalStreamDocument.astro`
- `apps/site/src/layouts/TerminalLayout.astro`
- `apps/site/src/styles/terminal.css`
- `apps/site/src/scripts/terminal-reader.ts`
- `apps/site/src/lib/render-document.ts`
- `apps/site/src/styles/global.css`
- `presentations/semantic/src/index.ts`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
