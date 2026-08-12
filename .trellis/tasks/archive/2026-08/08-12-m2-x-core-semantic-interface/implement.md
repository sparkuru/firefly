# M2 X Core semantic interface — Implementation Plan

## Preconditions

- Task remains in `planning` until the owner approves the final summary.
- Use the project-local UUPM context in
  `research/uupm-semantic-editorial.md`; do not regenerate or broaden the design
  direction during implementation.
- Use `./sam` for every Node/npm/browser command and preserve package-local exact
  lockfiles.
- Do not edit NERV, deployment, wrapper, or reference-prototype files.

## Ordered Work

1. **Establish private package boundaries**
   - Create `packages/x-core/` and `presentations/semantic/` as private strict ESM
     TypeScript packages with exact dependencies, lockfiles, build outputs, and
     unit-test scripts.
   - Reuse versions compatible with the locked Astro markdown stack; declare
     every direct runtime/type dependency in the owning package.
   - Add root command delegates and ignore only generated package build/test
     artifacts.
   - Prove clean installs and the X Core → semantic build order before site
     integration. Stop if external-package resolution requires converting the
     repository into an npm workspace; that is a scope change.

2. **Implement contracts, registry, diagnostics, and JSON safety**
   - Add the readonly public types, diagnostic/error representation, normalized
     adapter ID rules, registry/default selection, and plain JSON validator.
   - Write unit tests first for duplicate/unknown/unsupported adapters, unsafe or
     cyclic props, forbidden keys, and document-aware error details.
   - Register a test-only adapter proving two outputs from one normalized input;
     do not add Terminal-named production code.

3. **Implement the paired AST pipeline**
   - Add shared per-VFile state, app-supplied context resolution, raw-HTML
     failure, summary/reference analysis, deterministic heading IDs/outline, and
     stable block `nodeId` assignment.
   - Apply the selected adapter, validate its returned HAST and manifest targets,
     and publish only versioned JSON-compatible metadata.
   - Cover repeated-run determinism, duplicate headings, links/images, tables,
     code, blockquotes, missing targets, and ID collisions with fixtures.

4. **Implement the semantic adapter**
   - Support only the M2 post/page contexts, preserve native semantics, and add
     narrowly required structure for addressable/wide content.
   - Emit an empty production enhancement manifest.
   - Test the support boundary, unchanged semantic meaning, stable output, and
     absence of client/runtime dependencies.

5. **Integrate the locked Astro processor**
   - Wire the paired plugins and semantic registry into `unified(...)`, disable
     dangerous raw HTML, and add an app-owned `DocumentContext` resolver.
   - Add `renderDocument()` to validate/narrow generated plugin metadata.
   - Move post/page composition into `SemanticDocument.astro`; keep route files
     thin and URLs unchanged.
   - Adjust the metadata schema so syntactically valid adapter IDs reach registry
     validation while malformed IDs still fail early.

6. **Apply the approved restrained editorial UI**
   - Refine existing tokens/typography/spacing only as required by the approved
     UUPM context.
   - Add an optional useful outline and localized table/code overflow behavior
     with keyboard-visible focus.
   - Extend ordinary sample Markdown to exercise headings, links, blockquote,
     code, and table semantics without framework imports or presentation classes.
   - Add no external font, icon library, dark mode, decorative motion, or client
     script.

7. **Expand automated evidence**
   - Add X Core/semantic unit and integration scripts to package/root delegates.
   - Extend content negatives for malformed/unregistered presentations and raw
     HTML.
   - Extend JavaScript-disabled Playwright for outline targets, code/table
     containment, heading order, focus, direct navigation, draft absence, and no
     overflow on both configured projects.
   - Inspect emitted files and dependency/source graphs for prohibited runtime,
     NERV, Terminal, external-font, private, draft, absolute-path, or source-map
     leakage.

8. **Run the full quality gate and update durable specs**
   - Run every command below through the approved wrapper, fixing product defects
     before declaring any gate passed.
   - Re-run unchanged NERV check/build after all main-site/package checks.
   - In Phase 3.3 update frontend indexes and focused guides to describe the
     implemented packages, plugin metadata, registry/diagnostics contracts,
     semantic component, package build order, and browser coverage.
   - Run task validation, `git diff --check`, artifact/secret/local-path scans,
     and final boundary review before proposing commits.

## Validation Commands

The implementation may add the named scripts, but the final gate must expose and
run equivalent commands:

```bash
./sam npm --prefix packages/x-core ci
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build

./sam npm --prefix presentations/semantic ci
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e

./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

python3 ./.trellis/scripts/task.py validate 08-12-m2-x-core-semantic-interface
git diff --check
```

Record exact focused/full test counts, viewports, JavaScript mode, route/fixture
coverage, static output inventory, negative-case errors, package versions, and
any unavailable command. A missing browser image or network failure is
`unavailable`, never `passed`.

## Risk and Rollback Points

- After step 1, verify clean package installs/resolution before building on the
  topology. Do not silently introduce workspaces or merge lockfiles.
- After step 3, keep pure package tests green before touching Astro routes.
- After step 5, compare exact M1 route output and no-JavaScript behavior before UI
  refinements.
- If Astro plugin metadata cannot be consumed reliably through
  `remarkPluginFrontmatter`, stop and revise `design.md`; do not create a browser
  parsing fallback.
- Rollback restores M1's `unified()` configuration, direct `render(entry)` route
  calls, and prior CSS/content. New packages and generated build artifacts are
  additive and contain no user data.

## Start Gate

- `prd.md`, `design.md`, and this plan have no blocking open questions.
- Both JSONL manifests contain real frontend spec and task-research entries.
- The owner has reviewed the final planning summary in a subsequent message and
  explicitly approved implementation.
