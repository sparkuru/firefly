# M3 Terminal interface

## Goal

Deliver the first interactive Terminal Presentation on the static main site.
The home route is the shell: its working state visually centers one continuous
command/output stream and an inline `guest@f1refly $` prompt rather than a
content index plus form. Readers discover and render the same validated Markdown
content through allowlisted commands, while useful native navigation remains in
initial HTML for no-JavaScript and failure recovery.

M3 must prove that a non-default presentation can add a narrowly scoped browser
runtime without weakening the static-content, package-isolation, or failure
boundaries established by M1 and M2.

## Confirmed Product and Repository Facts

- The root product contract assigns `/` to the Terminal Presentation and requires
  an accessible site description and navigation fallback in initial HTML.
- M2 already provides a strict presentation registry, deterministic X Core
  document analysis, safely serializable enhancement manifests, a semantic
  adapter, and thin Astro post/page routes. It deliberately shipped no browser
  enhancement loader.
- The current home route is shell-owned rather than a Markdown document, so M3
  needs site-owned composition and a build-time public-content index in addition
  to registering a `terminal` adapter for optional Markdown presentations.
- Public content must still come through the existing schema and
  `getPublicContent()` policy. The browser must not load or parse Markdown.
- `prototypes/typecho-terminal/` is reference-only. Visual tokens, interaction
  ideas, command history, and completion may inform M3; PHP templates, Typecho
  widgets, database reads, comments, and licensed theme assets may not enter the
  product dependency graph.
- M4, not M3, owns experiment-manifest validation, `/lab/` generation, NERV
  mounting, artifact assembly, and experiment publication. No published lab
  catalog exists in the main-site artifact today.
- UUPM evidence supports a high-contrast dark terminal, visible focus,
  keyboard/touch parity, responsive containment, restrained motion, and a
  useful no-JavaScript alternative. Generic newsletter/Bento recommendations,
  external web fonts, ornamental scanlines, and delayed typewriter sequences are
  not product requirements.
- Official xterm.js guidance describes it as a full terminal-emulator component
  for terminal applications and process attachment. M3 needs a deterministic
  content command interpreter, not shell/process emulation, so a custom semantic
  DOM interaction is the current evidence-backed default unless implementation
  research disproves it.
- The owner authorized reuse of articles under
  `/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/online/`. A read-only audit
  selected `41-llm-workflow-with-trellis.md` as the one M3 vertical slice: it is
  self-contained, has no embedded assets or private infrastructure, and exercises
  headings, tables, lists, quotes, links, code, and a long Mermaid fence.
- The owner selected a whole-route presentation for that article. Its permanent
  route retains the dark Terminal stage, decorative title bar, prompt language,
  and document typography, while retaining semantic article structure, direct
  navigation, and complete no-JavaScript reading. The revised home shares the
  palette and typography but deliberately suppresses that route chrome.
- Submit-ready review showed that the first implementation's visible hero,
  grouped index cards, boxed command records, labeled input box, and Run button
  read as a themed content page rather than a shell. The owner approved the
  palette but required a shell-first revision: the enhanced home shows only the
  prompt and continuous output; `cat` renders Glow-like document HTML inline;
  `clear` removes the visible session output. It remains an allowlisted content
  interpreter, never a real shell.

## Requirements

### R1 — Terminal-owned home with static fallback

- Replace the current home surface with the Terminal Presentation while keeping
  the route statically generated.
- Initial HTML must contain a programmatic site identity/heading and direct links
  to every public post/page represented in the Terminal index. The working
  enhanced state hides this recovery navigation so it does not compete with the
  prompt; no-JavaScript, initialization failure, or later fatal failure reveals
  it.
- With JavaScript disabled or the terminal runtime unavailable, the fallback
  remains visible, understandable, keyboard reachable, and free of fake input.
- A successful boot presents one continuous, unboxed shell stream and an inline
  prompt. Do not render a hero, always-visible file index, card-like command
  records, visible form label, text-field box, or visible Run button.
- Preserve the shared skip link, visible focus, meaningful landmarks, direct
  URLs, and a useful unknown-route page.

### R2 — One validated content source

- Generate the terminal content index at build time from the same validated,
  draft-filtered, globally unique public content projection used by routes.
- Terminal entries carry only safe serializable metadata needed for discovery
  and document lookup; private fields, source paths, draft data, and source
  Markdown must not leak into JavaScript, JSON, or data attributes.
