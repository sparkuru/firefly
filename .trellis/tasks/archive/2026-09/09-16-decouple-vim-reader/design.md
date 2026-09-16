# Presentation-composed document navigator — Technical Design

## Status

Implementation approved and completed. The owner approved the public
vocabulary, the two-field authoring model, and the final planning summary;
the implementation and quality checks below record the delivered result.

## 1. Design outcome

The article front matter remains:

```yaml
presentation: firefly
articleTheme: paper
```

`presentation` selects one complete document experience. That experience owns
the outer document form and the way it composes a `documentNavigator`, including
entry behavior and the visible command/status surface. `articleTheme` continues
to style only the rendered article-content root.

There is no article-level `reader`, `navigator`, or interaction field. A
presentation may reuse the shared documentNavigator implementation or later
provide another implementation as part of its own experience definition.

The task is an architectural extraction and terminology correction, not a new
interaction design. The existing Firefly and semantic behaviors remain the
initial profiles.

## 2. Ownership and package boundaries

| Concern | Owner | Contract |
| --- | --- | --- |
| Front matter validation/defaults | `apps/site/src/lib/content-schema.mjs` | Accept the existing `presentation` and `articleTheme` IDs; no third field |
| Build-time content transform and metadata | `packages/x-core` | Resolve `presentation` to an adapter; keep exact metadata and identity guarantees |
| Presentation experience composition | `apps/site/src/lib/presentation-experiences.ts` | One site-owned definition per production presentation, including document renderer kind and documentNavigator profile |
| Outer document chrome | `apps/site/src/layouts/*` | Terminal or semantic page shell, independent from articleTheme |
| Article content styling | `apps/site/src/lib/article-theme.mjs` and `apps/site/src/styles/article-themes/*` | Content-root-only theme selection |
| Document interaction | Document components, `apps/site/src/components/DocumentNavigationStatus.astro`, and `apps/site/src/scripts/document-navigator.ts` | Documents own content boundaries; status owns controls; runtime enhances existing HTML |
| Terminal command navigation | `presentations/terminal` and `apps/site/src/scripts/terminal-home.ts` | Keep the `vim` command semantics; decorate canonical links with the compatibility fragment |

X Core remains unaware of browser DOM, layout components, status bars, and
article themes. The site-owned experience definition is intentionally outside
X Core even though it consumes the already-resolved presentation ID.

## 3. Single presentation-experience definition

The current site has three related decisions split across
`DocumentPresentation.astro`, `SemanticDocument.astro`, and
`TerminalDocument.astro`: the adapter ID, the outer document kind, and the
documentNavigator entry policy. Consolidate those decisions into one
site-owned definition. The exact implementation shape should be a typed
registry or frozen record, not a second article metadata projection.

The implementation contract is:

```ts
type PresentationExperience = {
  readonly id: string;
  readonly adapter: PresentationAdapter;
  readonly documentKind: 'semantic' | 'terminal';
  readonly documentNavigator: {
    readonly kind: 'document-navigator';
    readonly entry: 'always' | 'fragment';
  };
};
```

The initial entries are:

```text
firefly  -> terminal document + documentNavigator(entry: always)
semantic -> semantic document + documentNavigator(entry: fragment)
```

The profile's `kind` names the current site-owned implementation, not a
front-matter value. Future presentations can reuse this implementation.
Different entry affordances, new navigation implementations, and disabling
navigation require a concrete use case and a separate design extension.

`apps/site/astro.config.mjs` should build the existing X Core
`PresentationRegistry` from the adapters in these definitions, while
`DocumentPresentation.astro` should resolve the same definition for outer
rendering. This removes the current duplicated allow-list/dispatch knowledge;
it does not create a separate `presentation -> reader` table. The definition
is the presentation's complete site contract.

The adapter ID must remain the source of truth for the X Core registration.
The site definition should fail early if its key/declared ID and adapter ID
disagree. Unknown IDs and unsupported contexts must continue to produce the
existing typed X Core/build errors.

## 4. DocumentNavigator contract

### 4.1 Component boundary

Rename `ReaderStatus.astro` to `DocumentNavigationStatus.astro` and make it consume
the resolved presentation-owned profile. It remains a shared component for
the two current document renderers, but its activation is no longer encoded
by a `variant === semantic/terminal` branch alone.

The component is responsible for:

- rendering the current document-navigation status/search/command surface;
- loading the progressive enhancement module once for the current document;
- preserving static content and native links when JavaScript is absent.

