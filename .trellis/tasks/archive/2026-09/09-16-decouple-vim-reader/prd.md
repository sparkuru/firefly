# Compose presentation with a document navigator

## Goal

Refactor the site's document-navigation composition into one presentation
experience definition, preserving Firefly's file discovery, reading, and
location workflow and the existing semantic reading experience. This reduces
duplicated entry-policy decisions and makes the shared navigation behavior
understandable and reusable when adding presentations.

The deliverable is a verified implementation with updated contracts. This
document defines its requirements; planning approval is tracked separately
in `implement.md`.

## Confirmed repository facts

- `apps/site/src/components/DocumentPresentation.astro:27-64` selects the
  outer document presentation from the rendered document metadata. The
  supported production paths are the default `firefly` Terminal presentation
  and explicit `semantic` presentation.
- `apps/site/src/layouts/TerminalLayout.astro:26-64` owns the dark Terminal
  shell, title bar, path display, and Terminal-specific delivery of CSS.
  `apps/site/src/layouts/DocumentLayout.astro:23-49` owns the semantic site
  header, navigation, main area, and footer.
- `apps/site/src/components/TerminalDocument.astro:45-105` renders a Terminal
  document with an always-active reader entry and visible Terminal reader
  status. `apps/site/src/components/SemanticDocument.astro:28-82` renders the
  semantic document and includes the same reader contract as a fragment-entry
  mode with initially hidden status.
- `apps/site/src/components/ReaderStatus.astro:2-28` supplies the shared reader
  status/search/command controls. `apps/site/src/scripts/terminal-reader.ts:142-160`
  activates the shared Vim-like reader for every presentation, but deliberately
  waits for `#terminal-reader` when the presentation marks itself as a fragment
  entry.
- `apps/site/src/lib/article-theme.mjs:2-44` owns the frozen site registry
  `default` and `paper`. `articleTheme` is validated by the shared post/page
  schema and is passed independently to both document components.
- `apps/site/src/styles/article-themes/paper.css:1-267` scopes the paper skin
  below `[data-article-content][data-article-theme='paper']`; it does not style
  the outer presentation, reader status, navigation, or Terminal chrome.
- Earlier planning recorded a demo using `presentation: semantic` and
  `articleTheme: paper`. That external article is not a validation dependency;
  use repository-local fixtures to verify composition.
- Recent article-theme tests and the archived task records cover the two
  article-theme values, both presentation paths, content-boundary isolation,
  and the shared reader behavior. There is no product-level theme picker or
  explicit cross-presentation reader affordance yet.

## Product problem

The shared navigation behavior already serves both presentations, but its
Terminal/Vim naming obscures that reuse. Adapter registration, document
dispatch, and navigation entry policy are distributed across different files,
increasing the coordination needed to extend a presentation.

Different entry policies are intentional and remain supported. This task
centralizes their ownership; it does not improve semantic navigation
discoverability or add a visible entry affordance.

## Confirmed product decisions

The owner rejects an author-facing `reader` field. A separate
`presentation -> reader` mapping would add an unnecessary configuration layer
for future presentations such as `firefly`, `atom`, and `powershell`.

`presentation` is therefore a complete experience preset rather than a visual
skin only. Its site-owned definition may select or compose a document
navigation behavior, its entry policy, and its visible controls. A navigation
implementation can be designed independently and reused by multiple
presentations, but its implementation identity does not enter article front
matter.

This keeps the author-facing model at two independent fields:

```yaml
presentation: firefly
articleTheme: paper
```

`presentation` selects the outer experience and its document-navigation
composition; `articleTheme` selects the content treatment. There is no
standalone author-facing `reader` field.

The main tradeoff is composability: presentation-owned navigation composition
makes each preset internally coherent and avoids an extra author/configuration
mapping, but it does not initially promise every combination such as “Atom
chrome with Firefly navigation” or “PowerShell chrome with no navigation.”

The approved product vocabulary is:

- `presentation`: the public front-matter field and existing X Core concept;
- `articleTheme`: the public content-boundary styling field;
- `documentNavigator`: the interaction behavior currently called the reader;
- `commandBar`/navigation status: the visible status and command surface when
  a presentation exposes one.

The existing `presentation` and `articleTheme` field names stay stable. The
one-letter shorthand `p`/`a` remains useful in discussion but is not added to
the authored schema.

## Scope

In scope:

- a single site-owned presentation-experience definition that keeps each
  presentation's outer form and documentNavigator composition together;
- moving the current Terminal/semantic entry differences behind that
  presentation definition while keeping the shared documentNavigator engine;
- renaming the product-facing and site-owned reader implementation to
  documentNavigator terminology where it is not a public compatibility
  boundary;
- preserving the `presentation` + `articleTheme` authoring model and making
  their composition observable in both existing presentations;
