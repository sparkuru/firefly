# Permalinks, Vim reader, and single-page experience

## Goal

Design the next user-facing pass for canonical document permalinks, the
read-only Vim reader, and the meaning of a "single-page" reading experience.
The design must preserve the current static/read-only architecture while making
document entry, navigation, reading state, and exit behavior feel like one
coherent product.

## Background and confirmed repository facts

- The canonical content model already owns each public document's virtual path,
  trailing-slash permalink, directory destinations, breadcrumbs, and aliases.
  Terminal and static routes consume this model rather than deriving paths from
  raw command input.
- A post such as `posts/characters/nahida.md` currently renders at
  `/posts/characters/nahida/`; its breadcrumb is a native path navigation with
  linked `/`, `posts`, and `characters` tokens plus an unlinked current
  `nahida.md` token.
- `vim <path>` resolves through the same guest-visible path model as `cat`, then
  navigates to the canonical document route. `:q` currently navigates to `/`.
- The current implementation does not actually guarantee reader activation for
  every `vim` target: `hello-static-foundation.md` declares
  `presentation: semantic`, so `vim ./hello-static-foundation.md` lands on the
  semantic route without `data-terminal-reader` or the reader script. The
  existing `vim` browser test only covers a document already declared with
  `presentation: terminal`.
- Browser reproduction on both existing Terminal documents confirms a second,
  independent gap: `vim ./characters/nahida.md` and
  `vim ./llm-workflow-with-trellis.md` load the reader DOM and script, but the
  reader region is not focused after navigation. Pressing `G` immediately after
  the route change does nothing; focusing the reader region first makes `G`
  work. The existing reader tests mask this because their helper calls
  `region.focus()` before every key assertion.
- The canonical document remains complete semantic HTML without JavaScript.
  JavaScript progressively adds a reader region with bounded `j/k`, `g/G`,
  `/`/`?`, `n/N`, `v`, `Escape`, and `:q` behavior, while preserving native
  links, text selection, local-scroll regions, IME, and modified-key behavior.
- `cat` on the Terminal home appends an inline document fragment; this is a
  separate presentation from a canonical document route and must not clone the
  whole page layout or create duplicate IDs.
- Navigation is currently native full-document navigation. There is no client
  router, `pushState`, or cross-route single-page transition contract.
- The prior workspace/Vim task deliberately left editing, persistence, arbitrary
  ex commands, shell escapes, and full Vim emulation out of scope.

## Requirements

### R1 — Canonical permalink experience

- Keep one canonical, directly loadable, trailing-slash route per guest-visible
  document and preserve JavaScript-free semantic reading.
- Make the breadcrumb, title/header, outline, reader status, and exit affordance
  express one unambiguous document state across desktop and mobile.
- Keep route, breadcrumb, Terminal `cat`/`vim`, and native directory links on the
  same canonical model; do not introduce consumer-specific path reconstruction.

### R2 — Read-only Vim reader refinement

- Review the current bounded key/mode/search/selection behavior for discoverability,
  focus, status clarity, viewport settlement, and native-browser compatibility.
- Keep the reader progressive enhancement: no canvas/editor replacement, no
  client-side Markdown parser, no persistence, and no mutation of authored
  content.
- Define any new reader behavior as a small explicit contract with accessible
  status and browser tests; avoid broad Vim emulation.
- Treat Vim search, movement, and quick jumps as subordinate reading aids. The
  article's title, outline, prose, links, code, and native selection remain the
  primary visual and interaction surface.
- Define whether an explicit `vim` command overrides a document's default
  presentation or only opens documents already configured for the Terminal
  reader. The result must be observable, deterministic, and covered for both
  semantic and Terminal-presented fixtures.
- Define a reliable reader-entry focus contract for `vim`: after command
  navigation, the intended reader region must be discoverable and ready for the
  documented keys without requiring an unexplained manual click. Direct native
  permalink entry must retain an intentional focus policy rather than inheriting
  accidental global key capture.

### R3 — Single-page meaning and navigation boundary

- Treat "single-page" as one coherent single-document reading composition, not
  SPA-like cross-document navigation. Native links and full static navigation
  remain the route boundary.
- Do not add a client router or runtime content fetch. A future transition
  proposal would require a separate product decision and technical design.

## Acceptance Criteria

- [x] The product meaning of "single-page" is explicit, including whether
      cross-document navigation may avoid a full page reload.
- [x] A reviewed design describes canonical route ownership, breadcrumb/header
      hierarchy, reader states, search/selection feedback, focus/scroll behavior,
      and `:q`/back-navigation semantics.
- [x] The design preserves semantic JavaScript-free output and the existing
      read-only capability boundary.
- [x] Any proposed implementation can be tested at desktop/mobile widths and
      with JavaScript disabled, reduced motion, IME, native links, selections,
      and direct deep links.
- [x] Product scope, technical risks, and deferred items are resolved before
      implementation approval.

## Approved product decisions

- "单页面" means a unified single-document reading composition with native
  static navigation. This preserves deep links, recovery, and the current
  no-JavaScript contract; SPA-like cross-document transitions are deferred.
- Use a content-first document treatment. Reader mode, search, movement,
  selection, and exit feedback are auxiliary signals and controls; they remain
  visually subordinate to the authored document and do not replace the
  semantic article with an editor-like surface.
- `vim` is an explicit reader-mode override for any guest-visible document,
  including documents whose ordinary permalink declares `presentation:
  semantic`. A normal permalink continues to honor the document's declared
  presentation.
- `vim` appends the explicit `#terminal-reader` fragment to its canonical
  destination. The document reader detects this marker, focuses the intended
  reader region after route load, and preserves the fragment as the browser's
  visible destination. A direct canonical permalink without the fragment does
  not unexpectedly capture ordinary page keys. With JavaScript disabled, the
  fragment still provides a native document location without requiring reader
  enhancement.
- Place the compact reader status/search affordance immediately before the
  reading region as a quiet, clearly labeled, non-sticky line. This keeps the
  keyboard layer discoverable without covering or reflowing the article while
  reading; the authored content remains the dominant surface.

## Out of scope until explicitly approved

- Editing, saving, persistence, arbitrary Vim commands, shell escapes, macros,
  plugins, authentication, runtime content fetches, and a general client router.

## Notes

- Keep `prd.md` focused on requirements, constraints, and acceptance criteria.
- Lightweight tasks can remain PRD-only.
- For complex tasks, add `design.md` for technical design and `implement.md` for execution planning before `task.py start`.
