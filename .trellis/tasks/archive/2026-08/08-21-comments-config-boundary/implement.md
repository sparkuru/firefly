# Comments configuration boundary — implementation plan

1. Establish Node `>=22.13.0` and run the current comments check/test to
   distinguish environment failures from WIP failures.
2. Review the shared parser/types and add or repair negative/precedence cases
   without weakening strict public/private validation.
3. Review site projection and service loader integration, including config path,
   environment precedence, consent, outbox, and mailer behavior.
4. Review Docker root-context build, read-only config mount, `sam` forwarding,
   lockfile, staging example, README, and frontend/service specs.
5. Run:

   ```sh
   ./sam npm run check:comments
   ./sam npm run test:comments
   ./sam npm run test:content:site
   ./sam npm run build:comments
   ```

6. If Docker is available, run the documented root-context image/runtime
   probes without credentials. Record unavailable checks explicitly.
7. Review the exact child diff for secret/publication leakage before handing it
   to the parent integration review.

Rollback point: before staging, restore only named child paths if a repair is
not supported by the contract or tests.

## Completed validation

- `./sam node --version` reported Node `v22.23.1`.
- `./sam npm run check:m51`, `./sam npm run test:m51`, and
  `./sam npm run build:m51` passed, including the comments and site/content
  suites.
- `./sam npm run check:comments`, `./sam npm run test:comments`, and
  `./sam npm run build:comments` passed; the service suite reached 23 tests.
- Root-context comments image build and read-only runtime probing passed.
- `bash -n sam`, ShellCheck, shfmt, `git diff --check`, and the generated
  artifact privacy scan passed.
- Browser validation was not effective for this config/data-boundary change;
  no browser interaction contract changed.
