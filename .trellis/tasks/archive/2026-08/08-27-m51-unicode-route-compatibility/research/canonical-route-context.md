# Canonical route context for Unicode comments compatibility

This task-focused extract records the relevant contracts from
`.trellis/spec/frontend/content-workspace-contract.md` without injecting that
60 KB document through a 32 KB context limit.

## Canonical document ownership

- `CanonicalDocument` owns `relativePath`, `virtualPath`, `filename`, `href`,
  directory hrefs, breadcrumbs, aliases, and markers.
- `createCanonicalDocument()` is the single projection boundary. Consumers do
  not reinterpret raw collection IDs, front matter, or Terminal operands.
- A post path such as `posts/characters/nahida.md` maps to the readable
  trailing-slash route `/posts/characters/nahida/` and directory routes remain
  separate.
- The single canonical model owns permalink, directory tree, breadcrumbs,
  aliases, Terminal entries/templates, and route generation.

## Route and path safety

- Source identities must be NFC. Hidden, dot, traversal, percent, backslash,
  and unsafe paths are rejected.
- Collision keys validate NFC and apply NFKC/case folding, including `ß`/`ss`
  and final-sigma/sigma equivalence. Exact, case/Unicode, file/directory,
  canonical/alias, and duplicate-alias collisions abort the build.
- Route reservations include `/`, every directory, every document, and every
  alias. Public routes are canonical trailing-slash paths.
- Terminal entries use the already validated canonical href directly; they do
  not parse or reconstruct public routes.

## Fixture and runtime boundary

- `FIREFLY_CONTENT_ROOT` may select an absolute readable workspace containing
  `posts/` and `pages/`; it defaults to the repository fixture.
- `./sam` mounts the selected content root read-only and rejects broad,
  repository-ancestor, broken, cyclic, or unsafe paths before Docker.
- Materialization builds a candidate under the generated-content boundary and
  atomically promotes a complete stage; failure restores the prior stage.
- Draft/private content is absent from guest-visible routes and artifacts.

## Task consequence

The comments adapter may derive a protocol `postPath` from
`CanonicalDocument.href`, but it must not mutate, replace, or reinterpret the
canonical site href. The comments converter must reject inputs the content
contract forbids, preserve ASCII routes, and fail an enabled build if a public
post cannot be represented safely.
