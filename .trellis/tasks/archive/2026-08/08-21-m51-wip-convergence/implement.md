# M5.1 WIP convergence — implementation plan

## Ordered checklist

1. Verify the parent and child planning artifacts, current task pointers, dirty
   worktree, and exact owner WIP boundaries. Do not run `task.py start` until
   the final planning summary is approved.
2. Establish Node `>=22.13.0` and lock the validation environment. If the
   required runtime is unavailable, stop before claiming full validation and
   record the blocker.
3. Start `08-21-comments-config-boundary` and inspect/repair only its owned
   files. Add tests for public projection, secret rejection, environment
   precedence, config-path resolution, and disabled-build behavior.
4. Run the child’s type check, tests, build, and relevant site content/config
   tests. Review the staged diff for public/private leakage.
5. Start `08-21-publication-route-alignment` only after the comments child is
   green. Align route fixtures/probes and verify the assembler’s nested-post
   handling without weakening path/reference safety.
6. Run assembler tests, affected site content/static-output tests, and the
   assembled-publication browser test if the local browser/runtime is
   available.
7. Run parent validation: `npm run check:m51`, `npm run test:m51`,
   `npm run build:m51`, shell syntax/format/lint checks, and the existing
   publication/runtime probes. Use the repository’s `./sam` wrapper where the
   command is part of the project contract.
8. Update `.trellis/spec/frontend/` only with durable contracts learned from
   the final implementation. Update parent/child evidence with command,
   result, environment, and residual-risk records.
9. Reconcile `.trellis/mainline.md`, review the exact staged file list, and
   prepare the commit body/attribution according to project convention.
10. Run the final quality gate, archive child tasks serially, then archive the
    parent and record the session wrap-up. Do not claim completion while any
    required validation or archival step is missing.

## Validation commands

```sh
node --version                         # must be >= 22.13.0
git diff --check
npm run check:comments
npm run test:comments
npm run test:content:site
npm run test:assembler
npm run check:m51
npm run test:m51
npm run build:m51
bash -n sam package-runtime.sh
```

Also run the repository-prescribed ShellCheck/shfmt, Docker runtime probes,
and publication Playwright checks when their tools are available. Capture
failures rather than weakening acceptance criteria to fit an unavailable
environment.

## Risk and rollback points

- The existing dirty worktree is owner data. Before each child, record the
  child file set; do not use broad restore/clean commands.
- The service Dockerfile changes build context and runtime paths. Verify the
  root-context build and read-only config mount before treating it as ready.
- Route fixture updates can hide a stale canonical path. Search the affected
  runtime/test surfaces after the child passes.
- Mainline status is a control record, not a product behavior change; update it
  only after the implementation and evidence are complete.

## Completed validation and integration

- Child `comments-config-boundary` archived after commit `433c16d`; all four
  previously untracked comments source files are now intentional tracked
  source. Its Node `v22.23.1` checks, service/site tests, Docker probe, shell
  checks, and privacy scan passed.
- Child `publication-route-alignment` archived after commit `6f60776`; its
  canonical route, deeper authored-post regression, assembler 7/7, content
  36/36, publication Playwright 4/4, runtime probes, and shell checks passed.
- Parent-level `./sam` checks, tests, and build passed under Node `v22.23.1`;
  `./package-runtime.sh` and the exact publication browser suite also passed.
  The comments child already passed its root-context image/read-only runtime
  probe; the final parent rerun built the image but its duplicate runtime probe
  was interrupted, so that duplicate is not claimed as a pass. The one
  interrupted `./sam npm run check:m4` invocation is likewise not claimed as a
  pass. The tracked site remains comments-disabled and no external service or
  credential was provisioned.
- Durable specs now document the shared comments runtime path/SMTP validation
  boundary and shape-based deeper authored-post classification. The mainline
  record is reconciled before parent archival.
