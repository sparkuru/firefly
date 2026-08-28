# X Core and canonical-route boundary cleanup

## Goal

Restore the boundary between Firefly's build-time document pipeline and the
site/plugin integration layer. X Core must own normalized content,
Presentation selection, rendered metadata, and diagnostics; it must not expose
unused publication or service plugin-host behavior. The site must retain its
statically registered comments integration, and both the canonical content
model and Astro's X Core context adapter must use one pure route projection
rule.

The user-visible outcome is unchanged public content: existing readable routes,
Presentation defaults, static output, comments-disabled behavior, and private
service/publication boundaries continue to work while the two audited sources
of coupling are removed.

## Dependency and confirmed facts

- This child belongs to the active parent
  `08-27-repository-audit-remediation`. The M5.1 Unicode route compatibility,
  documentation convergence, deterministic validation, and comments public
  contract children are archived before this child enters implementation.
- `packages/x-core/src/plugins.ts:3-175` defines a generic
  `FireflyPluginRegistry` with site, publication, and service capabilities,
  including `PublicationInput`, `PublicationContribution`, and
  `servicePlugins()`.
- `packages/x-core/src/index.ts:1-7` re-exports that generic host. Repository
  search found no production caller of `publicationContributions()` or
  `servicePlugins()`; the only current registry consumer is the site's
  comments site-extension path in `apps/site/src/lib/site-plugins.ts:1-125`.
- `packages/x-core/tests/plugins.test.ts:1-67` tests the generic host rather
  than the approved X Core document/Presentation contract.
- `apps/site/src/lib/content.ts:80-123` derives a canonical document route
  from collection, Markdown identity, and slug. It also owns directory hrefs,
  breadcrumbs, aliases, and route reservations.
- `apps/site/src/lib/x-core-context.ts:75-105` independently derives the
  same page/nested-post route from Astro's staged path and front matter before
  creating `DocumentContext`.
- `.trellis/spec/frontend/x-core-contract.md:76-84` already classifies the
  generic plugin host as transitional and states that routes and site
  extensions are outside durable X Core ownership.
- `plugins/comments/plugin.json` and its separate site, publication, and
  service entrypoints remain an internal statically registered capability. The
  task removes the X Core host coupling; it does not turn the plugin into a
  runtime marketplace or remove its owning adapters.

## Requirements

### R1 — Narrow X Core to its approved contract

- Remove the generic publication/service plugin-host API from the X Core
  package entrypoint and source ownership. No X Core public type or method in
  this task may accept private service state, publication paths, or generic
  lifecycle hooks.
- Preserve all document contracts, `PresentationRegistry`, the Markdown
  processing pipeline, diagnostics, metadata parsing, and the existing
  default `firefly` Presentation.
- Move the minimum site-only registry types/behavior needed by the comments
  integration into the site boundary. Registration remains static and
  repository-owned; there is no dynamic discovery, marketplace, service
  lifecycle manager, or publication orchestrator added.
- Keep publication and service adapters owned and invoked by their existing
  packages. Their manifests, private data, secrets, runtime configuration,
  and publication metadata contracts remain outside X Core.

### R2 — Establish one canonical-route projection contract

- Add one pure site-owned route projection helper with an explicit input
  contract for a validated collection, staged/relative Markdown path where a
  post requires it, and canonical slug.
- Make `createCanonicalDocument()` and `resolveDocumentContext()` consume the
  same helper. Remove their duplicated parent/slug route assembly while
  keeping content-specific directory construction and route reservation logic
  in the canonical content model.
- Preserve the current rules: pages map to `/pages/<slug>/`, nested posts keep
  their relative parent directories and map to
  `/posts/<parent>/<slug>/`, routes have a single leading/trailing slash, and
  existing Unicode, slug normalization, alias, and collision behavior remains
  unchanged.
- Keep route projection independent of Astro, the filesystem, X Core package
  internals, browser code, comments storage, and deployment paths.

