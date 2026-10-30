# Firefly Display Blocks Contract

## 1. Scope / Trigger

Use this contract when changing `firefly` fenced blocks, their Markdown/YAML
parsing, article media publication, composition CSS, or document navigation.
It extends the [Content Workspace](./content-workspace-contract.md) and
[X Core](./x-core-contract.md) contracts for posts/pages. Memo's existing
Markdown and independent asset behavior remain separate.

## 2. Signatures

Site-owned modules under `apps/site/src/build/` expose:

```js
parseFireflyBlock(source, { documentPath, line } = {})
collectFireflyBlocks(markdown, { documentPath } = {}) // Promise<[{ block, line, ordinal, resources }]>
createFireflyBlockPlugins({ resolveMedia, resolveContext } = {}) // { remarkPlugin, rehypePlugin }
stageFireflyMedia({ sourceRoot, targetRoot, inventory })
resolveFireflyMedia({ src, file, stageRoot })
fireflyMediaReferences(html) // Set of content-addressed filenames
publishFireflyAssets(output, stageRoot)
createFireflyAssetsIntegration({ stageRoot } = {})
```

The author-facing vocabulary and examples live in `docs/firefly-blocks.md`.
The complete local-media demonstration is
`content/posts/firefly-playground/index.md`, with sibling `assets/` and public
route `/posts/firefly-playground/showcase/` when building the tracked workspace.

## 3. Contracts

- A genuine Markdown fence with language `firefly` contains a strict YAML map.
  Supported types are `image`, `link`, `video`, `audio`, and `composition`.
  Composition requires `layout` (`image-left`, `image-right`, or `image-top`),
  an image `media` mapping, and Markdown `content`. `alt` and `caption` are
  distinct; absent/empty `alt` produces an empty image alternative. Other
  Markdown readers retain the source as a code block.
- Expand semantic Markdown before X Core remark analysis. Run `rehypeRaw` and
  the authored HTML sanitizer before the trusted block renderer, and render
  blocks before X Core rehype identities/outline and Astro heading collection.
  Each per-file marker is unpredictable, authenticated, consumed once and
  absent from final output. Author HTML cannot manufacture a trusted marker,
  bypass sanitization or introduce raw HAST. The same valid document renders
  deterministically despite transient marker values. The first prose paragraph,
  not the composition image's alt text, supplies an opening summary.
- Composition content retains headings, paragraphs, normal links, outer image
  reference definitions, and safe nested Markdown images; nested `firefly`
  blocks are rejected. Generated native audio/video uses controls, no autoplay,
  `preload="none"`, and a separate accessible resource link. Link cards work
  without a remote metadata request. URLs must be safe and malformed percent
  encodings fail before Astro image collection.
- Resolve local media relative to the logical authored document path, with
  `.fireflyignore` applied to the referenced media. Document-directory link
  semantics, safe names, collection containment and race checks remain
  enforced; linked/non-regular media files and changed source directories are
  rejected. Reference staging is part of the existing atomic candidate
  promotion. Supported local extensions are the image/audio/video vocabulary in
  `firefly-assets.mjs`; remote HTTP(S) and site-root URLs remain references.
  The initial implementation preserves original bytes rather than generating
  responsive variants; lazy loading and known dimensions do not reduce the
  download/decode cost of an oversized source image.
- Stage referenced **guest-visible** media in `.generated-content/.firefly-media/`
  with the guest-only manifest `.generated-content/.firefly-media.json`. Publish
  exactly the staged bytes actually referenced by public HTML, including inert
  templates, at `/firefly-media/<sha256>.<extension>`. Private, draft, ignored,
  withdrawn and orphaned inputs must not appear in output or dev responses.
  Development middleware restricts access to the guest manifest and supports
  GET/HEAD and byte ranges. Media paths and diagnostics never expose host paths.
- Post/page loader digests include the guest media manifest, so replacing media
  bytes without changing Markdown rerenders the hashed URLs on warm builds.
  Original source bytes and Memo loader behavior remain unchanged.
