# M5.1 Unicode route compatibility design

## 1. Decision and invariants

The approved design keeps `CanonicalDocument.href` as the site's readable,
NFC Unicode route. Percent encoding is a comments-protocol representation and
must not leak back into the site's canonical model.

The following invariants remain unchanged:

- `apps/site/src/lib/content.ts:80-124` owns public document routes,
  breadcrumbs, aliases, and directory hrefs;
- content paths continue to reject percent signs and unsafe path syntax;
- `plugins/comments/config.mjs:195-237` remains the owner of the canonical
  comments-route grammar;
- exported comments and service submissions use uppercase UTF-8 percent
  encoding;
- the comments result map consumed by the site remains keyed by raw
  `CanonicalDocument.href`;
- tracked comments activation remains disabled.

No route redirect, SEO migration, content migration, style change, runtime
deployment, or data migration is required.

## 2. Boundary contract

Add one shared pure conversion function to the comments contract module:

```ts
commentsPostPathFromSiteHref(value: unknown): string | null
```

Input contract:

- an NFC site post href in `/posts/<segment>/` form;
- at least one non-empty segment;
- a leading and trailing slash;
- no percent escapes, query, fragment, backslash, doubled slash, whitespace,
  traversal, dot-prefixed segment, control/format character, or unsupported
  ASCII punctuation.

Output contract:

- each non-ASCII code point is encoded as its UTF-8 bytes using uppercase
  `%HH` escapes;
- the comments route validator accepts the complete output;
- safe ASCII routes are byte-for-byte unchanged;
- invalid or unrepresentable input returns `null`.

The function must reuse the existing segment encoder and final
`isCanonicalCommentsPostRoute` grammar in `plugins/comments/config.mjs`; the
site must not implement a second private route grammar. Add its declaration to
`plugins/comments/config.d.mts` and re-export it from the site comments adapter
where needed.

## 3. Build-time data flow

```text
CanonicalDocument.href (raw Unicode)
  -> commentsPostPathFromSiteHref
  -> canonical comments postPath (encoded)
  -> public export lookup
  -> comments grouped under the original raw href
  -> post plugin extension
       - comments: published records
       - postPath: encoded comments protocol route
  -> CommentSection
  -> top-level and reply CommentForm hidden postPath
```

`loadCommentsForPosts` currently compares `comment.postPath` directly with raw
site hrefs at `apps/site/src/lib/comments.mjs:192-206`. Replace that comparison
with a lookup built once from all public posts:

```text
encoded comments postPath -> raw canonical site href
```

Initialization must fail closed if a public post href cannot be converted or
if two raw hrefs map to the same encoded comments route. An exported route that
has no matching public post continues to fail the build as stale/non-public.
The returned map remains keyed by raw href so existing site consumers do not
change identity.

The comments post extension currently forwards `context.document.route`
directly at `apps/site/src/lib/site-plugins.ts:63-69`. It must instead obtain
the encoded comments `postPath` through the same shared converter. The
extension still looks up its comments by raw document route. Existing
`CommentSection.astro:78-99` and `CommentForm.astro:15-19` propagation can then
remain unchanged: both top-level and reply forms receive the encoded protocol
value.

## 4. Failure behavior

| Input or state | Required result |
| --- | --- |
| Safe ASCII post href | unchanged comments `postPath` |
| NFC Unicode post href | uppercase UTF-8 percent-encoded `postPath` |
| Already encoded site href | reject; site hrefs may not contain `%` |
| Query, fragment, doubled slash, traversal, unsafe delimiter, whitespace, control, or non-NFC input | reject conversion |
| Two public hrefs produce one comments route | fail build before grouping |
| Export route is canonical but absent from public posts | retain existing stale-route build failure |
| Comments disabled | no comment surface; existing disabled behavior remains |

Errors may include the rejected public route because repository content paths
are public build inputs, but must not include export contents, configuration
values, credentials, or operator-specific paths.

## 5. Validation design

### Pure and integration tests

- Extend the shared/site comments tests with an explicit raw Unicode href and
  expected encoded route.
- Cover ASCII identity plus malformed escapes, encoded input, traversal,
  delimiters, whitespace, control/format characters, non-NFC text, and unsafe
  punctuation.
- Use a sanitized export fixture to prove an encoded Unicode comment groups
  under the raw Unicode site href.
- Preserve stale-route and empty-group assertions.
- Assert plugin/static output contains the published comment and that every
  top-level/reply hidden `postPath` uses the encoded route.

### Browser validation

Classification: `playwright-required`. The affected surface is a published
comment plus a form payload, and both can be exercised locally without a live
comments service.

Create the smallest deterministic, repository-local test projection containing
a synthetic Unicode post, a sanitized public comments export, and non-secret
comments-enabled test configuration. The projection must live under an ignored
test/artifact path, use the existing configurable content root and config
resolution boundaries, and clean up only files it owns. It must not read,
replace, or mutate the ignored owner configuration.

Build first, then run the existing static Chromium Playwright boundary through
`./sam` at desktop `1440x900` and mobile `375x812`. The focused assertions are:

- the Unicode post route is reachable while the site's canonical href model
  remains readable Unicode;
- the synthetic published comment is visible;
- the top-level and reply forms preserve their labels and contain the expected
  encoded hidden `postPath`;
- no horizontal overflow or client-side service dependency is introduced.

The test must not submit the form or contact a remote endpoint. Reports,
screenshots, and traces follow the existing ignored Playwright locations.

## 6. UI/UX scope

The task-specific UUPM research is retained in
`research/ui-ux-pro-max.md`. Its generated palette, typography, subscription
layout, and CTA advice are intentionally rejected because this task is not a
redesign. Approved UI constraints are limited to preserving current appearance,
semantic labels, keyboard/focus behavior, responsive containment, and the
readable public route.

Loading, error, disabled, success, animation, color, typography, and touch
target behavior do not change. Existing tests remain the source of truth for
those states.

## 7. Compatibility, rollback, and residual risk

The change is backward-compatible for ASCII routes and additive for Unicode
routes. No stored comment or route-catalog migration is needed because those
already use the encoded representation.

Rollback is a source/test revert: remove the converter, restore direct grouping
and extension routing, and remove the synthetic fixtures. There is no runtime
or data rollback.

The main residual risk is divergence between the site's raw-route grammar and
the comments grammar. Keeping conversion and final validation in the shared
comments contract, plus fail-closed edge tests, contains that risk. Any newly
discovered public href that cannot be represented must fail the enabled build
rather than being silently omitted.
