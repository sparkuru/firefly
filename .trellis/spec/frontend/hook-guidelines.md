# Client-Side Behavior (No Hook Layer)

## Current Runtime Model

This project does not use a component framework, custom hooks, a data-fetching
library, or a client-side lifecycle abstraction. The NERV package dependencies are
Astro, TypeScript, Astro's checker, and Playwright. A source scan finds one browser
script: the inline `<script>` in `experiments/nerv/src/pages/index.astro`.

Keep this file at the task-defined path so existing Trellis manifests remain
stable, but do not interpret its filename as evidence that `use*` hooks exist.

## Route-Owned Script Pattern

The current interactive behavior belongs to the route that renders the required
DOM:

- Query `.logo-container`, keep a route-local `clickCount`, and attach the click
  listener only when the element exists through optional chaining.
- After three clicks, persist the `has_visited` cookie and redirect to the `from`
  query parameter or `/`.
- Query all `.warning-stripe` elements with
  `document.querySelectorAll<HTMLElement>()` and update their `--bg-position`
  custom property from the window scroll position.

The script is placed after the page markup in `src/pages/index.astro`; its selectors
are rendered by `NervLogo.astro` and `WarningStripe.astro`. Treat those selectors as
a small cross-file contract.

For behavior of the same size and scope, follow that boundary: keep the script in
the owning route, use browser APIs directly, and keep mutable values inside the
script rather than attaching them to `window`.

## Data Fetching

There is no runtime fetching, request cache, synchronization, loading state, or
error-state convention in the implemented frontend. The NERV experiment builds to
static HTML and its current interaction uses only DOM, URL, cookie, and navigation
APIs.

Do not introduce React Query, SWR, a custom `useFetch`, or a parallel client data
model for static content. If a future milestone introduces browser data fetching,
establish its lifecycle, error handling, and tests in that task before recording it
as a project convention.

## Naming and Extraction Boundary

There is no `useSomething` naming convention because there are no hooks. Existing
TypeScript and browser-script identifiers use descriptive camelCase names such as
`clickCount`, `scrollY`, `viewportWidth`, and `baseURL`.

Do not extract the current handlers merely to satisfy a template category. The
repository has no shared client-module pattern or evidence-backed extraction
threshold yet. A task that introduces that boundary must document its location,
naming, and validation alongside the implementation.

## Avoid

- Do not add hook-shaped functions to a framework-free Astro page.
- Do not move route state onto `window` or another implicit global.
- Do not assume a selected element exists. The current single-element query uses
  `logo?.addEventListener(...)`.
- Do not change `.logo-container` or `.warning-stripe` independently of the route
  script that queries them.
- Do not add runtime requests for content already available at static-build time.
- Do not use `prototypes/typecho-terminal/terminal/assets/terminal.js` as current
  runtime architecture. Its parent prototype is explicitly `reference-only`.

## Reference Files

- `experiments/nerv/package.json`
- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/modules/nerv/components/NervLogo.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `prototypes/typecho-terminal/prototype.json`
