# Adapter/package contract cleanup — design

## Boundary and data flow

The relevant build-time path is:

    normalized Markdown -> X Core NormalizedDocumentInput -> selected adapter
    -> validated HAST -> Astro/static publication

X Core owns the normalized input and validates the adapter result. Each
Presentation package owns its transform implementation. The site registers
both packages but does not own their transform internals. Terminal's browser
runtime subpath remains a separate, side-effect-free export and is not part of
this change.

## Package dependency contract

Both presentation packages will list @firefly/x-core under dependencies and
remove it from devDependencies. This reflects the package boundary rather than
the current local install behavior:

- Terminal's adapter source imports DEFAULT_PRESENTATION_ID as a runtime value.
- Semantic's exported adapter contract and generated declaration surface refer
  to X Core types, so an independent consumer must be able to resolve X Core.

The package lockfiles will be updated only to mirror this direct-dependency
classification. The repository remains a collection of independently locked
packages, not an npm workspace.

## Semantic immutability design

Semantic will gain the same narrow tree-clone boundary already used by
Terminal:

1. Copy the HAST root and recursively copy element nodes.
2. Copy each element's properties object and recursively copy its children.
3. Copy non-element node records without changing their values.
4. Apply the existing recursive wide-content wrapper only to the clone.
5. Return the cloned/transformed root.

This keeps the change package-local. A shared HAST utility would broaden the
X Core API or add a new package for a two-consumer helper without a current
behavioral need. The common contract is enforced by the X Core specification
and by each adapter's focused tests, not by a new cross-package coupling.

The current transform only replaces children arrays and adds wrapper nodes; it
does not mutate nested property values. The regression will therefore assert a
deep source snapshot and distinct root/node identity while preserving the
existing output assertions. If implementation evidence shows a property value
is mutated, the clone boundary must be deepened before acceptance rather than
weakening the test.

## Compatibility and rollout

The emitted Semantic HAST should be structurally identical to the current
output. Only aliasing changes: the caller's input remains available for any
later adapter or diagnostic consumer. Public routes, metadata, Presentation
selection, comments configuration, and browser runtime behavior are unchanged.

The implementation is reversible by reverting the two manifest/lockfile pairs,
the Semantic source, and its focused test. No migration or runtime deployment
step is needed.

## Risks and mitigations

- A lockfile can retain a dev marker after the manifest moves the dependency.
  Clean installs and direct lockfile inspection are required.
- A clone can accidentally omit a HAST node variant or property. The
  implementation follows Terminal's existing exhaustive-by-shape copy and the
  Semantic fixture exercises text, nested elements, pre, table, properties,
  and node IDs.
- A build-time package change can affect static output even without a UI
  change. Site X Core/content/check/build gates and the repository fixture
  verification cover that boundary.
