# Repository evidence for safe embedded Markdown HTML

## Observed failure

- `tooling/sync-server/sync-server.sh` passes the configured external blog root
  to `./sam npm run build:m4` before any SSH staging or promotion. The remote
  protocol is therefore outside the failure's cause and scope.
- The external article
  `posts/infra/connect-to-windows-via-terminal.md` contains six legacy
  `<center>` elements inside Markdown headings.
- `apps/site/astro.config.mjs` currently sets
  `remarkRehype.allowDangerousHtml` to `false` and registers only the X Core
  rehype plugin.
- `packages/x-core/src/pipeline.ts` currently rejects MDAST `html` nodes during
  remark analysis. Its later transform check rejects HAST `raw` nodes.
- `apps/site/src/lib/render-document.ts` parses the metadata after rendering;
  when the earlier content error prevents metadata publication, this produces
  the secondary `XCORE_UNSAFE_JSON`/undefined message seen in the build log.

## Relevant current boundaries

- The site already has two presentation-owned content containers: `.prose` in
  `SemanticDocument.astro` and `.terminal-prose` in `TerminalDocument.astro`.
- Semantic website styles are linked from `global.css`; Terminal website styles
  are injected from `terminal.css`. The two layouts do not share an article
  content boundary or a general article-theme registry today.
- The generated-content materializer copies external Markdown into the Astro
  stage and does not rewrite authored HTML. Existing source identity, routes,
  and the sync build/deploy order must remain unchanged.

## Decision captured by this task

- Site-owned parsing/sanitization runs before the X Core rehype stage.
- X Core receives a default-off authored-HTML opt-in so other hosts retain the
  old raw-MDAST rejection; the final raw-HAST guard remains mandatory.
- The initial policy omits `<style>`, `style`, scripts, event handlers,
  unsafe URL protocols, and browser embedding controls. Unsupported content is
  removed from emitted HTML by the sanitizer.
- The current article layer uses a stable `data-article-content` boundary and
  namespaced `firefly-content-*` classes shared by both presentations. A
  per-article theme field/registry/selector/picker is deferred.

## Verification constraints

- Node and browser evidence must run through the repository's `./sam` wrapper;
  host Node/npm runs are not validation evidence.
- The affected gates are the X Core package check/test, site X Core/content
  tests and Astro check/build, then the relevant cross-layer `check:m4`,
  `test:m4`, and external-workspace build path.
