# Permalinks, Vim reader, and single-page experience — Technical Design

## 1. Scope and product boundary

This task refines the existing static document routes and bounded reader. It
does not change the canonical route model, add a client router, or turn a
document into an editor.

The product has two distinct layers:

1. The canonical document route is immutable, directly loadable, and complete
   semantic HTML. Its ordinary presentation continues to come from the
   document's declared `presentation` metadata.
2. `vim` is an explicit reader-entry intent. It opens that same canonical route
   with the `#terminal-reader` fragment, which activates the local reader
   enhancement and gives the browser a native location even when JavaScript is
   unavailable.

The semantic and Terminal layouts remain separate whole-page compositions. The
reader contract is shared by both document components, so `vim` can open a
semantic document without converting its visual layout into a terminal editor.

## 2. URL and focus contract

| Entry | URL | Default presentation | Reader focus | Reader state |
| --- | --- | --- | --- | --- |
| Native semantic permalink | `/posts/hello-static-foundation/` | `semantic` | no automatic focus | ordinary semantic page |
| Native Terminal permalink | `/posts/characters/nahida/` | `terminal` | no automatic focus | reader available but idle |
| `vim` semantic target | `/posts/hello-static-foundation/#terminal-reader` | `semantic` layout | focus reader region after load | active reader |
| `vim` Terminal target | `/posts/characters/nahida/#terminal-reader` | `terminal` layout | focus reader region after load | active reader |

The fragment is an entry marker, not a new canonical route and not persisted
reader state. It must be appended only by the `document-navigation` path used by
`vim`; ordinary directory links, document links, breadcrumbs, and `cat` keep
the canonical URL without the fragment.

The browser's native fragment navigation settles the viewport. The reader then
uses one animation-frame boundary before calling `focus({ preventScroll: true
})`, so focus does not undo the fragment's location. The exact hash comparison
is `#terminal-reader`; other fragments remain native document anchors.

Direct browser Back/Forward remains native full-document navigation. Reader mode,
search, visual selection, active unit, and generated unit IDs are discarded on
route changes. `:q` continues to assign `/` directly, without `history` APIs or
history traps.

## 3. Command-to-navigation data flow

The pure Terminal runtime continues to return a closed
`document-navigation` effect containing the already decoded canonical entry.
The runtime does not know about `window`, fragments, DOM nodes, or URL string
concatenation. The effect kind is the reader-intent boundary because only `vim`
produces this effect.

`apps/site/src/scripts/terminal-home.ts` owns one small
`readerDestinationHref()` helper. It receives the trusted `entry.href`, parses
it against the current same-origin base URL, sets the fixed
`terminal-reader` hash, and returns the path/query/hash form used by both the
transcript link and `window.location.assign()`. It rejects or falls back to the
existing failure path if the trusted route cannot be represented as a same-
origin canonical destination. No raw command operand reaches this helper.

This keeps the boundary explicit:

```text
vim operand
  -> pure parser/path resolver
  -> validated canonical TerminalEntry
  -> closed document-navigation effect
  -> controller adds fixed reader fragment
  -> native static route load
  -> document reader consumes exact fragment
```

The canonical entry's `href` remains fragment-free in build manifests,
directory indexes, templates, breadcrumbs, and route validation. The fragment
is a transient browser entry signal, not content identity.

## 4. Shared document reader markup

`SemanticDocument.astro` and `TerminalDocument.astro` continue to own their
headers, outlines, layout-specific typography, and content presentation. They
share a small reader-status component/markup contract rather than duplicating
the forms and live-region wiring.

Both document roots expose one route-local reader controller boundary:

- `data-terminal-reader` on the document root;
- one `data-terminal-reader-region` with `id="terminal-reader"`, a stable
  accessible name, and the rendered `<Content />` as its direct reading body;
- one compact status region with mode, position, search form, command form,
  visible message, and polite atomic announcer;
- status before the reading region in DOM order.

The semantic variant keeps its existing `DocumentLayout` and `.prose` measure.
Its reader region is inert by default: status is hidden and the region is not in
ordinary Tab order. When the exact reader fragment is present, the controller
reveals the status, makes the region programmatically focusable, and activates
the same bounded reader behavior. With JavaScript disabled, the hidden status
does not disturb the semantic page and the fragment still lands on the stable
reader anchor.

