# Repository evidence for article theme infrastructure

## Existing boundaries

- `apps/site/src/lib/content-schema.mjs:71-87` defines the shared strict
  post/page front matter schema. `presentation` is the existing outer
  presentation selector and omitted values default to X Core's `firefly` ID.
  Unknown front matter keys fail through `.strict()`.
- `apps/site/src/components/DocumentPresentation.astro` is the single site
  dispatch point for `semantic` versus `firefly` Terminal documents.
- `apps/site/src/components/SemanticDocument.astro:63-73` and
  `apps/site/src/components/TerminalDocument.astro:89-97` already expose the
  rendered Markdown through one `[data-article-content]` region each.
- `apps/site/src/styles/article-content.css` is the shared article-content
  stylesheet. It uses generic article-content tokens and approved content
  selectors, not website chrome selectors. The semantic and Terminal layouts
  map their own tokens into this contract.

## Separation constraints

- `apps/site/src/lib/x-core-context.ts:40-57,100-108` intentionally projects
  only route/layout/presentation data into the X Core document context.
  `articleTheme` must remain outside that projection and outside exact `xCore`
  metadata.
- `apps/site/src/lib/site-plugins.ts:77-83` sends only route, collection, and
  presentation into site plugin build documents. Theme metadata must not leak
  into this payload.
- Canonical content keeps the full validated collection entry in
  `apps/site/src/lib/content.ts`; presentation itself is not duplicated into
  `CanonicalDocument`, so articleTheme should follow the same pattern.

## Prior decision and current scope

- Archived task `09-14-safe-markdown-html` explicitly deferred a validated
  article-theme ID, registry, stylesheet selector, and picker while creating
  the article-content boundary as the future seam.
- The current task resolves to infrastructure-only: expose optional
  `articleTheme`, default it to the sole site-owned ID `default`, emit the
  validated ID at the content boundary, and ship no alternate palette,
  selector block, picker, or browser switcher.
- Adding the field is additive for authored sources: existing Markdown omits
  it and receives the schema default; no external blog rewrite is required.

## Required evidence after implementation

- Schema tests must cover omitted/default, explicit `default`, unknown,
  malformed, unsafe, wrong-type, and strict-unknown-key inputs.
- Static output must show exactly one `data-article-theme="default"` on each
  semantic/Terminal article-content root and none on website chrome, routes,
  home templates, or comments.
- Context/integration tests must prove heading/node identities, presentation,
  and exact X Core metadata remain unchanged and contain no theme field.
- All Node/build evidence must use `./sam`; the external content workspace is
  an input mount only and the synchronizer/deployment boundary is unchanged.
