# Metadata marker boundary research

## Repository evidence

- `apps/site/src/lib/content-schema.mjs` defines `sharedMetadata` and applies
  strict post/page schemas. This is the correct validation boundary for a
  namespaced `firefly` object.
- `apps/site/src/content.config.ts` loads only staged Markdown and passes its
  data through Astro collections. The materializer should remain unaware of
  front-matter semantics.
- `apps/site/src/lib/content.ts` creates `CanonicalDocument`, builds the public
  tree, and performs guest projection/route reservations. This is the single
  shared projection point for marker data.
- `apps/site/src/components/SemanticDocument.astro` and
  `TerminalDocument.astro` own document headers; `ContentDirectoryIndex.astro`
  and `TerminalHome.astro` own public listing rows. All can consume one
  canonical marker descriptor.
- `apps/site/src/lib/render-document.ts` runs after collection schema parsing
  and is not the right place to duplicate front-matter validation. It remains
  responsible for body/X Core metadata only.

## Decisions recorded from discussion

- Use `firefly.markers`, not a broad set of unrelated top-level fields.
- Unknown-but-safe marker IDs are accepted and silently inactive in ordinary
  builds.
- A later checker will compare accepted IDs against the supported registry and
  report unsupported markers; that checker is outside this MVP.
- The MVP implements only `featured`; future IDs remain no-ops.
- Marker behavior is presentation/editorial only and cannot replace
  `.fireflyignore`, `draft`, or `access`.

## Design implication

Keep the registry framework-neutral and export its supported ID set. The
canonical model should expose only supported descriptors, while the parsed
collection metadata retains accepted IDs for the future checker. This prevents
unknown authoring values from leaking into static output while preserving the
ability to diagnose them later.
