# Add Firefly content metadata markers

## Goal and user value

Allow an authored Markdown document to carry a small, validated set of
Firefly-specific markers that can affect presentation and editorial placement
without changing its source path, publication eligibility, access projection,
or Markdown body.

The feature should let the site express project-specific meaning such as
“featured”, “experimental”, or “reference” once in front matter and reuse that
meaning consistently across document pages, directory indexes, the Terminal
presentation, and future editorial surfaces.

## Confirmed repository facts

- `apps/site/src/lib/content-schema.mjs` owns the strict shared front-matter
  schema for posts and pages. Unknown metadata keys currently fail validation.
- `apps/site/src/content.config.ts` validates staged Markdown after the
  materializer. The Astro collections are the metadata boundary; the
  materializer is a safe path scanner/copy stage and should not interpret
  document semantics.
- `createCanonicalDocument()` in `apps/site/src/lib/content.ts` is the shared
  projection point for canonical paths, breadcrumbs, directory entries, and
  page/document consumers.
- `draft` and `access` are already responsible for guest publication
  projection. `presentation`, `tags`, `noindex`, and route metadata already
  have separate meanings and must not be overloaded by markers.
- `DocumentPresentation`, document components, directory indexes, and Terminal
  surfaces consume the canonical model or its collection entry. Marker data
  should cross those boundaries through one typed projection rather than
  repeated raw front-matter reads.
- `.fireflyignore` remains a source-path publication filter. A metadata marker
  must not become an implicit replacement for path filtering or access control.

## Product contract

- Firefly-specific metadata is namespaced under an optional `firefly` front
  matter object, keeping topical `tags` separate from project behavior.
- The first capability is `firefly.markers`, an ordered list of semantic marker
  identifiers. Markers describe presentation/editorial meaning after a
  document is public; they do not publish drafts, expose private documents, or
  change canonical routes.
- Marker identifiers are validated as safe, lowercase kebab-case identifiers
  and resolved through a Firefly-owned registry into safe display data such as
  a label and visual tone. Authored metadata must not provide arbitrary HTML,
  CSS classes, icons, or executable behavior.
- An identifier that is not currently present in the registry is accepted but
  has no runtime effect by default. Unsupported markers remain available to a
  future checker, which will report them without making normal site builds
  fail.
- Marker data is optional and defaults to an empty, immutable result. Existing
  Markdown without `firefly` metadata must retain the current schema,
  projection, route, and rendered output behavior.
- Marker use is collection-neutral: the same contract applies to posts and
  pages, while consumers may choose whether a particular marker is meaningful
  for a given surface.
- Marker ordering and duplicate handling must be deterministic and documented;
  the schema must reject malformed identifiers rather than silently broadening
  the public contract. Unknown-but-safe identifiers are intentionally a
  no-op, not a schema error.

## MVP first-party marker

The MVP implements one first-party marker:

- `featured` — renders a safe, visible Featured badge on supported document
  and listing surfaces and exposes a typed supported marker for future
  editorial placement.

Other identifiers, including future candidates such as `experimental`,
`reference`, and `longread`, remain accepted no-ops until they receive an
explicit registry entry and behavior. Markers that duplicate `draft`,
`access`, `presentation`, `noindex`, or `tags` are out of scope.

## In scope

- Strict schema support for the Firefly metadata namespace.
- A central marker registry/normalizer and a typed canonical marker projection.
- Passing the projection to at least the existing document and directory
  presentation boundaries where a visible or editorial behavior is selected.
- Safe fallback/diagnostics for malformed marker metadata; unknown-but-safe
  markers are accepted as no-ops in this task.
- Unit, content-schema, canonical-model, and static-output regression coverage.
- README and content-workspace contract updates that document the metadata
  boundary and the distinction from `.fireflyignore`, `draft`, and `access`.

## Out of scope

- Metadata-controlled publication or access control; use `.fireflyignore`,
  `draft`, and `access` for those concerns.
- Arbitrary user-defined CSS/HTML/icon injection from front matter.
- A general plugin marketplace or runtime marker registration API.
- Changes to the Markdown materializer, generated-stage path identity, route
  slug rules, attachment publication, or browser-side fetching.
- Replacing topical `tags`, SEO `noindex`, or presentation adapter selection.

## Acceptance criteria

- [x] A valid `firefly.markers` value is accepted for both posts and pages and
      reaches the shared canonical marker projection.
- [x] Existing documents without `firefly` metadata produce the same public
      routes, projection, and visible output as before.
- [x] Marker metadata is validated at the content schema boundary; malformed
      shape, invalid identifiers, and duplicate behavior follow the documented
      contract and produce deterministic diagnostics, while unknown-but-safe
      identifiers remain no-ops.
- [x] A first-party marker produces its intended behavior in the selected
      document and listing presentation surfaces without duplicating raw
      metadata parsing in components. For this MVP, `featured` is the only
      marker with behavior.
- [x] Marker data cannot publish drafts, bypass private access projection,
      change routes, inject arbitrary markup/styles, or enter static output as
      uncontrolled executable data.
- [x] Existing `.fireflyignore`, draft/private, schema, canonical-route, and
      static-output tests remain passing.
- [x] Documentation explains the `firefly` namespace, supported markers,
      registry behavior, and its boundary with publication/access metadata.

## Deferred follow-up

A later checker should scan accepted `firefly.markers` values against the
current registry and report unsupported identifiers quickly. The checker is
not part of this MVP's runtime behavior; unsupported values remain silent
no-ops during ordinary builds.

## Resolved product decisions

- The MVP implements only `featured` with visible behavior.
- Other safe marker IDs remain accepted runtime no-ops until a future registry
  entry and behavior are deliberately designed.
