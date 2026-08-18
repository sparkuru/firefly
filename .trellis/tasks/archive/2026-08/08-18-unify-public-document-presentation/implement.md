# Implementation Plan: Unified Public Document Presentation

## Ordered checklist

1. [x] Read the task design, UUPM research, and frontend component/quality/
       hook/directory specifications; confirm the unrelated shell-path diff is
       outside the write scope.
2. [x] Change the two current semantic public documents to
       `presentation: terminal` without changing their body or routes.
3. [x] Update static-output, semantic-route, and reader browser assertions to
       describe the unified Terminal document surface.
4. [x] Run content tests, Astro check/build, Terminal/site tests, focused
       static and reader/Terminal Playwright coverage, then the full site suite.
5. [x] Review responsive/accessibility/static fallback evidence and verify no
       shell-path files or unrelated worktree changes are staged.

## Validation commands

```bash
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
```

## Risk and rollback points

- Route snapshots may still assert the old semantic stylesheet ownership;
  update those assertions together rather than weakening isolation checks.
- The semantic reader fragment test must continue to prove native/no-JS
  behavior after the route becomes a Terminal document.
- Stage only this task's Markdown, test, spec, and task-artifact paths. Leave
  the active shell-path task and pre-existing Trellis changes untouched.
