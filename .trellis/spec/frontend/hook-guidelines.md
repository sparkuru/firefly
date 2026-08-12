# Client-Side Behavior (No Hook Layer)

## Current Runtime Model

There is no component framework, custom hook layer, browser data-fetching layer,
client cache, or lifecycle abstraction.

- `apps/site/` emits useful static HTML and contains no client `<script>` or
  hydration directive. Its Playwright projects disable JavaScript.
- `experiments/nerv/` has one route-owned inline browser script in
  `src/pages/index.astro`.

Keep this task-defined filename stable, but do not interpret it as evidence that
`use*` hooks exist.

## Static Main Site

Content loading, filtering, Markdown rendering, and route generation happen at
build time. Do not add browser requests, a client router, or runtime Markdown
parsing for data already available to Astro. A future enhancement must define its
no-JavaScript fallback, ownership, loading/error behavior, and tests before it
establishes a new convention.

## NERV Route-Owned Script

NERV's route script:

- queries `.logo-container`, owns local `clickCount`, and guards the optional
  element before attaching a click listener;
- writes the fixed `has_visited` cookie and redirects from the `from` query value
  after three clicks;
- queries `.warning-stripe` elements and updates their CSS custom property from
  `window.scrollY`.

Keep behavior of this size in its owning route. Selector classes are a cross-file
contract with `NervLogo.astro` and `WarningStripe.astro`.

## Extraction and Naming

There is no evidence-backed hook or shared client-module extraction threshold.
Use descriptive camelCase identifiers. Extract browser code only through an
explicit task when implemented routes genuinely share behavior or the route
script becomes independently testable.

## Avoid

- Do not add hook-shaped functions to framework-free Astro pages.
- Do not add runtime requests for build-time content.
- Do not attach route-local mutable state to `window`.
- Do not assume queried elements exist or change script-owned selectors alone.
- Do not treat the reference Typecho terminal JavaScript as current architecture.

## Reference Files

- `apps/site/src/pages/index.astro`
- `apps/site/playwright.config.ts`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/components/NervLogo.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `prototypes/typecho-terminal/prototype.json`
