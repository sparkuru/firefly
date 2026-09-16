# Repository evidence: presentation-composed document navigator

## Context loading requirement

`task.py validate` reports that `content-workspace-contract.md` exceeds the
32,768-byte injection limit. Implementation and check agents must read the
referenced contract directly in paginated chunks through EOF before acting;
injected text is incomplete. In particular, the `Read-only Vim reader`
section begins around line 1146 and is beyond the injected prefix. Do not
treat successful manifest validation as proof of complete context delivery.

## Current rendering flow

- `apps/site/src/components/DocumentPresentation.astro` currently resolves
  `document.metadata.presentation`, validates the two production IDs inline,
  selects `DocumentLayout` or `TerminalLayout`, and independently resolves
  `articleTheme` through the site registry.
- `DocumentLayout.astro` owns semantic site chrome. `TerminalLayout.astro`
  owns the Terminal shell, title bar, and inline Terminal/shared/article CSS.
- `SemanticDocument.astro` and `TerminalDocument.astro` both render a
  `[data-article-content]` root and the shared `ReaderStatus` component, but
  hardcode different entry modes (`fragment` versus `always`) and variants.
- `ReaderStatus.astro` renders the status/search/command surface and imports
  `terminal-reader.ts`. The runtime is already shared by semantic and Terminal
  documents; it waits for `#terminal-reader` only when the root declares
  fragment entry.

## Existing contracts to preserve

- `packages/x-core` owns framework-neutral presentation adapter selection,
  transforms, exact metadata, diagnostics, and identity invariants. Its
  `DocumentContext` and `XCoreMetadata` intentionally do not contain
  `articleTheme` or browser interaction state.
- `apps/site` owns outer layouts, content-root article themes, browser
  controllers, and reader status delivery. Browser interaction must not move
  into X Core.
- Omitted `presentation` resolves to `firefly`; explicit `semantic` remains
  supported. Both adapters support post/page contexts and preserve normalized
  headings and node identities.
- `articleTheme` is validated independently, defaults to `default`, and is
  emitted only as `data-article-theme` on the content root. `paper.css` is
  content-root scoped and must not recolor outer chrome or controls.
- Static HTML remains complete without JavaScript. Terminal direct entry keeps
  the visible status surface; semantic direct entry keeps the status hidden and
  activates it through `#terminal-reader`.
- `#terminal-reader` is a public compatibility fragment used by terminal
  `vim` navigation and existing permalinks. The task must not remove it.

## Proposed seam

Create one site-owned presentation-experience definition consumed by both the
Astro dispatch and the X Core adapter registration. Each entry keeps the
presentation renderer identity and its `documentNavigator` composition
together. The front matter still carries only `presentation` and
`articleTheme`; the navigator descriptor is internal presentation data.

The initial two entries preserve the existing behavior:

```text
firefly  -> Terminal document + documentNavigator(always, visible)
semantic -> semantic document + documentNavigator(fragment, hidden-until-entry)
```

Future presentations can reuse this navigator or add a bespoke implementation
after a concrete second interaction use case. The owner deferred navigation
opt-out support until a presentation needs it; this task keeps profiles
non-nullable and adds no no-navigation fixtures or document-level asset
suppression. A generic runtime plugin marketplace is not part of this task.

The current status component owns controls and runtime initialization, while
the two document components own the article and content root. Preserve this
ownership during extraction: name the surface `DocumentNavigationStatus.astro`
and pass the same resolved profile to the documents and status component.
Current initialization checks the fragment once; there is no hashchange
activation listener in `ReaderStatus.astro` or `terminal-reader.ts`.

## Rename boundary

Rename the site-owned interaction implementation and product-facing labels to
`documentNavigator`/navigation terminology. Keep the `vim` Terminal command
and `#terminal-reader` fragment as compatibility boundaries. Comment display
names containing “Reader” are unrelated data and must not be bulk-renamed.

## Validation evidence

The existing positive build fixture, static-output assertions, reader browser
suite, semantic/Terminal presentation tests, and `./sam` package gates provide
the regression surface. The implementation should add profile consistency and
entry-behavior assertions without changing X Core metadata or the article-theme
boundary.
