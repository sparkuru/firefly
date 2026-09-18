# Authored content theme contract migration — execution plan

## Dependency

The direct rename is approved. Integrate after child A's shared document
composition/rendering boundary is accepted; do not use a compatibility alias to
work around ordering. Do not edit external workspaces.

## Ordered checklist

- [x] Search all active producers/consumers and classify old-name occurrences as
      contract, prose/code example, negative test, or historical record.
- [x] Rename the theme registry/types/resolver and strict schema/metadata tooling;
      reject old-only and both-name inputs while preserving default/paper values.
- [x] Migrate repository-owned frontmatter fixtures/examples and renderer props,
      emit one `data-content-theme`, retain `[data-article-content]`, and update
      content-scoped CSS/docs without changing unrelated article semantics.
- [x] Verify theme isolation from X Core, routes, comments/plugins and navigator
      lifecycle; add no picker, preference or runtime switcher.
- [x] Run focused schema/metadata/X Core/static-output tests, then site check/build
      and browser no-JS/interactive theme invariance checks.
- [x] Record external-workspace migration as an explicit handoff; do not mutate or
      silently normalize external authored files.

## Validation commands

```text
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
```

Run any metadata CLI package tests declared by the current manifests through
`./sam`; do not use external content as a writable fixture.

## Risk and rollback points

1. Search audit must cover schema, tools, fixtures, DOM/CSS, docs and tests.
2. Schema and repository content migrate together; old field acceptance is never
   restored to make a build pass.
3. Inspect X Core and plugin payloads for absence of theme data.
4. Rollback is a paired application/content revision, not an alias.

## Evidence and handoff

- The active site surface now uses `contentTheme`, `ContentThemeId`,
  `resolveContentThemeId`, `data-content-theme`, and
  `styles/content-themes/paper.css`; the structural `[data-article-content]`
  hook remains unchanged.
- Old-only and both-name front matter fail with the direct migration diagnostic;
  the metadata CLI leaves rejected source files unchanged. X Core and plugin
  payload tests confirm theme metadata is not forwarded.
- `./sam npm --prefix apps/site run test:content`: passed (89 tests).
- `./sam npm --prefix apps/site run test:x-core`: passed (8 tests).
- With `FIREFLY_CONTENT_ROOT` set to the repository `content/` fixture,
  `./sam npm --prefix apps/site run check`: passed with 0 errors, warnings, or
  hints; `./sam npm --prefix apps/site run build`: passed with 18 static-output
  tests.
- A pinned Playwright run against an isolated temporary copy of the external
  content, with its one legacy field migrated only in that copy, passed all 48
  document-navigator tests on desktop and mobile. The full 162-test run passed
  154 tests; the eight remaining failures are pre-existing hard-coded external
  content assertions (NERV metadata and the workflow article's outline/link
  text), not content-theme or navigator failures.
- External authored content was not edited. The currently configured external
  workspace still contains `posts/infra/30-connect-windows-via-terminal.md`
  with `articleTheme: "paper"`; its owner must migrate that field to
  `contentTheme: "paper"` before a build using that workspace. The new schema
  intentionally fails closed until that handoff is completed.
