# Frontend Quality Guidelines

## Current Quality Gate

The runnable frontend is `experiments/nerv/`. Validate it through the root `./sam`
container wrapper; host Node, globally installed browser tooling, and raw Docker are
not the repository contract.

For every frontend source change, run:

```bash
./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
```

`check` runs `astro check`. `build` runs `astro check && astro build`, preserving a
type/content check before static output. Installation uses the lockfile:

```bash
./sam npm --prefix experiments/nerv ci
```

See `development-runtime.md` for wrapper inputs, failure handling, and script-level
checks.

## Browser Validation

`experiments/nerv/tests/nerv.spec.ts` is the trusted browser-test example. It:

- navigates relative to the configured `/lab/nerv/` base URL;
- verifies the document title;
- locates the semantic main landmark and level-one heading by accessible role/name;
- asserts that document width does not exceed viewport width.

`playwright.config.ts` runs the same test in Chromium at desktop `1440x900` and
mobile `375x812`. Use the version-matched package/image pair:

```bash
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e -- tests/nerv.spec.ts

SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix experiments/nerv run test:e2e
```

Add interaction assertions when changing the logo click/cookie/redirect behavior or
scroll-driven stripe behavior; the present test is a render-and-overflow baseline,
not coverage for those interactions. Prefer role and accessible-name locators for
semantic UI. Use CSS selectors only when the selector itself is the behavior
contract, such as `.warning-stripe` in the current route script.

## Accessibility and Responsive Baseline

- Keep one visible `<main>` and a meaningful page `<h1>`; both are asserted on the
  NERV route.
- Preserve heading order and native document elements in feature components.
- Keep the configured narrow-mobile project passing without document-width
  overflow.
- Treat keyboard/focus checks as required when a task adds keyboard-operable
  controls. The current page has no form control or focus-flow test.
- Do not claim automated accessibility scanning: no scanner is configured.
- Do not claim visual-regression coverage: screenshots are failure diagnostics,
  not approved baselines.

The root `prd.md` requires an experiment reduced-motion strategy, but the current
NERV styles still contain continuous `scanline` and `flicker` animations without a
`prefers-reduced-motion` rule. Record that as an implementation gap when relevant;
do not describe it as existing behavior or mark it verified.

## Formatting and Source Consistency

No repository ESLint/Prettier script or configuration and no `.editorconfig` are
present. Do not report a formatter or lint pass that the project cannot run. Match
the checked-in local style instead:

- two-space indentation in Astro, TypeScript, JavaScript config, and CSS;
- single quotes and semicolons in TypeScript / JavaScript;
- trailing commas are not used uniformly, so preserve the surrounding file;
- component CSS stays co-located and normal styles remain scoped.

Always run `git diff --check` for whitespace errors. Do not reformat unrelated
legacy code in `prototypes/typecho-terminal/` while working on the Astro package.

## Review Checklist

- The change stays inside the correct experiment/module boundary and does not turn
  the reference-only Typecho prototype into runtime code.
- A route remains thin, a feature root owns composition, and leaf components keep
  their local props and styles.
- Root-relative assets respect Astro's `/lab/nerv` base configuration.
- Static content remains usable without new client-framework or runtime-data
  dependencies.
- Selector changes account for `src/pages/index.astro` DOM queries.
- Astro check and build pass through `./sam`.
- Browser-visible behavior has focused Playwright evidence followed by the full
  configured run when applicable.
- Failure artifacts are left at `experiments/nerv/playwright-report/` and
  `experiments/nerv/test-results/`; both remain ignored.
- Residual human review is limited to subjective visual/product judgment, real
  devices, assistive technology, or a private deployment environment.

## Avoid

- Do not use a successful build as evidence that browser behavior or responsive
  layout passed.
- Do not replace a failed or unavailable Playwright run with an unrecorded visual
  smoke test.
- Do not add snapshot baselines without a controlled review/update policy.
- Do not bypass `./sam` with host package-manager or global Playwright commands.
- Do not weaken semantic markup to make CSS layout easier.
- Do not report the planned Astro 7 main-site architecture from `prd.md` as current
  NERV implementation.

## Reference Files

- `experiments/nerv/package.json`
- `experiments/nerv/playwright.config.ts`
- `experiments/nerv/tests/nerv.spec.ts`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/NervPage.astro`
- `experiments/nerv/src/modules/error/NotFoundPage.astro`
- `.trellis/spec/frontend/development-runtime.md`
