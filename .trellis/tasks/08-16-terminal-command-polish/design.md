# Design: Terminal command polish and readable layout

## Scope and boundaries

The implementation remains split across the existing pure runtime and the
browser controller:

- `presentations/terminal/src/runtime.ts` owns the authoritative rshell AST,
  command definitions, immutable state transitions, safe corpus lines, text
  stdout, structured standalone effects, and grep match metadata.
- `apps/site/src/scripts/terminal-home.ts` owns DOM extraction from trusted
  build-rendered templates, standalone effect rendering, text-only pipeline
  rendering, focus, announcements, and viewport settlement.
- `apps/site/src/components/TerminalHome.astro` supplies semantic help/result
  containers only when the controller needs stable labels; it does not own
  command logic.
- `apps/site/src/styles/terminal.css` owns the grouped-help grid, grep result
  readability, 80% desktop measure, mobile collapse, and intentional wide-code
  overflow.

No runtime requests, Markdown parser, host shell, filesystem, network,
persistence, SSR conversion, or arbitrary navigation is added.

## Corpus line model

Introduce one pure line-normalization helper with two modes:

1. Normal prose elements produce one bounded normalized line each.
2. `pre`/code blocks preserve their internal line boundaries, normalize CRLF
   to LF, remove unsafe control characters, and bound each line and the total
   document contribution.

The controller continues to extract only visible build-rendered semantic
elements from the inert templates. It passes `TerminalTextDocument.lines` to
the runtime; no raw Markdown or HTML enters the command engine. The runtime
does not collapse already-separated lines again. Existing fallback titles still
provide a safe minimal corpus entry when a template has no readable body text.

## Command architecture

The registry refactor now keeps neutral metadata, policy, and execution specs
for the migrated core and session commands in `commands/registry.ts`, and the
runtime adapts those specs into its public compatibility registry. The old
duplicate built-in dispatch for `ls`, `cat`, `grep`, `cd`, `open`, `vim`,
`clear`, `tree`, `help`, `pwd`, `history`, `alias`, and identity/time commands
has been removed. Custom registries remain supported by the compatibility
facade.

The target POSIX-inspired process model is specified in
`architecture-design.md`. It separates shell core, command modules, a
ReadonlyVirtualFs capability port, session/control events, explicit
stdin/stdout/stderr, and the terminal presentation adapter. The existing
`executeCommand`, `completeCommand`, and `TerminalEffect` exports remain as a
facade during phased migration.

The shell runner owns shell parsing/expansion, stage scheduling, stream wiring,
redirection, command policy, and state/control application. After shell
expansion it invokes the resolved command definition's argv parser; that parser
owns option aliases, short-option clusters, interspersed option ordering, `--`,
and operand arity. A command receives frozen parsed arguments, stdin, and
injected capabilities and returns a bounded ProcessResult; it does not receive
pipeline-position booleans or produce DOM-facing effects. Rich standalone
values are side-channel command values that the terminal adapter renders, while
pipes consume deterministic stdout only.

`parseRshell` becomes the only semantic parser. `tokenizeCommand` remains only
if package compatibility requires the export; it becomes a documented adapter
for a single, non-pipeline stage and cannot grow a second grammar.

Default help groups are:

- **Explore:** `ls`, `tree`, `grep`
- **Read & navigate:** `cat`, `vim`, `open`, `cd`, `pwd`
- **Identity & time:** `about`, `whoami`, `id`, `date`
- **Session:** `help`/`?`, `history`, `alias`, `clear`

The group value and display order live on the neutral command definition. Rich
standalone help renders these groups as semantic sections in a sparse two-
column desktop grid and one-column mobile layout. Text stdout uses the same
group order with plain labels, so `help | grep` remains deterministic.

## Grep result model

Keep the existing safe matcher, flags, resource policy, stdin semantics, and
work caps. Extend the matcher internally with match-span collection for
standalone results. A standalone grep effect contains immutable matches with:

- canonical public/scratch path;
- optional one-based line number;
- original bounded line text;
- safe match ranges for renderer-created `<mark>` nodes.

The controller renders paths, line numbers, and text with `textContent` or text
nodes only. Match ranges become semantic `<mark>` elements; no HTML string is
interpolated. A zero-match standalone result gets a visible empty state with a
short recovery hint. In a pipeline, grep continues to emit deterministic plain
text and does not emit rich effects.

Long lines wrap inside the result region. The result region may scroll only for
an intentionally wide code/table document, not for normal grep output. The
plain stdout representation remains copyable and bounded.

## Help and output presentation

The selected UI direction is terminal-native sparse grouping rather than
dashboard cards:

- group titles use the existing command color token and semantic headings;
- command rows use a two-column command/description relationship with aliases
  shown as secondary text;
- light dividers and whitespace create rhythm without heavy card chrome;
- desktop uses two group columns; mobile uses one column;
- the command form remains the only input and remains at least 44px tall;
- error, no-result, focus, reduced-motion, and keyboard states remain explicit.

The UUPM research is advisory. Adopted decisions are content-first structure,
high-contrast existing phosphor tokens, local JetBrains Mono, sparse spacing,
subtle motion, visible focus, 16px mobile text, explicit empty states, and no
normal-content horizontal overflow. Its generated FAQ/CTA structure, external
font import, oversized landing typography, and router animation are rejected as
incompatible with this static terminal.

## Width strategy

Use a responsive outer measure close to 80% of the available desktop viewport,
bounded by a sensible maximum. The home shell, transcript, prompt, and inline
stream share this outer measure so they no longer feel like a narrow centered
column. Keep long-form prose headings/paragraphs at a readable text measure
where needed, while allowing `.terminal-wide` code/table regions to own local
overflow.

At mobile breakpoints, the content returns to full available width with safe
area padding. The layout must pass the existing 375, 768, 1024, and 1440
browser checkpoints without page-wide overflow.

## Compatibility and rollback

- Existing command strings, aliases, completion values, navigation hrefs,
  document effects, history limits, and error contracts remain stable unless a
  test documents the intentional no-result/structured-output improvement.
- The runtime stays framework-free and browser-safe; the controller remains
  the only DOM owner.
- If the unified handler refactor causes a compatibility regression, restore
  the adapter boundary first while keeping the corpus and UI improvements
  independently revertible.
- If the 80% measure harms long-form readability, narrow only the prose child
  measure; do not undo the wider outer stream or reintroduce page-wide
  centered constraints.

## Validation evidence to collect

- Runtime unit tests for line-preserving corpus data, grouped help text/rich
  effect, grep match/no-match/flags/pipelines, parser compatibility, and every
  command/registry policy.
- Focused Terminal Playwright for grouped help, grep output/no-result, code
  line fidelity, width at desktop/mobile, focus, keyboard, and reduced motion.
- Full reader and site Playwright plus terminal/site package checks, builds,
  content/X Core checks, and static-output invariants.