- Build hook imports must be available before Vite closes its module runner;
  use static imports for dependencies needed by `astro:build:done`.
- Nginx allows HTTP(S) `img-src` and `media-src` on the homepage and ordinary
  post/page routes, including the homepage's `/index.html` internal redirect.
  API, lab and retained independent Memo routes retain their earlier policies.
  HTTPS browsers may still block mixed-content HTTP media independently of CSP.
- The assembled-publication preview server serves the supported image/audio/video
  MIME types and single GET byte ranges, including suffix ranges and 416 for
  unsatisfiable requests. HEAD returns the full representation headers without
  a body; unvalidated If-Range requests receive the full representation.
- Layout uses a scoped composition formatting context and CSS floats; prose
  wraps beside the figure, resumes full width under it, and does not affect the
  next block. Narrow screens stack image then prose. The same static body is
  readable without JavaScript in both presentations and themes; Terminal home
  inline streams share the article-content styling boundary.
- The navigator includes direct semantic prose nodes and list items within a
  composition, its caption, and textual standalone blocks in document order,
  without selecting the containing composition as a duplicate unit. Native
  links and media controls remain protected from navigation key handling.

## 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| Invalid YAML, duplicate key, unknown field/type/layout, unsupported alias or nested block | Fail with `[FIREFLY_BLOCK]`, virtual document path and fence line when available. |
| Unsafe/malformed URL or missing/ignored/escaping local asset | Fail with a virtual-document diagnostic; never publish arbitrary host files. |
| Private/draft media or source unused by public HTML | No public media output or successful development response. |
| Public HTML refers to media absent from the guest manifest | Publication fails instead of copying an unapproved file. |
| Remote metadata unavailable or media fails in browser | Keep the link/reader-visible resource entry and surrounding prose. |
| Firefly-looking text inside another code fence or raw HTML | Preserve as ordinary content, not a validated display block. |
| Rebuild after an asset is withdrawn | Withdraw its staged/public bytes without retaining stale output. |

## 5. Good / Base / Bad Cases

- Good: a public `posts/notes/article.md` uses `./assets/picture.png`; the
  build publishes the referenced bytes by hash and both canonical and Terminal
  reading surfaces use the same generated URL.
- Base: ordinary Markdown and Mermaid have no Firefly blocks and keep existing
  parsing, public routes, code highlighting, and asset dependencies.
- Bad: copy every file under an author workspace into `dist`, authorize a
  draft's media merely because it was staged, accept raw `<video>` as trusted
  generated markup, or run browser-side Markdown to display prose.

## 6. Tests Required

- `apps/site/tests/firefly-blocks.test.mjs`: exact schema/errors, nested Markdown,
  summary and heading identities, safe authored HTML, reference definitions,
  deterministic output and frontmatter cases.
- `apps/site/tests/firefly-assets.test.mjs`: logical paths, containment,
  guest-only manifest, ignored/private/draft/withdrawn resources, link races,
  exact template/HTML references, byte ranges and a real Astro build hook.
- `apps/site/tests/content-build-positive.test.mjs` and
  `static-output.test.mjs`: actual public/private build, source bytes, exact
  media inventory and public HTML reference closure.
- `apps/site/tests/firefly-display.spec.ts`: Chromium and Firefox desktop/mobile,
  JS enabled/disabled, both presentations/themes, actual wrap geometry,
  standalone media and navigation/search.
- `apps/site/tests/firefly-media.spec.ts`: actual audio/video playback, GIF
  decoding, failed media fallback, delayed/failed images with rapid scrolling,
  Terminal inline reading and touch-home search. Synthetic local fixtures
  supply media bytes without depending on a third-party service. Run the normal wrapped build and
  full verification gates from `development-runtime.md`.

## 7. Wrong vs Correct

Wrong: render the YAML fence as raw HTML, publish every nearby file, then use a
scroll handler to reveal the body when it becomes visible.

Correct: validate the declaration, preserve semantic Markdown through X Core,
publish only guest-visible references, and emit native HTML/CSS at build time.
