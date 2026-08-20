# Implementation plan — Command Tab completion selection

## Preconditions

- Confirm `./sam` is executable and use it for all Node and browser commands.
- Re-read the curated frontend specs and task UI research before editing.

## Steps

1. Extend `CompletionResult` and `completeFrom()` in
   `presentations/terminal/src/runtime.ts` so ambiguous results expose a common
   prompt value and candidate prompt values without changing candidate order or
   path safety.
2. Update `presentations/terminal/tests/terminal.test.ts` to assert command,
   directory, relative-path, and absolute-path ambiguous result values,
   including shared-prefix and no-shared-prefix cases.
3. Update `apps/site/src/components/TerminalHome.astro`,
   `apps/site/src/scripts/terminal-home.ts`, and
   `apps/site/src/styles/terminal.css` to render a vertical accessible panel,
   retain prompt focus, manage active selection, and implement the exact
   Tab/Enter/Space/Escape/Ctrl+A/Ctrl+E/Ctrl+U state transitions.
4. Update `apps/site/tests/terminal.spec.ts` with focused desktop/mobile
   assertions for common-prefix insertion, vertical candidates, active-item
   wrap-around, Enter/Space commit-versus-submit, Escape, line editing,
   IME/modifier exclusions, existing Ctrl+C/Ctrl+L/history behavior, and no
   overflow.
5. Run the package checks, build the site, and run the focused interactive
   Playwright suite through `./sam`; record browser evidence and any exact
   unavailable blocker.
6. Perform the required submit-ready human review after automated evidence,
   then run the full scoped quality gate before commit.

## Validation

```sh
./sam npm --prefix presentations/terminal ci
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
git diff --check
```

## Risks and rollback

- A controller-side reconstruction of candidate command text could bypass the
  pure safe completion contract. Mitigation: runtime supplies full prompt
  values; controller only chooses them.
- A fake interactive list can break screen-reader behavior or focus. Mitigation:
  keep focus in the native input and test list/active-descendant semantics.
- Browser-reserved shortcuts cannot be proven by Playwright alone. Mitigation:
  keep `clear`/`cls` canonical and report Ctrl+L as best-effort in product help.
- If regression appears, revert the task-scoped runtime/controller/markup/CSS/
  test changes together; no data migration or published-command rollback is
  required.
