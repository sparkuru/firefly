# Adapter/package contract cleanup — implementation plan

## Ordered checklist

1. Re-read the active task artifacts and the X Core, frontend runtime, and
   validation-profile specs. Confirm the worktree contains only the task-tree
   bookkeeping changes already known to this session.
2. Move @firefly/x-core from devDependencies to dependencies in both
   presentation manifests. Update only the matching package-lock root entries
   and dependency metadata needed by npm ci.
3. Add the Semantic package-local HAST clone boundary, keep the existing
   recursive wide-content behavior unchanged, and add a regression that
   snapshots the source tree before transformation and checks distinct output
   identity.
4. Run focused package checks, tests, and builds in dependency order. Inspect
   package-lock diffs and generated output for unintended dependency or
   cross-presentation coupling.
5. Refresh the site from its own lockfile and run its X Core/content/check/build
   gates. Run the normal full repository fixture verification when the
   environment permits; preserve exact failure evidence if a pre-existing
   publication-state gate blocks it.
6. Run the final Trellis quality check, map every acceptance criterion to
   evidence, inspect git diff --check and the explicit path list, and leave
   commit/archive decisions to the main session.

## Validation commands

Focused package gates:

    ./sam npm --prefix presentations/semantic ci
    ./sam npm --prefix presentations/semantic run check
    ./sam npm --prefix presentations/semantic run test
    ./sam npm --prefix presentations/semantic run build
    ./sam npm --prefix presentations/terminal ci
    ./sam npm --prefix presentations/terminal run check
    ./sam npm --prefix presentations/terminal run test
    ./sam npm --prefix presentations/terminal run build

Affected consumer gates:

    ./sam npm --prefix apps/site ci
    ./sam npm --prefix apps/site run test:x-core
    ./sam npm --prefix apps/site run test:content
    ./sam npm --prefix apps/site run check
    ./sam npm --prefix apps/site run build

Full fixture and task gates:

    ./verify.sh
    python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-29-adapter-package-contract-cleanup
    git diff --check

If the full fixture command reaches an unrelated publication epoch or
deployment-state guard, do not mutate that state to make the task green.
Record the exact command, phase, and prior-state evidence instead.

## Risky files and rollback points

Risky files are the two package manifests and lockfiles, plus
presentations/semantic/src/index.ts and its test. A failure after dependency
metadata changes can be rolled back by reverting only those explicit files;
dist, node_modules, and browser reports are ignored generated artifacts and
  must not enter the commit.
