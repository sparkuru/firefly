# Client-Side Behavior (No Hook Layer)

## Current Runtime Model

There is no component framework, custom hook layer, browser data-fetching layer,
client cache, or lifecycle abstraction.

- `apps/site/` emits useful static HTML for every route. Only the Terminal home
  references a client module; `/lab/`, Terminal articles, semantic documents,
  About, and 404 are JavaScript-free. No hydration directive exists.
- X Core and both adapters run only during Markdown build/render. Their emitted
  enhancement manifests are empty and have no generic browser loader.
- `@f1refly/presentation-terminal/runtime` (the package's `./runtime` export) is
  a pure, side-effect-free command/index module.
  `apps/site/src/scripts/terminal-home.ts` alone owns DOM wiring.
- `experiments/nerv/` has one route-owned inline browser script in
  `src/pages/index.astro`.

Keep this task-defined filename stable, but do not interpret it as evidence that
`use*` hooks exist.

## Terminal Home Progressive Enhancement

Content loading, filtering, Experiment catalog projection, X Core analysis/
presentation selection, Markdown rendering, index assembly, and route generation
happen at build time. The home
emits exactly one inert keyed, `renderDocument()`-produced template per public
entry. It serializes only canonical `kind`, `slug`, `filename`, `title`, `href`,
and UTC calendar-date fields on server-rendered recovery entries. Browser startup
strictly decodes those fields and proves an exact entry/template bijection. A
separate strict index contains only canonical `{ id, title, href }` listed
Experiment records. It never fetches content or receives Markdown/HTML strings,
raw manifests, build commands, filesystem paths, or unlisted metadata.

The command engine recognizes exactly `help`, `ls [posts|pages|lab]`,
`open lab/<id>`, `cat [./]<slug>.md`, `about`, `pwd`, `whoami`, `date`, `history`,
and `clear`. `ls lab` returns a closed Experiment-list effect. `open lab/<id>`
returns a navigation effect only for an exact decoded listed ID; the controller
navigates to that validated canonical mount and never constructs a destination
from raw command input. `cat` accepts one exact optional `./` prefix, normalizes
it before matching, and rejects deeper paths, traversal, absolute paths, and
URLs. A valid `cat` returns a closed `document` effect. The controller clones only
the matching validated `HTMLTemplateElement.content`, scopes clone-owned IDs and
ID references, appends it inline, and leaves `/` unchanged. Canonical
destinations remain native recovery/permalink/output links; the controller does
not programmatically navigate for `cat`.

- Keep recovery visible initially, without JavaScript, and on early failure.
  Reveal the hidden shell and hide recovery only after complete node, index, and
  template validation.
- Render text with `textContent`, `createTextNode`, and native `<a>` elements;
  never use `innerHTML` for content or command output.
- Preserve the latest pre-history draft, cap submissions at 50, consume Tab only
  for unique completion, preserve the optional `./` spelling in that completion,
  and leave Enter/Arrow/Tab unintercepted during IME composition. Unsafe or
  path-like completion candidates must leave Tab native.
- Submit through desktop or mobile soft-keyboard Enter using the single-input
  native form. `clear` removes every visible transcript/document/completion
  result while preserving bounded history, inert templates, recovery data, and a
  fresh prompt. Announce only the latest brief result via the polite atomic node.
- After short output, focus the fresh prompt and settle it into the viewport;
  after a document effect, focus and settle its title at the reading start.
  Scrolling is smooth normally and immediate under `prefers-reduced-motion`.
- An unmodified, non-Space printable key pressed elsewhere in the document may
  return focus to the prompt and insert at its current selection. Never take over
  modified keys, Space, navigation/control keys, IME composition, an active text
  selection, native form controls, links, editable content, keyboard-scroll
  regions, or standard ARIA widget/container roles.
- If command execution, rendering, or clone scoping throws after startup, hide
  the whole session, restore recovery, expose one explicit failure message, and
  focus one recovery target.

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
- Do not load the Terminal home controller on an article/page route.
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
