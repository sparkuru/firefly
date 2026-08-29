# Release recovery boundary research

## Question

Does this repository own production release crash recovery, or should the
release/observability child only document the boundary and defer that work?

## Evidence

- `tooling/assemble-publication/src/index.ts` creates repository-local
  candidate trees, validates their inventories/references, and promotes the
  `artifacts/` and `dist/` targets together. If an in-process rename fails, it
  restores the prior local targets and removes unfinished candidates.
- The assembler also refuses a comments tombstone epoch lower than the
  published local epoch. This is an anti-rollback data-safety guard and must
  remain authoritative.
- The root `prd.md` defines the production shape as immutable deployment
  releases under `releases/<release-id>/` with an operator-managed `current`
  link. It assigns release creation, current switching, crash recovery, and
  production rollback to the deployment environment.
- `Dockerfile`, `package-runtime.sh`, and `nginx.conf` validate and serve a
  local static publication image; none manages a deployment release directory,
  remote state, or a durable current-link transaction.
- Existing assembler tests cover deterministic output, private/unsafe release
  rejection, comment tombstone evidence, and refusal of an older rollback.

## Decision

Repository-owned deployment crash recovery is explicitly deferred in this
child. The child may document the boundary and retain the existing local
candidate rollback tests, but it must not introduce a new release-state model,
remote deployment adapter, symlink manager, or recovery daemon.

Any future deployment-recovery task requires an owner-approved deployment
state owner, release identity and retention rules, crash/interruption model,
rollback authority, private target environment, and recovery drill. Public
comments enablement remains a separate task with its own SMTP, proxy, browser,
backup/restore, and controlled public validation gates.
