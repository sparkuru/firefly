# Completion stability commit plan

The owner previously authorized commits during this ongoing Terminal refinement
and confirmed a separate tracking task for the reported follow-up bug. Reuse that
authorization for the verified focused repair; no new product/deployment scope.

Submit-ready classification: human-optional. Relevant coordinate, focus, key,
selection and reading checks passed, and independent review has no blocker.
A visual preference check remains optional in the existing local preview.

Work commit `fix(site): keep visible completion stationary` includes exactly:

- `apps/site/src/scripts/terminal-home.ts`
- `apps/site/tests/terminal-refinement.spec.ts`
- `.trellis/spec/frontend/terminal-reading-contract.md`
- `.trellis/mainline.md`
- `.trellis/tasks/10-09-terminal-completion-viewport-stability/prd.md`
- `.trellis/tasks/10-09-terminal-completion-viewport-stability/task.json`
- `.trellis/tasks/10-09-terminal-completion-viewport-stability/research/scroll-cause.md`
- `.trellis/tasks/10-09-terminal-completion-viewport-stability/research/validation.md`
- `.trellis/tasks/10-09-terminal-completion-viewport-stability/research/commit-plan.md`

No unrecognized dirty path is present. Generated reports, earlier captures,
content output and JSONL runtime context remain ignored and unstaged.

After preview readiness, stage only the controller, existing regression test,
updated Terminal reading contract/mainline and this task's explicit records.
Commit the work as `fix(site): keep visible completion stationary`. Then use
the supported `task.py archive ... --no-commit` route, inspect and stage only
this task's source/destination and continuity record, and create the separate
archive commit with exactly one Codex attribution trailer. Record the developer
journal with the work commit only. No push, amend or production deployment.

Work commit executed: `8617d83`. Preview readiness and exact rebuilt entry-script serving passed before commit. Archive/journal follow the reviewed plan.
