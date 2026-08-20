# M3 Terminal interface — Technical Design

## Design Summary

M3 adds a private Terminal presentation package and two site-owned compositions:
a shell-first interactive Terminal home at `/`, and a JavaScript-free whole-page
Terminal document for one real post. The package owns a pure X Core adapter and
a pure, closed command engine. Astro owns validated content projection, build-
time document templates, HTML, route selection, CSS, focus, announcements, and
browser startup.

The design does not change X Core contracts, parse Markdown in the browser, add
a client router, import the reference prototype, or publish an experiment. The
existing semantic post, About page, 404, and NERV remain independent regression
surfaces.

## Architectural Invariants

- Content Collections and `getPublicContent()` remain the only public-content
  source. Draft filtering, strict front matter, supported layouts, and global
  slug uniqueness happen before Terminal index projection.
- X Core remains the only Markdown presentation-selection boundary.
  `metadata.presentation`, produced after registry resolution, drives one shared
  site dispatcher for post/page composition.
- Only `/` receives browser JavaScript. The Terminal article uses the same
  visual language but has no command form, runtime module, hydration, or script.
- The initial home HTML is the recovery product. It contains accessible identity
  and native links, but a successful startup hides that fallback and reveals a
  continuous shell stream whose primary visual is one inline prompt.
- Browser code receives only a small validated index and inert, build-rendered
  DOM templates. It never receives source Markdown, HTML strings, draft data,
  private source paths, VFiles, HAST, registry instances, or experiment manifests.
- `presentations/terminal/`, `apps/site/`, `packages/x-core/`,
  `presentations/semantic/`, and `experiments/nerv/` keep independent
  package locks and build boundaries. The root remains a script delegate.

## Repository and Runtime Boundaries

```text
validated Markdown
    │
    ├─ DocumentContext → X Core registry → semantic adapter
    │                                      → Semantic document page
    │
    └─ DocumentContext → X Core registry → terminal adapter
                                           → Terminal document page (no JS)

getPublicContent()
    → minimal TerminalEntry[] projection + native recovery links
    → renderDocument(entry) for each public entry
    → inert keyed <template> document fragments
    → site browser module validates entry/template bijection
    → pure terminal command engine
    → safe text/list effects or cloned semantic document DOM
```

### New private package

`presentations/terminal/` mirrors the semantic package topology:

- private ESM package with its own exact lockfile and strict NodeNext TypeScript;
- exact `file:../../packages/x-core` dependency for the public adapter contract;
- a root export for the production adapter and a separate `./runtime` export for
  index validation, parser, command reducer, history navigation, and completion;
- a browser-safe, side-effect-free runtime subpath that has no X Core/HAST import
  after compilation, so the home bundle cannot retain build-only adapter code;
- no Astro, DOM, browser-global, xterm, prototype, NERV, or content-loader
  dependency;
- package-local unit tests and compiled `dist` export.

The package accepts plain readonly data and returns tagged readonly results. It
does not navigate, render HTML, read a clock directly, or mutate caller-owned
arrays.

### Site-owned composition

`apps/site/` adds narrowly scoped boundaries equivalent to:

- `TerminalLayout.astro`: the complete dark document shell, metadata, skip
  link, `main` landmark, route-local inline styles, and a narrowly scoped option
  that suppresses the decorative title bar/window boundary on the home only;
- `TerminalHome.astro`: recovery navigation, inert document templates, hidden-
  until-ready shell session, inline prompt, continuous transcript, completion
  hint, and announcer;
- `TerminalStreamDocument.astro`: compact inline article fragment rendered only
  inside a keyed inert template; it owns no layout, script, or stylesheet;
- `TerminalDocument.astro`: article header, date, outline, prompt-like home
  path, and rendered Markdown inside semantic `article` structure;
- `DocumentPresentation.astro`: exhaustive whole-page dispatch for
  `semantic` and `terminal` metadata, shared by both dynamic route files;
- a home-only TypeScript browser entry for DOM decoding and effect application.

