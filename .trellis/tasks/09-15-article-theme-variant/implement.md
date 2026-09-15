# Paper article theme — Implementation Plan

## 1. Pre-start and orchestration gate

- Keep the task in `planning` until the owner approves the final planning
  summary in a subsequent message.
- Before product edits on the approved turn, run
  `python3 ./.trellis/scripts/task.py start
  .trellis/tasks/09-15-article-theme-variant` and load `trellis-before-dev` for
  the frontend/spec layers. Read this task's PRD, design, and curated context
  manifests first.
- In the main Codex session, dispatch the task's normal Trellis implementation
  and check agents after activation. Each dispatch prompt must start with the
  active task path and agents must return evidence; the main session verifies
  their results before relying on them.
- Do not edit the read-only external blog workspace. Do not start product code
  implementation during the planning turn that creates these artifacts.

## 2. Ordered implementation checklist

1. Reconfirm `git status`, current task state, the task artifacts, and the
   frontend/runtime specs. Confirm the baseline `article-content.css` is
   unchanged before editing.
2. Extend `apps/site/src/lib/article-theme.mjs` with the single exact ID
   `paper`, keeping the registry frozen and ID-only. Update focused schema tests
   for exact acceptance, omission/default compatibility, unsafe values, and
   wrong types.
3. Add `apps/site/src/styles/article-themes/paper.css` using the documented
   primitive → semantic → component token layers. Scope every selector below
   `[data-article-content][data-article-theme='paper']`; cover reading text,
   headings, links, blockquotes, callouts, code, wide regions, media, focus,
   and 375px-safe spacing without changing outer tokens.
4. Add explicit static style delivery: import the theme from `global.css`, and
   import it with `?raw` and append it in `TerminalLayout.astro` after the
   existing Terminal/shared content CSS. Do not add a dynamic CSS URL or route.
5. Add/update deterministic tests. Use a temporary same-filesystem blog root
   under `apps/site/test-results/` for a positive Astro build with two fixtures
   sharing the same Markdown body: one semantic route and one default Terminal
   route, both with `articleTheme: paper`. Clean fixtures, generated content,
   and output in `finally` blocks.
6. Extend static/source and X Core integration assertions for both real paper
   output roots, exact routes, CSS delivery, absence of `articleTheme` in X Core
   context/metadata, stable headings/node IDs, sanitizer behavior, and no
   outer-chrome attributes or selectors. Keep the default static fixture and
   shared baseline unchanged.
7. Add the focused static Playwright assertion to the maintained site matrix
   if needed: exercise the already-built CSS on a test-only paper attribute at
   1440x900 and 375x812, checking computed readability/focus and page/local
   overflow. Do not publish a fixture route or mutate the external workspace.
8. Use `trellis-check` after implementation. Resolve any cascade, build,
   accessibility, or route failure before updating the durable frontend
   contracts with `trellis-update-spec`.
9. Inspect the final diff and ignored/generated state. Confirm no Markdown,
   sanitizer, X Core, presentation package, route, comment/plugin, dependency,
   font, asset, or deployment change slipped into the task.

## 3. Validation commands

Run Node, Astro, and browser work through the repository's `./sam` boundary.
Run focused checks first, then the cross-layer gates:

```sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/09-15-article-theme-variant
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-desktop-static
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-mobile-static
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
FIREFLY_CONTENT_ROOT=/home/wkyuu/cargo/repo/04-flyMe2theStar/03-genshin/blog ./sam npm --prefix apps/site run build:workspace
git diff --check
```

If the full publication workflow is required by the changed surface, also run
the repository's declared manifest validation and publication/browser gates
from `.trellis/spec/trellis-plus/validation-profile.md`. A missing browser
image, dependency, or external workspace must retain its exact diagnostic and
must not be reported as a pass.

## 4. Review gates and rollback points

- **Registry gate:** only `default` and `paper` are accepted; invalid input
  fails before rendering, and no value becomes a path, URL, selector, or class.
- **CSS gate:** every theme selector has the paper content-root prefix; the
  shared baseline, outer variables, Terminal shell, semantic header/outline,
  comments, reader status, and navigation are unaffected.
- **Build gate:** both temporary paper fixtures render to their expected routes
  and contain exactly one paper attribute on the content root; default output
  remains default.
- **X Core gate:** context, exact metadata, heading outline, node IDs,
  sanitizer output, and `presentation` selection are unchanged.
- **Browser gate:** paper colors/type/focus are visible and readable, the
  viewport does not gain horizontal overflow, and wide code/tables retain
  intentional local scrolling at desktop/mobile sizes.
- **Rollback:** revert only the registry, paper CSS/imports, tests, and durable
  spec edits owned by this task. Preserve authored content, external workspace
  state, and previously generated publication artifacts.

## 5. Likely files

Expected product/test/spec files are limited to:

- `apps/site/src/lib/article-theme.mjs`
- `apps/site/src/styles/article-themes/paper.css`
- `apps/site/src/styles/global.css`
- `apps/site/src/layouts/TerminalLayout.astro`
- `apps/site/tests/content-schema.test.mjs`
- `apps/site/tests/content-build-positive.test.mjs` (new, if the positive
  fixture is kept separate from the existing negative-build helper)
- `apps/site/tests/static-output.test.mjs`
- `apps/site/tests/x-core-context.test.mjs`
- `apps/site/tests/x-core-integration.test.mjs`
- `apps/site/tests/site.spec.ts` (only for the focused static CSS smoke case)
- `.trellis/spec/frontend/content-workspace-contract.md`
- `.trellis/spec/frontend/site-configuration-contract.md`

The final implementation may omit a file when existing test structure provides
the same coverage, but it must not expand beyond the scope in the PRD without
another planning review.