### R3 — Preserve cross-layer behavior

- The statically generated site remains the only site runtime; comments remain
  disabled in tracked configuration and the site does not read private service
  state when disabled.
- Existing comments public/build contract consumption, static output,
  publication assembly, Presentation selection, canonical links, directory
  indexes, and Terminal navigation remain behaviorally unchanged.
- No public URL, authored content, route grammar, comments schema, generated
  publication format, or private operational boundary may change.

### R4 — Prove and document the boundary

- Add focused tests for the site-owned route projection, including root and
  nested posts, pages, slug overrides/normalization, and fail-closed invalid
  or missing post path inputs as applicable to the chosen helper contract.
- Add an X Core public-surface/boundary regression proving the removed generic
  host is not exported or consumed, while site-level comments extension tests
  continue to exercise the statically registered path.
- Retain and run existing X Core, site content, static-output, comments,
  browser, and assembled-publication coverage. The complete deterministic
  verification entry point must remain green.
- Update the X Core contract and comments plugin ownership documentation to
  state that X Core owns document/Presentation processing only, the site owns
  its static registry, and publication/service adapters remain separate.

## Acceptance Criteria

- [x] `packages/x-core` no longer exports or owns generic publication/service
      plugin-host types or methods, and its remaining public API is the
      document/Presentation pipeline described by the durable X Core contract.
- [x] The comments site integration remains statically registered and produces
      the same enabled-fixture output while tracked comments stay disabled;
      no dynamic plugin discovery or runtime marketplace is introduced.
- [x] One pure route projection rule is consumed by both
      `createCanonicalDocument()` and `resolveDocumentContext()`; no equivalent
      parent/slug route assembly remains in either consumer.
- [x] Root posts, nested posts, pages, slug overrides, Unicode routes, aliases,
      directory indexes, and route-collision protections retain their current
      observable behavior.
- [x] `DocumentContext.route` and the corresponding canonical content href
      agree for the same staged document, without adding host paths or route
      logic to X Core.
- [x] Existing package checks/tests/builds, site static-output tests, focused
      and full browser suites, assembled-publication tests, and `./verify.sh`
      pass through the approved `./sam` boundary, or any unavailable check is
      recorded with its exact failure.
- [x] `.trellis/spec/frontend/x-core-contract.md` and
      `plugins/comments/README.md` describe the final ownership boundaries;
      no private paths, credentials, generated output, deployment changes, or
      unrelated adapter/release work enter the diff.
- [x] Task validation, `git diff --check`, and an independent Trellis quality
      check pass before commit/archive.

### Validation note

The complete `./verify.sh` gate passed package checks/tests, the site/static
build, and experiment build stages, then stopped at the existing publication
state guard: `comments tombstone epoch 0 predates the published epoch 4;
refusing rollback.` The standalone main-site and NERV Playwright suites passed
(130/130 and 8/8). The standalone publication suite passed its two NERV tests
but its two main-publication tests could not validate the expected article
against the existing incomplete release. These exact outcomes are recorded in
`research/boundary-evidence.md`; no publication state was changed.

## Out of scope

- Correcting Semantic's input mutation or the Semantic/Terminal X Core
  dependency declarations; those belong to the later adapter/package cleanup
  child.
- Extracting or redesigning the comments public contract, changing comments
  routes, enabling public comments, SMTP/provider tests, deployment, or
  production runtime changes.
- Changing public URLs, content slugs, authored Markdown, Presentation UX,
  Terminal decomposition, Experiment boundaries, publication crash recovery,
  or dynamic-service observability.
- Converting the repository to npm workspaces, publishing a private package,
  introducing a third-party plugin marketplace, or broadening X Core into a
  general framework.

## Open questions

None. The parent PRD, current source, durable X Core contract, and archived
comments-contract child establish the required behavior and leave only
implementation-level choices for the design artifact.
