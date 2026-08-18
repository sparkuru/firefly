# Implementation Plan: Shell-Intuitive Document Paths

## Ordered checklist

1. [x] Before editing, load the frontend and content-workspace guidance and
       confirm the task is `in_progress`.
2. [x] Add a narrow root-resource mount detector in
       `presentations/terminal/src/vfs/paths.ts`; support `posts/`, `pages/`,
       and `lab/` with an optional leading `./` only at virtual root.
3. [x] Preserve the existing posts-default fallback, absolute paths, nested
       cwd behavior, and resource safety restrictions.
4. [x] Update `cat` to distinguish experiments/directories from unknown
       resources and provide actionable commands; remove the stale absolute
       pages claim from generic read errors.
5. [x] Update the `vim` resource error wording so it describes the new
       mount-qualified path behavior accurately.
6. [x] Extend neutral-shell and Terminal runtime tests for root `pages`,
       dotted root `pages`, explicit `posts`, `grep`/`vim` consistency, and the
       `cat lab/nerv` navigation error.
7. [x] Update `apps/site/tests/terminal.spec.ts` to assert the new page reads,
       keep absolute-page coverage, and assert the experiment hint if exposed
       in the interactive stream.
8. [x] Run package type-check/build/tests, then run the focused site Terminal
       browser test using the repository's `./sam` Playwright boundary.
9. [x] Review the diff for stale path wording, accidental `..` support,
       host-path exposure, and changes outside the approved scope.

## Validation commands

From the repository root:

```bash
./sam npm --prefix presentations/terminal run check
./sam npm --prefix presentations/terminal run build
./sam npm --prefix presentations/terminal run test
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/terminal.spec.ts
```

If the browser command is unavailable, record its exact error and do not count
it as passed. The focused Terminal package tests remain the first failure
localization gate.

## Risk and rollback points

- **Resolver risk:** a broad change could make nested relative operands escape
  posts. Keep the new branch gated by `cwd === '/'`, `mode === 'resource'`,
  and an explicit mount prefix.
- **Error-contract risk:** update exact assertions together with messages;
  unknown paths must remain non-disclosing.
- **Completion risk:** execution and existing completion may diverge. Add
  root-context completion assertions before declaring the task complete.
- **Rollback:** revert the resolver helper/branch, `cat`/`vim` message changes,
  and the corresponding tests as one unit; no content or generated artifact
  rollback is needed.
