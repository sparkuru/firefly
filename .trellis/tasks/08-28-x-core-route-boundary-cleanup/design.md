# X Core and canonical-route boundary cleanup — Technical Design

## Status

Implemented after owner approval and task start. Validation evidence and the
known publication-state gate are recorded in `research/boundary-evidence.md`.

## 1. Target ownership

The dependency direction after this task is:

```text
validated Markdown
  └─> X Core document pipeline
        └─> PresentationRegistry / semantic or Terminal adapter
              └─> site render bridge

validated site entry + staged Astro file
  └─> apps/site canonical-route projection
        ├─> CanonicalDocument.href / directory model
        └─> DocumentContext.route for X Core

CanonicalDocument posts + site config
  └─> apps/site statically registered site-plugin registry
        └─> comments site extension

comments public contract ──> site / service / publication adapters
```

X Core remains framework-neutral and build-time. The route helper is site
owned because route projection depends on the site's collection and staged
content conventions; it must not be moved into `packages/x-core` merely to
share code with the Astro adapter.

## 2. X Core/plugin boundary

Remove the transitional `packages/x-core/src/plugins.ts` host and its public
export. The X Core package keeps `contracts.ts`, `registry.ts`, `pipeline.ts`,
metadata, JSON validation, and diagnostics. The generic host's publication and
service input types are not replaced by new generic interfaces.

The site retains the smallest local static registry needed by
`apps/site/src/lib/site-plugins.ts`. Its local contract should contain only:

- a site plugin identity/enable predicate;
- build-time site data loading from already prepared site input;
- post-only extension production from that build data; and
- site-local plugin data and extension result types.

The existing `commentsPlugin` remains the only statically registered site
entrypoint. Its publication and service entrypoints continue to be called by
their existing owners, not through the site registry or X Core. The manifest
can remain the ownership index; it is not a runtime discovery mechanism.

The site registry may remain in `site-plugins.ts` or be split into a narrowly
named site-local module if that improves separation. The implementation must
not recreate publication/service fields under a different name merely to
preserve the old generic shape.

## 3. Canonical-route projection

Create a pure module under `apps/site/src/lib/` with an API equivalent to:

```ts
projectCanonicalRoute({
  collection: 'posts' | 'pages',
  relativePath?: string,
  slug: string
}): string
```

The exact exported name and file extension may follow the existing mixed
TypeScript/ES-module convention, but the contract must be explicit and
testable. It accepts already validated, NFC-safe path/slug inputs and does not
read Astro state or the filesystem. A post without a relative Markdown path
fails closed; a page uses its canonical slug without inventing a physical
parent route. Whitespace-to-hyphen normalization must have one owner, either
inside this helper or in one documented precondition, and both callers must
follow that same choice.

`createCanonicalDocument()` continues to own Markdown identity validation,
directory hrefs, breadcrumbs, aliases, guest projection, and route
reservations. It passes the validated relative path and normalized route slug
to the helper for `CanonicalDocument.href`.

`resolveDocumentContext()` continues to own Astro front-matter validation and
staged-path extraction. It derives the same collection/path/slug inputs and
uses the helper for `DocumentContext.route`; its existing X Core diagnostic
wrapping remains the error boundary for malformed staged inputs.

The helper does not generate directory routes, aliases, comments protocol
routes, or deployment routes. Those remain with their current owners.

## 4. Compatibility and failure behavior

- `/pages/about/`, `/posts/ai/llm-workflow-with-trellis/`, nested directory
  routes, and readable Unicode routes remain byte-for-byte the same.
- The site continues to pass `canonical.href` into page params, Terminal
  navigation, comments route conversion, and Presentation rendering.
- X Core continues to receive a canonical route in `DocumentContext`, but no
  route projection code is added to X Core.
- Invalid helper inputs fail before a `CanonicalDocument` or
  `DocumentContext` is emitted. The Astro adapter retains its typed
  `XCORE_CONTEXT_RESOLUTION` diagnostic rather than leaking a native error.
- Removing the generic host is a private internal API cleanup. A source revert
  restores the old file/export without touching content, comments data,
  secrets, generated publication, or deployment state.

## 5. Test strategy

1. A focused pure route test exercises page, root-post, nested-post, slug
   override/normalization, Unicode, missing-post-path, and unsafe-input cases
   that the helper owns.
2. X Core package tests verify the public export no longer exposes the removed
   host and that all document/Presentation tests remain unchanged.
3. Site comments/site-plugin tests prove the local static registry still loads
   the disabled/fixture paths and emits the same post extension shape.
4. Existing site integration, content/static-output, browser, and publication
   tests prove route/output compatibility through the real Astro build.
5. The deterministic `./verify.sh` run is the final cross-layer gate.

## 6. Documentation

Update the X Core contract to remove the transitional generic-host wording and
state the site-owned static registry and app-owned route projection. Update the
comments plugin README so its ownership description no longer says that
Firefly core supplies a generic lifecycle host. Do not turn implementation
notes into a new product architecture or document private operational values.
