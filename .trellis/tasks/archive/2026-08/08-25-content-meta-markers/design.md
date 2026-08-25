# Technical design: Firefly content metadata markers

## Design outcome

Add a small, build-time metadata extension under the `firefly` front-matter
namespace. The MVP accepts safe marker identifiers, resolves the supported
`featured` marker through one registry, and treats every other safe identifier
as a silent runtime no-op. The normalized supported marker projection is added
to `CanonicalDocument` and consumed by existing document/listing boundaries.

The content materializer and `.fireflyignore` layer remain unchanged. Marker
metadata is interpreted only after Astro has loaded and schema-validated the
staged Markdown.

## Data flow and ownership

```text
Markdown front matter
  ↓
content-schema.mjs
  ↓  safe `firefly.markers` identifiers
Astro CollectionEntry.data
  ↓
content-markers.mjs registry/normalizer
  ↓  supported immutable marker descriptors
createCanonicalDocument()
  ↓
CanonicalDocument.markers
  ├─ SemanticDocument / TerminalDocument header badge
  ├─ ContentDirectoryIndex file rows
  └─ TerminalHome public index rows
```

Boundary ownership:

| Boundary | Owner | Responsibility |
| --- | --- | --- |
| Front matter shape | `content-schema.mjs` | Validate the optional `firefly` object and safe marker identifiers; preserve unknown-but-safe identifiers for future checking |
| Supported marker semantics | `content-markers.mjs` | Own the first-party registry, descriptors, and normalization; expose the supported ID set for a later checker |
| Canonical projection | `content.ts` | Convert collection metadata into immutable `CanonicalDocument.markers` exactly once |
| Presentation | shared marker component plus existing document/list components | Render only registry-owned labels/classes; never parse raw front matter |
| Publication/access | existing materializer and `content-access.mjs` | Continue owning path filtering, draft projection, and private-owner behavior |

## Front-matter contract

The authored shape is:

```yaml
firefly:
  markers:
    - featured
```

The schema should model this as an optional strict object with a default empty
marker list. A marker ID is a trimmed, NFC, lowercase kebab-case token matching
the existing safe adapter-ID style. It cannot contain whitespace, path
separators, control characters, HTML, or arbitrary CSS syntax.

The schema accepts unknown-but-safe IDs. It should normalize duplicates while
preserving first declaration order, so repeated input is deterministic without
turning a harmless authoring mistake into duplicate badges. Unknown IDs remain
represented in the parsed collection metadata so a future checker can compare
them with the registry; they do not enter the supported canonical projection.

Malformed `firefly` shapes and unsafe IDs fail at the existing Astro schema
boundary with the normal content diagnostic. Unknown-but-safe IDs do not fail
ordinary builds and have no rendering or routing effect.

## Registry and canonical model

Create a framework-neutral site helper, likely
`apps/site/src/lib/content-markers.mjs`, with a frozen registry containing only
the MVP marker:

```js
featured: {
  id: 'featured',
  label: 'Featured',
  tone: 'accent'
}
```

The helper exposes:

- the immutable supported marker ID set for the future checker;
- a resolver that receives parsed marker IDs and returns only supported,
  registry-owned descriptors in deterministic order;
- no HTML, CSS, icon, or executable values originating from front matter.

Extend `CanonicalDocument` with an immutable `markers` field. The projection
is empty for documents without metadata or with only unsupported IDs. The
`entry` remains available to existing consumers, but new presentation code must
use `canonical.markers` instead of independently reading
`entry.data.firefly.markers`.

## MVP presentation behavior

`featured` is a visible but non-routing marker:

- document headers in both Semantic and Terminal presentations show a textual
  `Featured` badge when present;
- public file rows in `ContentDirectoryIndex` and `TerminalHome` show the same
  badge through a shared rendering helper;
- the marker does not reorder, filter, or duplicate entries in this MVP;
  `CanonicalDocument.markers` is the extension point for a later curated home
  section or sorting policy.

Use a small shared Astro component for the descriptor list so label rendering
and the `data-content-marker` diagnostic hook are not duplicated. The component
must render visible text, not color alone, and must derive its class names from
the registry descriptor rather than authored strings. Add matching semantic and
Terminal CSS tokens in their existing style boundaries; do not inject a raw
front-matter value into a class attribute.

The home page's existing document wrapper should carry the canonical document
alongside its Terminal entry so `TerminalHome` can access the same marker
projection. Do not extend the independent presentation-terminal package's
`TerminalEntry` contract for this site-only behavior.

## Future checker boundary

The checker is explicitly deferred. This task must make it possible without
changing the runtime contract by keeping:

- all accepted marker IDs in validated collection metadata;
- the supported registry in one importable module;
- unsupported IDs absent from the rendered canonical marker projection.

A later checker can scan the loaded collection metadata or authored workspace,
compare IDs with the exported registry, and emit file/line-aware diagnostics.
It should not be implemented as a runtime warning in this task.

## Compatibility and safety

- Documents without `firefly` metadata retain the existing route, public
  projection, generated output, and visible layout behavior.
- `draft`, `access`, `.fireflyignore`, `presentation`, `tags`, `noindex`, and
  slug/route metadata keep their current owners and meanings.
- Unsupported marker IDs cannot expose private/draft content because marker
  resolution runs after the existing guest projection and only affects already
  public documents.
- Labels and visual tones are registry-owned constants, preventing arbitrary
  markup/style injection from content metadata.
- The materializer continues to copy Markdown without interpreting front
  matter, so scan/copy race and atomic-stage guarantees are unaffected.

## Test strategy

- Schema tests cover absent/default metadata, valid `featured`, safe unknown
  IDs, malformed namespace/arrays, unsafe IDs, NFC/case rules, and duplicate
  normalization.
- Marker helper tests cover registry descriptors, supported resolution,
  unknown no-op behavior, ordering, deduplication, and frozen output.
- Canonical model tests prove `CanonicalDocument.markers` is shared by posts
  and pages and remains empty for legacy documents.
- Static build tests use a marker-bearing fixture and assert the Featured badge
  appears in the intended HTML surfaces, while no raw unsupported ID, host path,
  or executable marker payload is emitted.
- Existing content, materializer, draft/private, route, and static-output tests
  remain required. No browser interaction behavior changes, so Playwright is
  a follow-up only if the static output reveals a visible geometry or keyboard
  regression.

## Rollback

The change is isolated to site schema, canonical projection, marker rendering,
styles, tests, documentation, and the task-local contract. If the marker
surface is unsuitable, removing the optional schema field and canonical field
restores legacy documents; no materializer or source-path migration is needed.
