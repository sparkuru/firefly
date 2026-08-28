# Comments contract extraction implementation plan

## 1. Reconfirm context and readiness

- Read this task’s PRD/design, the parent remediation PRD, the comments,
  directory, quality, type-safety, publication, code-reuse, and cross-layer
  specs, plus the boundary research matrix.
- Confirm archived prerequisites, current mainline status, and a diff limited
  to task-control files before implementation. Do not read ignored owner config,
  secrets, or external content.
- Before writing product code, load `trellis-before-dev` for the affected
  repository layers and record any refreshed spec context.

## 2. Implement the shared contract first

- Add `plugins/comments/public.mjs` and `public.d.mts` with the public model,
  route facade, pure validators/normalizers, parent checks, sorting, digest,
  serialization/export creation, and frozen empty/decoded values.
- Reuse the existing route implementation through the contract facade; do not
  copy route encoding logic into the new module. Keep config parsing and runtime
  namespace types out of the public module.
- Preserve accepted schema/digest behavior and error wording needed by the
  existing fixtures; expose a generic contract error independent of service
  error classes.
- Add shared Node tests and a root `test:comments-contract` delegate so the
  contract is executed by the deterministic `test:m51` path.

## 3. Reduce the site adapter

- Replace the local decoder/constants/normalizers/hash in
  `apps/site/src/lib/comments.mjs` with imports/re-exports from the shared
  contract. Keep only contained JSON loading, disabled/empty handling, fixed
  module-root resolution, route conversion/grouping, collision detection, and
  raw href mapping.
- Update `apps/site/src/lib/comments.d.ts` to re-export shared public types and
  retain the site loader/grouping signatures. Keep plugin/UI wrappers stable.
- Move the Unicode fixture-preparation route import to the public contract.

## 4. Reduce the service adapter without leaking private state

- Re-export shared public types from `services/comments/src/types.ts`; retain
  private service/storage/notification declarations and constants that are not
  part of the public projection.
- Replace duplicated public-export logic in `services/comments/src/validation.ts`
  with compiled-path-safe loading of the shared contract and thin error-
  translating wrappers. Keep submission validation and service-specific error
  codes/statuses local.
- Preserve `services/comments/src/export.ts` and `service.ts` public APIs; if
  export creation currently mutates a decoded object, switch to the shared
  immutable result without changing serialized fields.
- Move the route-catalog operation’s predicate import to the public contract.

## 5. Decouple the publication bridge

- Update `tooling/assemble-publication/src/plugins/comments.ts` to load the
  repository-owned public contract (with a narrow test injection only if
  needed), remove `apps/site/src/lib/comments.mjs` and its type cast, and keep
  all existing contained path, surface, route, digest, and metadata checks.
- Add focused coverage for contract loading/decoder use and source-import
  absence without copying the site package into temporary fixtures.

## 6. Durable docs and task controls

- Update `plugins/comments/README.md`,
  `.trellis/spec/frontend/comments-publication-contract.md`, and
  `.trellis/spec/frontend/directory-structure.md` to name the shared contract,
  its public-only scope, and the three adapter responsibilities. Keep the
  existing static/private and disabled-default rules.
- Correct the stale owner-decision sentence in `.trellis/mainline.md` so it
  identifies documentation and deterministic validation as archived and this
  comments-contract child as the current planning item; do not add product
  enablement or operational values.
- Curate real spec/research entries in `implement.jsonl` and `check.jsonl`,
  then run task validation before requesting implementation approval.

## 7. Focused verification and review gates

Run through the approved `./sam` boundary, in dependency order:

```sh
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-28-comments-contract-extraction
./sam npm run check:comments
./sam npm run test:comments-contract
./sam npm run test:comments
./sam npm --prefix tooling/assemble-publication run check
./sam npm --prefix tooling/assemble-publication run test
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
./verify.sh
git diff --check
```

The complete gate is expected to be deterministic and comments-disabled. If a
package or browser prerequisite is unavailable, retain its exact failure and
do not claim a pass. Inspect the final diff for `apps/site/src` imports in the
assembler, duplicate decoder/digest code, private fields, owner paths,
generated output, and unrelated X Core/adapter/release changes.

Dispatch an independent Trellis check after implementation. If it finds a
behavior change, package-path failure, skipped contract test, or privacy leak,
return to the owning implementation step before commit.

## 8. Rollback points

1. Before adding the contract: preserve the existing focused site/service
   fixtures and service/publication API behavior.
2. Before adapter removal: verify the shared contract test reproduces the
   existing valid, Unicode, malformed, parent, and digest cases.
3. Before changing compiled imports: run package check/build and confirm the
   emitted service/assembler paths resolve the repository module; never restore
   a site-source fallback.
4. Before doc/spec changes: ensure only ownership/boundary wording changes and
   no public enablement or runtime details are introduced.
5. Before commit/archive: pass the independent check, task validation, full
   deterministic gate, privacy/scope review, and `git diff --check`. A source
   revert is sufficient rollback; generated reports remain ignored.
