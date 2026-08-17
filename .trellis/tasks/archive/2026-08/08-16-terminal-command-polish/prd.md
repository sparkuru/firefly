# Terminal command polish and readable layout

## Goal

Make the browser-resident rshell feel like a readable knowledge-browser
interface rather than a dense command dump. Preserve the existing read-only
capability boundary while improving document text fidelity, grouped help,
grep results, command architecture, and the desktop content width. The command
architecture must evolve from a centralized runtime into atomic, composable
shell/process boundaries without changing the public command behavior.

## User value

The owner should be able to discover commands quickly, search public writing
without receiving collapsed or visually noisy lines, and read terminal-rendered
documents in a content region close to 80% of the available desktop width.

## Confirmed facts

- The command engine is a pure TypeScript runtime in
  `presentations/terminal/src/runtime.ts`; DOM lookup, document-template
  cloning, output rendering, focus, and viewport settlement belong to
  `apps/site/src/scripts/terminal-home.ts`.
- The shipped command surface is `help`/`?`, `ls`, `open`, `cat`, `vim`,
  `tree`, `about`, `cd`, `pwd`, `whoami`, `id`, `date`, `history`, `alias`,
  `grep`, and `clear`. It is an in-memory capability shell, not a host shell:
  it must not gain filesystem, network, persistence, SSR, or arbitrary URL
  execution.
- The runtime still exposes a compatibility `definitions` array, but the
  migrated core command specs now live in
  `presentations/terminal/src/commands/registry.ts`; the runtime only adapts
  them to the public registry and terminal effects.
- `tokenizeCommand` remains a public simple tokenizer while `executeCommand`
  uses the newer quote-aware `parseRshell` pipeline parser. The task should
  establish one authoritative parser path without breaking a necessary public
  compatibility surface.
- The earlier corpus extractor flattened visible whitespace in
  `apps/site/src/scripts/terminal-home.ts`; the current line-oriented
  extractor preserves code/pre line boundaries and the runtime only applies
  safe control-character/length filtering. This is covered by terminal unit
  and browser grep regressions.
- `grep` without operands searches every public document and emits
  `path:line`; the current behavior is implemented around
  `presentations/terminal/src/runtime.ts:1301-1375`.
- The current Terminal home and stream document measures are capped in `ch`
  units (`--terminal-measure`, `--terminal-measure-stream`) rather than using
  the requested approximately 80% desktop content width.
- The worktree contains pre-existing unrelated changes. This task must not
  revert or absorb them unless their owner explicitly assigns them to this
  task.
- The owner approved a sparse terminal-native grouped-help layout: desktop may
  use a two-column grid of functional groups, mobile collapses to one column,
  and command rows use light separators/spacing rather than heavy card chrome.
- The original command runtime was a 1955-line compatibility hub. The approved
  separation and migration order are recorded in `architecture-design.md`;
  phases 0–3 now provide neutral contracts, a public VFS adapter, isolated
  core/session command modules, parser/expansion/runner boundaries, and a
  compatibility projection back to TerminalEffect.

## Requirements

### R1 — Preserve searchable document structure

- Keep the public, build-rendered corpus only; do not expose raw Markdown,
  private metadata, host paths, or runtime fetches.
- Preserve meaningful line boundaries for paragraphs, list items, blockquotes,
  and especially `pre`/code blocks when building the browser text corpus.
- Keep safe text normalization and size limits, but do not flatten a whole code
  block or multi-line example into one grep line.
- `cat` document rendering must remain the trusted-template path and must not
  regress to `innerHTML` or runtime Markdown parsing.

### R2 — Make help grouped and scannable

- `help` and `?` must show every supported command, aliases, usage, and a short
  description.
- Present commands in named functional groups rather than one dense list.
- The chosen presentation must remain terminal-native, keyboard accessible,
  readable at desktop and mobile widths, and easy to extend when a command is
  added.
- Help output must remain usable in a text-only pipeline; rich grouping is a
  standalone rendering enhancement, not a reason to break `help | grep`.

### R3 — Make grep results useful

- Preserve the existing safe regex subset, `-i`, `-n`, `-F`, public-resource
  scope, stdin behavior, and work limits.
- Give standalone grep results a structured presentation that makes the
  source path, optional line number, and matched context legible.
- Show an explicit, non-error no-results state instead of an empty-looking
  command record.
- Keep piped grep output deterministic plain text and preserve current safety
  and truncation behavior.
- Long matches must wrap or otherwise remain readable without causing page-wide
  overflow; copying the underlying text must remain possible.

### R4 — Establish one command implementation source of truth

- A command definition must own its metadata, aliases, completion, execution,
  pure-text/pipeline policy, and user-facing usage contract.
