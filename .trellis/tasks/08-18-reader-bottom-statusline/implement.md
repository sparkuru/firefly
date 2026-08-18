# Implementation Plan: Bottom-anchored reader statusline

## Ordered checklist

1. [ ] Read the approved PRD/design, UUPM research, and curated frontend
       context; inspect the current reader selectors/tests and preserve the
       unrelated active-task changes.
2. [ ] Move the shared `ReaderStatus` composition after the rendered reader
       region in both document components.
3. [ ] Convert semantic and Terminal status CSS from top sticky flow to fixed
       bottom chrome. Preserve token-backed contrast, full-viewport containment,
       native form behavior, focus treatment, and responsive no-overflow rules;
       add safe-area and compact paragraph/reserve styling.
4. [ ] Add route-local status-height observation in the existing reader
       controller so the article reserves the measured fixed-bar height and
       active/search settlement remains above it through state and viewport
       changes.
5. [ ] Update reader/static-output browser assertions for post-content markup,
       fixed bottom geometry, initial/mid-scroll persistence, reserved final
       content, search/command expansion, semantic fragment visibility, and
       desktop/mobile containment. Keep behavior assertions unchanged.
6. [ ] Update the durable frontend reader contract only where the layout
       contract changes; do not modify generic semantic or shell-path rules.
7. [ ] Run focused static/type/build and reader/browser checks through `./sam`,
       then the relevant site suites and `git diff --check`. Review the final
       diff for active-worktree preservation.

## Expected change surface

- `apps/site/src/components/SemanticDocument.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/src/styles/global.css`
- `apps/site/src/styles/terminal.css`
- `apps/site/src/scripts/terminal-reader.ts`
- `apps/site/tests/reader.spec.ts`
- `apps/site/tests/static-output.test.mjs` only for the status/reader order
  assertion already owned by the active site test file
- `.trellis/spec/frontend/content-workspace-contract.md`

Task artifacts and UUPM research live under this task directory. Do not alter
`presentations/terminal/src/*`, shell-intuitive path files, authored Markdown,
or unrelated active-task assertions.

## Validation commands

```bash
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
./sam node --test apps/site/tests/static-output.test.mjs
git diff --check
```

If the package script uses a different static-output command, use the exact
script listed in `apps/site/package.json` and record the command/result.

## Risk and rollback points

- A fixed element does not reserve layout space by itself. Verify both the
  conservative static fallback and the measured dynamic reservation, including
  search/command states at 375px.
- Moving the status after prose changes source order and static-output
  assertions; preserve the same stable data attributes and script bundle.
- Fixed bottom chrome can cover anchor targets or search matches if geometry is
  incomplete. Browser-test the first unit, last unit, mid-page search, and
  command form rather than relying on computed CSS alone.
- The active unified-presentation task currently owns content and some site
  test changes. Patch only the status-order assertion around its current text;
  never revert or stage unrelated hunks.
- If the measured-reservation approach causes a runtime regression, retain the
  CSS fallback and revert only the observer integration while keeping the
  bottom visual contract under investigation; do not weaken the acceptance
  criteria silently.
