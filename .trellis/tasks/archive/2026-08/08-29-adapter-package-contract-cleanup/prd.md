# Adapter/package contract cleanup

## Goal

Make both production Presentation packages correctly declare their X Core
contract and make Semantic transforms non-mutating, so an adapter cannot
silently corrupt the normalized document tree used by the build-time pipeline.

## Background and confirmed facts

- The build-time flow is normalized Markdown through X Core into a selected
  Presentation adapter; the adapter returns a HAST root that X Core validates
  before site publication.
- The durable X Core contract requires both production adapters to clone their
  input, preserve headings and node identities, recursively wrap wide pre and
  table content, and emit no enhancements.
- Terminal already clones the root and nested element nodes in
  presentations/terminal/src/index.ts before applying its existing wrapper.
- Semantic currently walks the supplied tree and assigns new children arrays to
  the original parents in presentations/semantic/src/index.ts. Its current
  tests verify output shape and stability but do not verify that the input tree
  remains unchanged.
- Both presentation package manifests place @firefly/x-core only under
  devDependencies. Terminal imports DEFAULT_PRESENTATION_ID at runtime, and
  both package declarations expose X Core types in their build-time adapter
  contract. Their independent package lockfiles mirror the same
  classification.
- The site consumes both adapters through its build-time Astro registry. This
  task must preserve the existing routes, selected Presentation behavior,
  comments-disabled configuration, and Terminal runtime-subpath isolation.
- The deterministic validation child and X Core/route-boundary child are
  archived. This child can be checked independently of plugin-host and route
  cleanup.

## Requirements

### R1. Production package declarations

- The semantic and Terminal presentation packages declare @firefly/x-core as a
  production dependency, not only a development dependency.
- Both presentation package lockfiles agree with their manifests and remain
  independently installable through the repository's separate-package model.
- No npm workspace conversion, package publication, version upgrade, or
  dependency unrelated to the adapter contract is introduced.

### R2. Semantic transform contract

- Semantic transforms operate on a cloned HAST root and never mutate the
  NormalizedDocumentInput tree supplied by the caller.
- Existing Semantic behavior remains intact: native nodes are preserved,
  nested pre/table elements receive the existing wide-content wrappers,
  headings and data-node identities survive, and the enhancement manifest stays
  empty.
- Semantic remains isolated from Terminal implementation code. The change must
  not broaden the X Core public API merely to share a small adapter-local
  implementation detail.

### R3. Regression and integration evidence

- Semantic tests prove source-tree immutability in addition to output shape and
  repeatability.
- Existing Terminal immutability coverage remains green.
- Affected package checks, tests, and builds pass through ./sam; the site
  consumer is refreshed from its own lockfile and passes its X Core/content,
  type-check, and static-build gates.
- The final validation records any full verification failure with its exact
  phase and distinguishes repository changes from external publication state.

## Acceptance Criteria

- [x] presentations/semantic/package.json and
      presentations/terminal/package.json contain @firefly/x-core under
      dependencies and not under devDependencies.
- [x] The corresponding package-lock.json files encode the same direct
      production dependency classification, and clean package installs succeed
      through ./sam.
- [x] A Semantic transform leaves a deep snapshot of its input tree unchanged,
      returns a distinct transformed root, preserves existing wrappers,
      properties, headings, and data-node identities, and keeps enhancements
      empty.
- [x] The existing Terminal immutability and presentation-isolation tests pass.
- [x] Semantic and Terminal package check/test/build gates pass; the affected
      site X Core/content/check/build gates pass; and the normal full fixture
      verification is run or its exact blocking phase is recorded.
- [x] No public route, rendered Presentation selection, comments configuration,
      Terminal runtime subpath, or unrelated task-control/product boundary
      changes.

## Out of scope

- X Core plugin-host or canonical-route changes, comments contract changes,
  Terminal runtime/controller decomposition, public comments enablement,
  deployment, credentials, authored content, and UX changes.
- Introducing a shared framework or generalized HAST utility package solely to
  remove the two adapter-local clone implementations.
- Editing generated dist or node_modules artifacts into the task.

## Dependencies and decision state

- Dependency: the deterministic validation and X Core/route-boundary children
  are complete and archived, so their package/build conventions are available.
- No product, compatibility, or risk decision remains blocking. The
  implementation recommendation is a behavior-preserving package-local clone
  in Semantic, matching the already-audited Terminal boundary.
