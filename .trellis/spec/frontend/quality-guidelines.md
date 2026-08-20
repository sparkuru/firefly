# Frontend Quality Guidelines

## Package Quality Gates

Use the root `./sam` wrapper. Host Node, global browser tooling, and raw Docker
are not validation contracts.

```bash
./sam npm --prefix tooling/validate-experiments ci
./sam npm --prefix tooling/validate-experiments run check
./sam npm --prefix tooling/validate-experiments run test
./sam npm --prefix tooling/validate-experiments run build
./sam npm --prefix tooling/validate-experiments run validate -- --root ../..

./sam npm --prefix packages/x-core ci
./sam npm --prefix packages/x-core run check
./sam npm --prefix packages/x-core run test
./sam npm --prefix packages/x-core run build

./sam npm --prefix presentations/semantic ci
./sam npm --prefix presentations/semantic run check
./sam npm --prefix presentations/semantic run test
./sam npm --prefix presentations/semantic run build

./sam npm --prefix presentations/terminal ci
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run test
./sam npm --prefix presentations/terminal run build

./sam npm --prefix tooling/assemble-publication ci
./sam npm --prefix tooling/assemble-publication run check
./sam npm --prefix tooling/assemble-publication run test
./sam npm --prefix tooling/assemble-publication run build

./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm --prefix experiments/nerv ci
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build

./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
./package-runtime.sh
```

A successful build is necessary but not sufficient. For main-site work, inspect
the exact emitted route set, draft absence, and relevant content-invariant error
paths. For isolation work, check/build all affected packages and the consumer,
then scan for cross-imports.

## Browser Validation

Browser-accessible changes require the focused command followed by the full
package suite from the single profile in `index.md`.

- Build the main site before Playwright; its server previews the already checked
  `dist/`. Do not use `astro dev` to prove semantic/Terminal style isolation.
- Static projects disable JavaScript and cover native home fallback, semantic and
  Terminal documents, canonical post/page directory indexes and breadcrumbs,
  `/lab/`, nested/fragment deep links, static 404 recovery, heading
  order and outline targets, focusable code/table regions, visible focus, draft
  absence, and no document overflow at both viewports.
- Interactive projects enable JavaScript for Terminal home and Terminal-document
  reader coverage:
  home-only connecting startup state, persistent first boot-log transcript record,
  DOM-ready missing-controller fallback, prompt availability after startup, commands/errors,
  manifest-backed lab listing/navigation, history/draft
  restoration, safe unique/ambiguous/zero-result path completion with retained focus and
  prompt-wide Tab prevention plus native outside-prompt traversal, prompt `Ctrl+C` cancellation,
  IME-safe and mobile soft-keyboard Enter, inline `cat` with unchanged URL,
  record-start/document viewport settlement, executable list operands, nested
  tree/cat/vim, Vim movement/search/
  visual Range/`:q`, safe printable typing with native/ARIA
  widget and local-scroll exclusions, repeated-clone
  ID/reference scoping, clear-to-fresh-prompt behavior with a centered empty
  session and no overflow, validated native links, latest-only announcements,
  early/late recovery, reduced motion, and responsive checks at `375`, `768`,
  `1024`, and `1440` widths.
- NERV coverage includes title, main/heading semantics, mounted favicon/logo,
  three-click cookie/return, independent 404, reduced CSS/scroll motion, and no
  overflow at both viewports.
- Publication Playwright serves the already assembled root release and covers
  site-to-NERV navigation, mounted assets, distinct 404 ownership, native return,
  reduced motion, and containment. It complements rather than replaces both
  application-local suites.
- Prefer semantic role/name locators. Use CSS selectors only when the selector is
  itself a runtime contract.
- Preserve reports, screenshots, and traces on failure. Do not weaken assertions
  or silently replace an unavailable run with visual smoke testing.

## Content and Static-Output Review

- Posts consume only the fresh ordinary-file materialized stage; pages use their
  repository loader. Both use the shared strict schema.
- Routes consume the guest canonical projection; draft/access/layout/path checks are not
  scattered across pages.
- The default site inventory is exactly ten HTML routes, one semantic CSS,
  one Terminal-home JS, and one canonical-document reader JS, with zero maps or
  unknown files. Only home references the command script; canonical document
  routes reference the reader, with semantic documents activating it only for
  the explicit `#terminal-reader` fragment; directory indexes remain
  script-free. Semantic/About/lab/404/directory routes link semantic CSS;
  Terminal home/documents contain Terminal styles.
- The exact home script predicate returns `false` only for Astro's generated
  `TerminalHome...js` filename after POSIX/Windows separator normalization and
  returns Vite's `undefined` default for every other or non-string input.
- Home output contains exactly one inert document template per public entry,
  rendered through production `renderDocument()`. Template keys exactly match
  decoded entries; document bodies occur only inside those templates and never
  in JavaScript, JSON, or entry `data-*` metadata.
- Output contains only the frozen guest projection. Private/draft titles, bodies,
  owners, paths, completion entries, templates, routes, and private-only
  directories are absent, as are `FIREFLY_CONTENT_ROOT` and resolved host paths.
  Generated, assembled, and runtime trees contain zero symlinks.
- `/lab/` and Terminal recovery consume one frozen listed catalog projection.
  Site entry links use validated default entries; Terminal links use canonical
  mounts. Neither surface imports, requests, or preloads Experiment assets.
- Outside owner-authorized nested `posts/<category>/<slug>/index.html` and
  `pages/<slug>/index.html` body HTML, output contains no
  source Markdown parser, hydration directive, external font request,
  NERV/xterm/prototype dependency/style, draft, credential, private data, or
  local absolute path. It contains exact same-origin JetBrains Mono v2.304
  Regular/Medium WOFF2 files plus the complete tagged OFL and provenance record;
  static tests pin all upstream bytes with SHA-256, and browser tests prove both
  weights load through `document.fonts` without a remote request.
