# Implementation Plan: Ctrl+L and grep context output

## Preconditions and review gates

- [x] Keep task status `planning` until this plan, the design, and the PRD are
      reviewed and explicitly approved by the user.
- [x] Before implementation, run `python3 ./.trellis/scripts/task.py validate
      09-11-ctrl-l-clear-grep-context` and confirm the context manifests contain
      real spec entries.
- [x] Start the task only after the planning approval with
      `python3 ./.trellis/scripts/task.py start
      09-11-ctrl-l-clear-grep-context`.

## Ordered implementation checklist

1. [x] Load the Terminal/content-workspace and frontend guidance through
   `trellis-before-dev`; reread `prd.md`, `design.md`, and this plan.
2. [x] Extend the shared grep row contract in
   `presentations/terminal/src/shell/contracts.ts` and the mirrored Terminal
   runtime types in `presentations/terminal/src/runtime.ts` with optional
   context and separator markers. Preserve the existing shape for match-only
   results.
3. [x] Update `presentations/terminal/src/commands/grep.ts`:
   - add short/long context options and usage/help text;
   - validate bounded numeric values;
   - calculate per-resource context intervals, merge overlapping/adjacent
     intervals, and mark context rows/separator boundaries;
   - preserve matching ranges, resource ordering, stdin behavior, and existing
     limits;
   - format plain stdout with `:`/`-` prefixes and `--` block separators.
4. [x] Update the runtime text projection in `runtime.ts` so direct output,
   pipelines, command substitution, and redirects all see the same formatted
   context rows.
5. [x] Update `apps/site/src/scripts/terminal-home.ts` and
   `apps/site/src/styles/terminal.css` to render context rows without
   highlights, render separator rows, and keep summaries and mobile layout
   correct. Do not alter the already-correct Ctrl+L branch except where a
   regression test requires an explicit assertion.
6. [x] Add focused neutral-command tests in
   `presentations/terminal/tests/neutral-shell.test.ts` for parser forms,
   numeric validation, A/B/C behavior, C-plus-explicit-direction overrides,
   interval merging, separators, stdin, named resources, and bounds.
7. [x] Add Terminal runtime tests in
   `presentations/terminal/tests/terminal.test.ts` for help, structured row
   metadata, plain projections, pipelines, redirects, and match-count
   summaries.
8. [x] Add or extend site Playwright coverage in
   `apps/site/tests/terminal.spec.ts` for visible context/separator rows,
   absent context highlights, line-number delimiters, and no horizontal
   overflow. Retain the existing Ctrl+L regression tests.
9. [x] Update `.trellis/spec/frontend/content-workspace-contract.md` with the
   stable grep row markers, delimiter rules, and required cross-layer test
   coverage.

## Validation commands

[x] `./sam npm --prefix presentations/terminal run check`
[x] `./sam npm --prefix presentations/terminal run test`
[x] `./sam npm --prefix presentations/terminal run build`

Then run the affected site checks and static build:

[x] `./sam npm --prefix apps/site run check`
[x] `./sam npm --prefix apps/site run test:content`
[x] `./sam npm --prefix apps/site run build`

For the interactive browser evidence, build the immutable site artifact first
and use the pinned Playwright image/profile:

[x] `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts`

Before handoff, run:

```text
python3 ./.trellis/scripts/task.py validate 09-11-ctrl-l-clear-grep-context
git diff --check
```

If the complete mainline gate is required by the final diff, run the relevant
`./sam npm run check:m4` and `./sam npm run test:m4` commands after the
focused checks. Do not treat a failed or unavailable wrapper/browser command
as a pass.

## Risk and rollback points

- **Shared payload risk:** update neutral contracts, runtime copies, and the
  site renderer together; a missing copy can silently drop context metadata.
- **Output semantics risk:** assert both structured rows and plain stdout so a
  pipeline cannot diverge from direct Terminal output.
- **Boundary risk:** test first/last lines, adjacent matches, multiple files,
  stdin, and truncation so context never crosses resources or duplicates rows.
- **Accessibility/layout risk:** assert no `<mark>` on context rows, visible
  separators, focus preservation, and mobile no-overflow behavior.
- **Rollback:** if an iteration fails, revert only the changed Terminal/site
  source, tests, and spec files; no content, config, or runtime state needs
  recovery.
