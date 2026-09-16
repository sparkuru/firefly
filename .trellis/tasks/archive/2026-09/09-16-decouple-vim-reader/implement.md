# Presentation-composed document navigator — Implementation Plan

## 1. Preconditions and orchestration gates

- Product scope decisions are resolved: fully disabled navigation is deferred.
  Implement only the two existing non-nullable navigator profiles. The owner
  approved the final planning summary and the task is active.
- The task was activated with `task.py start` after explicit approval. The
  implementation and quality checks below record the completed execution.
- Before implementation, run:

  ```text
  python3 ./.trellis/scripts/task.py validate 09-16-decouple-vim-reader
  ```

  and re-read `prd.md`, `design.md`, this file, and the curated manifests.
- The content-workspace contract exceeds the injection size limit. Both
  implementation and review agents must use direct paginated reading through
  EOF as documented in `research/repository-evidence.md` before task work.
- After explicit approval of the final planning summary, run
  `python3 ./.trellis/scripts/task.py start 09-16-decouple-vim-reader`, load
  `trellis-before-dev`, and refresh the frontend/X Core context before editing.
- Use the repository's Trellis implementation/check agents after activation.
  The main session owns scope, verifies their evidence, and resolves any
  disagreement against the repository and task artifacts.
- Preserve unrelated worktree changes and do not edit the external blog
  workspace. All Node/Astro/browser commands run through `./sam`.

## 2. Ordered implementation checklist

Execute three sequential checkpoints within this task; do not parallelize
edits to document components, runtime selectors, or their tests:

| Checkpoint | Deliverable | Required evidence before next checkpoint |
| --- | --- | --- |
| A: definitions | Pure navigation contract/helper, experience definitions, registry and dispatch integration using existing DOM names | New definition/helper tests in `test:content`, X Core tests, Astro check/build |
| B: profile wiring | Typed document/status props and derived entry/tabindex/visibility using existing DOM names | Four direct/fragment browser entry cases, static/no-JS behavior |
| C: naming | Atomic component/runtime/DOM/CSS/test rename and durable spec update | Full AC1–AC6 matrix and affected-package checks |

The exact APIs, dependency restrictions, DOM ownership, and rename map are in
`design.md` sections 11–14. If a checkpoint fails, diagnose it before applying
the next transformation. Retain the previous passing checkpoint as the narrow
rollback boundary; never revert user-owned or unrelated changes.

1. Reconfirm the worktree, task state, PRD/design, frontend contracts, and
   current generated-output baseline. Search all existing `reader` identifiers
   before changing any name; distinguish the public `#terminal-reader`/`vim`
   compatibility boundary from site-owned implementation names.
2. Add the site-owned presentation-experience definition in
   `apps/site/src/lib/presentation-experiences.ts`. Keep each adapter ID,
   document renderer kind, and `documentNavigator` entry profile together.
   Define the initial `firefly` (`terminal`, `always`) and `semantic`
   (`semantic`, `fragment`) entries. Do not add article metadata or a global
   reader-selection map.
3. Update `apps/site/astro.config.mjs` to register adapters from the single
   experience definition and update `DocumentPresentation.astro` to resolve
   that same definition for outer dispatch. Keep unknown-ID/support failures
   typed and preserve the existing default `firefly` behavior.
4. Rename and parameterize the site-owned navigation surface:
   - `ReaderStatus.astro` → `DocumentNavigationStatus.astro`;
   - `terminal-reader.ts` → `document-navigator.ts`;
   - `startTerminalReader`/reader-specific local names →
     `startDocumentNavigator`/navigation names;
   - pass the resolved profile into `SemanticDocument.astro` and
     `TerminalDocument.astro` instead of hardcoding entry policy there;
   - retain article/content-root ownership in those document components;
     the status component owns controls and script initialization only, using
     the same profile for visibility without moving content or comments;
   - use neutral `data-document-navigator-*` attributes where they are not
     public compatibility identifiers;
   - preserve all state-machine, native-control, IME, selection, focus,
     search, reduced-motion, and `:q` behavior.
5. Rename site-owned visible terminology and styles to document-navigation
   language. Update `global.css`, `terminal.css`, accessible labels,
   announcements, status classes, CSS highlight names, and status-reserve
   variables as one consistent change. Keep the Terminal `vim` command name,
   its semantics, and the `#terminal-reader` fragment/id unchanged.
