# Publication route alignment — implementation plan

1. Search active source, tests, fixtures, scripts, and publication probes for
   stale `/posts/main/379/` references and classify historical evidence versus
   active contract.
2. Review the existing `segments.length >= 4` assembler change and its
   regression fixture for the narrowest safe behavior.
3. Align the comments fixture, package runtime probe, assembler test, and
   publication browser test with the canonical nested route.
4. Run:

   ```sh
   ./sam npm --prefix tooling/assemble-publication run check
   ./sam npm run test:assembler
   ./sam npm run test:content:site
   ./sam npm run check:assembler
   ```

5. Run assembled-publication browser/runtime probes when their local
   dependencies are available. Confirm route status, distinct 404 behavior,
   and publication inventory remain intact.
6. Hand the exact route diff and evidence to the parent integration review.

Rollback point: revert only the route fixture/probe and depth-regression hunks
if the canonical route is not present in the generated site.

## Completed validation

- `./sam node --version` reported Node `v22.23.1`.
- Assembler type-check and tests passed (7/7); the deeper route regression is
  covered alongside the ordinary authored post path.
- `./sam npm run test:content:site` passed (36/36).
- Full publication build/static output, canonical route probes, runtime
  packaging, and publication Playwright passed (4/4 desktop/mobile).
- `bash -n`, ShellCheck, shfmt, and `git diff --check` passed.
- Active runtime/test surfaces contain no `/posts/main/379/` reference. The
  configured site remains comments-disabled, so the comments-enabled rendering
  branch was not run; the fixture decoder/catalog binding probe passed.
- One `./sam npm run check:m4` invocation was interrupted after 14.9 seconds;
  no result is claimed for that invocation.
