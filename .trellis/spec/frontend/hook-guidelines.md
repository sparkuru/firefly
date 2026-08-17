# Client-Side Behavior (No Hook Layer)

## Current Runtime Model

There is no component framework, custom hook layer, browser data-fetching layer,
client cache, or lifecycle abstraction.

- `apps/site/` emits useful static HTML for every route. The Terminal home owns
  one command controller; canonical document routes own one read-only reader
  controller. Terminal documents expose the reader directly, while semantic
  documents keep the reader status hidden and activate it only for the explicit
  `#terminal-reader` fragment. Directory indexes, `/lab/`, and 404 are
  JavaScript-free; all document content remains useful without JavaScript. No
  hydration directive exists.
- X Core and both adapters run only during Markdown build/render. Their emitted
  enhancement manifests are empty and have no generic browser loader.
- `@f1refly/presentation-terminal/runtime` (the package's `./runtime` export) is
  a pure, side-effect-free command/index module.
  `apps/site/src/scripts/terminal-home.ts` owns command DOM wiring.
- `apps/site/src/scripts/terminal-reader.ts` is a separate route-local controller
  for already-rendered canonical documents; it does not import the command
  engine and does not activate a semantic document without the explicit reader
  fragment.
- `experiments/nerv/` has one route-owned inline browser script in
  `src/pages/index.astro`.

Keep this task-defined filename stable, but do not interpret it as evidence that
`use*` hooks exist.

## Terminal Home Progressive Enhancement

Content loading, filtering, Experiment catalog projection, X Core analysis/
presentation selection, Markdown rendering, index assembly, and route generation
happen at build time. The home
emits exactly one inert keyed, `renderDocument()`-produced template per public
entry. It serializes only canonical `kind`, `virtualPath`, `relativePath`,
`filename`, `title`, `href`, and UTC calendar-date fields. Browser startup
strictly decodes those fields and proves an exact entry/template bijection. A
separate strict index contains only canonical `{ id, title, href }` listed
Experiment records. It never fetches content or receives Markdown/HTML strings,
raw manifests, build commands, filesystem paths, or unlisted metadata.

The default immutable registry recognizes `help`, `ls`, `open`, `cat`, `vim`,
`tree`, `about`, `pwd`, `whoami`, `date`, `history`, and `clear`. Each definition
owns aliases, help/usage, execution, and optional completion. The shipped
registry has no surprise aliases; tests prove a custom definition and alias.
`ls lab` returns a closed Experiment-list effect. `open lab/<id>`
returns a navigation effect only for an exact decoded listed ID; the controller
navigates to that validated canonical mount and never constructs a destination
from raw command input. `cat`/`vim` resolve nested paths through the same virtual
filesystem: relative operands are under posts, one exact `./` is optional, and
virtual absolute operands begin only `/posts/` or `/pages/`. Hidden/dot/
traversal/percent/backslash/URL/non-NFC inputs do not resolve. A valid `cat`
returns `document`; `vim` returns `document-navigation` with the validated entry.
The controller clones only
the matching validated `HTMLTemplateElement.content`, scopes clone-owned IDs and
ID references, appends it inline, and leaves `/` unchanged. Canonical
destinations remain native recovery/permalink/output links; the controller does
not programmatically navigate for `cat`.

- Keep recovery visible initially, without JavaScript, and on early failure.
  Reveal the hidden shell and hide recovery only after complete node, index, and
  template validation.
- Render text with `textContent`, `createTextNode`, and native `<a>` elements;
  never use `innerHTML` for content or command output.
- Preserve the latest pre-history draft and cap submissions at 50. When the
  prompt is focused, prevent the default action for every Tab event, including
  modifiers and IME/composition; only unmodified, non-composing Tab may rewrite
  input. Safe `cat`/`vim` paths own the rewrite decision for unique, ambiguous,
  and zero-result completion. Ambiguity keeps prompt focus and preserves `./`
  or `/`; zero-result completion keeps exact input/focus and shows `No matches.`
  Tab outside the prompt remains native.
- Exact unmodified prompt `Ctrl+C` cancels current input/completion and history
  traversal draft without submitting, clearing prior transcript/history, or
  stealing composition and Alt/Meta/Shift variants.
- Submit through desktop or mobile soft-keyboard Enter using the single-input
  native form. `clear` removes every visible transcript/document/completion
  result while preserving bounded history, inert templates, recovery data, and a
  fresh prompt. Announce only the latest brief result via the polite atomic node.
- After non-document output, focus the fresh prompt but settle from the current
  record start so long help is not top-clipped; keep the prompt visible when the
  viewport can contain both. After a document effect, focus and settle its title
  at the reading start. Scrolling is smooth normally and immediate under
  `prefers-reduced-motion`.
- An unmodified, non-Space printable key pressed elsewhere in the document may
  return focus to the prompt and insert at its current selection. Never take over
  modified keys, Space, navigation/control keys, IME composition, an active text
  selection, native form controls, links, editable content, keyboard-scroll
  regions, or standard ARIA widget/container roles.
- If command execution, rendering, or clone scoping throws after startup, hide
  the whole session, restore recovery, expose one explicit failure message, and
  focus one recovery target.

## Canonical Document Reader

The reader enhances already-rendered canonical document HTML with local normal,
visual, search, and command modes. Terminal documents expose it directly;
semantic documents expose it only after the explicit `#terminal-reader`
fragment entry. It recognizes only `j/k/g/G`, `/?`, `n/N`, `v`, Escape, and
`:q`; movement targets semantic reading units, visual mode owns a real
boundary-checked Range, and `:q` assigns `/`. Search/command use labeled native
inputs. Search is occurrence-based: each non-overlapping literal match owns an
exact text-node `Range`, `n/N` move through occurrence records rather than unit
IDs, and the persistent status reports the active occurrence. CSS Highlights
may render cloned all-match and active-match ranges, but unsupported browsers
must retain navigation without mutating content or browser selection. The
search prefix, direction-specific label, and placeholder must make `/` versus
`?` discoverable. Generated unit IDs avoid all existing IDs.

The reader must ignore IME, modifiers, native controls, links, editables, media,
standard ARIA widgets/containers, local-scroll regions, and user-owned
selections. It must not clear a selection merely because it once created a Range.
Motion is immediate under reduced-motion preference. No state persists or
crosses routes.

Do not add browser requests, a client router, runtime Markdown parsing, or an
enhancement loader for data already available to Astro. A future non-empty X Core
enhancement implementation must define module ownership, safe props, load/error
recovery, no-JavaScript fallback, and browser tests before adding client code.

## NERV Route-Owned Script

NERV's route script:

- queries `.logo-container`, owns local `clickCount`, and guards the optional
  element before attaching a click listener;
- writes the fixed `has_visited` cookie and redirects from the `from` query value
  after three clicks;
- queries `.warning-stripe` elements and updates their CSS custom property from
  `window.scrollY` only when `prefers-reduced-motion` does not request reduced
  motion; media-query changes immediately reset the value to `0px`.

Keep behavior of this size in its owning route. Selector classes are a cross-file
contract with `NervLogo.astro` and `WarningStripe.astro`.

## Extraction and Naming

There is no hook convention. Use descriptive camelCase identifiers. Pure parsing,
history, completion, index validation, and effects belong in
`presentations/terminal/src/runtime.ts`. DOM lookup, safe text/link rendering,
trusted-template cloning and ID-reference scoping, focus, announcements, and
recovery belong in the home controller. Navigation follows validated native
links or a closed decoded Experiment effect. Do not move DOM APIs into the
runtime subpath or duplicate the engine in
the Astro component.

## Avoid

- Do not add hook-shaped functions to framework-free Astro pages.
- Do not add runtime requests for build-time content.
- Do not attach route-local mutable state to `window`.
- Do not assume queried elements exist or change script-owned selectors alone.
- Do not execute commands through a shell, `eval`, dynamic import, or URL input.
- Do not load the Terminal home controller on a document route or the reader on
  home/directory/semantic/lab routes.
- Do not implement shell-like global typing by cancelling every document
  keydown; accessibility controls and browser/assistive-technology shortcuts
  retain native ownership.
- Do not treat the reference Typecho terminal JavaScript as current architecture.

## Reference Files

- `apps/site/src/pages/index.astro`
- `apps/site/src/lib/experiments.ts`
- `apps/site/src/pages/lab/index.astro`
- `apps/site/src/components/TerminalHome.astro`
- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/src/scripts/terminal-reader.ts`
- `presentations/terminal/src/runtime.ts`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/src/lib/render-document.ts`
- `packages/x-core/src/pipeline.ts`
- `presentations/semantic/src/index.ts`
- `apps/site/playwright.config.ts`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/components/NervLogo.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `prototypes/typecho-terminal/prototype.json`