6. Update `apps/site/src/scripts/terminal-home.ts` helper names and link copy
   to documentNavigator terminology while retaining same-origin validation and
   the legacy `#terminal-reader` output. Update the Terminal command summary
   only where it calls the UI a reader; do not rename the command itself.
7. Update tests and browser configuration:
   - add profile-consistency/entry-policy assertions;
   - update static-output component and asset assertions;
   - rename the reader browser suite to document-navigator terminology (and
     update `playwright.config.ts` if the filename changes);
   - preserve desktop/mobile static and interactive matrices, semantic and
     Terminal entry coverage, and all existing interaction-boundary tests;
   - update review screenshot selectors/labels without changing unrelated
     comment fixture display names.
8. Update the durable frontend contracts, especially the read-only reader
   section of `.trellis/spec/frontend/content-workspace-contract.md`, to call
   the behavior documentNavigator while documenting the preserved legacy
   fragment and `vim` command. Update X Core wording only where it describes
   the site asset; do not alter the X Core contract or metadata shape.
9. Run focused checks, inspect static output and the final diff, then run the
   cross-package gates. Record exact pass/fail evidence in this file only after
   implementation has actually run.
10. Use `trellis-check` after implementation. If the design boundary or
    frontend contract changes materially, stop and update the task artifacts
    before continuing; do not silently broaden the task.

## 3. Validation commands

Acceptance mapping:

| PRD criterion | Evidence |
| --- | --- |
| AC1 | Experience-definition tests and registration/dispatch inspection |
| AC2 | Schema defaults plus both presentations' direct/fragment browser cases |
| AC3 | Existing navigator and Terminal browser regression suites |
| AC4 | Built asset assertions and JavaScript-disabled desktop/mobile cases |
| AC5 | Local 2×2 presentation/theme fixtures, static isolation and existing X Core/content contracts |
| AC6 | Accessible-name assertions, compatibility links, and spec/diff review |

Run focused validation first, always through the project command boundary:

```text
python3 ./.trellis/scripts/task.py validate 09-16-decouple-vim-reader
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-desktop-static
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-mobile-static
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-desktop-interactive
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- --project=chromium-mobile-interactive
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
git diff --check
```

If the implementation changes a shared package import or the full publication
graph, run the complete declared validation profile, including manifest and
publication browser gates. A missing Docker image, dependency, or browser
server is an unavailable result, not a pass; retain its exact diagnostic.

## 4. Review gates and rollback points

- **Schema gate:** front matter remains exactly `presentation` plus optional
  `articleTheme`; omitted presentation still resolves to `firefly`; no reader
  value enters content schema or X Core metadata.
- **Single-definition gate:** the adapter registry and site dispatch consume
  the same presentation-experience definitions; no parallel `p -> reader`
  table or duplicated entry policy remains.
- **Behavior gate:** Firefly remains always-entry/visible and semantic remains
  fragment-entry/hidden-by-default; all current navigator behavior and native
  boundaries are unchanged.
- **Compatibility gate:** `vim` remains a valid Terminal command and
  `#terminal-reader` remains a working generated and direct-entry fragment;
  canonical routes and no-JavaScript content remain unchanged.
- **Isolation gate:** `articleTheme` stays content-root-only; outer layout,
  navigator status, comments, X Core metadata, and Terminal chrome do not
  consume it.
- **Static graph gate:** only document routes load the renamed navigator asset;
  home/directory/Lab/NERV do not, and each document contains one expected
  navigation boundary.
- **Accessibility gate:** document-navigation labels, visible focus,
  announcements, native control ownership, 44px targets, reduced motion, and
  JavaScript-disabled reading all pass.
- **Rollback:** revert the experience definition/dispatch, navigator rename and
  profile plumbing, CSS/labels, tests, and durable contract update together.
  Preserve authored content, external workspace state, and generated
  publication artifacts.

## 5. Expected files

Likely product/test/spec changes are limited to:

- `apps/site/src/lib/presentation-experiences.ts` (new);
- `apps/site/src/lib/document-navigation.ts` (new pure contract/helper);
- `apps/site/tests/presentation-experiences.test.mjs` (new) and
  `apps/site/package.json` (register the test in the explicit runner list);
