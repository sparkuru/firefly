# Frontend Quality Guidelines

## Package Quality Gates

Use the root `./sam` wrapper. Host Node, global browser tooling, and raw Docker
are not validation contracts.

```bash
./sam npm --prefix apps/site ci
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build

./sam npm --prefix experiments/nerv run check
./sam npm --prefix experiments/nerv run build
```

A successful build is necessary but not sufficient. For main-site work, inspect
the exact emitted route set, draft absence, and relevant content-invariant error
paths. For isolation work, check/build both packages and scan for cross-imports.

## Browser Validation

Browser-accessible changes require the focused command followed by the full
package suite from the single profile in `index.md`.

- Main site tests run with JavaScript disabled and cover home, generated post/page
  deep links, static 404 recovery, headings/body, visible skip-link focus, draft
  absence, and no overflow at both viewports.
- NERV's current browser baseline covers title, main/heading semantics, and no
  overflow. Add click/cookie/redirect or scroll assertions when those contracts
  change.
- Prefer semantic role/name locators. Use CSS selectors only when the selector is
  itself a runtime contract.
- Preserve reports, screenshots, and traces on failure. Do not weaken assertions
  or silently replace an unavailable run with visual smoke testing.

## Content and Static-Output Review

- Collection config uses explicit external loaders and the shared strict schema.
- Routes consume the single public projection; draft/layout/slug checks are not
  scattered across pages.
- Static output contains no source Markdown parser, hydration directive, client
  script, external font request, NERV import, draft text, credential, or local
  absolute path.
- Only implemented route semantics are emitted. Do not add placeholder routes to
  make a milestone appear broader.

## Accessibility and Responsive Baseline

- Keep a visible primary heading, semantic main/article/navigation structure,
  native links, sequential headings, and a keyboard-accessible skip path.
- Preserve visible focus and no document-width overflow at `375x812` and
  `1440x900`.
- Main-site core content must remain readable with JavaScript disabled.
- No automated accessibility scanner or visual-regression baseline is configured;
  do not claim either.
- NERV still lacks a `prefers-reduced-motion` implementation for its continuous
  effects. Record that gap when relevant rather than marking it verified.

## Formatting and Source Consistency

No repository ESLint/Prettier script/config or `.editorconfig` exists. Do not
claim a linter/formatter pass. Match local two-space Astro/JS/TS/CSS style,
single quotes and semicolons in JS/TS, and surrounding trailing-comma style.
Always run `git diff --check` and avoid reformatting reference-only legacy code.

## Review Checklist

- Change stays within the correct site/experiment/content boundary.
- Direct dependency versions and app-local lockfiles remain reproducible.
- Schema changes include shared runtime behavior and negative regression tests.
- Main-site routes remain thin and static; NERV selectors/base-path behavior is
  preserved when relevant.
- Astro check/build and applicable Node/browser tests pass through `./sam`.
- Browser evidence records package, command, routes/states, viewports, JavaScript
  mode, fixtures, results, and artifacts on failure.
- No deployment or publication claim is made from package-local `dist/` alone.
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
- `experiments/nerv/package.json`
- `experiments/nerv/playwright.config.ts`
- `experiments/nerv/tests/nerv.spec.ts`
- `.trellis/spec/frontend/development-runtime.md`
