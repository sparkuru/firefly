# Terminal Shell Architecture Design

Status: approved design; phases 0–3 parser/expansion/runner/session are implemented
behind the compatibility facade.

The final facade removal and migration of tree/help/history/identity remain
follow-up phases. The current implementation deliberately keeps the public
`runtime.ts` surface stable while neutral process contracts, command modules,
parser/expansion/runner/session commands, and the public VFS are exercised by
unit tests.

This design moves the browser-resident rshell toward a POSIX-inspired,
browser-safe process model. It keeps execution synchronous and in memory. The
goal is explicit ownership and composable contracts, not a general-purpose
operating-system shell.

## 1. Goals and non-goals

### Goals

- Separate command logic from pipeline position, DOM rendering, and concrete
  content-index arrays.
- Treat stdin, stdout, and stderr as explicit process channels.
- Represent shell state changes and interactive controls separately from text.
- Expose the public content index through a read-only virtual filesystem port.
- Let a new pure-text command live in one command module plus tests without
  editing the pipeline runner or terminal renderer.
- Preserve executeCommand and completeCommand as compatibility facades during
  migration.

### Non-goals

- Host process execution, filesystem access, network access, persistence, or
  arbitrary URL execution.
- Async scheduling, jobs, PTYs, host signals, or a full POSIX grammar.
- Replacing the parser in the first migration step.
- Changing command behavior, routes, content, or visual design as part of the
  boundary refactor.

## 2. Current gap and target decision

The current runtime file is a useful compatibility facade, but it is also the
parser, command registry, command implementation module, virtual filesystem,
pipeline runner, grep engine, output serializer, and structured terminal-effect
producer. TerminalCommandContext exposes the whole shell world to commands, and
TerminalEffect combines process output, state transitions, and presentation or
navigation results.

The target has five responsibilities:

1. Shell core parses, expands, schedules stages, connects streams, applies
   redirection, and enforces command policy.
2. Commands implement argument semantics against injected capabilities.
3. Virtual filesystem resolves safe paths and reads, lists, and globs only the
   validated public/session namespace.
4. Session/control owns cwd, history, scratch state, and interactive events.
5. Terminal adapter projects a neutral process result into structured terminal
   effects and DOM-facing behavior.

The first implementation keeps the existing facade and moves responsibilities
behind it. Moving the neutral result directly to the site controller is a
later cleanup, not a prerequisite for the first migration.

## 3. Dependency direction

    apps/site terminal controller
             |
             v
    terminal presentation adapter
             |
             v
    shell runner -> command registry -> command modules
             |                         |
             |                         +-- ReadonlyVirtualFs port
             |                         +-- ShellState port
             |                         +-- Clock/control ports
             v
    parser, expansion, streams, redirect policy

    build-time Entry/Document/Experiment arrays
             |
             v
    public VFS adapter -> ReadonlyVirtualFs

Dependency rules:

- Shell core must not import TerminalEntry, Astro, DOM types, CSS classes, or
  TerminalEffect.
- Command modules must not import the site controller or write DOM/navigation
  state directly.
- The public VFS adapter is the only layer that knows the build-index shape.
- The terminal adapter is the only layer that knows structured rows, links,
  announcements, or navigation rendering.
- The runner owns pipeline position and stream wiring; commands do not receive
  piped or pure booleans.
- The shell facade may depend on all internal modules for compatibility, but
  internal modules must not depend back on the facade.

## 4. Proposed module layout

    presentations/terminal/src/
      runtime.ts                 compatibility facade
      shell/
        contracts.ts             streams and process contracts
        parser.ts                Rshell AST and authoritative parser
        expansion.ts             bounded command substitution
        streams.ts               bounded stream helpers and serialization
        runner.ts                stages, pipes, redirects, policy
      commands/
        contracts.ts             command metadata and implementation type
        arguments.ts             bounded per-command argv/options parser
        registry.ts              immutable registry and aliases
        ls.ts                    list command
        tree.ts                  tree command
        grep.ts                  grep command and matcher boundary
        cat.ts                   cat command
        cd.ts                    cwd shell builtin
        open.ts                  experiment control builtin
        vim.ts                   document navigation builtin
        session.ts               help and identity/session commands
      vfs/
        contracts.ts             safe paths, nodes, listings, resources
        paths.ts                 normalization and wildcard rules
        public-index.ts          Entry/Document/Experiment adapter
      presentation/
        values.ts                neutral command values and control events
        terminal-effect.ts       compatibility projection to TerminalEffect

runtime.ts remains the public import surface until all callers migrate.

## 5. Core contracts