Names may be adjusted to existing conventions, but those ownership boundaries
must remain. Route files continue to own only static path generation, entry
selection, and the call to `renderDocument()`.

## Terminal Package Contracts

The implementation should expose types equivalent to:

```ts
type TerminalEntryKind = 'post' | 'page';

interface TerminalEntry {
  readonly kind: TerminalEntryKind;
  readonly slug: string;
  readonly filename: `${string}.md`;
  readonly title: string;
  readonly href: string;
  readonly date: string; // YYYY-MM-DD
}

interface TerminalIdentity {
  readonly user: string;
  readonly host: string;
  readonly workingDirectory: string;
  readonly about: string;
}

interface TerminalState {
  readonly history: readonly string[];
  readonly historyCursor: number | null;
  readonly draftInput: string;
}

type TerminalEffect =
  | { readonly kind: 'lines'; readonly tone: 'normal' | 'muted' | 'error';
      readonly lines: readonly string[] }
  | { readonly kind: 'entries'; readonly entries: readonly TerminalEntry[] }
  | { readonly kind: 'document'; readonly entry: TerminalEntry }
  | { readonly kind: 'clear' };
```

The exact naming is implementation-owned, but exhaustive tagged effects are
required so the DOM layer never guesses from strings. Input/index decoders
reject non-plain data, unknown fields, unsafe slugs, non-canonical local hrefs,
duplicate filenames/slugs, invalid dates, and mutable aliasing. These failures
are typed and actionable; getters, prototypes, or coercion are not invoked.

The command executor accepts the current state, validated entries, terminal
identity, and an injected clock/date formatter. Tests therefore do not depend on
the machine time zone or wall clock. The site identity defaults to
`guest@firefly:~/blog$`; `whoami`, `pwd`, and `about` derive from the same
configuration rather than duplicate literals.

## Command Grammar and Behavior

Tokenization supports whitespace plus balanced single/double quotes. It does not
implement shell escaping, interpolation, environment variables, pipes,
redirection, globbing, evaluation, or executable paths. Shell-shaped tokens are
ordinary invalid operands and never cross an execution boundary.

| Input | Deterministic result |
| --- | --- |
| `help` | Lists exactly the M3 commands and short usage; no lab command. |
| `ls` | Lists all public filenames, titles, and authored dates in the existing deterministic order. |
| `ls posts` / `ls pages` | Lists only that kind with filename, title, authored date, and native canonical link. |
| `cat <slug>.md` | Resolves one exact public filename and returns a document effect for build-rendered inline output. |
| `about` | Prints the configured site description. |
| `pwd` | Prints `~/blog`. |
| `whoami` | Prints `guest`. |
| `date` | Prints the injected clock as `YYYY-MM-DD HH:mm:ss UTC`. |
| `history` | Prints the bounded page-local command history, including this submission. |
| `clear` | Clears every visible transcript/document record and completion/status text; a fresh prompt and in-memory history remain. |

Commands are lowercase and strict-arity. Empty submission is ignored. Unknown
commands, unbalanced quotes, missing/excess operands, unknown filenames, and
unsupported `ls` targets return concise usage or recovery guidance.
`ls lab` and `open lab/<id>` take the ordinary unknown-command path and are
absent from help and completion.

History is memory-only, keeps the latest 50 non-empty submissions, retains
duplicates, and is reset by reload. Arrow Up/Down navigation preserves the draft
that existed before entering history and never moves focus.

Completion is pure and context-aware:

- command position completes the closed command names;
- `ls ` completes only `posts` and `pages`;
- `cat ` completes public `<slug>.md` filenames;
- a unique match updates the input and prevents that Tab event;
- zero or multiple matches leave normal browser Tab navigation intact; multiple
  candidates update a visible, non-modal hint without trapping focus.

No global key listener is used. Browser and assistive-technology shortcuts,
including the browser address-bar shortcut, remain untouched.

## Home Data and Progressive Enhancement

### Build-time projection

