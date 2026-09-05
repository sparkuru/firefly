# Implementation plan

## Ordered checklist

1. [x] Read the frontend/Trellis specs and inspect current neutral/runtime Help,
       registry, completion, and browser test seams before editing.
2. [x] Extend command contracts with immutable help-example metadata and the
       neutral completion context required by command-owned callbacks; update
       registry validation/freezing and any shared helpers.
3. [x] Move parser/policy/metadata literals and executors into exported command
       descriptors. Keep the registry as explicit imports and composition; use
       small command modules/shared helpers where the current session module
       contains several commands.
4. [x] Bind existing contextual completion behavior to descriptors and remove
       the runtime command-name completion switch. Verify custom terminal
       definitions still work.
5. [x] Add generic `help [command]` parsing/resolution and descriptor examples;
       project examples through shell contracts and runtime effects, with
       generic browser rendering and bounded stdout/announcement projections.
6. [x] Update focused unit/integration/browser tests for descriptor ownership,
       registry-only composition, Help list/detail/alias/custom examples,
       unknown targets, and completion parity. Do not weaken existing safety
       assertions.
7. [x] Run the quality gate, inspect the diff for accidental command behavior
       changes, and revise this task artifacts if implementation reveals a
       contract decision that must be preserved.

## Validation commands

Run through the repository wrapper, not host npm:

```sh
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-05-terminal-command-module-descriptors
git diff --check
```

If the focused browser command has a repository-specific invocation, use the
equivalent script documented by `presentations/terminal`/`apps/site` and record
the exact command and result in the task journal.

## Review gates and rollback points

- After contract/registry migration: type-check and neutral unit tests must pass
  before touching DOM code.
- After completion migration: compare all existing completion fixtures and
  custom-registry tests; revert only the completion slice if parity fails.
- After Help detail/rendering: run terminal browser tests and inspect responsive
  Help layout; keep generic rendering and remove any command-specific branch.
- Before activation/commit: `task.py validate`, full scoped checks, and
  `git diff --check` must be clean. Revert a slice with its tests if a gate
  exposes an incompatible public shape; do not reset unrelated user changes.
