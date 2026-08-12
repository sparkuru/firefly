# Research — M3 Terminal architecture and prototype boundary

## Repository evidence

### Two composition paths

The current architecture has two distinct inputs:

```text
Markdown document
  -> authored schema
  -> DocumentContext
  -> X Core registry
  -> selected PresentationAdapter
  -> site-owned document component

Home /
  -> getPublicContent()
  -> site-owned static Terminal markup and guarded browser runtime
```

The home route is not a Markdown document and has no X Core `DocumentContext`.
It must not be forced through an enhancement manifest invented for document HAST
nodes. X Core can register the Terminal document adapter, while Astro owns the
home composition and safe public index.

### Existing extension points

- `apps/site/astro.config.mjs` is the single production adapter-registration
  point.
- `packages/x-core/src/contracts.ts` already defines the sufficient adapter and
  enhancement contracts; no M3 contract change is currently justified.
- `apps/site/src/lib/content.ts#getPublicContent()` is the only allowed source
  for a draft-filtered, globally unique, deterministic terminal index.
- `apps/site/src/pages/index.astro` owns `/` directly.
- The post and page routes currently always compose `SemanticDocument.astro`;
  Terminal-selected documents need one shared presentation-aware dispatcher,
  not duplicated route branches.
- `presentations/semantic/` is the package topology to mirror: private exact
  dependencies, package-local lockfile, strict ESM TypeScript, pure adapter, and
  unit tests.

### Smallest sound package boundary

Create a private `presentations/terminal/` package that owns:

- the pure X Core adapter;
- typed public-index/command contracts;
- tokenization, normalization, completion, and deterministic state transitions;
- package-local unit tests and build output.

Keep these in `apps/site/`:

- conversion from validated content entries to the minimal serialized index;
- Astro home/document markup and presentation dispatch;
- route-local Terminal CSS;
- guarded DOM events, navigation, focus, announcements, and progressive
  enhancement.

Do not import from `prototypes/` or `experiments/`, and do not turn the root into
an npm workspace. Expected clean-build order is X Core, semantic and terminal in
parallel after X Core, then site install/check/build/browser validation.

## Prototype findings

`prototypes/typecho-terminal/prototype.json` marks the subtree reference-only,
forbids shipping PHP, and limits reuse to visual/interaction ideas. The runtime
is a small dependency-free DOM command interpreter, not xterm.js.

Useful concepts to reimplement:

- safe text output through `textContent`;
- quoted-token parsing and normalized document lookup;
- navigation to prebuilt canonical URLs rather than browser Markdown parsing;
- in-memory command history, completion, `Ctrl+L`, and command actions;
- palette, prompt, file-list, document, mobile, and reduced-motion treatments;
- labeled input, native links, semantic time values, and polite announcements.

Defects/coupling to discard:

- Typecho widgets, PHP templates/hooks, database queries, comments, archive
  iteration, runtime settings, and server-side date/URL helpers;
- an empty home output until JavaScript boot text appears;
- removed input outline, unconditional autofocus, whole-screen focus capture,
  and a growing live region;
- command-only completion, unbounded page-local history, silent initialization
  failure, and fixed unvalidated DOM/JSON assumptions;
- comment/archive CSS and any wholesale stylesheet copy whose provenance is not
  independently established.

The prototype `cat` behavior resolves a document and navigates to its already
built URL. It never fetches or parses Markdown. That behavior aligns with the
static architecture and is the M3 default.

## Owner-directed shell-first revision — 2026-08-13

The owner rejected the first enhanced-home interaction after reviewing the
running implementation. The home must behave as a specialized shell rather
than a terminal-themed index and command form. This decision supersedes the
navigation conclusion above for the enhanced home only:

- successful enhancement hides the recovery index and exposes only a continuous
  prompt/output stream beginning with `guest@f1refly $`;
- `cat <filename>.md` renders the selected public document inline without
  changing the URL;
