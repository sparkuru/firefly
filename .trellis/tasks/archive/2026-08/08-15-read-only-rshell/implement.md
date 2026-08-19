# Read-only rshell implementation plan

## Scope and ownership

- `presentations/terminal/src/runtime.ts` and its unit tests own pure parsing,
  virtual cwd, registry semantics, line streams, commands, and pipeline errors.
- `apps/site/src/scripts/terminal-home.ts`, `TerminalHome.astro`, and Terminal
  browser tests own trusted-template text extraction, dynamic prompt/ARIA,
  safe final-output rendering, focus, and responsive evidence.
- Frontend contracts are updated only after implementation proves a stable
  reusable rshell rule; task-local behavior stays in this task directory.

## Ordered work

1. Define frozen text-stream/corpus, virtual-directory, scratch, command
   capability, and resource-budget contracts in the pure runtime. Extend state,
   command context, and execution without moving DOM APIs into the presentation
   package.
2. Replace single-command parsing with a restricted AST for quote-aware pipelines,
   `$(...)`, and final `>`/`>>`. Reject malformed grammar before dispatch;
   execute stages left-to-right and abort on typed errors.
3. Implement a pure iterative regular-language compiler/matcher for rshell grep.
   Document its RE2-like syntax subset and fixed caps; reject backreferences,
   lookaround, excessive bounds, and every unsupported construct without calling
   JavaScript `RegExp`.
4. Rework directory resolution, `ls`, `tree`, `cat`, and completion around the
   canonical virtual cwd. Add `cd`, `id`, read-only `alias`, `?`, expanded grep,
   capability-scoped scratch reads, and scratch-only redirection; retain `open`,
   `vim`, `about`, history, clear, and direct-cat effects.
5. Add deterministic stdout/stderr lines for every text-producing command. Keep
   direct document/link/navigation effects for standalone commands, make a
   pipeline final result text-only, and ensure substitution can invoke only
   declared pure-text command contracts.
6. In the controller, extract normalized visible text only from already validated
   public templates; pass it to the pure runtime. Update prompt/label/announcer
   from state and render final text with `textContent`. Keep scratch in runtime
   memory only.
7. Extend unit tests for AST quoting/pipes/substitution/redirection, per-command
   capability denial, cwd resolution, aliases/identity, public-only resource
   lookup, stdin filtering/chaining, safe regex/adversarial patterns, scratch
   expiry/bounds, bounded output, and hostile paths/arguments.
8. Extend focused Terminal Playwright coverage for desktop/mobile command flows,
   direct versus piped `cat`, prompt updates, visible redirected/session data,
   text error recovery, Tab/history/clear, no overflow, reduced motion, and
   protected keyboard input.
9. Run the complete affected package/site checks and static/publication evidence;
   review the final diff against the PRD and UUPM decisions before any commit.

## Validation plan

```bash
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e
./sam npm --prefix tooling/assemble-publication run test:e2e
./sam npm run check:m4
./sam npm run test:m4
git diff --check
```

## Risk checkpoints and rollback

- Keep public-text extraction behind the existing entry/template validation; if
  corpus construction cannot prove an exact trusted source, fail back to native
  recovery instead of exposing a partial shell.
- Treat every raw path, corpus record, command token, alias, and pipeline stage
  as untrusted command input until canonical validation succeeds.
- Do not add browser fetching, raw Markdown/HTML text, `innerHTML`, URL
  construction, a general shell evaluator, or persistent storage as a shortcut.
- If a new effect cannot preserve direct-document links, focus/announcement, or
  no-JavaScript recovery, revise the design before merging. Revert the task
  commit to roll back without external residue.