- `apps/site/astro.config.mjs`;
- `apps/site/src/components/DocumentPresentation.astro`;
- `apps/site/src/components/SemanticDocument.astro`;
- `apps/site/src/components/TerminalDocument.astro`;
- `apps/site/src/components/ReaderStatus.astro` renamed to
  `DocumentNavigationStatus.astro`;
- `apps/site/src/scripts/terminal-reader.ts` renamed to
  `document-navigator.ts`;
- `apps/site/src/scripts/terminal-home.ts`;
- `apps/site/src/styles/global.css` and `apps/site/src/styles/terminal.css`;
- `presentations/terminal/src/commands/session.ts` (summary wording only);
- affected site tests and `apps/site/playwright.config.ts`;
- `package-runtime.sh` and `tooling/assemble-publication/tests/publication.spec.ts`;
- `.trellis/spec/frontend/content-workspace-contract.md` and, only if needed,
  the corresponding X Core wording;
- this task's research/manifests and evidence.

Do not modify `packages/x-core` contracts, `article-theme.mjs`,
`article-content.css`, authored Markdown, route-generation logic, comments
fixtures, or the external blog unless a later approved design explicitly
expands the scope.

## 6. Post-implementation evidence

The owner approved the final planning summary on 2026-09-16. The task was
started with `python3 ./.trellis/scripts/task.py start
09-16-decouple-vim-reader`; `task.py validate` passes with the expected warning
that the large content-workspace spec is truncated for injection. The
implementation and review agents completed the three checkpoints. The final
diff contains the presentation-experience registry, pure navigator profile,
profile wiring, atomic site-owned rename, asset/runtime updates, tests, and
the durable frontend contract update. Authored content and the external blog
workspace were not changed.

### Focused and package validation

- `./sam npm --prefix apps/site run check`: passed; 83 Astro files, 0 errors,
  warnings, or hints.
- `./sam npm --prefix apps/site run test:content`: passed; 81 tests.
- `./sam npm --prefix apps/site run test:x-core`: passed; 8 tests.
- `./sam npm --prefix apps/site run build`: passed with 28 local pages and
  18 static-output tests.
- `./sam npm run check:m4`: passed for validator, X Core, semantic, terminal,
  assembler, site, NERV, and majo.
- `./sam npm run test:m4`: passed; validator 4, X Core 15, semantic 3,
  terminal 40, assembler 9, site content 81, and site X Core 8.
- `./sam npm run build:m4`: passed, including experiment builds and
  publication assembly.
- `./sam npm run test:e2e:publication`: passed; 4/4 desktop/mobile publication
  tests.
- `./package-runtime.sh`: passed publication, route, header, 404, inventory,
  private-data, non-root, and read-only runtime probes.
- `bash -n package-runtime.sh`, ShellCheck, `git diff --check`, and task
  validation passed.

### Browser validation

- Focused `document-navigator` suite: desktop 18/18 and mobile 18/18.
  This covers direct and legacy-fragment entry on the available Firefly
  document routes, navigation movement, search, selection, native controls,
  IME, reduced motion, focus, Back/Forward, `vim`, and `:q`.
- Full desktop interactive project: 61 passed, one navigator case passed on
  retry, and one existing local-fixture completion assertion failed because
  the test expects `./app/` while the local public directory is `./apps/`.
- Full mobile interactive project: 62 passed and the same existing
  `./app/` versus `./apps/` fixture assertion failed.
- Desktop and mobile JavaScript-disabled projects each passed 9/11. The two
  failures in each run are fixture-specific assertions for the local
  `Learning-with-LLM` filename casing and configured NERV metadata; all
  document-navigation no-JavaScript cases passed.

The checked-in production content has no semantic presentation route, so the
semantic direct/fragment entry policy is verified by the frozen experience
definitions, pure profile tests, static-output assertions, and the temporary
semantic/paper build fixture. A separate semantic interactive fixture was not
added because the task explicitly preserves authored content and the current
browser fixture set contains only Terminal document routes. The two CSS
optimizer messages about `::highlight(document-navigation-*)` are nonfatal;
the browser highlight tests pass and the supported CSS Highlights API remains
progressively optional.
