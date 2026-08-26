# Implementation Plan: Clickable `find` Results

## Ordered Checklist

1. [x] Re-read the active Terminal contracts and verify the worktree is clean
      before implementation.
2. [x] Add the neutral `document-search` value to the shell contract and have
      `executeFind` attach validated matches while preserving current stdout.
3. [x] Adapt the neutral value to a typed `find` Terminal effect, update the
      effect's text projection/announcement/exhaustiveness paths, and fail safe
      when a result cannot map to the decoded public entry index.
4. [x] Refactor the existing document-row renderer only as needed, then render
      direct find matches as native canonical links with complete display paths,
      dates, titles, and existing responsive/focus behavior.
5. [x] Extend neutral/runtime tests for structured values, direct effects,
      deterministic ordering, text-only `find | cat` behavior, and text-only
      redirect output.
6. [x] Extend focused site Terminal Playwright coverage for post/page links,
      keyboard reachability and navigation, canonical hrefs, and absence of
      anchors in the pipeline projection.
7. [x] Update the durable Terminal/content-workspace contract with the
      structured-versus-text find boundary and native-link rule.
8. [x] Run the quality gates below, inspect the final diff, and prepare the
      implementation summary for independent check.

## Expected Files

- `presentations/terminal/src/shell/contracts.ts`
- `presentations/terminal/src/commands/find.ts`
- `presentations/terminal/src/runtime.ts`
- `presentations/terminal/src/shell/runner.ts`
- `apps/site/src/scripts/terminal-home.ts`
- `presentations/terminal/tests/neutral-shell.test.ts`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/tests/terminal.spec.ts`
- `.trellis/spec/frontend/content-workspace-contract.md`

## Validation Commands

Run through the project boundary:

```text
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-26-find-result-links
```

The focused browser suite must run against the production-shaped site preview,
not `astro dev`. If a command is unavailable, report its exact environment
error rather than counting it as passed.

## Risk and Review Points

- The closed `TerminalEffect` union is consumed by both runtime text policies
  and the DOM renderer; exhaustive compiler errors are expected and should be
  resolved rather than bypassed.
- The direct browser row must keep the validated canonical `href`; no URL may
  be derived from a keyword, display path, or shell operand.
- `find | cat`, substitutions, and redirects must remain text-only even though
  direct `find` gains a structured value.
- Existing `ls` link behavior and directory click interception must remain
  unchanged. Verify normal and modified document-link activation is still
  native.
- Do not add static content metadata, runtime requests, a client router, or
  generated sensitive artifacts.
