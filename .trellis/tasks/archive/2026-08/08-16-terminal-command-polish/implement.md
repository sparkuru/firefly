# Implementation plan: Terminal command polish and readable layout

## Preconditions

- Review `prd.md`, `design.md`, the UUPM research, and both context manifests.
- Confirm `./sam` exists and is executable before package/browser validation.
- Preserve the unrelated dirty paths already present in the worktree:
  `.trellis/mainline.md`, `.trellis/spec/frontend/development-runtime.md`,
  `.trellis/tasks/archive/2026-08/08-14-m6-staging-rollout/prd.md`, `dev.sh`, and
  `compose.release.yml`.
- Run `task.py start` only after the owner approves the final planning summary.

## Ordered implementation checklist

1. [x] Refactor the runtime command contracts in
   `presentations/terminal/src/runtime.ts`:
   - follow `architecture-design.md` as the target boundary and dependency
     direction;
   - introduce neutral shell/process/VFS contracts behind the existing facade;
   - model stdout, stderr, status, state patches, controls, and structured
     command values separately;
   - migrate `ls`, `cat`, `grep`, and `cd` before the remaining commands;
   - retain a safe compatibility adapter for the existing `TerminalEffect`,
     registry, `executeCommand`, and `completeCommand` exports;
   - keep `parseRshell` authoritative and `tokenizeCommand` as its documented
     compatibility wrapper.
2. [x] Replace whitespace-flattening corpus normalization with a line-preserving
   extractor shared by the controller/runtime boundary. Add unit fixtures for
   prose, lists, blockquotes, code blocks, unsafe controls, and fallback titles.
3. [x] Add structured standalone effects for grouped help and grep results while
   keeping pipeline stdout plain, bounded, and deterministic. Add semantic
   renderer helpers that use text nodes and `<mark>` ranges safely.
4. [x] Update `TerminalHome.astro`, `terminal-home.ts`, and `terminal.css`:
   - render grouped help sections and grep empty/match states;
   - use the approved sparse two-column/one-column grouped layout;
   - widen the desktop outer content measure toward 80%;
   - preserve mobile full width, focus, reduced motion, recovery, and wide-code
     local overflow.
5. [x] Update runtime, controller, and browser tests for all changed contracts.
   Keep tests for custom registries, aliases, completion, pipelines,
   substitutions, redirects, navigation, history, `clear`, fallback recovery,
   and no-JavaScript output.
6. [x] Reconcile stable reusable rules into the relevant frontend specs only after
   implementation/check evidence proves them. Keep task-specific visual choices
   and raw UUPM output in this task.

## Follow-up architecture phase

The approved parser/runner follow-up is now implemented behind the existing
facade:

7. [x] Extract the authoritative parser and bounded substitution expansion into
   `presentations/terminal/src/shell/` with focused unit coverage.
8. [x] Add the neutral runner for parser stages, stream wiring, status/policy
   enforcement, state patches, controls/values, and bounded scratch redirects.
9. [x] Route the default fully-neutral core command path through the runner while
   preserving custom registries and legacy session/tree commands.
10. [x] Move tree/help/pwd/history/alias/identity/time behavior to neutral session
    command specs, with injected command metadata/identity and VFS-backed tree
    traversal; retain custom-registry help compatibility.
11. [x] Add a definition-owned argv parser for every neutral command. Accept
    interspersed short/long options, short clusters, and `--` before execution;
    cover `grep -i a`/`grep a -i` equivalence and repair `.` resolution at the
    canonical VFS root without changing the posts-relative resource contract.
12. [x] Make completion ownership explicit for safe `cd` unique/ambiguous/
    no-match results so the browser prevents native Tab traversal and
    refocuses the prompt; derive built-in `l=ls`, `ll=ls`, and `cls=clear` from
    the command registry; and aggregate same-directory `ls *` multi-matches
    into deterministic direct-child listings.
13. [x] Make the active prompt the single Tab event boundary: prevent every
    prompt-focused Tab variant, while limiting completion rewriting to
    unmodified, non-composing events and preserving native Tab outside the
    prompt.
14. [x] Add bounded session-only user aliases (`alias name=command`) to the
    neutral shell session, canonical command resolution, help/query output, and
    runtime state adapter. Alias state is in-memory like scratch/pipeline state
    and is cleared by a fresh terminal session.
15. [x] Normalize `ls` completion directory candidates to one slash-terminated
    visible form, so an ambiguous `ls p` reports `pages/` and `posts/` without
    duplicate bare-name entries, while a unique prefix such as `ls pa` still
    completes deterministically.
16. [x] Make the shared browser completion renderer explain every ambiguous
    result as a normal multi-candidate state, while leaving unique completion
    output unchanged and keeping the note below the candidate list.

## Validation commands

Run through the project wrapper:

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
  ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e
```

Also run the repository shell checks relevant to the dirty workspace without
modifying unrelated files:

```bash
bash -n sam dev.sh package-runtime.sh
shellcheck sam dev.sh package-runtime.sh
shfmt -d sam dev.sh package-runtime.sh
git diff --check
```

Browser evidence must cover 375, 768, 1024, and 1440 widths, grouped help,
grep matches/no-results/long lines, preserved code-block lines, focus after
output, mobile Enter, reduced motion, and no document overflow.

## Review and rollback points

- After the runtime refactor, run terminal unit check/test before touching UI
  rendering; the command contract is the highest-risk boundary.
- After corpus extraction changes, run content/build checks and inspect a
  representative `grep #` result before styling it.
- If the unified handler API breaks custom registries, restore the compatibility
  adapter rather than duplicating the old built-in switch.
- If the width change causes overflow, narrow the outer max width or prose
  child measure; do not disable mobile zoom or global overflow as a shortcut.
- Dispatch `trellis-check` after implementation for spec drift, safety,
  accessibility, and cross-layer data-flow review before final validation.
