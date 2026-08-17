# Permalinks, Vim reader, and single-page experience — Implementation Plan

## Preconditions

- Obtain a fresh implementation approval after the final planning summary.
- Keep the existing unrelated worktree changes untouched:
  `.trellis/mainline.md`, the staging-rollout PRD, `dev.sh`, and
  `compose.release.yml`.
- Use `./sam` for every Node, Astro, and Playwright command.
- Do not change canonical content identity or route generation unless a test
  proves that the existing shared model cannot carry the reader fragment
  contract.

## Ordered implementation checklist

### 1. Close the navigation boundary

- Update the pure Terminal/runtime tests only as needed to preserve the closed
  `document-navigation` effect and prove that `vim` still resolves through the
  shared canonical entry.
- Add a controller-owned helper in
  `apps/site/src/scripts/terminal-home.ts` that derives the fixed
  `#terminal-reader` destination from the validated entry href.
- Use the helper for the transcript link and native assignment. Keep canonical
  entry manifests and ordinary document links fragment-free.
- Update terminal browser assertions to expect the explicit reader fragment.

### 2. Make both document presentations reader-capable

- Add the shared reader-status/control markup boundary, keeping labeled native
  search/command inputs and the existing polite announcer contract.
- Move the status before the rendered reader region in
  `TerminalDocument.astro`.
- Add the same reader anchor/region contract to `SemanticDocument.astro`
  without changing its `DocumentLayout`, article header, outline, or semantic
  prose hierarchy.
- Ensure each page has exactly one `id="terminal-reader"`, one reader region,
  and one controller-owned set of reader controls.

### 3. Implement explicit fragment entry and focus

- Update `terminal-reader.ts` to distinguish always-capable Terminal documents
  from fragment-entry-only semantic documents.
- On exact `#terminal-reader`, reveal the semantic status, make the region
  focusable, initialize the reader, and focus after native fragment settlement
  with `preventScroll: true`.
- Leave direct canonical routes unfocused and preserve native ownership outside
  the focused reader region.
- Keep the current unit, search, visual Range, IME, modified-key, selection,
  reduced-motion, and `:q` contracts unchanged unless a focused test exposes a
  necessary compatibility correction.

### 4. Refine presentation styling

- Move Terminal status spacing/border treatment from after-body to before-body.
- Add the semantic variant's auxiliary status styling within the semantic style
  boundary, reusing existing tokens and readable measures.
- Preserve visible focus, no-overlay/no-sticky behavior, wide-content
  containment, and responsive 375/768/1024/1440 checkpoints.
- Verify the status does not become an editor-like surface or dominate the
  authored title/prose.

### 5. Add regression coverage

- Extend `apps/site/tests/reader.spec.ts` with:
  - Terminal `vim` navigation with fragment and immediate `G` without manual
    focus;
  - semantic `vim` navigation with fragment, reader activation, and `:q`;
  - direct semantic and Terminal permalink focus policy;
  - native links, search, visual selection, IME, modified keys, reduced motion,
    and Back/Forward compatibility where the existing suite does not already
    cover it.
- Extend `apps/site/tests/static-output.test.mjs` for the semantic reader
  anchor, status-before-region order, unique IDs, and JavaScript-free content.
- Keep terminal runtime unit coverage for the closed effect/path boundary.
- Add or update focused screenshot coverage under the current task's research
  directory for desktop and mobile reader-entry and idle states.

## Validation commands

Run the smallest relevant checks while implementing, then the full gate:

```bash
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/reader.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-17-permalinks-vim-single-page
```

If the change crosses the existing package/publication boundary, also run the
applicable M4/M5 package, assembly, and production-shaped Nginx gates from
`.trellis/spec/frontend/development-runtime.md` and
`.trellis/spec/frontend/quality-guidelines.md`; do not treat a site-local build
as publication evidence.

## Validation evidence to record

- Exact route/hash and focused element for both Terminal and semantic `vim`
  entries at desktop and mobile widths.
- Direct canonical routes showing no automatic focus.
- JavaScript-disabled semantic output and fragment landing.
- Status order, overflow, visible focus, reduced motion, and native-key
  boundary results.
- The focused desktop/mobile screenshots and any unavailable command with its
  exact error.

## Risky files and rollback points

Likely task-scoped files are:

- `presentations/terminal/src/runtime.ts` and its unit tests;
- `apps/site/src/scripts/terminal-home.ts`;
- `apps/site/src/scripts/terminal-reader.ts`;
- `apps/site/src/components/DocumentPresentation.astro` only if dispatch
  wiring needs adjustment;
- `apps/site/src/components/SemanticDocument.astro`;
- `apps/site/src/components/TerminalDocument.astro`;
- `apps/site/src/styles/global.css` and `apps/site/src/styles/terminal.css`;
- `apps/site/tests/reader.spec.ts`, `apps/site/tests/static-output.test.mjs`,
  and focused screenshot tests.

The first rollback checkpoint is after the fragment-navigation change; the
second is after shared semantic/Terminal markup; the third is after focus and
CSS changes. Roll back only task-scoped edits if a checkpoint fails, and leave
the unrelated dirty worktree paths intact.

## Definition of done

- All PRD acceptance criteria have observable test evidence.
- The reader is immediately usable after `vim` without a manual click.
- Semantic documents remain semantic by default and become reader-capable only
  through explicit reader entry.
- The status is before the body, quiet, accessible, responsive, and non-sticky.
- Static/no-JavaScript output, canonical links, native Back/Forward, and the
  existing read-only security boundary remain intact.
- Focused screenshots have received human review before commit/archive.