The home route maps the existing `posts` and `pages` arrays into
`TerminalEntry[]` with only kind, slug, filename, title, canonical href, and
UTC `YYYY-MM-DD` date. The same entries render native recovery links. In the
same build, `Promise.all(publicDocuments.map(renderDocument))` renders each
public entry once for the home and pairs it with exactly one inert keyed
`<template>` containing a `TerminalStreamDocument` fragment.

Those native elements are also the metadata serialization boundary: safe
`data-terminal-entry-*` attributes carry the minimal fields. The browser module
reconstructs and validates its index from that DOM, then proves that template
filenames form the exact same set with no duplicate, missing, or unknown member.
There is no inline JSON blob, fetch, API endpoint, source Markdown, HTML-string
payload, or window-global bootstrap object.

### Startup states

The shell session is rendered with the native `hidden` attribute. On successful
required-node lookup, index validation, and entry/template bijection validation,
the browser module attaches guarded listeners, hides the recovery block, and
reveals the session. On missing nodes, malformed attributes, duplicate entries/
templates, or module failure, it mutates nothing and recovery links remain usable.

The browser module appends unboxed command records to one continuous transcript.
All text uses `textContent`; entry results use newly created native links whose
href came from the validated index. A document effect clones only the matching
trusted `HTMLTemplateElement.content`. `innerHTML`, `insertAdjacentHTML`,
`DOMParser`, `Range#createContextualFragment`, template evaluation, browser
Markdown conversion, and content fetch are prohibited.

Every document clone gets a monotonically increasing output scope. The DOM layer
prefixes cloned IDs and rewrites same-fragment `href`, `for`, `headers`, and ARIA
ID-reference attributes only when their target ID belongs to that clone.
Repeated `cat` calls therefore remain append-only without duplicate live IDs.
Canonical permalinks and the external `#terminal-command` return target stay
unchanged native links.

Every submission crosses one guarded controller boundary. If the pure executor,
effect renderer, template clone/scoping, or a required live node fails after
startup, that boundary hides the session, restores recovery navigation, exposes
one interactive-unavailable message, and focuses one recovery heading. Tests
exercise this with injected throwing seams; production exposes no global hook.

### Interaction and announcements

- The skip link remains the first keyboard target; the input never autofocuses.
- At successful startup, the only persistent visible input control is one
  unboxed prompt row; command output may expose validated native links:
  `guest@firefly $ <input>`. Its H1, form label, and concise instructions remain
  programmatic/visually hidden; the accessible name contains the visible prompt.
- Enter submits unless IME composition is active. The single text input uses
  native implicit form submission plus `enterkeyhint="send"`; there is no visible
  Run button. The input row is the 44px touch target, and real soft-keyboard
  behavior remains a human-review residual.
- Focus remains in the input after ordinary command results. Navigation follows
  native links only; recoverable command and usage errors never steal focus.
- `cat` appends the inline article, focuses its compact title so reading starts
  at the beginning, announces only that title, and exposes a muted native link
  back to `#terminal-command`. The prompt remains after the transcript.
- The growing transcript is not a live region. A separate visually hidden
  `aria-live=polite`, `aria-atomic=true` node receives only a brief latest
  result summary.
- Empty post/page results render explicit messages rather than blank regions.
  There is no loading state because all public data and templates are initial HTML.

## Terminal Document Composition

The new article passes the strict content schema, receives a
`DocumentContext`, and selects `terminal` through the production registry.
The Terminal adapter supports only valid post/page contexts, recursively wraps
wide `pre` and `table` nodes in presentation-owned named focusable regions,
preserves all X Core heading/node identities, and declares no enhancements.

After `renderDocument()` validates X Core/Astro metadata agreement, the shared
document dispatcher switches on `document.metadata.presentation`:

- `semantic` uses the existing restrained document layout and component;
- `terminal` uses the whole-page Terminal layout and document component;
- any other value fails the build even though the registry should already have
  rejected it.

The Terminal article shows a direct home link and a readable prompt-like path,
but no fake command input or browser module. It has one route H1, sequential body
headings, optional outline, semantic time, native links, blockquote/list/table/
code semantics, and locally contained wide content. Mermaid stays an inert
fenced code block.