- Remove or consolidate the duplicate built-in dispatch so adding or changing
  a command does not require editing two divergent implementations.
- Consolidate the parser path where safe. If `tokenizeCommand` must remain
  exported for compatibility, make it a documented wrapper or compatibility
  adapter over the authoritative parser rather than a second semantic parser.
- Preserve active custom registries, aliases, pipeline behavior, command
  substitution restrictions, and immutable state transitions.

### R4a — Establish atomic shell/process boundaries

- Keep parsing, expansion, stage scheduling, stream wiring, redirects, and
  command policy in a shell runner rather than in individual commands.
- Give every command explicit stdin, stdout, stderr, status, and structured
  value contracts; pipeline position must not be exposed as `piped`/`pure`
  booleans.
- Inject a read-only virtual filesystem capability instead of passing raw
  TerminalEntry/Document/Experiment arrays to commands.
- Represent cwd/session updates and interactive actions as state patches or
  control events, separate from stdout/stderr.
- Keep the existing runtime exports as a compatibility facade while migrating
  commands in small, reversible phases.

### R5 — Widen the readable content region

- On desktop, the Terminal home, command transcript, and inline document stream
  should use a content region close to 80% of the available page width, with a
  sensible maximum to avoid uncontrolled line length.
- Preserve the existing mobile full-width behavior, safe horizontal scrolling
  for intentionally wide code/table regions, visible focus, and no accidental
  document overflow.
- The width change must not disturb the static recovery page or canonical
  document reader boundaries.

### R6 — Preserve capability and accessibility boundaries

- No host command execution, filesystem access, network request, persistence,
  SSR conversion, or arbitrary navigation may be introduced.
- Continue rendering command output through safe DOM construction and native
  links.
- Preserve reduced-motion behavior, keyboard focus, IME/native control
  handling, and JavaScript-free recovery content.

## Acceptance Criteria

- [x] A regression using a public document containing a multi-line code/tree
  example proves `grep` sees and displays meaningful separate lines rather than
  one whitespace-collapsed mega-line.
- [x] `help` and `?` render all commands in the approved grouped presentation;
  the layout is visibly less crowded at desktop and mobile widths, and
  `help | grep <pattern>` still returns deterministic text.
- [x] Standalone `grep` has an explicit no-results state, readable path/line
  presentation, and tests for flags, long-line handling, and pipeline output.
- [x] Command execution has one authoritative definition/dispatch path; unit
  tests cover every shipped command, custom registry commands, aliases,
  completion, pipelines, substitutions, redirects, and rejection cases.
- [x] The architecture refactor has a shell runner, command modules, a
  ReadonlyVirtualFs port, explicit stdout/stderr/status, and separate state or
  control events; `ls`, `cat`, `grep`, and `cd` can run against a fake VFS
  without DOM or apps/site imports.
- [x] Desktop Terminal content measures approximately 80% of the available
  width within a safe maximum; 375px, 768px, 1024px, and 1440px browser checks
  show no accidental document overflow and preserve focus/reader behavior.
- [x] Terminal package check, test, and build; site content/X Core check/build;
  focused Terminal browser tests; reader tests; and the full site Playwright
  suite pass.
- [x] Read-only, static fallback, public-corpus, and no-runtime-fetch
  invariants remain intact.

## Out of scope

- Adding a general-purpose POSIX/GNU shell or new mutation commands. A bounded,
  in-memory POSIX-inspired process contract is in scope; host process
  semantics are not.
- Host filesystem, network, server, database, authentication, comments, SSR,
  or persistent browser storage.
- Rewriting authored documents or changing public content semantics solely to
  improve a terminal result.
- A full visual redesign of the Terminal theme or unrelated page types.
- The pre-existing unrelated worktree changes listed in the session Project
  Pulse.

## Approved UI research direction

- Task research is recorded in
  `.trellis/tasks/08-16-terminal-command-polish/research/ui-ux-pro-max.md`.
- Adopt the useful parts of the UUPM result: content-first documentation
  structure, high-contrast phosphor tokens, existing JetBrains Mono, sparse
  whitespace, subtle motion, visible focus, 16px mobile text, explicit empty
  states, and no normal-content horizontal overflow.
- Do not adopt the generated FAQ/CTA structure, external Google Font import,
  oversized landing-page typography, or router animation; they conflict with
  the existing static terminal architecture and local font contract.

## Planning decision resolved

- Approved boundary: introduce the shell/process/VFS contracts inside the
  terminal package, migrate the core commands behind the existing
  `executeCommand`, `completeCommand`, and `TerminalEffect` facade, and defer
  any cross-package presentation move until the neutral contracts are stable.
  The owner confirmed this phased approach before implementation began.
