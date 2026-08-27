# Documentation convergence

## Goal

Make the root PRD, project mainline, and durable frontend specs describe one
coherent Firefly state after the completed M5.1 Unicode route work. A future
maintainer must be able to distinguish implemented behavior, approved durable
contracts, historical evidence, and known remediation work without treating a
stale statement as current authority.

This is the first child of `08-27-repository-audit-remediation`. It may enter
implementation because `08-27-m51-unicode-route-compatibility` is archived at
`.trellis/tasks/archive/2026-08/08-27-m51-unicode-route-compatibility/`.

## Background and confirmed facts

- The worktree was clean when this child entered planning on 2026-08-28.
- `prd.md:165-198` labels a tree containing nonexistent
  `packages/content-contract/`, `tooling/validate-content/`, and
  `content/assets/` entries as the current repository structure.
- `prd.md:250-259` calls Semantic the default document Presentation, while
  `packages/x-core/src/contracts.ts:4`, `presentations/terminal/src/index.ts`,
  and `.trellis/spec/frontend/x-core-contract.md:30-47` establish `firefly` as
  the default Terminal adapter and `semantic` as explicit opt-in.
- `prd.md:239-252` shows a stale Presentation adapter signature; the implemented
  `PresentationAdapter` consumes `NormalizedDocumentInput` and returns readonly
  enhancements with JSON-safe props.
- `prd.md:591` still calls M5.1 deferred and requiring re-authorization. M5.1
  service, static consumer, publication/provisioning, route-catalog, and Unicode
  compatibility tasks are implemented and archived; tracked comments remain
  disabled pending a separate owner enablement decision.
- `.trellis/mainline.md:28` and its `Next Decision` still report one incompatible
  non-ASCII route. Commit `bb7ee81` and the archived Unicode task closed that
  code gap locally without changing public URLs or enabling comments.
- The original SQL inventory of 93 posts and 7 pages is historical migration
  evidence. The 95/8 authored-workspace count recorded during M5 is an observed
  owner-workspace snapshot, not a permanent schema or build invariant.
- The repository assembler promotes ignored root `artifacts/` and `dist/`
  candidates together. The external immutable `releases/<release-id>/` plus
  `current` switch is a deployment boundary, not an assembler-owned repository
  directory layout.
- Durable specs correctly define several intended boundaries that current code
  has not yet fully reached: the assembler currently imports the site comments
  decoder by repository source path, X Core currently exports generic plugin
  publication/service capabilities, adapter manifests classify X Core as a
  development dependency, and fixed route-count assertions drift with the
  selected content workspace. These are remediation inputs, not new approved
  architecture.

## Requirements

### R1. Reconcile the root PRD

- Replace the stale current-directory tree with repository-backed top-level and
  ownership boundaries, including the internal comments plugin and private
  comments service.
- Make the conceptual X Core signatures agree with the implemented public
  contracts without turning X Core into a site, route, plugin-host, or deployment
  owner.
- State that `firefly`/Terminal is the default document Presentation and
  `semantic` is explicit opt-in; preserve the distinction between Presentation
  and Experiment.
- Record M5.1 as implemented/provisioned but disabled by default, including the
  completed Unicode compatibility boundary. Remove superseded deferred and
  re-authorization wording.
- Keep 93/7 as historical input evidence and qualify 95/8 as a dated observed
  workspace snapshot. Do not make mutable content counts an architectural or
  acceptance invariant.
- Separate repository build assembly (`artifacts/` plus `dist/`) from the
  operator-owned immutable deployment/release switch.

### R2. Reconcile the project mainline

- Update the M5.1 state and evidence with route-catalog and Unicode completion,
  while retaining tracked-disabled and privacy/operational boundaries.
- Replace the stale incompatible-route next decision with the approved P1
  repository-audit remediation parent and its serial child order.
- Keep public comments enablement as a separate guided owner decision; this
  documentation child must not imply approval to run SMTP, deployment, or
  public browser gates.
- Record only repository-safe task paths, commits, generic results, and
  redacted operational outcomes.

### R3. Reconcile durable frontend specs without blessing defects

- In `directory-structure.md`, describe the real current package tree and make
  known assembler-to-site and adapter dependency mismatches explicit temporary
  remediation gaps. Do not expand those dependencies or redefine them as the
  target architecture.
- In `x-core-contract.md`, preserve X Core's content/Presentation ownership and
  identify generic publication/service plugin-host exports as transitional code
  scheduled for the later X Core/plugin cleanup child. Keep adapter cloning as
  the normative contract while identifying Semantic's current in-place HAST
  wrapping as a later adapter-cleanup violation.
- In `quality-guidelines.md`, replace fixed whole-site route counts with
  inventory-derived assertions tied to the explicitly selected fixture or
  workspace. Exact counts may remain fixture-local test data, not a durable
  global invariant.
- In `publication-contract.md`, distinguish repository candidate promotion from
  external immutable deployment/crash-recovery ownership.
- Preserve each spec's executable signatures, validation matrix, cases, tests,
  and wrong/correct guidance; do not add principle-only duplicate sections.

### R4. Prove convergence mechanically

- Search all changed authoritative documents for superseded directory names,
  incorrect default-Presentation wording, the closed incompatible-route gap,
  M5.1 deferred/re-authorization claims, and unqualified mutable inventory
  counts.
- Verify every new repository/task/spec path and commit reference exists.
- Review the final diff for duplicated authority, operational/private values,
  and accidental code, config, or generated-file changes.
- Run `git diff --check` and validate this Trellis task's context manifests.

## Acceptance Criteria

- [x] Root `prd.md` matches the implemented top-level package layout and current
      `PresentationAdapter`/default Presentation behavior.
- [x] Root `prd.md` and `.trellis/mainline.md` describe M5.1 as implemented and
      provisioned but tracked-disabled, with the Unicode route gap closed.
- [x] Historical 93/7 input and the dated 95/8 observation are clearly separated;
      no mutable owner-workspace count is a durable architecture invariant.
- [x] Repository `artifacts/`/`dist/` promotion is clearly separated from the
      operator-owned immutable deployment switch and crash-recovery decision.
- [x] Relevant frontend specs state the intended dependency/X Core boundaries
      and explicitly classify current deviations as later remediation inputs.
- [x] Fixed whole-site route counts are not presented as valid for every selected
      content workspace.
- [x] Consistency searches find none of the targeted superseded claims outside
      explicitly labelled historical evidence or remediation notes.
- [x] Only documentation, Trellis planning/context files, and no operational or
      private values appear in the final diff; task validation and
      `git diff --check` pass.

## Out of scope

- Product code, tests, package manifests, build commands, CI, or browser fixture
  changes.
- Fixing the existing 16 content-versus-Playwright assertion failures; that
  belongs to the deterministic-validation child.
- Extracting the comments contract, removing X Core plugin-host code, changing
  canonical-route projection, correcting adapter dependencies, or making the
  Semantic adapter non-mutating.
- Public comments enablement, SMTP/provider tests, deployment, production
  changes, or release crash-recovery implementation.
- Reading or recording owner-local configuration, content paths, endpoints,
  identities, credentials, or raw operational output.
