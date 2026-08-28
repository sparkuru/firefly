# Comments contract extraction

## Goal and user value

Give the site build, private comments service, and publication assembler one
declared repository-local contract for the comments public projection. A future
change to route encoding, allowlisted export fields, normalization, ordering,
or digest calculation should have one owner and one compatibility test surface,
without turning the static site into SSR or making the assembler depend on site
source.

This is the third child of
`.trellis/tasks/08-27-repository-audit-remediation/`. It depends on the archived
Unicode route-compatibility prerequisite and the archived documentation and
deterministic-validation children. It must complete before the parent’s X
Core/plugin-host and canonical-route cleanup where site integration overlaps.

## Confirmed repository facts

- `apps/site/src/lib/comments.mjs:19-169` contains a complete public-export
  decoder, digest calculation, field allowlist, and normalization rules. The
  same file also resolves a repository root by probing `process.cwd()` and
  parent candidates at lines 12-17, then owns file loading and post grouping at
  lines 171-224.
- `services/comments/src/validation.ts:19-22,211-428` independently implements
  route normalization, public comment/export decoding, ordering, digesting,
  and serialization. `services/comments/src/types.ts:143-166` independently
  declares the route catalog and public comment/export shapes. The service
  wrapper additionally owns private submission validation and service-specific
  error classes, which must remain private.
- `plugins/comments/config.mjs:200-258` already contains the canonical route
  predicate and raw-site-href-to-encoded-route converter. It is also the
  comments namespace parser, so configuration parsing and public export data
  must not be mixed together.
- `tooling/assemble-publication/src/plugins/comments.ts:27-56` validates the
  export handoff and currently imports
  `apps/site/src/lib/comments.mjs` by repository-relative source path. This is
  the audited assembler-to-site coupling; the assembler should consume the
  declared comments contract instead.
- `apps/site/src/plugins/comments/site.mjs` and
  `apps/site/src/lib/site-plugins.ts:11-126` are already thin site integration
  points. Pages, indexes, experiments, 404 output, and inline Terminal output
  are deliberately outside the post extension.
- Existing fixtures and tests cover ASCII identity, canonical uppercase UTF-8
  route encoding, private-field rejection, one-level replies, plain-text and
  HTTPS constraints, digest mismatch, stale routes, disabled behavior, and
  publication privacy. The archived Unicode task confirms that these route
  semantics are stable and must not be redesigned here.

## Requirements

### R1 — Single public/build contract owner

Create a repository-local comments public contract under `plugins/comments/`
with source and declaration entrypoints. It owns the public model types, route
predicate/converter facade, exact `comments.public.v1` allowlist, canonical
normalization, one-level parent checks, deterministic ordering, digest
calculation, serialization/export creation, and empty-export behavior. It must
not import private service state, storage, moderation, notification, SMTP, or
runtime configuration types.

The existing `plugins/comments/config.mjs` remains the configuration namespace
owner. Its route implementation may remain the compatibility source, but all
site/service/assembler route consumers must use the public contract facade so
there is one declared dependency and one route rule.

### R2 — Thin consumer adapters

- Reduce the site comments module to site-only concerns: contained export file
  resolution, optional/disabled loading, and grouping encoded public routes
  under readable `CanonicalDocument.href` keys. It re-exports the shared
  decoder/types for existing callers and no longer defines a second decoder.
  Its default repository boundary is deterministic; do not retain cwd/parent
  probing for this contract.
- Reduce service public-export code to adapters around the shared contract,
  preserving `ValidationError`/`ExportValidationError` at the private service
  boundary. Private submission, email, token, moderation, storage, and HTTP
  validation remain in the service package.
- Change the publication bridge to load the declared comments contract and
  decode the handoff without importing `apps/site/src/**`. Keep emitted-site
  surface detection, contained handoff checks, route-to-output checks, digest
  requirement, and generic publication metadata validation in the assembler.

### R3 — Compatibility and privacy

Preserve the existing `comments.public.v1` JSON shape, public field allowlist,
readable-Unicode/encoded-route boundary, digest payload, deterministic order,
one-level replies, disabled-by-default behavior, publication metadata, and
privacy scanner. Do not enable tracked comments, contact SMTP/deployment, read
owner-local content or secrets, import historical data, or change public URLs.
Where the two existing decoders differ, converge on the existing documented
contract and record any deliberately compatible input (such as the accepted
digest spelling) rather than silently weakening validation.

### R4 — Evidence and durable guidance

Add focused contract tests and retain the existing site, service, assembler,
static-output, and publication tests. Prove that consumers use the same
decoder/digest implementation, that Unicode route fixtures round-trip, that
private fields remain rejected, and that the assembler source contains no site
source import. Update the comments publication and directory-ownership specs
and plugin README with the module owner and adapter boundaries.

## Acceptance criteria

- [ ] `plugins/comments/` contains one public contract implementation and
      declaration for route conversion, public types, decoding, normalization,
      ordering, and digesting; no equivalent decoder/digest implementation
      remains in the site or service.
- [ ] Site, service, and assembler consume that contract; service-specific
      error classes and private submission/runtime validation remain local.
- [ ] `tooling/assemble-publication/src/plugins/comments.ts` has no import or
      dynamic import of `apps/site/src/**`, and its publication handoff still
      rejects missing digests, stale output routes, unsafe paths, and absent
      comment surfaces as before.
- [ ] Site export loading uses the fixed repository/module boundary and keeps
      the disabled/absent-export path free of file reads; post grouping still
      maps encoded Unicode routes back to raw site hrefs.
- [ ] Shared contract tests cover valid/frozen output, exact allowlists,
      malformed and private records, parent relationships, canonical Unicode
      routes, digest verification, deterministic order, and empty exports.
- [ ] Existing service validation/export tests, site comments/static-output
      tests, assembler tests, and the deterministic repository gate pass with
      comments disabled in tracked configuration; no owner-local or generated
      inputs enter the diff.
- [ ] `comments-publication-contract.md`, `directory-structure.md`, and the
      plugin README identify the shared module and the site/service/assembler
      responsibilities without promoting a new npm workspace or marketplace.
- [ ] Task context validation, TypeScript/Astro checks, focused tests,
      `git diff --check`, privacy/scope review, and the independent Trellis
      quality check pass before commit/archive.

## Out of scope

- X Core/plugin-host removal, canonical-route ownership changes outside the
  comments boundary, adapter dependency/mutation fixes, Terminal decomposition,
  or release crash-recovery/observability work owned by later children.
- Public comments enablement, SMTP/provider testing, deployment, credentials,
  private data migration, historical import, browser runtime reads, or public
  comment counts.
- Converting the repository to npm workspaces, publishing a private package,
  introducing dynamic plugin discovery, changing URLs/fixtures’ product
  semantics, or rewriting the comments UI.

## Risks and deferred items

- Service and assembler TypeScript packages emit declarations from package-local
  `dist/` trees while the repository contract is intentionally not a published
  npm package. Runtime imports must therefore resolve the repository-owned
  contract explicitly, and checks must exercise compiled service/assembler
  paths rather than relying only on source imports.
- The site and service currently expose different error classes and a small
  digest-input compatibility difference. The shared contract will own semantic
  validation; adapters may translate errors, but no consumer may reimplement
  the rules.
- Publication transaction crash recovery and dynamic-service observability
  remain later parent deliverables; this task only preserves their metadata and
  privacy inputs.

## Open questions

None. The parent explicitly requires a repository-local private contract and
forbids a workspace/package conversion; the existing specs and fixtures define
the behavior to preserve.