`SemanticDocument.astro` and `TerminalDocument.astro` continue to own the
article wrapper and content root, including the legacy ID, region semantics,
tabindex, and neutral navigation data attributes. They receive the resolved
profile from dispatch and derive entry attributes and initial focusability
from it. The status component derives initial visibility from that same
profile. Shared typed helpers may encode these derivations; neither document
component should redeclare presentation-specific entry policy.

The runtime receives the article wrapper as its root and discovers the content
region and status within it, preserving today's sibling structure. The status
component does not wrap or move article content, headings, outlines, or comments.
`documentNavigator` names the composed behavior, not just its visible status UI.

The outer `variant` still controls the existing Terminal versus semantic
visual treatment. It is presentation chrome, not articleTheme data.

### 4.2 Runtime boundary

Rename `startTerminalReader` and `terminal-reader.ts` to
`startDocumentNavigator` and `document-navigator.ts`. Preserve the current
state machine and safety boundaries:

- semantic reading units remain the top-level headings, paragraphs, list items,
  blockquotes, code, tables, and localized wide regions already selected by
  the controller;
- normal, visual, search, and command states remain ephemeral and route-local;
- protected native controls, IME composition, modifiers, and user-owned text
  selections retain browser ownership;
- search remains literal, case-insensitive, range-based, and bounded to one
  reading unit;
- reduced-motion behavior and fixed status reservation remain unchanged;
- `:q` still navigates to `/` deterministically.

The runtime should read a neutral data contract such as
`data-document-navigator-entry`, not infer behavior from a Terminal-specific
name. The profile is serialized only into the rendered document's local DOM
attributes; it is not added to X Core metadata.

### 4.3 Terminology and accessibility

Replace product-facing strings such as “Read-only Vim reader”, “Reader status”,
and “Reader command” with document-navigation terminology. Suggested stable
labels are:

- `Document navigator for <title>` for the content region;
- `Document navigation status` for the status surface;
- `Navigation command` for the command input;
- `Document navigation command mode` and `Unsupported navigation command: ...`
  for announcements.

The `vim` command name and its terminal help syntax remain unchanged because
they are command-language compatibility, not the product abstraction.

The visible surface may continue to use the current Terminal or semantic
visual classes, but the site-owned component and CSS identifiers should move
from `reader` to `navigator`/`navigation` where they are not public
compatibility boundaries. Do not rename unrelated comment display names.

## 5. Fragment and identifier compatibility

`#terminal-reader` is already used by canonical `vim` navigation, semantic
entry links, existing permalinks, no-JavaScript hash settlement, and tests. It
must remain accepted and remain the generated fragment for this task. The
interaction implementation can be renamed without changing this URL contract.

The content root must retain `id="terminal-reader"` for the same reason. New
internal `data-document-navigator-*` attributes and labels do not require a
new public fragment. A future migration to `#document-navigator` would need a
separate compatibility plan with an alias target and should not be bundled
into this extraction.

`apps/site/src/scripts/terminal-home.ts` should rename the helper
`readerDestinationHref` to a documentNavigator-oriented name while preserving
its validation and its `#terminal-reader` output. The `vim` navigation effect
continues to carry the canonical route, and only the browser controller adds
the interaction fragment.

## 6. Article-theme composition

The `articleTheme` data flow remains unchanged:

```text
front matter articleTheme
  -> content schema/default
  -> resolveArticleThemeId()
  -> [data-article-content][data-article-theme="..."]
  -> article-content/theme CSS only
```

The `presentation` data flow becomes:

```text
front matter presentation
  -> Astro/X Core context and exact metadata.presentation
  -> site presentation-experience definition
  -> outer layout/document renderer
  -> documentNavigator profile and progressive enhancement
```

The two flows meet only at `DocumentPresentation.astro` and the selected
document component. `articleTheme` must not enter the presentation registry,
X Core metadata, route identity, comments/plugin payloads, or navigator state.
Likewise, documentNavigator data must not alter the article-theme selector or
the shared content boundary.

## 7. Static delivery and accessibility

- Both existing presentations continue to emit complete HTML content without
  JavaScript.
- The Firefly profile keeps `always` entry and visible Terminal status on
  direct document routes.
- The semantic profile keeps `fragment` entry and hidden status until the
  exact `#terminal-reader` fragment is present on initial load. Adding or
  removing a hash on an already loaded page is not a new activation lifecycle
  in this refactor; preserve existing history and focus behavior.
- The site must continue to load one canonical document-navigation asset only
  for document routes; home, directory indexes, Lab, and NERV remain outside
  this asset boundary.
