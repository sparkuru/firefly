# Terminal document identity design

## Boundary

The change stays in the main-site Terminal presentation and its frontend
contracts:

- `apps/site/src/components/DocumentPresentation.astro`
- `apps/site/src/pages/posts/[...path].astro`
- `apps/site/src/components/TerminalDocument.astro`
- focused main-site static/browser assertions
- the affected `.trellis/spec/frontend/` wording

No Terminal package resolver, canonical route generator, content materializer,
Markdown source, comments plugin, or publication pipeline changes.

## Path namespaces

Three path namespaces remain explicit and must not be conflated:

| Boundary | Example | Owner |
| --- | --- | --- |
| Visible Terminal shell path | `~/blog/posts/infra/cloudflare-web-service.md` | site Terminal chrome |
| Internal VFS path | `/posts/infra/cloudflare-web-service.md` | Terminal runtime/index |
| Canonical web URL | `/posts/infra/cloudflare-web-service/` | Astro route model |

The visible shell path is the only form shown as a document title-bar identity.
The internal VFS path remains available to runtime contracts and the canonical
web URL remains a trailing-slash browser route.

## Rendering decision

- Keep the Terminal title bar as the single visual source-path display for a
  document and pass it the `~/blog/`-prefixed canonical virtual path.
- Remove the body `.terminal-path` paragraph from `TerminalDocument.astro` so
  the article header begins with the visible title. Keep the publication date,
  outline, reader status, and rendered content unchanged.
- Apply the same `~/blog/` prefix to nested directory title-bar paths, closing
  the same construction error for directory routes.
- Do not add a new visual treatment, animation, icon, or interaction. The
  existing dark Terminal palette, JetBrains Mono typography, responsive
  containment, focus behavior, and reduced-motion behavior remain the design
  baseline.

## Accessibility and responsive behavior

- The title bar remains decorative (`aria-hidden`) as it is today; the document
  keeps one visible programmatic `h1` and its existing native semantic content.
- Removing one non-interactive paragraph reduces duplicate information and
  shifts the existing header upward without changing focus targets or keyboard
  order.
- Existing desktop `1440x900` and mobile `375x812` no-overflow assertions remain
  required. Long paths continue to use the existing title-bar containment rules.

## UUPM decisions carried forward

The task research confirms the existing content-first Terminal direction:
monospace typography, dark phosphor/success-green contrast, rational spacing,
minimal decoration, and restrained motion. This task only removes redundant
identity text and corrects its namespace; it does not introduce the research's
generic newsletter pattern or new design tokens.
