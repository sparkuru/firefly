# Composition and disabled document navigator mode

## Goal

Implement the foundation of the approved document-navigation composition: each
registered presentation independently resolves an enabled navigator or a fully
disabled `none` capability, and Terminal document opening follows the destination
capability.

## Dependency and scope

This child depends only on the approved parent design and is the first execution
child. B and C depend on this child for document rendering boundaries; D depends
on its destination capability transport. The parent remains responsible for final
matrix/publication integration. R5/AC8 is a gate here: enabled behavior uses only
`#document-navigator`, while disabled documents do not acquire a fragment.

In scope: R1 and R2, including site-owned `[documentNavigation.<presentation>]`
configuration, registry/resolver validation, shared rendering composition,
navigator-only JS/CSS asset isolation, and a build-owned lookup consumed by the
browser Terminal controller. Keep `articleTheme` unchanged in this child; C owns
the direct `contentTheme` migration.

Out of scope: semantic entry lifecycle (B), theme vocabulary/content migration
(C), command-name migration (D), new production navigators, dynamic plugins,
Markdown navigator metadata, X Core metadata changes, old-fragment aliases, and
external workspace edits.

## Requirements

- Preserve the four approved cells: firefly/semantic × document-navigator/none;
  omission of the table or entry preserves current enabled defaults (`always` for
  firefly and `fragment` for semantic).
- Resolve one immutable composition result from the registered presentation,
  navigator registry and site configuration. `none` is a disabled discriminated
  result, not a fake navigator profile. Unknown IDs, unknown presentations,
  malformed/empty entries and invalid profiles fail before rendering with field
  context.
- Both enabled and disabled documents retain the same body, headings, outline,
  canonical route, comments behavior and current content wrapper. Disabled output
  has no navigator region semantics, navigator IDs/data hooks/status/entry,
  handlers, or navigator-only JS/CSS delivery.
- Navigator-specific styles and runtime imports are owned by the navigator
  capability. General presentation/body/theme styles remain available in `none`.
  Shared build output may contain assets for enabled pages, but disabled HTML,
  import/style edges and browser requests must not reference navigator-only assets.
- Build a site-owned canonical-document capability lookup from the same public
  Terminal projection and resolver used for rendering. The browser decorates a
  validated same-origin canonical document URL with `#document-navigator` only
  when the destination is enabled; disabled destinations stay fragment-free.
  Query parameters survive, unknown lookup entries fail safe to the canonical URL,
  and private/unlisted documents never enter the lookup.
- Keep navigator profiles and theme data out of X Core metadata, content schema,
  route identity, comments payloads and presentation-package command contracts.

## Acceptance Criteria

- [ ] Posts and pages render in all four cells; omission preserves today's enabled
      behavior; both registered themes still render without changes.
- [ ] Invalid site configuration and resolver definitions reject duplicates,
      unknown IDs, wrong types, empty values and invalid profiles before document
      rendering.
- [ ] Static disabled pages contain complete readable content, working links,
      heading anchors and outline, while containing no navigator DOM/hooks/status/
      entry and no navigator-only import/preload/style edge or browser request.
- [ ] Enabled pages retain current profile behavior and `#document-navigator`.
      A test-only alternate navigator definition exercises resolver composition
      without shipping another production navigator.
- [ ] The destination capability lookup is generated from public canonical
      documents, agrees with rendered pages, preserves query handling and same-
      origin validation, and gives the browser the approved enabled/disabled URL.
- [ ] No navigator or theme fields enter X Core metadata or the content schema;
      active legacy fragment behavior is absent.

## Risks and rollback

The highest-risk boundary is Astro's processed asset graph: conditional markup
alone is insufficient. Capture a minimal enabled/disabled production build before
extending browser behavior. Rollback is removal of the optional navigation table
and rebuild; do not add compatibility branches.
