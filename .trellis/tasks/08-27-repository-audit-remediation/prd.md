# Repository audit remediation

## Goal

Reconcile PRD and architecture boundaries, isolate deterministic validation, reduce comments/plugin coupling, and close release-quality gaps identified by the 2026-08-27 repository audit.

This is a parent remediation task. It begins only after
`08-27-m51-unicode-route-compatibility` is implemented, checked, committed,
and archived. Its deliverables must be planned and executed as independently
verifiable child tasks rather than as one broad refactor.

## Background and confirmed facts

- The core Markdown -> X Core -> Presentation -> static publication direction
  remains valid; the audit found no reason for an architectural rewrite.
- Semantic/Terminal presentation isolation, Experiment autonomy, static
  publication validation, and private comments-service separation are working
  boundaries that must be preserved.
- The root PRD and durable Trellis specs contain stale or conflicting statements
  about M5.1 status, current content inventory, the default Presentation, X Core
  interfaces, package layout, and publication ownership.
- The default `test:m51` command inherits the developer's configured external
  content root. Its negative-build fixtures are repository-local, so four
  negative tests can produce false failures. With the repository fixture root
  selected explicitly, all 177 non-browser tests pass.
- The default milestone test and publication commands do not run the existing
  site, NERV, and assembled-publication Playwright suites. No repository-local
  CI workflow currently enforces those gates.
- Comments configuration/route logic is shared, but public-export contracts are
  repeated across the site and service, and the assembler imports the site
  decoder by repository-relative source path.
- X Core exports a generic site/publication/service plugin registry even though
  the approved X Core responsibility is content and Presentation processing;
  the publication/service registry paths are not used by production code.
- Site canonical routes are projected in both the canonical content model and
  the Astro X Core context adapter. The Terminal adapter also has an undeclared
  runtime dependency on X Core, and the Semantic adapter mutates input despite
  the durable clone contract.

## Requirements

### R1. Preserve the working architecture

- Keep the public site statically generated and keep comments disabled in
  tracked configuration.
- Preserve readable public routes, content/Presentation separation, Experiment
  autonomy, static artifact validation, and operational/privacy boundaries.
- Prefer thin, behavior-preserving boundary changes over a repository rewrite,
  workspace conversion, plugin marketplace, or framework migration.

### R2. Reconcile authoritative documentation

- Make the root PRD, `.trellis/mainline.md`, and relevant frontend specs agree
  with implemented M5.1 state, current package/directory ownership, default
  Presentation behavior, X Core contracts, and build-versus-deployment release
  boundaries.
- Treat owner-local content inventory as observed state rather than a permanent
  architectural invariant; record current counts only where they are useful and
  avoid operational paths or identities.
- Remove or explicitly mark superseded concepts instead of retaining parallel
  contradictory statements.

### R3. Make validation deterministic and release-complete

- Separate repository-fixture tests from owner-workspace validation so local
  `config.dev` cannot change fixture ownership or negative-test behavior.
- Provide one documented verification entry point that runs the applicable
  type/static checks, unit/integration tests, builds, and site/NERV/publication
  browser gates in the correct order.
- Add repository-local automation only where it can use the existing `./sam`
  boundary without weakening Docker-only development or private-data rules.
- Preserve failure reports and classify unavailable browser or external checks
  honestly.

### R4. Stabilize the comments contract boundary

- After the Unicode route task lands, give the site, service, and assembler one
  explicit private comments-contract dependency for route conversion, public
  export decoding/types, and digest validation.
- Remove assembler-to-site-source imports and repository-layout probing where a
  declared package contract can own the behavior.
- Keep service-only state, secrets, moderation data, and runtime configuration
  out of the shared public/build contract.

### R5. Restore X Core and route ownership boundaries

- Keep X Core focused on normalized content and Presentation contracts; move or
  remove generic plugin-host capabilities that do not belong to that boundary.
- Preserve the statically registered comments integration without creating a
  runtime plugin marketplace.
- Establish one shared pure canonical-route projection contract for the site
  and Astro context adapter, without changing existing public routes.
- Correct adapter package dependency declarations and make the Semantic adapter
  implementation and tests agree with the approved non-mutating transform
  contract.

### R6. Reduce maintainability and operational risk incrementally

- Split oversized Terminal runtime/controller responsibilities only behind
  existing public APIs and regression coverage; file length alone is not a
  refactor target.
- Before public comments enablement, define the minimum request logging,
  health/metrics, and operational evidence required for the dynamic service.
- Clarify whether assembler candidate promotion is only a build boundary or is
  expected to provide durable deployment crash recovery; implement recovery
  only if the latter is an approved requirement.

## Planned child deliverables and dependencies

1. **Documentation convergence**: PRD/mainline/spec correction. Can start after
   the Unicode task is archived.
2. **Deterministic validation gate**: fixture isolation plus a complete verify
   command. Can start after the Unicode task and may run in parallel with
   documentation convergence.
3. **Comments contract extraction**: depends on the Unicode converter and its
   tests being stable; must finish before plugin-host changes that touch the same
   site integration.
4. **X Core/plugin and canonical-route boundary cleanup**: depends on comments
   contract extraction where files overlap.
5. **Adapter/package contract cleanup**: may run after deterministic validation
   exists and can be checked independently from plugin-host cleanup.
6. **Release/observability hardening**: last; its exact scope depends on whether
   comments public enablement or repository-owned deployment recovery is being
   pursued.

Each child must repeat its real dependency in its own `prd.md` and
`implement.md`; parent/child tree position is not treated as scheduling.

## Acceptance Criteria

- [ ] `08-27-m51-unicode-route-compatibility` is archived before any remediation
      child enters implementation.
- [ ] Root PRD, mainline, and durable specs contain no known contradictions for
      M5.1 status, default Presentation, current package layout, X Core scope, or
      release ownership.
- [ ] Repository fixture tests pass regardless of `config.dev` or an external
      `FIREFLY_CONTENT_ROOT`, while a separate command validates an explicitly
      selected owner workspace.
- [ ] A documented full verification entry point includes the applicable
      non-browser checks and all three existing Playwright surfaces, with no
      private data or remote service requirement.
- [ ] The assembler no longer imports `apps/site/src/**`, and the site, service,
      and assembler consume one declared comments public/build contract.
- [ ] X Core no longer owns unused publication/service plugin-host behavior; the
      static comments integration and existing public output remain unchanged.
- [ ] Canonical route projection has one reusable rule source, Terminal declares
      its runtime dependency correctly, and both production adapters satisfy
      their documented transform contract.
- [ ] Any Terminal decomposition preserves exported APIs and focused/unit/full
      browser behavior; no change is justified only by line count.
- [ ] Dynamic-service observability and release crash-recovery items are either
      implemented with tests or explicitly deferred with an owner-approved
      boundary and rationale.
- [ ] Every child passes its focused validation and final full-scope Trellis
      check without enabling comments, contacting deployment, or committing
      owner-local/generated/private inputs.

## Out of scope

- Implementing this parent task as one diff.
- Changing public URLs, content slugs, authored content, or Presentation UX.
- Public comments enablement, SMTP/provider testing, deployment, credential
  changes, or production data migration.
- Converting the repository to npm workspaces or publishing private packages.
- Introducing a third-party plugin marketplace, a generalized framework, or a
  broad Terminal rewrite.

## Open questions

None block creation of the parent task. Product decisions for observability and
deployment crash recovery must be resolved in the owning child task before that
child can leave planning.
