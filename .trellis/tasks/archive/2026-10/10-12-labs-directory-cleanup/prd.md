# Labs Directory Cleanup

## Goal

Use `labs/` as the independent-experience source directory and remove the unused
`services/memos/` directory while preserving publication and local material.

## Background

The owner requested task creation, renaming `experiments` to `labs` if feasible,
and removing `services/memos` if unused. Independent NERV/MAJO source currently
lives under `experiments/`; default discovery is hardcoded in
`tooling/validate-experiments/src/index.ts:379`. Root scripts, Docker installs,
tests and ignore rules also contain source paths. Public mounts use `/lab/`.

`services/memos/README.md:3` and the retired Memo service contract confirm that
the visitor service was retired. Only the README is tracked. Ignored local
dependencies, compiled files and historical browser evidence remain. Active
imports, scripts, Compose and proxy wiring have no consumer of this directory.

## Requirements

- R1: Move the complete source directory to `labs/`, preserving tracked files
  and ignored local inputs, especially MAJO media.
- R2: Synchronize default discovery, root/Docker commands, source-path fixtures,
  protected source-root lists, ignore rules and current engineering/path docs.
- R3: Remove `services/memos/` from the repository after preserving its local
  remnants outside the repository. Keep the existing retirement/recovery spec.
- R4: Preserve public `/lab/` routes, `experiment.json` schema, Experiment APIs,
  package/command names, `artifacts/experiments/` format, Memo reading, private
  state, authored documents and historical task/journal records.

## Acceptance Criteria

- AC1 (R1): Source and local-input fingerprints match after the move; both
  packages live below `labs/` and no root `experiments/` directory remains.
- AC2 (R2): Default discovery produces the same NERV/MAJO catalog under `labs`;
  affected checks/tests and the source-to-publication build pass, including
  existing containment and assembly rollback coverage.
- AC3 (R2, R4): Media, dependencies and generated reports/artifacts stay ignored.
  Active source-path references use `labs`; retained `experiments` references
  have identified semantic, artifact or historical roles.
- AC4 (R3): `services/memos/` is absent and its local remnants are recoverable
  outside the repository. No maintained command depends on it.
- AC5 (R3, R4): Rebuilt publication retains canonical lab mounts and current
  Memo reading; private state and historical evidence remain intact.

## Out of Scope

Renaming semantic Experiment interfaces/manifests/commands/artifacts or public
URLs; deleting private Memo data; modifying document content, visuals or service
behavior; stopping unrelated processes; deployment, push or automatic commits.

## Planning Status

The owner approved the final planning summary on 2026-10-12 ("可以").
Implementation and all five acceptance criteria are complete. Evidence is in
`research/validation.md`. The owner subsequently authorized submission; work
commit `afcfcc7` records the reviewed changes. Standard archival and session
bookkeeping complete this task. Task status is now `completed` and the records
are archived under `.trellis/tasks/archive/2026-10/10-12-labs-directory-cleanup/`.
No remote push or deployment is included.
