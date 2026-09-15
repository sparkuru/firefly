# Article theme infrastructure — Implementation Plan

## 1. Planning gate

- Keep the task in `planning` until the owner approves the final planning
  summary in a later turn.
- On the approved implementation turn, read this task's PRD/design and load
  `trellis-before-dev` for the frontend/spec layers before editing product
  files.
- Run `python3 ./.trellis/scripts/task.py start
  .trellis/tasks/09-15-article-themes` before product edits. Do not modify
  authored external blog content.
- Keep this as one cohesive task. The registry, schema, render boundary,
  tests, and durable contracts are not independently releasable in this
  infrastructure-only scope.

## 2. Ordered implementation checklist

1. Reconfirm the current clean/isolated worktree and read the applicable
   frontend and runtime specs.
2. Add the site-owned article-theme registry/resolver with the sole frozen ID
   `default`; keep it ID-only and free of dynamic CSS or stylesheet metadata.
3. Add optional `articleTheme` to the shared post/page schema, defaulting to
   the registry's `default` ID and rejecting unknown, malformed, unsafe, and
   wrong-type values while preserving strict unknown-key behavior. Ensure the
   authoring metadata helper retains the field during normalization.
4. Resolve the normalized theme at `DocumentPresentation.astro` and pass it as
   an independent prop to `SemanticDocument.astro` and `TerminalDocument.astro`.
   Emit `data-article-theme="default"` only on each existing
   `[data-article-content]` root.
5. Leave `presentation`, `resolveDocumentContext`, X Core metadata, site plugin
   payloads, canonical routes, Terminal home data, sanitizer behavior, and
   current article-content visual rules unchanged.
6. Add focused schema/registry and authoring-helper coverage, context/X Core
   exclusion assertions, and static-output boundary assertions for semantic
   and Terminal documents.
   Confirm the current CSS has no alternate theme rules or website-chrome
   selectors.
7. Update the content-workspace, site-configuration, and X Core contracts to
   document `articleTheme`, the `default` fallback, strict registry membership,
   the content-only boundary, and the deferred alternate-theme scope.
8. Run the validation gates below, inspect the final diff and generated-file
   status, and re-run focused checks after any correction.

## 3. Validation commands

All Node/build evidence must use the repository's `./sam` boundary:

```sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-15-article-themes
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm --prefix apps/site run build:workspace
./sam npm run check:m4
./sam npm run test:m4
FIREFLY_CONTENT_ROOT=/absolute/path/to/blog ./sam npm run build:m4
git diff --check
```

Use the configured external blog root for the owner-workspace build. Record
any unavailable browser/dependency/content-root gate with its original
diagnostic; do not substitute host Node/npm results or touch remote staging.

## 4. Review gates and rollback points

- After schema integration, verify omitted legacy content resolves to
  `default`, explicit `default` is accepted, and all other IDs fail before
  rendering.
- After boundary wiring, verify both presentations contain exactly one theme
  attribute on the content root and no theme attribute on website chrome,
  routes, home templates, or comments.
- After context/integration coverage, verify `articleTheme` is absent from
  X Core context and exact `xCore` metadata while `presentation`, headings, and
  node IDs remain stable.
- Before handoff, inspect for dynamic selectors, stylesheet URLs, arbitrary
  classes, sanitizer changes, front matter rewrites, route changes, external
  workspace changes, generated artifacts, and synchronizer protocol changes.
- Roll back only the task-owned registry/schema/component/test/spec changes if
  the default output or metadata contract drifts; leave external content and
  remote publication state untouched.

## 5. Likely files

- `apps/site/src/lib/article-theme.mjs`
- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/components/SemanticDocument.astro`
- `apps/site/src/components/TerminalDocument.astro`
- `apps/site/scripts/blog-meta.mjs`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/blog-meta-cli.test.mjs`
- `apps/site/tests/x-core-context.test.mjs`
- `apps/site/tests/static-output.test.mjs`
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`
- `.trellis/spec/frontend/x-core-contract.md`