The names below are design-level contracts. Existing project naming conventions
may adjust them, but the ownership and data flow are binding.

### 5.1 Virtual filesystem

    type VirtualPath = string;

    interface ReadonlyVirtualFs {
      resolve(input, cwd, mode): PathResolution;
      stat(path): VfsNode | undefined;
      list(path): DirectoryListing | undefined;
      glob(pattern): readonly VirtualPath[];
      read(path): ReadableResource | undefined;
    }

The VFS owns safe path validation, mount rules, directory/document identity, and
bounded matching. Commands ask this port questions; they do not inspect raw
entry arrays or reconstruct path prefixes.

public-index.ts adapts decoded posts, pages, experiments, documents, and session
scratch files to this port. It never reads the host filesystem.

### 5.2 Process streams and result

The browser implementation is synchronous and bounded, so a stream may remain an
immutable line collection internally. The contract still names three
POSIX-style channels explicitly:

    interface TextStream {
      readonly lines: readonly string[];
    }

    interface ProcessResult {
      readonly status: number;
      readonly stdout: TextStream;
      readonly stderr: TextStream;
      readonly statePatch?: ShellStatePatch;
      readonly controls?: readonly ShellControlEvent[];
      readonly value?: CommandValue;
    }

Rules:

- stdout is the only channel connected to the next pipeline stage.
- stderr is never passed to the next stage.
- Non-zero status stops the current pipeline.
- value is a structured, presentation-neutral result for a final interactive
  stage; it is not implicitly inserted into stdout.
- All streams are bounded and immutable at the public boundary.

### 5.3 Command contract

    interface CommandSpec {
      readonly name: string;
      readonly aliases: readonly string[];
      readonly usage: string;
      readonly summary: string;
      readonly group: TerminalCommandGroup;
      readonly order: number;
      readonly policy: CommandPolicy;
      readonly parse: (argv: readonly string[]) => CommandArgumentResult;
      readonly execute: (context, args: ParsedCommandArguments) => ProcessResult;
      readonly complete?: (context, operand) => CompletionResult;
    }

    interface ParsedCommandArguments {
      readonly options: Readonly<Record<string, true | string>>;
      readonly operands: readonly string[];
    }

    interface ShellCommandMetadata {
      readonly name: string;
      readonly aliases: readonly string[];
      readonly usage: string;
      readonly summary: string;
      readonly group: CommandGroup;
      readonly order: number;
    }

    interface ShellIdentity {
      readonly user: string;
      readonly host: string;
      readonly workingDirectory: string;
      readonly about: string;
    }

    interface ProcessContext {
      readonly stdin?: TextStream;
      readonly cwd: VirtualPath;
      readonly fs: ReadonlyVirtualFs;
      readonly session: ReadonlyShellSession;
      readonly clock: () => Date;
      readonly signal: ShellSignal;
      readonly commands?: readonly ShellCommandMetadata[];
      readonly identity?: ShellIdentity;
    }

Commands return a result. They do not call the DOM, mutate global state, or
branch on pipeline position. The runner supplies stdin and consumes stdout and
stderr. The shell parser owns quoting/pipes/redirects; after expansion, the
definition-owned argv parser accepts interspersed options, short clusters, and
`--` before the command executor receives frozen options and operands.

### 5.4 Policy and control

    interface CommandPolicy {
      readonly pipeline: 'text' | 'forbidden';
      readonly substitution: 'allowed' | 'forbidden';
      readonly redirect: 'text' | 'forbidden';
    }

    type ShellStatePatch =
      | { readonly kind: 'cwd'; readonly cwd: VirtualPath }
      | { readonly kind: 'session'; readonly session: ReadonlyShellSession };

    type ShellControlEvent =
      | { readonly kind: 'clear-transcript' }
      | { readonly kind: 'open-document'; readonly path: string }
      | { readonly kind: 'open-experiment'; readonly experimentId: string };

cd is a shell builtin that returns a cwd patch. clear, vim, and open return
control events. These are not stdout and never become pipe input. Ctrl+C and
future cancellation are represented by ShellSignal, not a command-specific
boolean.

### 5.5 Neutral command values

    type CommandValue =
      | { readonly kind: 'directory-listing'; readonly listing: DirectoryListing }
      | { readonly kind: 'document'; readonly document: PublicDocument }
      | { readonly kind: 'grep-report'; readonly report: GrepReport }
      | { readonly kind: 'help'; readonly groups: readonly HelpGroup[] };

For example, ls may return a directory-listing value plus deterministic stdout
serialization. The terminal adapter may render the value as aligned rows for a
standalone command. A pipeline consumes only stdout and never sees the
structured view value.