- preserving static HTML, accessibility, progressive enhancement, and current
  Firefly/semantic behavior; only the specified labels and internal identifiers
  change.

Out of scope:

- adding a third front-matter field or a global reader-selection matrix;
- implementing new Atom or PowerShell presentations or their bespoke
  navigation UIs in this task;
- moving browser interaction, site chrome, or article themes into X Core;
- renaming the existing `vim` Terminal command or removing the legacy
  `#terminal-reader` fragment contract;
- changing authored Markdown, routes, comments/plugin payloads, sanitizer
  policy, or the external blog workspace;
- building a generic presentation/theme/interaction marketplace or runtime
  plugin loader;
- supporting a presentation with navigation fully disabled, including a
  nullable navigator profile, no-navigation fixtures, or conditional navigator
  asset suppression for document routes; the owner deferred this capability
  until a concrete presentation needs it;
- adding a theme picker or a new semantic navigation entry affordance.

## Requirements

- R1 — A single site-owned experience definition supplies adapters to X Core
  registration and profiles to document dispatch. Adapter identity is the
  source of truth; no independent reader-selection table is introduced.
- R2 — Omitted `presentation` resolves to `firefly`. Firefly activates navigation
  on direct entry with visible status; semantic activates on initial load with
  the exact `#terminal-reader` fragment and otherwise keeps status hidden.
  No new same-page hash-change activation behavior is required.
- R3 — Preserve movement, visual selection, literal search, focus, native input
  ownership, IME, reduced motion, history behavior, and deterministic `:q`
  navigation to `/`. Preserve the `vim` command and its generated fragment.
- R4 — Preserve complete static HTML, native links, accessible navigation
  controls, and document-only navigation asset delivery.
- R5 — Keep both existing presentation IDs and both articleTheme IDs composable.
  Theme selection remains on the content root and does not affect chrome,
  navigation, X Core metadata, routes, sanitizer policy, or comments payloads.
- R6 — Use document-navigation terminology in site-owned implementation and
  accessible labels. Retain public compatibility identifiers; do not rename
  unrelated content or comment display names.
- R7 — Future presentations own their navigation composition inside their
  experience definition. Bespoke engines and article-level overrides are
  deferred until a concrete use case; existing theme validation stays intact.

## Alternatives considered

The following alternatives were compared against Firefly identity, DIY
freedom, discoverability, accessibility, implementation complexity, and
backward compatibility:

1. Firefly-exclusive interaction: strongest original identity and lowest
   implementation cost, but prevents semantic and future presentations from
   composing the same document behavior and keeps the old conceptual split.
2. Universal optional interaction: improves reuse and discoverability, but
   makes every presentation carry a global interaction-entry contract and can
   make the site feel inconsistent when a presentation has a different
   interaction language.
3. Universal configured interaction: maximizes article-level combinations, but
   creates the extra author-facing axis and a growing validation/UX matrix.
4. Presentation-composed documentNavigator: keeps the author model at two
   fields, lets each presentation be internally coherent, and allows an
   independently designed navigation implementation to be reused. This is the
   recommended direction; its tradeoff is that arbitrary cross-combinations
   remain a later extension rather than an initial promise.

## Acceptance Criteria

- [ ] AC1 (R1, R7): Registration and dispatch consume the same definitions;
      tests verify both adapter IDs, document kinds, entry policies, and
      rejection of identity mismatches. No duplicated entry-policy literals
      remain in document components.
- [ ] AC2 (R2): Browser tests cover direct and legacy-fragment initial entry
      for Firefly and semantic, including expected focus and status visibility;
      omitted presentation retains the Firefly default.
- [ ] AC3 (R3): Existing desktop/mobile movement, search, selection, native
      control, IME, focus, reduced-motion, history, and exit tests pass without
      weakening assertions. `vim` still produces the legacy fragment and `:q`
      returns to `/`.
- [ ] AC4 (R4): Both presentations remain readable with JavaScript disabled.
      Built document routes deliver one navigation asset and one content
      region; home, directory, Lab, and NERV routes deliver no navigator asset.
- [ ] AC5 (R5): Local fixtures cover firefly/semantic × default/paper. Each
      output has exactly one content-root theme attribute, with theme styling
      isolated from outer chrome and navigation. Existing metadata, route,
      sanitizer, and comments contract checks remain unchanged in meaning.
- [ ] AC6 (R6): Accessible names and announcements use navigation terminology;
      the `vim` command and `#terminal-reader` fragment/id remain compatible.
      Tests and durable frontend contracts reflect the internal rename.

## Risks and validation ownership

DOM/data/CSS renames can break focus, search highlights, status geometry, or
asset delivery even when types pass. `design.md` defines component ownership
and compatibility boundaries; `implement.md` maps these criteria to static,
browser, and package checks. No authored-content migration is required.