- `cat <slug>.md` resolves a public document deterministically and renders its
  build-time HTML inline without leaving `/`. Astro must pre-render inert
  document templates through the same `renderDocument()` and registered adapter
  path used by canonical routes. The browser clones trusted template DOM; it
  never fetches, parses Markdown, parses HTML strings, or inserts unsafe HTML.
- Each public entry has exactly one inert template. Repeated `cat` calls append
  shell output and must namespace cloned IDs plus fragment/ARIA references so
  the live document never contains duplicate IDs.
- A Markdown document that explicitly selects `presentation: terminal` must be
  resolved by the existing X Core registry, then composed through the shared
  presentation-aware document boundary rather than ad hoc post/page route branches.
- Copy only the selected Trellis article into this repository as
  `content/posts/llm-workflow-with-trellis.md`; never import or build from the
  external source directory, and never modify that directory.
- Normalize the copied article to the strict schema with title, stable slug,
  original date `2026-05-28`, updated date `2026-07-03`, description, tags,
  `draft: false`, `layout: post`, and `presentation: terminal`. Remove its body
  H1 in favor of front matter, keep Mermaid as inert readable code, and use the
  author's original voice.
- Content editing follows a preservation-first pass: change only metadata,
  invalid Markdown, broken links, stale Trellis facts, and genuine reading
  blockers; list every prose change for review. Do not broadly rewrite, polish,
  or standardize the author's phrasing.
- Keep the existing `hello-static-foundation` post and About page on the
  semantic presentation, proving both live presentation paths. Bulk use of the
  remaining external articles stays in M5.
- Render the selected article as a complete Terminal page with a skip link,
  meaningful `main` and `article` landmarks, exactly one H1, sequential headings,
  a direct home link, and locally contained wide content. It must not expose a
  command input or load the interactive home runtime.

### R3 — Command language and interaction

- Implement `help`, `ls`, `ls posts`, `ls pages`, `cat <slug>.md`, `about`,
  `pwd`, `whoami`, `date`, `history`, and `clear` as a closed, deterministic
  command vocabulary.
- Provide actionable output for unknown commands, missing operands, unknown
  slugs, and ambiguous completions.
- Support labeled text input, Enter submission, Arrow Up/Down history, Tab
  completion, focus recovery, and soft-keyboard Enter submission without
  hijacking browser or assistive-technology shortcuts. The label remains
  accessible but visually hidden; the prompt is the visible label-like affordance.
- Command output uses a restrained live region: announce new results without
  replaying the full terminal history or stealing focus.

### R4 — Progressive enhancement and failure isolation

- Ship the terminal client code only on `/`. The selected Terminal article may
  emit route-local Terminal styles but no client script or semantic stylesheet.
  Semantic post/page and 404 output must remain complete without JavaScript and
  must import neither Terminal styles nor runtime code.
- A terminal initialization failure must leave the fallback untouched. A fatal
  failure after startup must hide the session, restore the fallback, disclose a
  recovery message, and move focus to one fallback target.
- A malformed or non-canonical browser index must prevent interactive startup
  instead of exposing a destination that was not proven by the static build.
- Keep the terminal state machine and parser independently testable; keep DOM
  template rendering, recovery navigation, and accessibility integration at the
  site boundary.
- Do not add a client router, browser Markdown parser, server process, websocket,
  shell execution, arbitrary command evaluation, or persistent user data.

### R5 — Visual and responsive contract

- Use one coherent Terminal identity across `/` and the selected article, with
  near-black surfaces, readable light text, and a restrained green/amber accent
  system whose text/focus pairs meet WCAG contrast requirements.
- Prefer a local/system monospace stack. Do not add external font requests,
  icon packages, emoji controls, fake interactive window controls, or decorative
  effects that compete with content. Any title-bar treatment remains visibly
  decorative and does not imitate unavailable actions.
- Fit desktop and `375px` mobile viewports without document-level horizontal
  overflow. Long command output may wrap or use a clearly bounded local scroller.
- Motion must communicate state, remain interruptible, and respect
  `prefers-reduced-motion`; no boot delay or typewriter animation may block input
  or reading.
- The prompt input row is at least `44px` high and uses `enterkeyhint="send"`.
  The owner explicitly prefers no visible submit control; real-device soft-
  keyboard behavior remains a named human residual.