- `clear` removes every visible command and document output while retaining the
  bounded Arrow-key history and a fresh prompt;
- the canonical document routes remain static, directly linkable, and
  JavaScript-free.

The approved transport is build-time inert `<template>` content. Each public
document passes through the same `renderDocument()` and registered adapter used
by its canonical route. The browser receives neither source Markdown nor an
HTML string and must not fetch, parse, or insert authored markup through an
unsafe API. The controller validates an exact entry/template bijection, clones
trusted template DOM, and namespaces cloned IDs plus fragment/ARIA references
for append-only repeated `cat` output.

The visible Run control, hero, index cards, transcript cards, and permanently
visible fallback are removed from the working state. The fallback remains the
default server-rendered state and is hidden only after complete initialization;
any fatal runtime failure restores it. A visually hidden H1 and input label
preserve programmatic identity, while a single 44px prompt input uses implicit
form submission and `enterkeyhint="send"`. Real-device soft-keyboard behavior
remains a submit-ready manual residual.

This is intentionally bounded to the current three public documents. The
resulting home payload is acceptable for M3, but M5 must revisit fragment
delivery before bulk migration rather than scaling the embedded-template model
without measurement.

## Dependency decision

The evidenced MVP does not need xterm.js. Official documentation describes
xterm.js as a full browser terminal emulator intended to host terminal
applications and connect to processes; it explicitly is not a shell itself.
That feature set is broader than a closed content-command interpreter and would
add route-splitting, rendering, and accessibility surface without product value.

Primary references:

- https://www.npmjs.com/package/@xterm/xterm
- https://xtermjs.org/docs/api/terminal/interfaces/iterminaloptions/

Use semantic DOM and a pure command engine. Reconsider xterm.js only if a future
milestone requires terminal application emulation, ANSI/PTY behavior, or process
attachment.

## Locked Astro asset-isolation evidence

A disposable Astro 7.1.6/Vite 8.2.1 build reproduced the planned shared dynamic
route dispatcher. `semantic.css?url` linked only from the semantic output, while
Terminal `?raw` CSS appeared inline only on Terminal outputs. The dev server did
not preserve that boundary: it traversed the shared route graph and injected the
semantic CSS URL module into the Terminal path. Main-site browser evidence must
therefore preview a prior production build rather than use `astro dev`.

The same spike showed that Astro inlines a small discovered home script under
Vite's default 4096-byte threshold. A narrow function-form
`vite.build.assetsInlineLimit` predicate returning `false` only for the
normalized generated Terminal-home script ID emitted exactly one external JS
asset. Do not use a global zero threshold; static output tests must verify the
final generated ID predicate and exact route references.

## Confirmed owner decision

M3 hides `ls lab` and `open lab/<id>` from `help` and treats them as unknown.
M4 introduces them only with a real manifest-backed catalog and mounted
destination. No M3 source or output may advertise an unpublished NERV route.

## Real document decision

The owner authorized articles from the sibling `03-genshin/online/` source, and
the audit selected `41-llm-workflow-with-trellis.md`. M3 copies and normalizes it
as a new public Terminal-selected post while keeping the existing post/page
semantic. The owner selected a whole-page Terminal shell for that route. The
site composition layer therefore owns the complete Terminal document page,
while the adapter remains a pure document-tree transformation and the article
remains readable without client JavaScript.

## Stop gates

- Stop if whole-home Terminal runtime would require changing X Core enhancement
  target semantics; use site-owned composition instead.
- Stop if Astro links Terminal CSS/JS from semantic-only routes; redesign the
  route-local asset boundary before proceeding.
- Stop if Terminal document composition requires browser Markdown/HTML transport
  or a client router; the approved home model uses build-time inert templates,
  while canonical routes remain the direct-navigation fallback.
- Stop if a working lab command requires reading/mounting experiments; that work
  remains M4.
- Stop if local `file:` resolution would require a workspace conversion or a
  merged root lockfile.
