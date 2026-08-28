# Comments contract extraction design

## Status

Planned after repository evidence review. Implementation remains blocked until
the owner approves the final planning summary and the task is started through
Trellis.

## 1. Boundary and ownership

The contract is repository-local rather than a new npm package or workspace:

```text
plugins/comments/config.mjs
  └─ owns namespace parsing and retains the existing route implementation
       │ route facade (re-export)
       ▼
plugins/comments/public.mjs + public.d.mts
  └─ owns public types, route facade, pure normalization/decoding/order/digest
       ├─ apps/site/src/lib/comments.mjs
       │    file/env boundary, disabled behavior, raw-href grouping
       ├─ services/comments/src/validation.ts + types.ts
       │    private submission rules and service error/type compatibility
       └─ tooling/assemble-publication/src/plugins/comments.ts
            contained handoff, output-surface scan, publication metadata
```

`public.mjs` has no dependency on the service, Astro, X Core, assembler, site
components, private configuration, environment variables, or filesystem. It
may import the existing route facade from `config.mjs`; `config.mjs` must not
import the public contract, so there is no cycle. Existing config consumers can
continue importing the route functions during the compatibility window, while
all public/export consumers use the declared public entrypoint.

## 2. Public contract API

The declaration file defines one structural model for all consumers:

```ts
interface PublicComment {
  readonly id: string;
  readonly postPath: string;
  readonly parentId: string | null;
  readonly displayName: string;
  readonly homepage?: string;
  readonly body: string;
  readonly createdAt: string;
}

interface PublicCommentsExport {
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly tombstoneEpoch: number;
  readonly comments: readonly PublicComment[];
  readonly digest?: string;
}

decodePublicCommentsExport(value: unknown, source?: string, options?: {
  readonly routeCatalog?: RouteCatalogInput;
}): PublicCommentsExport

createPublicExport(value: Omit<PublicCommentsExport, 'digest'>, catalog?: RouteCatalogInput): PublicCommentsExport

digestForExport(value: Pick<PublicCommentsExport, 'schemaVersion' | 'sourceRevision' | 'generatedAt' | 'tombstoneEpoch'> & { comments: readonly PublicComment[] }): string

serializePublicExport(value: PublicCommentsExport): string

validatePublicComment(value: unknown, catalog?: RouteCatalogInput, seen?: Set<string>): PublicComment

commentsPostPathFromSiteHref(value: unknown): string | null
isCanonicalCommentsPostRoute(value: unknown): value is string
```

The optional catalog option is an additive internal capability for the service
and does not alter the site’s existing two-argument call. All semantic checks
are implemented once: exact own-key allowlists, canonical schema/date/source
revision, NFC text and HTTPS homepage, opaque IDs, canonical route, direct
parent relationship, deterministic sorting, and SHA-256 digest verification.
Returned envelopes and comment arrays are frozen. `createPublicExport()` returns
a new value containing the computed digest instead of mutating a frozen decode.

The contract accepts the existing bare hexadecimal digest and the already
documented `sha256:` input spelling, but always computes/serializes the bare
hex digest. The assembler’s existing publication metadata validator remains the
owner of the metadata shape and may reject a prefixed value at that later
boundary, preserving current release behavior.

## 3. Site adapter migration

`apps/site/src/lib/comments.mjs` becomes a thin adapter:

1. Import and re-export route/decoder functions from `plugins/comments/public.mjs`.
2. Keep `loadPublicCommentsExport()` responsible for JSON file IO, explicit
   `FIREFLY_COMMENTS_EXPORT`, contained path checks, and the empty disabled path.
   Resolve the repository root from the module’s known source location only;
   remove the `process.cwd()`/parent-candidate probe.
3. Keep `loadCommentsForPosts()` responsible for empty per-post groups,
   enabled checks, conversion from raw readable hrefs to encoded protocol paths,
   collision checks, and mapping decoded comments back to raw hrefs.
4. Preserve existing error messages where they are part of tests and preserve
   the site declaration by re-exporting shared `PublicComment` and
   `PublicCommentsExport` types. `CommentSection` and presentation components
   continue to receive only that public read model.

No browser bundle receives the contract module: this is build-time server code,
and no runtime fetch or service dependency is introduced.

## 4. Service adapter migration

`services/comments/src/types.ts` re-exports the shared public model and route
catalog types while retaining private storage, notification, and submission
types. `validation.ts` dynamically resolves the repository-owned public module
from the compiled package location, because service and assembler are separate
TypeScript packages and the contract is intentionally not published.

The service keeps its existing public functions as compatibility adapters:

- route/catalog and public-field normalizers delegate to the contract and map
  generic contract failures to `ValidationError`;
- `decodePublicExport()` delegates to the shared decoder (with the service
  route catalog) and maps failures to `ExportValidationError`;
- compare/digest/serialize/create functions delegate without reimplementing
  semantics;
- submission allowlist, consent, email, honeypot, request-size, and private
  error/status behavior remain local.

`service.ts` continues to select approved records and to enforce private parent
and moderation policy. It may call the adapter’s `createPublicExport()` but must
not duplicate public digest or decoder internals.

## 5. Publication adapter migration

`tooling/assemble-publication/src/plugins/comments.ts` continues to own:

- site-output walk and comment-section detection;
- `FIREFLY_COMMENTS_EXPORT` lexical/realpath/regular-file containment;
- mapping protocol `postPath` values to emitted `index.html` routes;
- the requirement that enabled handoffs contain a digest and a comment surface;
- projection to generic `CommentsPublicationMetadata` and the assembler’s
  tombstone/metadata checks.

It dynamically imports `plugins/comments/public.mjs` from the selected
repository root, never `apps/site/src/**`. A narrow optional decoder injection
may be accepted solely for isolated temporary-root tests; the CLI uses the
repository-owned contract by default. This keeps the adapter testable without
copying site source into a fixture or weakening the production dependency.

The assembler remains a publication consumer, not a comments business-logic
owner: it does not know private rows, moderation fields, email, tokens, or
service configuration.

## 6. Other route consumers and tests

Update the Unicode fixture-preparation script and service route-catalog
operation to import the public route facade. Configuration tests may continue
to import `config.mjs` because they test the namespace parser itself.

Add a package-independent Node test under `plugins/comments/tests/` for the
shared contract. It covers valid/frozen output, sorting, Unicode conversion,
unknown/private fields, malformed routes/text/homepages/dates, duplicate IDs,
missing/nested/cross-post parents, bare/prefixed digest verification, and the
empty export. Existing site/service tests remain in their package suites and
assert compatibility/error translation. Add a small assembler adapter test or
source assertion proving the publication bridge does not mention site source
paths and still rejects the current handoff failure cases.

## 7. Compatibility, rollback, and failure containment

- Public schema, routes, UI, tracked-disabled configuration, service runtime,
  and publication metadata stay unchanged. The change is a source-level
  extraction plus adapters and tests.
- A source revert removes the shared module and adapter changes without touching
  comments data, generated artifacts, configuration secrets, or deployment.
- If compiled runtime resolution cannot locate the repository contract, fail
  closed with a clear package/path error; never fall back to importing site
  source or a second local decoder.
- If a fixture exposes an actual compatibility mismatch, update the contract
  and its focused tests first; do not weaken the publication/privacy boundary.
