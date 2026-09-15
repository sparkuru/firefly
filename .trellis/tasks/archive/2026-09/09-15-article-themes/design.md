# Article theme infrastructure — Technical Design

## Status

Implementation complete and ready for archive. The owner selected the
infrastructure-only scope: expose an optional `articleTheme` front matter field
with the sole current value
`default`, but do not ship an alternate visual skin.

## 1. Ownership and data flow

`apps/site` owns the article-theme contract. The theme is content metadata and
is consumed only at the rendered Markdown boundary. X Core continues to own
document analysis, presentation selection, stable identities, and exact
`xCore` metadata; the Terminal and semantic presentation packages remain
unaware of article themes.

The data flow is:

```text
authored Markdown front matter
  │
  ├─ Astro content schema: optional articleTheme
  │       └─ omitted → "default"
  │       └─ only registered IDs accepted
  │
  ├─ PublicDocumentEntry.data.articleTheme
  │
  ├─ DocumentPresentation resolves the site-owned ID
  │
  └─ SemanticDocument / TerminalDocument
          └─ [data-article-content][data-article-theme="default"]
```

The existing `CanonicalDocument` shape remains unchanged: it already carries
the full validated collection entry, and article theme metadata should not be
duplicated into a second projection field. The materializer, route model,
access projection, comments plugin, and synchronizer remain unchanged.

## 2. Site-owned registry contract

Add a small module such as `apps/site/src/lib/article-theme.mjs` with a static,
site-owned registry:

```js
DEFAULT_ARTICLE_THEME_ID = 'default'
ARTICLE_THEME_IDS = ['default']
isArticleThemeId(value) → boolean
resolveArticleThemeId(value) → 'default'
```

The actual exports may use frozen descriptors rather than the shorthand above,
but the first release must keep the registry ID-only. It must not accept or
return authored CSS selectors, stylesheet URLs, class names, HTML, executable
configuration, or arbitrary token maps. A later theme task may add a new
statically implemented ID and scoped CSS while keeping the resolver contract.

`resolveArticleThemeId(undefined)` returns `default`; malformed or unknown
values throw a site-owned validation error at the rendering boundary. The
content schema uses the same registry predicate, so normal Astro builds fail
closed before rendering. This duplicate boundary check is intentional defense
against a component being exercised with an unvalidated fixture.

## 3. Front matter and compatibility

Extend the shared post/page schema with:

```yaml
articleTheme: default
```

The field is optional and defaults to `default`. Existing authored content is
not rewritten. Explicit `default` is accepted; another ID, an unsafe path-like
value, an object, or an unknown key is rejected by the strict schema. The
future addition of an alternate theme is then additive to the registry and
theme styles rather than a Markdown or sanitizer change.

The authoring helper `apps/site/scripts/blog-meta.mjs` retains the optional
field when normalizing a document, so save-as/write-back cannot silently drop
an authored theme value. The existing `presentation` field remains the only
selector for the outer semantic/Terminal presentation. `articleTheme` must not
enter
`resolveDocumentContext`, the X Core document context, `xCore` metadata, site
plugin build documents, Terminal home data, routes, or canonical identity.

## 4. Rendered boundary

`DocumentPresentation.astro` resolves the validated entry value and passes the
result to both document components. Each component emits the attribute on the
existing content region:

```html
<div
  class="prose"
  data-article-content
  data-article-theme="default"
>
  …rendered Markdown…
</div>
```

The Terminal variant keeps its current `class="terminal-prose"` and adds the
same article-theme attribute. Headers, outlines, comments, reader controls,
Terminal chrome, and the outer `data-terminal-theme` stay outside this scope.

No theme attribute is emitted on the website root, document article, route
links, home templates, or arbitrary authored HTML nodes. Astro's escaped
attribute rendering is not the policy boundary; the registry and schema are.

## 5. CSS and future extension seam

The current `article-content.css` remains visually unchanged. Its existing
generic token mapping continues to serve both presentations. The new
`data-article-theme` attribute is a stable selector seam for a future task;
this task does not add a second selector block or new palette.

Future theme rules must use a static, scoped form such as:

```css
[data-article-content][data-article-theme='future-id'] { … }
```

They must not dynamically load author-provided styles, interpolate the ID into
an arbitrary selector, target `.site-*`/`.terminal-*` chrome, or reuse the
website `presentation` field. The default output must remain equivalent to the
current output apart from the validated boundary attribute.

## 6. Test strategy

1. Add a focused registry/schema test for the default, explicit default,
   unknown, malformed, unsafe, and wrong-type values. Confirm strict unknown
   front matter remains rejected.
2. Verify the authoring helper preserves `articleTheme` while normalizing
   front matter.
3. Extend X Core context/integration assertions to prove article theme is not
   copied into the context or `xCore` metadata, while presentation and heading
   identity remain unchanged.
4. Extend static-output assertions for both semantic and Terminal document
   routes: exactly one `data-article-theme="default"` appears on the
   article-content root, and no outer website/home surface receives it.
5. Keep the current article-content CSS selector contract and assert that no
   alternate theme selector or website-chrome coupling is introduced.
6. Run the repository's `./sam` package, site, cross-package, and external
   workspace build gates. No browser-side theme behavior is required because
   this release intentionally has no visible alternate skin; existing static
   document/a11y checks remain the relevant regression surface.

## 7. Compatibility, risks, and rollback

- Omitted `articleTheme` defaults to `default`, so existing Markdown and the
  external workspace remain compatible.
- The public field name and `default` ID become stable content contracts. A
  later task should add IDs only with an explicit visual and compatibility
  review.
- The main risks are accidentally coupling the field to `presentation`,
  leaking it into X Core/plugin data, or allowing an arbitrary value to become
  a CSS selector. Static registry membership, exact boundary assertions, and
  context/metadata tests address these risks.
- Rollback is a source revert of the site registry, schema, boundary prop,
  tests, and spec updates. It does not modify authored Markdown, generated
  content, remote staging, or publication state.