- Fixed status geometry, focus-visible styling, live announcements, protected
  controls, 44px form targets, and reduced-motion behavior remain covered by
  the existing frontend contract.

## 8. Test design

### 8.1 Definition and build tests

- Add focused tests for the presentation-experience definition: both adapter
  IDs resolve, adapter IDs and definition IDs agree, Firefly/semantic document
  kinds are stable, and their navigator entry profiles are explicit.
- Extend the existing positive content build assertions to verify that the
  same `articleTheme: paper` content can render through both presentation
  definitions without leaking theme metadata or navigator configuration into
  X Core output.
- Keep the existing unknown-presentation, unsupported-layout, exact metadata,
  heading identity, sanitizer, and content-root isolation tests unchanged in
  meaning.

### 8.2 Static-output tests

Update selectors and asset-name assertions for the renamed component/runtime.
Verify that:

- the Firefly document has one documentNavigator region, `always` entry, and
  visible navigation status;
- semantic output has one documentNavigator region, `fragment` entry, and a
  hidden status by default;
- the two layouts still deliver only their intended CSS paths;
- no navigator asset appears on home/directory/Lab/NERV routes;
- the `articleTheme` attribute remains exactly once on the content root;
- the legacy `#terminal-reader` ID/fragment remains present.

### 8.3 Browser tests

Rename the reader-focused suite or its test vocabulary to document navigator
without weakening coverage. Keep the current desktop/mobile interactive and
JavaScript-disabled checks, and add explicit profile assertions for direct and
fragment entry. All existing movement, search, selection, native-control,
IME, reduced-motion, focus, Back/Forward, and `:q` cases must pass under the
new labels.

The browser suite should assert accessible names use document-navigation
language. It should not assert that the historical URL fragment is renamed.

## 9. Compatibility and rollback

No authored-content migration is required. `presentation` and `articleTheme`
keep their current defaults and serialized metadata. X Core version and
metadata shape remain unchanged. Canonical routes, terminal `vim` commands,
comments, sanitizer rules, and external content workspaces remain unchanged.

The internal DOM/data/CSS names can change together with tests. The public
`#terminal-reader` fragment and `id` remain the rollback anchor. If the
presentation definition or profile dispatch causes a mismatch, revert the
site definition, component/runtime rename, CSS/test updates, and durable
contract update as one unit. Do not delete authored or generated content.

## 10. Deferred decisions

- The owner deferred fully disabled navigation until a presentation needs it.
  The current profile is non-nullable; no opt-out branch, no-navigation fixture,
  or document-level conditional asset suppression is implemented in this task.
- The exact bespoke navigation implementations for Atom and PowerShell are
  deferred until those presentations exist.
- A generic custom navigator plugin interface is deferred; the first concrete
  implementation should validate the composition seam before introducing an
  extension marketplace or arbitrary runtime loader.
- A future `contentTheme` rename is not part of this task; the approved public
  field remains `articleTheme`.

## 11. Module interfaces and dependency direction

Use two small modules, with different import boundaries:

| Module | Exports | Allowed runtime dependencies |
| --- | --- | --- |
| `lib/presentation-experiences.ts` | `PRESENTATION_EXPERIENCES`, `resolvePresentationExperience(id: string)` | Existing presentation adapters and type-only navigator contracts |
| `lib/document-navigation.ts` | `DocumentNavigatorProfile`, `navigationInitialState(profile)`, `DOCUMENT_NAVIGATOR_FRAGMENT` | None; pure data/types/helpers |

`DocumentNavigatorProfile` is the non-nullable `kind`/`entry` object in section
3. `DOCUMENT_NAVIGATOR_FRAGMENT` equals `#terminal-reader`.
`navigationInitialState()` returns `{ regionTabIndex: 0 | -1,
statusHidden: boolean }`: always-entry produces `{0, false}` and fragment-entry
produces `{-1, true}`. It does not read the URL; the static server cannot see
fragments. The client runtime alone handles activation from the initial URL.

The experience collection is a readonly array with frozen entries and profiles.
Validate each declared `id` against `adapter.id` and reject duplicate IDs when
constructing the lookup. Expose no mutating registry API. The resolver accepts
already-resolved metadata IDs and throws the existing site unsupported-
presentation error on a missing entry; it must not silently default. Defaults
remain owned by the existing schema/X Core path.

`astro.config.mjs` registers the collection's adapters into a fresh
`PresentationRegistry`, preserving its existing exported `presentationRegistry`.
X Core retains ownership of unknown-presentation and unsupported-context
diagnostics during rendering; do not translate those errors into site errors.
Neither library imports `astro.config.mjs`, Astro components, CSS, content
loading, or site configuration. This prevents a configuration/rendering cycle.

