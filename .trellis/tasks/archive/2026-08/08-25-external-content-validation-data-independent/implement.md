# Implementation plan

1. Update `apps/site/tests/static-output.test.mjs` to make marker assertions
   conditional on active generated content while retaining unsupported-marker
   rejection and correct `featured` label checks.
2. Update `tooling/format-content.sh` help/result wording to state that the
   command checks missing frontmatter only and that project build validation is
   separate. Preserve output compatibility where practical.
3. Run focused formatter checks: `bash -n`, ShellCheck, shfmt, schema registry
   printing, fixture check/write/idempotence, and the external workspace
   read-only check. Do not record the external runtime path in task artifacts.
4. Run project checks through `./sam`: content tests, Astro check, and the site
   build/static-output tests against the repository fixture. Run the same
   applicable content/build validation against the external workspace without
   modifying the project task or source tree with its data.
5. Review `git diff --check`, task privacy, changed-file scope, and generated
   artifact status. Preserve unrelated pre-existing changes.

## Risk and rollback points

- Primary risk: a conditional marker assertion could stop exercising positive
  output. Mitigate by keeping direct marker unit coverage and preserving the
  repository fixture's positive case.
- Primary rollback point: revert the static test and formatter messaging only;
  the already repaired external content is independent of this task.
