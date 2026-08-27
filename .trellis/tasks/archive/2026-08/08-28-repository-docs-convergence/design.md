# Documentation convergence design

## 1. Authority model

The task will not choose one document as universal authority. Each layer owns a
different kind of statement:

| Layer | Owns | Must not claim |
| --- | --- | --- |
| Source, manifests, tests | Current implemented shape and behavior | Product approval or durable intent |
| Archived tasks and commits | Historical decisions and completed evidence | Current implementation when later work superseded it |
| Root `prd.md` | Product boundaries, accepted milestones, and durable product decisions | Mutable test counts or unimplemented package trees as current fact |
| `.trellis/mainline.md` | Current initiative status, ordered next work, and guided authorization | Stale blockers or implicit permission for the next phase |
| `.trellis/spec/frontend/*.md` | Executable target contracts and required validation | Accidental implementation defects as approved architecture |

When source differs from a durable spec and a later remediation child owns the
fix, the documentation must state both facts: the target contract remains
normative, and the present deviation is explicitly tracked. It must not silently
rewrite the spec to bless the defect or falsely say the code already complies.

## 2. Document change map

### Root PRD

- Replace the stale directory diagram with an implemented top-level ownership
  map derived from `directory-structure.md` and existing manifests.
- Update the X Core conceptual signatures from `packages/x-core/src/contracts.ts`.
- Correct `semantic`/`firefly` default wording and the “Terminal is non-default”
  decision.
- Add M5.1 to the milestone/current-decision narrative and remove deferred text.
- Qualify current content counts as a dated observation.
- Split build assembly from external immutable deployment ownership.

### Mainline

- Retain the historical evidence ledger but update the initiative decision,
  M5.1 row, latest completion evidence, and `Next Decision`.
- Point the next guided work at
  `.trellis/tasks/08-27-repository-audit-remediation/`, with this documentation
  child first and no serial authorization beyond user-approved task transitions.

### Durable specs

- `directory-structure.md`: current tree and dependency-deviation notes.
- `x-core-contract.md`: target X Core scope plus transitional generic plugin-host
  export and Semantic in-place transform warnings.
- `quality-guidelines.md`: workspace-relative inventory assertions rather than
  one global route count.
- `publication-contract.md`: repository transaction versus deployment switch.

No new spec file or index entry is required because the owning scenarios already
exist and retain their seven-section executable structure.

## 3. Consistency strategy

The implementation will edit one authority layer at a time, then run targeted
searches across all of them. Closed or superseded phrases may remain only inside
clearly labelled historical evidence; current-state and next-decision sections
must not repeat them.

Counts and validation totals are evidence with a date/fixture, never permanent
behavioral contracts. Paths in diagrams must be checked against the repository.
Commit references must resolve locally. Operational facts remain provider- and
identity-neutral.

## 4. Compatibility and rollback

This is documentation-only and changes no runtime behavior. Rollback is a source
revert of the affected Markdown files. If evidence proves a planned correction
wrong, retain the implemented fact and move the unresolved interpretation back
to this task rather than editing code or making a product decision by inference.

The main risk is erasing the distinction between “current deviation” and
“approved target.” The authority model and targeted consistency searches are the
control for that risk.
