# Frontend Type Safety

## Compiler Baseline

`experiments/nerv/tsconfig.json` extends `astro/tsconfigs/strict` and excludes only
generated `dist`. The package is ESM (`"type": "module"`). Preserve this strict
baseline rather than weakening compiler options to make a local change pass.

Astro environment declarations remain in `src/env.d.ts`. There is no repository
frontend type package or generated application schema today.

## Local Types

Keep a type beside its sole consumer:

- `src/layouts/Layout.astro` defines a local `Props` interface with required
  `title` and optional `favicon` / `faviconType` strings.
- `src/modules/nerv/components/WarningStripe.astro` defines `position` as the
  literal union `'top' | 'bottom'` and defaults it during destructuring.

This codebase does not yet repeat a domain type across files, so creating a global
`types.ts` would add indirection without an existing shared contract. Introduce a
shared type only when multiple implemented modules consume the same data shape.

## Inference and Narrowing

- Let TypeScript infer local primitives and values when the initializer is clear,
  as with `const basePath`, `let clickCount = 0`, and the Playwright `baseURL`.
- Use literal unions for closed component variants rather than broad strings.
- Type DOM collection elements at the query boundary. The route uses
  `document.querySelectorAll<HTMLElement>('.warning-stripe')` before writing a CSS
  custom property.
- Handle an optional element before attaching behavior. The logo query is guarded
  with optional chaining.
- Use the framework config helpers for contextual typing:
  `defineConfig` wraps both `astro.config.mjs` and `playwright.config.ts`.

## Runtime Validation Boundary

The current NERV package has no Zod, Valibot, or custom runtime-schema library.
`experiment.json` is repository data, but validation tooling described in the root
`prd.md` has not been implemented yet. Do not claim runtime validation exists, and
do not replace TypeScript compile-time checks with unchecked casts.

When consuming untyped external input in future work, define validation as part of
that boundary's task. Existing browser inputs are deliberately narrow: the route
reads one query-string value and writes a fixed cookie value.

## Avoid

- Do not use `any`, broad type assertions, or relaxed compiler settings to bypass
  the strict Astro configuration. Current TypeScript and Astro source needs none of
  them.
- Do not type `WarningStripe`'s `position` as arbitrary `string`; only `top` and
  `bottom` are rendered and styled.
- Do not create shared type modules for one-file props.
- Do not describe the conceptual interfaces in root `prd.md` as implemented types;
  `PresentationAdapter` and `Enhancement` belong to future milestones.
- Do not treat JSON shape alone as runtime validation. `experiment.json` is an
  implemented manifest instance, while its planned validator is not yet present.

## Verification

Run the repository's Astro check through the container wrapper:

```bash
./sam npm --prefix experiments/nerv run check
```

The production build also begins with `astro check`, but the explicit check command
is the fastest type/content diagnostic. See `development-runtime.md` for the full
container and browser contracts.

## Reference Files

- `experiments/nerv/tsconfig.json`
- `experiments/nerv/package.json`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/astro.config.mjs`
- `experiments/nerv/playwright.config.ts`
