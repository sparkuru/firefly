# Support safe embedded HTML in Markdown

## Goal

Allow the external Firefly blog workspace to use selected HTML embedded in
Markdown while preserving the static site's X Core metadata, presentation
transforms, and build-time safety guarantees.

The immediate user-visible outcome is that existing content such as
`<center>...</center>` no longer causes the document build to fail with a
misleading missing-`xCore` error, while dangerous HTML remains unavailable by
default.

## Background and confirmed facts

- `tooling/sync-server/sync-server.sh:9` selects the external blog workspace by
  default, and `:204-206` passes it to the full `./sam npm run build:m4` build.
- The failing document is
  `posts/infra/connect-to-windows-via-terminal.md` in the configured blog
  workspace.
  It contains six `<center>...</center>` author-HTML headings at source lines
  89, 131, 157, 163, 195, and 199.
- `packages/x-core/src/pipeline.ts:179-185` currently rejects every Markdown
  `html` node as `XCORE_RAW_HTML`.
- `apps/site/astro.config.mjs:26-31` explicitly sets
  `remarkRehype.allowDangerousHtml` to `false`.
- `packages/x-core/src/pipeline.ts:329-336` rejects raw HAST nodes that reach
  the presentation boundary.
- `apps/site/src/lib/render-document.ts:53-59` parses
  `rendered.remarkPluginFrontmatter.xCore`; when the content render does not
  expose metadata after the HTML failure, the secondary error is reported as
  `XCORE_UNSAFE_JSON` with `received undefined`.
- The Astro dependency tree already contains `rehype-raw`; `rehype-sanitize`
  is not currently installed as a direct or transitive dependency.
- The repository's current behavior and frontend contract intentionally treat
  authored raw HTML as unsupported, so the contract and negative tests must be
  updated together with the implementation.
- The two current document presentations expose separate content containers:
  `SemanticDocument.astro` renders `.prose` and `TerminalDocument.astro`
  renders `.terminal-prose`; their outer layouts load separate website styles.
  This is enough to host a shared article-content boundary, but not a complete
  independently selectable article-theme system.

## Requirements

1. Support an explicit, site-owned allowlist of embedded HTML in Markdown.
2. Parse and sanitize embedded HTML before X Core assigns heading/node
   identities and publishes `xCore` metadata.
3. Keep X Core's final raw-HAST guard as a fail-safe; no unparsed raw HTML node
   may reach a presentation adapter or the renderer.
4. Keep dangerous executable behavior disabled by default, including scripts,
   event-handler attributes, unsafe URL protocols, and other equivalent XSS
   paths.
5. Preserve existing Markdown output, heading metadata, presentation adapter
   behavior, static routes, and `tooling/sync-server`'s build/deploy boundary.
6. Provide clear build/test coverage for allowed HTML, rejected or removed
   dangerous HTML, existing `<center>` content, and X Core metadata integrity.
7. Keep the policy compatible with the external blog workspace and usable by
   future Markdown authors without requiring per-article code changes.
8. Reuse the existing site styling surface for author-facing HTML classes:
   semantic pages use the `:root` tokens in `apps/site/src/styles/global.css`,
   while Terminal pages use the `data-terminal-theme="firefly"` token block in
   `apps/site/src/styles/terminal.css`. Do not introduce a general theme
   registry, theme picker, or second shipped theme as part of this task.
9. Keep article-content styling decoupled from website chrome and presentation
   selectors. Author-facing classes must be scoped to the rendered article
   content boundary and must not depend on `.site-*`, `.terminal-*`, or other
   layout implementation classes. A shared article-content stylesheet/token
   contract may be consumed by both existing presentations.
10. Leave a stable extension seam for a future independently selectable
    article-theme system without implementing that larger product surface in
    this task. The HTML sanitizer/class vocabulary, article-content boundary,
    and website `presentation` selection must remain separate concepts.

## Acceptance Criteria

- [x] The target external blog article builds successfully through the
  repository's Node 22 `./sam` environment.
- [x] A Markdown fixture containing allowlisted structural HTML is rendered as
  real HTML, and its surrounding headings/node identities and `xCore` metadata
  remain valid.
- [x] HTML outside the configured safety policy cannot introduce executable
  script, event-handler, unsafe-protocol, or equivalent browser behavior.
- [x] The X Core and site content tests cover the new policy and no longer
  assert that every raw HTML node is categorically invalid.
- [x] The normal site/content checks and the relevant build path pass without
  modifying the remote server.
- [x] No change is required to the synchronizer's upload/promotion protocol;
  failed builds still stop before remote staging or promotion.
- [x] An allowed `div class` content example is styled through the existing
  site CSS/presentation boundary, with readable behavior in both the semantic
  and Terminal presentations where both render the document, without selecting
  or depending on website chrome styles.
- [x] The design clearly distinguishes the website theme/presentation (outer
  layout, navigation, shell, and global tokens) from article content styling
  (Markdown HTML components and their scoped classes).
- [x] A future validated article-theme ID could be added at the article
  boundary without changing Markdown HTML syntax, the sanitizer pipeline, or
  the website presentation contract. The current task does not add a theme
  registry, selector, picker, or per-article frontmatter theme field.
- [x] The current article-content layer does not hard-code presentation or
  website-chrome selectors. It uses a stable content-component namespace and
  boundary so a later article-theme implementation can add a validated theme
  selector and overrides without moving the HTML sanitizer or rewriting
  authored Markdown.

## Resolved decisions

- The initial allowlist rejects both inline `style="..."` and
  `<style>...</style>`. Authors use approved class names with site-owned CSS;
  a future restricted CSS-property policy can be considered separately.

## Resolved scope

- This task implements the reusable article-content layer now: a stable
  rendered article-content boundary and a documented, namespaced
  `firefly-content-*` class vocabulary that both existing presentations can
  consume.
- Independently selectable whole-article skins are deferred. A per-article
  theme ID, theme registry, stylesheet loading system, picker, and multiple
  shipped article themes are not part of this task. The future extension point
  is the article-content boundary, so adding that system later remains
  additive rather than requiring a Markdown or sanitizer redesign.