Browser entrypoints may import only the pure navigation module. In particular,
neither `document-navigator.ts` nor `terminal-home.ts` may import the experience
collection: doing so would pull build-time adapter code into browser bundles.
Use explicit `.ts` module specifiers for direct Node strip-types tests, matching
the existing `test:content` runner; verify Astro configuration loading during
the focused build before proceeding with DOM changes.

## 12. Component props and DOM ownership

`DocumentPresentation.astro` resolves the experience once, dispatches on its
`documentKind`, and passes `navigatorProfile: DocumentNavigatorProfile` to
the selected document component. It continues resolving articleTheme separately.
Keep the two explicit layout branches because their props differ; a generic
layout factory or component registry is unnecessary for two renderers.

Both document components pass `profile: DocumentNavigatorProfile` and the
existing visual `variant` to `DocumentNavigationStatus.astro`. The variant
controls CSS only. Use the pure initial-state helper in documents and status;
no component compares the presentation ID to decide activation or visibility.

```text
DocumentPresentation (experience resolution)
  └─ TerminalDocument / SemanticDocument (profile prop)
       └─ article[data-document-navigator][data-document-navigator-entry]
            ├─ existing header and outline
            ├─ #terminal-reader[data-document-navigator-region] ← Content
            ├─ existing comments
            └─ DocumentNavigationStatus(profile, variant)
                 └─ section[data-document-navigator-status]
```

The processed Astro script remains in the status component and initializes
the page's single article root once. No client router, hash listener, global
event bus, lazy-loader, lifecycle framework, or engine/renderer adapter API
is added. Preserve current initialization order and empty-content behavior.

| Profile / initial URL | Static tabindex / status | Enhanced behavior |
| --- | --- | --- |
| always / ordinary route | 0 / visible | Initialize; preserve current ordinary-entry focus |
| always / legacy fragment | 0 / visible | Initialize and preserve fragment focus settlement |
| fragment / ordinary or unrelated hash | -1 / hidden | Return without attaching navigation handlers |
| fragment / legacy fragment | -1 / hidden | Reveal status, set tabindex 0, initialize and settle focus |

With JavaScript disabled, the static column remains authoritative and native
fragment/link behavior continues. Preserve selection/search ownership and
state transitions inside the existing controller rather than splitting that
controller into new abstractions during this extraction.

## 13. Atomic identifier migration

Apply these mappings together across templates, runtime, CSS, and tests:

| Current identifier | Target |
| --- | --- |
| `data-terminal-reader`, `data-terminal-reader-*` | `data-document-navigator`, `data-document-navigator-*` |
| `data-reader-*` state/control attributes | `data-navigation-*` (update dataset camelCase access too) |
| `.reader-status` / `.terminal-reader-status` | `.document-navigation-status` / `.terminal-navigation-status` |
| `--reader-status-reserve` | `--navigation-status-reserve` |
| search input/highlight `terminal-reader-search` and active suffix | `document-navigation-search` and corresponding active suffix |
| command input `terminal-reader-command` | `document-navigation-command` |
| generated unit prefix `terminal-reader-unit-` | `document-navigation-unit-` |
| `readerDestinationHref` | `documentNavigatorDestinationHref` |
| public `#terminal-reader`, `id="terminal-reader"`, command `vim` | Preserve exactly |

Update input labels' `for`, `aria-activedescendant`, highlight registration,
selectors, and generated-unit collision handling consistently. Authored
heading IDs are untouched. Other internal reader names follow navigation
terminology, but do not replace the word globally in content, archived task
records, or unrelated fixtures. No dual old/new internal-selector support is
needed: the static build publishes matching HTML/CSS/JS as one artifact.

## 14. Verification details and completion boundary

Add `tests/presentation-experiences.test.mjs` to the explicit `test:content`
script list; adding a test file alone will not run it. Exercise real adapter
registration/resolution and malformed definition validation, not merely object
snapshots. Test both initial-state helper branches. The existing
`content-build-positive.test.mjs` owns repository-local fixtures for all four
presentation/theme combinations; external blog data is not required.

Update built-output and browser assertions as part of each migration phase.
Check generated HTML and actual script reachability, not just a source filename
or hashed asset basename, for document-only delivery. Preserve source checks
only where they enforce intentional architectural boundaries.

Keep this as one task: definition extraction, profile wiring, and identifier
migration share one final regression/compatibility contract. Implementation
phases are ordered review checkpoints, not independently releasable products.
No product files are changed as part of this planning work.