## 6. Execution lifecycle

    input
      -> parse AST
      -> bounded substitution and expansion
      -> resolve command spec
      -> parse command argv/options
      -> create ProcessContext(stdin, cwd, fs, session, signal)
      -> execute stage
      -> connect stdout to next stage stdin
      -> keep stderr separate
      -> apply final redirect, state patch, and control event
      -> project final ProcessResult through terminal adapter

The runner, not a command, decides whether the result is:

- a pipeline value: serialize stdout only;
- a final interactive value: expose value to the adapter;
- an error: expose bounded stderr and status;
- a shell transition: apply statePatch and emit controls.

Command substitution reuses the same runner with restricted policy and consumes
only bounded stdout. It cannot invoke forbidden control commands or read a value
that exists only for the terminal adapter.

The canonical VFS root is `/`; `~/blog` is its prompt/display alias. Directory
mode must resolve `.` against `/` without constructing `//.`. Resource-relative
documents keep the established posts-relative rule, with pages requiring an
absolute `/pages/<path>.md` operand.

## 7. Migration map

| Current behavior | Target owner | Migration note |
| --- | --- | --- |
| path normalization, mount aliases, wildcard segments | vfs/paths.ts and VFS | preserve safe errors |
| directory/listing/entry lookup | vfs/public-index.ts | expose nodes, not raw arrays |
| ls listing and pattern semantics | commands/ls.ts | return listing value and stdout |
| cat resource and stdin semantics | commands/cat.ts | runner owns final rendering |
| grep matcher and resource scan | commands/grep.ts | return report value and stdout |
| cd cwd update | commands/cd.ts and runner | apply a state patch |
| open, vim, clear | command modules and controls | adapter maps controls |
| help metadata and grouping | command registry and help command | no global formatter switch |
| stdoutForEffect and isTextEffect | stream serializer and adapter | remove reverse coupling |
| TerminalEffect | compatibility adapter initially | move behind site boundary later |

## 8. Compatibility and rollout

### Phase 0: freeze behavior

- Keep current unit and E2E suites as characterization tests.
- Add contract tests for fake VFS, independent stdin/stdout/stderr, exit status,
  state patches, and control events.
- Do not change command strings or visible output.

### Phase 1: introduce ports behind the facade

- Add shell, VFS, and command contracts and adapters.
- Keep executeCommand, completeCommand, TerminalEffect, and registry exports.
- Route path resolution and public-index access through ReadonlyVirtualFs.

### Phase 2: migrate representative commands

Migrate ls, cat, grep, and cd first. They cover structured values, stdin, error
status, VFS access, and shell state transitions.

Each migrated command must run with a fake VFS and no DOM or apps/site import.
The old facade converts ProcessResult to current effects.

### Phase 3: migrate control and session commands

This phase has started with `open`, `vim`, and `clear`, plus the neutral command
registry, parser, bounded expansion, neutral runner, and the tree/help/history/
alias/identity/time session commands. The default fully neutral path now uses
the runner; custom registries and unsupported legacy stages stay on the
compatibility path.

### Phase 4: remove compatibility coupling

- Move TerminalEffect projection to the site-facing adapter.
- Make the site controller consume the neutral shell result plus adapter.
- Reduce runtime.ts to a compatibility/export facade or remove it only after all
  package consumers use the new modules.

Every phase preserves the static, no-host, public-corpus capability boundary.

## 9. Acceptance criteria

- The migrated command path contains no command-specific raw-index rules in the
  shell runner.
- Migrated commands receive no piped, pure, or stdinProvided booleans; those
  fields remain only on the legacy compatibility context.
- stdout, stderr, status, state patches, controls, and structured values are
  separate result fields.
- A command module is unit-testable with a fake VFS and in-memory streams,
  without importing apps/site or constructing DOM nodes.
- Adding a migrated pure-text command changes its command module, neutral
  registry declaration, and tests; the runner and renderer remain unchanged.
- ls, cat, grep, and cd preserve cwd-aware completion, public boundaries,
  structured listings, pipes, substitutions, and redirect limits.
- Existing terminal, site, content, X Core, static-output, and Playwright suites
  remain green after each migration phase.

## 10. Risks and open decisions

- Structured stdout remains deterministic text; structured values are final-stage
  side channels. This preserves POSIX-like pipes without losing rich standalone
  UI.
- Start with bounded immutable line streams rather than async iterators. Revisit
  only if a real command needs incremental work.
- Keep the current effect facade through Phase 3 to avoid a cross-package break.
- Use one file per behavior family rather than one file per trivial identity
  command, avoiding ceremony without a useful boundary.
