# Documentation convergence implementation plan

## 1. Confirm evidence and scope

- Re-read the parent PRD, this task's `prd.md`/`design.md`, the authority matrix,
  and the four owning frontend specs.
- Confirm the Unicode compatibility task remains archived and the worktree has
  no unrelated changes.
- Record the pre-edit targeted-search results; do not inspect owner-local config,
  content roots, deployment inputs, or ignored artifacts.

## 2. Reconcile root PRD

- Correct the directory tree, X Core signature, Presentation defaults, M5.1
  status, inventory language, milestone/current decisions, and release ownership.
- Preserve product rationale and historical SQL facts; do not rewrite the PRD as
  a changelog or copy detailed implementation specs into it.

## 3. Reconcile mainline

- Update only current status/decision/evidence sections that are stale.
- Preserve the historical ledger and privacy-redacted production evidence.
- Make the P1 remediation parent the next guided initiative and keep public
  comments enablement separately gated.

## 4. Reconcile executable specs

- Patch `directory-structure.md`, `x-core-contract.md`,
  `quality-guidelines.md`, and `publication-contract.md` at their existing owning
  scenarios.
- Keep target boundaries normative while marking audited current deviations as
  temporary follow-up inputs.
- Do not create new spec files, principle-only duplicates, or requirements for
  code changes in this documentation child.

## 5. Validate convergence

Run targeted searches for:

```sh
rg -n "content-contract|validate-content|Terminal is the first non-default|Terminal 是首个非默认|incompatible non-ASCII|incompatible route gap|事项保持 deferred|需重新授权" prd.md .trellis/mainline.md .trellis/spec/frontend
rg -n "95|93|exactly ten HTML|exactly ten default" prd.md .trellis/mainline.md .trellis/spec/frontend
```

Every hit must be either removed, qualified as dated/historical evidence, or
explicitly labelled as a current remediation gap. Then verify:

```sh
git diff --check
python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-28-repository-docs-convergence
```

Also verify referenced paths with `test -e`/`rg --files` and commit references
with `git rev-parse --verify`. Review the final diff for documentation-only
scope and privacy-safe values.

## 6. Final review

- Run an independent Trellis check focused on authority conflicts, lost product
  decisions, accidental normalization of known defects, and stale next-work
  guidance.
- If review changes product scope or the target architecture, return to planning;
  corrections that only improve evidence fidelity remain in this task.
- Present final evidence and request the normal Phase 3.4 commit confirmation.

## Rollback points

1. Before root PRD edits: retain the evidence matrix as the comparison baseline.
2. Before mainline edits: preserve historical evidence and only replace current
   status/decision text.
3. Before spec edits: confirm each change stays inside the existing owning
   scenario and does not authorize a future code refactor.