### R6 — Lab commands deferred to M4

- `ls lab` and `open lab/<id>` do not appear in M3 `help` and are treated as
  unknown commands if entered.
- M4 adds both commands only when its manifest-backed catalog and mounted
  destinations exist. M3 must not reserve a fake `/lab/` route, create a broken
  NERV link, or pretend an unmounted experiment is published.
- This owner decision preserves the milestone boundary at the cost of leaving
  the root MVP command vocabulary incomplete until M4.

### R7 — Validation and isolation evidence

- Unit tests cover parsing, normalization, command dispatch, history bounds,
  completion, errors, deterministic content lookup, and lab-boundary behavior.
- Integration/static tests cover terminal adapter registration, build-time index
  serialization, initial fallback semantics, route inventory, client-bundle
  placement, draft/private-data absence, and ordinary-route isolation.
- Playwright covers JavaScript-enabled terminal commands, inline document
  rendering, and recovery navigation plus JavaScript-disabled fallback at
  desktop `1440x900` and mobile `375x812`, with keyboard, touch, focus,
  live-region, overflow, and reduced-motion checks.
- Existing X Core, semantic, content-negative, static-output, and unchanged NERV
  checks/builds remain green through `./sam`.

## Preliminary Acceptance Criteria

- [ ] AC1: `/` is a statically generated Terminal Presentation. Its successful
      enhanced state visually shows only the shell stream/prompt, while useful
      direct-link fallback content exists before runtime and returns on failure.
- [ ] AC2: The home index comes from the same validated `getPublicContent()`
      projection as static routes. Every inert document template is produced by
      `renderDocument()` through the production X Core registry; `cat` clones
      that HTML inline at `/`, with no browser Markdown/HTML-string parser.
- [ ] AC2a: `/posts/llm-workflow-with-trellis/` is generated from the selected
      real article with `presentation: terminal`; its code, table, quote, heading,
      link, and Mermaid-source content remain readable without JavaScript, while
      the existing sample post and About page remain semantic.
- [ ] AC3: Every non-lab command in R3 has deterministic positive and negative
      tests, including history, completion, inline document output, repeat-ID
      scoping, and clear-to-fresh-prompt behavior.
- [ ] AC4: Disabled JavaScript and early/late runtime failure preserve or restore
      site identity, native public links, and keyboard-visible recovery focus.
- [ ] AC5: Only `/` emits the Terminal client chunk; the selected Terminal article
      emits its isolated Terminal styles but no client script or semantic style
      link; semantic post/page and 404 artifacts remain free of Terminal, xterm,
      experiment, and hydration dependencies.
- [ ] AC6: JavaScript-enabled and JavaScript-disabled Playwright evidence passes
      on the approved desktop/mobile viewports, including prompt-only startup,
      inline `cat`, soft-keyboard/IME behavior, reduced motion, and no document-
      level overflow.
- [ ] AC7: M3 `help` omits `ls lab` and `open lab/<id>`; entering either produces
      the ordinary unknown-command result and no `/lab/` or NERV destination is
      emitted.
- [ ] AC8: X Core, semantic presentation, site, static-artifact, task-manifest,
      and unchanged NERV validation all pass; unavailable commands are reported
      as unavailable rather than passed.
- [ ] AC9: Durable frontend specs describe the Terminal package/state/runtime,
      progressive-enhancement boundary, commands, and browser matrix without
      presenting M4 publication work as complete.

## Out of Scope

- Experiment manifest validation, `/lab/` index generation, NERV publication,
  artifact assembly, Docker/Nginx deployment, or production routing unless the
  owner explicitly pulls that M4 slice forward.
- Full content migration, comments, timeline/files final semantics, tags, RSS,
  sitemap, canonical-domain rollout, legacy redirects, staging, or production.
- A real shell, PTY, backend command service, arbitrary commands, filesystem,
  account state, authentication, or multi-session synchronization.
- Rewriting the reference prototype, importing Typecho/PHP code, or copying
  theme-specific licensed assets.
- Bulk migration, synchronization, or mutation of
  `/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/online/`; M3 copies and
  normalizes exactly one authorized article.

## Notes

- This task is complex. Planning must add task-local research, `design.md`,
  `implement.md`, and curated `implement.jsonl` / `check.jsonl` manifests before
  any start request.
- Creating and planning this task does not authorize implementation.