The Terminal variant keeps `TerminalLayout`, breadcrumb, Terminal typography,
and its reader-capable region. Its status is visible as a quiet affordance on
the Terminal document, but the region is not automatically focused without the
explicit fragment. This prevents a directly opened permalink from stealing
ordinary page focus while retaining discoverability for the declared Terminal
presentation.

The status line is non-sticky and non-overlaying. Its visual treatment uses the
existing presentation tokens: muted auxiliary text, visible focus, a compact
mode/position line, and native labeled inputs when search or command mode is
open. It must not introduce a second editor surface, a new font source, an icon
library, or color-only state communication.

## 5. Reader controller behavior

`apps/site/src/scripts/terminal-reader.ts` remains the only browser controller
for reader routes. Its current semantic-unit, Range, search, IME, modified-key,
native-selection, reduced-motion, and protected-target boundaries remain
authoritative.

The initialization sequence becomes:

1. Validate the expected reader nodes and collect direct semantic reading units.
2. Determine whether the document is always reader-capable (Terminal) or
   fragment-entry-only (semantic).
3. For fragment-entry-only documents, do nothing visible unless the exact
   `#terminal-reader` marker is present.
4. When the marker is present, reveal status, set the region's focusability,
   initialize generated unit IDs and status, then focus after the browser's
   fragment settlement without scrolling again.
5. Keep all mode/search/selection state in the controller closure; never write
   it to storage, query parameters, global variables, or the canonical model.

Movement remains semantic rather than pixel/screen based. `g/G` operate on the
same first/last unit set as `j/k`; `/`, `?`, `n/N`, `v`, Escape, and `:q` retain
their bounded meanings. Direct native links, outline anchors, code/table
scroll regions, text inputs, IME, browser modifiers, and user-owned selections
keep native ownership.

## 6. Static and responsive styling

Move the Terminal status spacing from an after-body treatment to a before-body
treatment and give the semantic reader variant a matching low-emphasis rule in
its own stylesheet boundary. Do not make the status sticky or create a nested
document scroller. Preserve the existing content measures, wide-content
containment, focus outlines, and `scroll-margin-block` behavior.

The UUPM research selected for this task is recorded in
`research/ui-ux-pro-max.md`. The implementation must preserve its approved
choices: content-first hierarchy, semantic HTML, deep links, breadcrumbs,
visible focus, JetBrains Mono/Phosphor language where applicable, sparse
spacing, subtle/reduced motion, and 375/768/1024/1440 responsive checkpoints.
The generated recommendations for newsletter/CTA content, oversized display
type, external fonts, icon libraries, GSAP, and router transitions are not
adopted.

## 7. Verification design

The browser contract must cover both presentation fixtures and both entry modes:

- `vim` from Terminal home to a Terminal document preserves the canonical path,
  adds exactly `#terminal-reader`, focuses the reader without a manual click,
  and accepts `G` immediately.
- `vim` to the semantic `hello-static-foundation` document preserves the
  semantic layout, adds the same fragment, reveals/focuses the reader, and
  accepts movement/search/`:q`.
- A direct semantic permalink has no reader auto-focus or global key capture;
  a direct Terminal permalink also has no automatic focus.
- JavaScript-disabled canonical pages remain complete. A JavaScript-disabled
  reader fragment lands at the stable reader anchor without requiring an
  enhancement script.
- The status appears before the reading body, is non-sticky, has accessible
  labels/live feedback, and does not introduce document overflow at desktop or
  mobile widths.
- Native links, outline anchors, selection, IME, modified keys, reduced motion,
  Back/Forward, and `:q` remain covered by the existing reader/site suites.

No SPA transition, runtime fetch, Markdown parser, persistence, or arbitrary
reader command is part of this design.

## 8. Risks and rollback boundaries

- Semantic documents currently have no reader DOM or controller. The shared
  markup must be added without changing their JavaScript-free article meaning or
  ordinary visual hierarchy.
- Moving the status before the body changes vertical rhythm and the first
  viewport. Focused desktop/mobile screenshots are required for human review.
- Fragment navigation and programmatic focus can compete for scroll position;
  the exact-hash check, one-frame delay, and `preventScroll` are the mitigation.
- Existing tests explicitly focus the reader before key assertions, so they can
  hide the regression being fixed. New tests must exercise the post-`vim`
  activeElement before any manual focus.

The rollback boundary is the task-scoped reader/navigation/component/style/test
files. Canonical content/path model files and unrelated dirty worktree files
must not be reverted as part of this task.