## Visual System and Accessibility

The approved palette starts from:

| Token | Value | Role |
| --- | --- | --- |
| background | `#050806` | page stage |
| panel | `#080d0a` | terminal surface |
| panel soft | `#0d1510` | secondary output |
| foreground | `#d6e7db` | primary text |
| muted | `#789081` | secondary metadata after measured contrast |
| accent | `#63f59a` | prompt, links, focus |
| warning | `#ffd166` | warning text plus a non-color cue |
| danger | `#ff6b7a` | errors plus an explicit label |
| border | `#213428` | quiet separation |

Implementation records measured contrast for every text/background and focus
pair, adjusting tokens rather than waiving WCAG 2.2 AA. Typography uses only a
system/local monospace stack. There are no remote fonts, images, icon packages,
emoji controls, or fake window buttons.

The working home has no hero, visible index, title bar, bordered window, boxed
input, cards, per-record panels, or visible Run control. It is a continuous
transparent terminal stream: prompt/output alignment and whitespace carry the
hierarchy. The exact visible prompt is `guest@firefly $`; the input is transparent
with an accent caret and a clear `:focus-within` state.

Desktop uses one centered terminal stream with a restrained line length. Small
screens use a full-bleed composition with safe-area-aware padding and a 44px
prompt row. The home may suppress the decorative title bar while whole-page
Terminal articles retain their established route shell.
The document never scrolls horizontally; code/table regions may scroll locally,
have an accessible name, and show focus. Breakpoints are verified at 375, 768,
1024, and 1440 CSS pixels. The four canonical projects retain 375×812 and
1440×900; a focused responsive containment case resizes the page to 768×900 and
1024×900 without multiplying the full project matrix.

The article-route title bar is decorative and marked accordingly; the home has
none. No boot delay, typewriter, GSAP transition, essential cursor blink, or
ornamental scanline is required.
Any retained micro-motion is short, causal, and removed by
`prefers-reduced-motion: reduce`.

## CSS and Client-Asset Isolation

Terminal CSS is namespaced and imported as a build-time raw string by
`TerminalLayout.astro`, then emitted with an inline style element only when
that layout renders. The existing semantic CSS side-effect import becomes an
explicit generated stylesheet URL linked only by `DocumentLayout.astro`.
Together, these two route-controlled emissions prevent either presentation
stylesheet from entering the other presentation's static path, even though one
dynamic Astro route imports the shared dispatcher.

A disposable locked-version Astro 7.1.6/Vite 8.2.1 build proved that production
shape. The Astro dev server nevertheless traverses the shared route CSS graph
and injects the semantic `?url` module into the Terminal path. Main-site
Playwright therefore runs `astro preview` against the already-validated static
build, not `astro dev`; presentation-isolation assertions must observe the
publishable artifact rather than a known dev-only graph leak.

The home browser entry is imported only by the home component and consumes only
the Terminal package's `./runtime` subpath. The Terminal layout and document
component contain no script import. A final static scan
must prove:

- exactly five HTML outputs: home, 404, About, the semantic sample post, and the
  selected Terminal post;
- one deliberate generated home JavaScript entry (and no source map), referenced
  only by `index.html`;
- no script element on the Terminal article, semantic documents, or 404;
- the semantic CSS link only on the semantic sample/About/404 paths, never on
  home or the Terminal article;
- Terminal style signatures only on home and the Terminal article;
- no known Terminal package/import paths, Terminal style tokens/data attributes,
  home script URL, xterm identifier, prototype path, or NERV artifact path in
  semantic route closure; broad prose words such as terminal, runtime, or
  experiment are never used as rejection patterns;
- no draft titles, private paths, source Markdown, secrets, external fonts,
  unknown artifact types, or NERV destination in main-site output.

Home HTML deliberately contains inert public document body HTML. Static scans
must prove those bodies occur only inside one template per public entry and do
not enter the JavaScript asset, JSON, or `data-*` metadata. This vertical slice
is acceptable for the current three public documents; M5 must revisit fragment
delivery before embedding the bulk corpus.

