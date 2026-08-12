# Frontend State Management

## Current State Model

The implemented NERV frontend is static-first and has no state-management package,
shared store, client cache, or server-state layer. Astro renders the document and
component props at build time. The only explicit mutable JavaScript value in the
implemented frontend is local to the inline script in
`experiments/nerv/src/pages/index.astro`.

## Existing State Categories

| Category | Current example | Ownership |
| --- | --- | --- |
| Render input | `title`, `favicon`, and `faviconType` in `Layout.astro`; `position` in `WarningStripe.astro` | Immutable Astro props owned by the receiving component |
| Ephemeral interaction | `let clickCount = 0` in `src/pages/index.astro` | The route script that owns the click listener |
| Derived browser value | `window.scrollY` converted to each stripe's `--bg-position` | Read inside the scroll listener; not duplicated into a store |
| URL input | `new URLSearchParams(window.location.search).get('from')` | Read at the redirect boundary |
| Persistence | `has_visited=true` cookie with one-year max age and `SameSite=Strict` | Written only after the three-click interaction |

Keep state at the narrowest current owner. Component props are render inputs, not a
mutable shared store. Browser-derived values should be read where they are applied
rather than mirrored into another state object.

## Global and Shared State

There is no global frontend state today and no criterion established for choosing a
store library. Do not add a singleton store for the current click counter, scroll
position, query parameter, or cookie. They are all confined to one route and have
direct browser representations.

If a future feature needs state across independently mounted client experiences,
that work must first define the ownership, serialization boundary, no-JavaScript
behavior, and browser tests. It should not silently establish a repository-wide
library from inside a feature task.

## Server State

There is no frontend server state to cache or synchronize. NERV has no runtime API
calls; `astro.config.mjs` sets `output: 'static'`, and `experiment.json` declares a
static `dist` artifact. Content visible on the page is authored in Astro files and
emitted during the build.

The terminal JavaScript under `prototypes/typecho-terminal/` manipulates a larger
context and command history, but `prototype.json` marks that tree as reference-only.
It does not establish state conventions for the Astro experiment or future static
Terminal Presentation.

## Persistence and Navigation Boundaries

The existing cookie and redirect are an explicit interaction contract:

- Cookie name: `has_visited`
- Value: `true`
- Scope: `path=/`
- Lifetime: `max-age=31536000`
- Same-site policy: `SameSite=Strict`
- Redirect source: `from` query parameter, falling back to `/`

When changing this behavior, update both the route script and browser acceptance
coverage. Do not introduce additional persistence or accept arbitrary URL-derived
state without a task-specific contract.

## Avoid

- Do not introduce Redux, Zustand, Nanostores, or a custom event bus for route-local
  browser values.
- Do not store `scrollY` or CSS animation position in a second JavaScript model; the
  route currently derives and applies it directly.
- Do not mutate `Astro.props` or use it as a global store.
- Do not add runtime content fetching to a page whose data is already available at
  static-build time.
- Do not infer the production state design from reference-only PHP/JavaScript.

## Reference Files

- `experiments/nerv/src/pages/index.astro`
- `experiments/nerv/src/layouts/Layout.astro`
- `experiments/nerv/src/modules/nerv/components/WarningStripe.astro`
- `experiments/nerv/astro.config.mjs`
- `experiments/nerv/experiment.json`
- `prototypes/typecho-terminal/prototype.json`
