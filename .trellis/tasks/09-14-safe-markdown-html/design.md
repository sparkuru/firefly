# Safe embedded Markdown HTML — Technical Design

## Status

Planning. The owner approved the current scope: implement a reusable
article-content component layer now, while deferring independently selectable
article themes.

## 1. Ownership and data flow

The external blog remains an input workspace. `tooling/sync-server` keeps its
existing build-before-upload boundary and does not gain HTML policy logic.
`apps/site` owns the authored-HTML policy because the allowed tags, classes,
URLs, and stylesheet contract are site presentation concerns. X Core keeps
framework-neutral document invariants and the final transform safety check.

The relevant build path becomes:

```text
authored Markdown
  │
  ├─ remark/X Core analysis (explicit authored-HTML opt-in)
  │
  ├─ remark-rehype with dangerous-HTML bridge enabled
  │
  ├─ rehype-raw                         # raw HAST → parsed elements
  │
  ├─ site-owned rehype-sanitize schema  # allowlist and URL policy
  │
  ├─ X Core rehype stage                # headings/node IDs, adapter, xCore
  │
  └─ Astro render output
```

Parsing and sanitization must run before X Core's rehype stage. Consequently,
headings and node identities are assigned against the sanitized tree, and no
unparsed raw node is visible to a presentation adapter.

## 2. X Core opt-in boundary

Extend `createXCorePlugins()` with an optional `allowAuthoredHtml` flag whose
default is `false`.

- The default keeps the framework-neutral package's current fail-closed
  behavior: a host that has not installed an HTML policy still receives
  `XCORE_RAW_HTML` for authored Markdown HTML.
- `apps/site` sets the flag only together with its `rehypeRaw` and sanitizer
  stages. The flag permits the MDAST HTML nodes to continue through the
  conversion bridge; it does not itself parse, sanitize, or render HTML.
- The final `assertSafeTransformTree()` raw-HAST guard remains unchanged. If a
  host opts in but fails to parse the raw node before the presentation stage,
  the build still fails with `XCORE_INVALID_TRANSFORM` rather than emitting
  raw HTML.

This keeps the safety decision explicit at each host and avoids making a
site-specific sanitizer dependency part of the framework-neutral X Core
package. The X Core contract will describe the host responsibility and the
opt-in signature.

## 3. Site-owned HTML policy

Add direct, locked site dependencies for `rehype-raw` and `rehype-sanitize`.
`rehype-raw` is already present transitively through Astro, but declaring the
dependency directly makes this pipeline contract stable rather than relying
on Astro's dependency graph.

Create a narrowly named site policy module that exports the sanitizer schema
and the documented content-class vocabulary. The schema is an explicit
allowlist based on the sanitizer's safe schema primitives, with additions only
for the content elements the site intends to support. The initial surface is
structural and presentation-neutral HTML such as containers, inline semantic
elements, lists, tables, figures, code-related elements, and safe media/link
attributes. Interactive embedding and browser document primitives such as
`script`, `style`, `iframe`, `object`, `embed`, forms, and `srcdoc` are not
allowed.

The policy must enforce all of the following:

- `<style>` and every authored `style="..."` attribute are absent from the
  output. Inline CSS is deliberately deferred to a separate, restricted CSS
  policy.
- Event-handler attributes (`on*`), `srcdoc`, executable/document embedding
  attributes, and equivalent browser-control attributes are absent.
- Link and resource URL attributes accept only the explicitly supported
  relative, `http`, and `https` forms. `javascript:`, `data:`, `vbscript:`,
  protocol-relative, and other unsafe forms are rejected by the schema.
- `class` is limited to the documented site-owned `firefly-content-*` values;
  arbitrary author CSS hooks do not become part of the contract.
- Unsupported elements/attributes are removed from the emitted tree by the
  sanitizer. They are rejected from the published HTML rather than allowed to
  reach the browser; the initial policy does not turn every unsupported
  authoring detail into a whole-site build failure.

`<center>` is retained as a narrow compatibility exception for the existing
external article. New authored components use semantic elements and approved
classes, especially `firefly-content-center`, rather than adding new legacy
tags.

The Astro processor must register the stages in this order:

```js
rehypePlugins: [
  rehypeRaw,
  [rehypeSanitize, markdownHtmlSchema],
  xCorePlugins.rehypePlugin
],
remarkRehype: { allowDangerousHtml: true }
```

The exact schema declaration may use the installed package's typed schema
shape, but the implementation must not widen the policy merely to make a
fixture pass. Integration tests will exercise allowed structure, the existing
`<center>` source, scripts/event handlers/unsafe URLs, and inline CSS.

## 4. Article-content boundary and styling

The two document components add one stable attribute to the rendered body
container:

```html
<div data-article-content>…rendered Markdown…</div>
```

The boundary is intentionally on the content region, not on the whole page
article. Website headers, outlines, comments, reader controls, navigation,
and the Terminal shell remain outside the authored HTML styling surface.

Add a shared `article-content.css` module. Semantic pages include it through
the existing global stylesheet bundle; Terminal pages inject the same source
alongside their existing inline terminal stylesheet. This preserves the
current static asset shape while giving the content layer one source of truth.

The stylesheet selects only `[data-article-content]` and approved semantic
classes. It must not select `.site-*`, `.terminal-*`, `.prose`, or
`.terminal-prose`. The first documented class components are:

- `firefly-content-callout`: a readable bordered/surfaced block;
- `firefly-content-center`: a centered block/inline-content utility used by
  new authors, with the legacy `<center>` compatibility style kept separate.

The shared stylesheet consumes a small generic article-content token contract.
The semantic and Terminal presentation styles map their existing light/dark
tokens to that generic contract; the shared content stylesheet never refers
to presentation-specific token names. This makes the current website theme
and article content style layers distinct while keeping both presentations
readable.

The boundary is also the future extension seam. A later implementation may
add a validated `data-article-theme` value and theme-specific overrides on
this content root. It will not need to change Markdown HTML syntax, move the
sanitizer, or reuse the website `presentation` field. This task does not add
that attribute, a theme field, a registry, stylesheet selection, or a picker.

## 5. Metadata and compatibility behavior

After sanitization, X Core assigns heading IDs and node IDs to the resulting
tree, runs the selected semantic or Terminal adapter, validates identity, and
publishes the same exact `xCore` metadata shape. The synchronizer's routes,
upload, staging, and promotion behavior remain unchanged.

The current missing-`xCore` secondary error is not treated as a new metadata
fallback. Once the authored HTML is accepted or safely removed before the
X Core rehype stage, `publishMetadata()` completes normally and the render
bridge receives its usual metadata. Any future render failure must still
surface the original typed error rather than being masked by a separate
metadata assertion.

## 6. Test strategy

1. X Core package tests keep the default raw-MDAST rejection, cover the new
   opt-in contract, and retain the final raw-HAST transform guard.
2. Site integration tests run the real Astro Markdown processor with the
   policy stages. They verify a `div` with an approved class, legacy
   `<center>`, stable heading/node IDs, valid `xCore`, removal of scripts,
   event handlers, unsafe URLs, `<style>`, and `style` attributes.
3. The same allowed content is rendered through both production adapters so
   the content class and metadata survive presentation selection unchanged.
4. Existing raw-HTML negative assertions are changed only where the site has
   deliberately opted in; unrelated route, metadata, and transform negatives
   remain negative.
5. Layout/static checks verify both document presentations expose
   `data-article-content` and load the shared component styles. The external
   target article is built through the Node 22 `./sam` path.

## 7. Risks, rollout, and rollback

- Sanitization can remove an author element or attribute that is not yet in
  the allowlist. Additions must be narrow, tested, and documented; do not
  solve this by allowing arbitrary HTML or CSS.
- Enabling the dangerous-HTML bridge without the raw parser would expose a
  failing configuration, not a successful output: the final X Core guard is
  the rollback-safe backstop. Keep the processor order covered by an
  integration test.
- Adding a shared CSS file can accidentally couple component styles to site
  chrome. The boundary selector and generic token assertions should catch
  this during review.
- Rollback is a source revert of the site policy, X Core opt-in, processor,
  layout, style, test, dependency, and spec changes. It does not modify the
  external blog source, generated content, remote staging, or publication
  state.