Astro inlines a discovered script smaller than Vite's default asset threshold.
Use a narrow `vite.build.assetsInlineLimit` predicate matching only the normalized
Terminal-home generated script ID and returning `false` for that entry. Preserve
the default for every other asset; do not set a repository-wide zero threshold.
Static tests remain the authority for exactly one external home script and its
route closure.

If Astro extraction links Terminal CSS or JavaScript from a semantic path, stop
and revise the composition boundary before continuing. A broad allowlist is not
an acceptable workaround.

## Article Import and Editorial Evidence

Implementation reads the authorized source file but writes only
`content/posts/llm-workflow-with-trellis.md`. It adds strict front matter with
slug `llm-workflow-with-trellis`, original date `2026-05-28`, updated date
`2026-07-03`, `layout: post`, `presentation: terminal`, and the required
public metadata.

The body H1 moves to front matter, the one bare source URL becomes an explicit
Markdown link, the Mermaid fence remains source text, and the known
`spec-bootstarp` typo is corrected. Any stale Trellis statement is changed only
when current repository workflow evidence demonstrates the replacement. If a
claim cannot be corrected without changing the argument, retain it as a clearly
dated statement rather than inventing a rewrite.

Every prose-level change is recorded with source wording, replacement, and
reason in a task-local article edit ledger. The source repository remains
read-only. The final human review explicitly includes the normalized article
diff so the owner can reject an uncertain editorial change independently of the
Terminal implementation.

## Validation Architecture

1. Terminal package unit tests cover adapter support/identity preservation,
   nested wide regions, empty enhancements, strict index decoding, tokenizer,
   every command and usage error, document effects, injected date, 50-entry
   history, Arrow navigation, unique/ambiguous completion, and lab-command absence.
2. Site Node tests run schema-validated Markdown through the real Astro
   processors and production registry for both semantic and Terminal adapters.
3. Content tests cover the real article schema, heading contract, duplicate
   slug protection, unknown presentation failure, raw HTML rejection, draft
   absence, and negative-build cleanup.
4. Static output tests enforce route and artifact inventories, fallback/session
   semantics, exact entry/template bijection, inert build-rendered bodies, safe
   entry fields, presentation dispatch, route-local CSS/script closure, and
   prohibited dependency/path/string absence.
5. Playwright uses two JavaScript-disabled static projects and two
   JavaScript-enabled Terminal projects at the approved desktop/mobile
   viewports. Static tests cover fallback and all route classes; interactive
   tests cover prompt-only startup, commands, errors, history, completion, full
   IME-safe submission, inline `cat`, repeated-ID scoping, clear, soft-keyboard
   submission, focus, announcements, reduced motion, and overflow.
6. Existing X Core, semantic, and unchanged NERV package checks/builds run after
   the final site iteration.

## Risks, Stop Gates, and Rollback

- Stop if the home requires X Core enhancement-target changes. Home composition
  stays site-owned.
- Stop if the package graph requires an npm workspace, root lockfile, xterm,
  Astro inside the pure package, or a dependency on prototype/NERV source.
- Stop if the client needs Markdown/HTML payloads, fetch routing, unsafe DOM
  insertion, persistent storage, or a global command hook.
- Stop if inline `cat` cannot be implemented solely by cloning trusted build-
  rendered templates with deterministic ID scoping.
- Stop if a real lab result requires an experiment manifest or mounted
  destination. That remains M4.
- Stop if the real article exposes an unreviewed asset, secret, private path, or
  editorial correction that cannot be justified from repository evidence.
- Stop if route-specific CSS/client closure cannot be proven in the static
  artifact.
- Stop before M5 bulk migration if embedding every public document would make
  home payload/parse cost unreasonable; M3's current three-entry template set is
  not a blanket scalability decision.

Rollback is additive and data-safe: restore the current home and direct semantic
document composition, unregister/remove the private Terminal package and copied
article, and revert the site-only Terminal components/assets/tests. X Core,
semantic content, NERV, deployment, the external source repository, and user
data require no migration or destructive rollback.