- Isolation scans use paths, manifests/dependency graphs, imports, and targeted
  runtime/style tokens. Do not use broad text matches such as `/nerv/i` that can
  flag prose or integrity strings.
- Only implemented route semantics are emitted. Do not add placeholder routes to
  make a milestone appear broader.

## Accessibility and Responsive Baseline

- Keep semantic main/article/navigation structure, native links, sequential
  headings, and a keyboard-accessible skip path. The Terminal home has a
  programmatic visually hidden H1 and label; every other route H1 remains visible.
- Preserve visible focus and no document-width overflow at `375x812` and
  `1440x900`.
- Main-site core content must remain readable with JavaScript disabled.
- The unboxed Terminal prompt row is at least 44 px, uses implicit form
  submission plus `enterkeyhint="send"`, and has no visible Run control. Wide
  code/table regions own local overflow, a programmatic name, keyboard focus, and
  visible focus state.
- Terminal global typing must preserve modified keys, Space, control/navigation
  keys, selection, IME, links, native controls, editable regions, keyboard-scroll
  regions, and standard ARIA widgets. Browser regressions cover both configured
  viewports; a blanket document-keydown cancellation is a release blocker.
- No automated accessibility scanner or visual-regression baseline is configured;
  do not claim either.
- NERV disables scanline/flicker animations and resets scroll-driven stripe
  decoration under `prefers-reduced-motion: reduce`; verify both CSS and runtime
  values rather than inferring compliance from the media query's presence.

## Formatting and Source Consistency

No repository ESLint/Prettier script/config or `.editorconfig` exists. Do not
claim a linter/formatter pass. Match local two-space Astro/JS/TS/CSS style,
single quotes and semicolons in JS/TS, and surrounding trailing-comma style.
Always run `git diff --check` and avoid reformatting reference-only legacy code.

## Review Checklist

- Change stays within the correct site/experiment/content boundary.
- Direct dependency versions and app-local lockfiles remain reproducible.
- Schema changes include shared runtime behavior and negative regression tests.
- Manifest/publication changes follow `publication-contract.md`: exact decoding,
  lexical plus realpath containment, safe trees/references, coordinated rollback,
  declared build commands, deterministic inventory, and container probes.
- X Core changes include adversarial adapter/context/JSON/metadata tests and a
  site integration using the shared schema plus the actual Astro processor.
- Terminal changes include strict descriptor-only index decoding, pure runtime
  graph checks, immutable registry/alias validation, closed command/effect tests,
  shared tree/path resolution, exact entry/template bijection,
  trusted cloning without HTML-string APIs, repeated-clone ID/fragment/ARIA
  scoping, clear preservation of history/recovery data, home marker ordering,
  no-JavaScript boot-log suppression, persistent boot-log history without a
  second animation after DOM relocation, prompt availability,
  prompt-wide Tab ownership with outside-prompt native traversal and prefix preservation, prompt Ctrl+C cancellation, safe
  global typing exclusions, record/document settlement with reduced motion,
  semantic root-theme purity, pinned font/license
  integrity, reader key/Range/native-ownership boundaries, fatal recovery
  restoration, and proof that semantic/Terminal
  packages and route assets remain bidirectionally isolated.
- Main-site routes remain thin and static; NERV selectors/base-path behavior is
  preserved when relevant.
- Workspace changes include exact read-only chained mounts, broad/special/broken
  rejection, deterministic/race-safe materialization and rollback, Unicode/case/
  route collisions, guest-only projection, external-workspace build, and default
  output restoration. See `content-workspace-contract.md`.
- Astro check/build and applicable Node/browser tests pass through `./sam`.
- Browser evidence records package, command, routes/states, viewports, JavaScript
  mode, fixtures, results, and artifacts on failure.
- No deployment or publication claim is made from package-local `dist/` alone.
- A publication claim requires the assembled root `dist/` checks and, when
  packaging changes, production-shaped non-root Nginx route/header/404/cache and
  teardown evidence.
- Human residuals are limited to subjective visuals, real devices, assistive
  technology, or private deployment environments.

## Avoid

- Do not equate a build with responsive/browser success.
- Do not bypass `./sam`, force peer resolution, or apply destructive audit fixes.
- Do not add screenshot baselines without a controlled review policy.
- Do not weaken semantic markup or validation to make a check pass.
- Do not report future PRD architecture as implemented.

## Reference Files

- `apps/site/package.json`
- `apps/site/src/lib/content-schema.mjs`
- `apps/site/src/lib/content.ts`
- `apps/site/playwright.config.ts`
- `apps/site/tests/site.spec.ts`
- `apps/site/tests/content-build-negatives.test.mjs`
- `apps/site/tests/x-core-integration.test.mjs`
- `apps/site/tests/static-output.test.mjs`
- `packages/x-core/tests/x-core.test.ts`
- `presentations/semantic/tests/semantic.test.ts`
- `presentations/terminal/tests/terminal.test.ts`
- `apps/site/tests/terminal.spec.ts`
- `experiments/nerv/package.json`
- `experiments/nerv/playwright.config.ts`
- `experiments/nerv/tests/nerv.spec.ts`
- `tooling/validate-experiments/tests/validator.test.ts`
- `tooling/assemble-publication/tests/assembler.test.ts`
- `tooling/assemble-publication/tests/publication.spec.ts`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/development-runtime.md`
- `.trellis/spec/frontend/content-workspace-contract.md`
