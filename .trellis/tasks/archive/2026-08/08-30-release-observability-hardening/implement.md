# Release and observability hardening implementation plan

## 1. Preconditions

- [x] Confirm the owner-approved scope in `prd.md`: private comments
      observability only; deployment crash recovery is explicitly deferred.
- [x] Keep comments disabled and do not use deployment, SMTP, credentials, or
      production data.
- [x] Curate both sub-agent context manifests with real spec/research entries.
- [x] Run `task.py validate` and complete the Phase 1 review before
      `task.py start`.

## 2. Implement the observability core

- [x] Add the package-local metrics/logging module described in `design.md`.
- [x] Keep method and route labels finite and discard all variable path,
      query, header, body, token, identity, and filesystem values.
- [x] Format deterministic Prometheus counters and duration sums/counts without
      adding a telemetry dependency or persistent state.
- [x] Make request-id and monotonic-time factories injectable for tests while
      retaining random UUID and monotonic-clock production defaults.

## 3. Wire service and HTTP behavior

- [x] Add service lifecycle/readiness state backed by a repository metadata read;
      readiness must fail closed after close or dependency failure.
- [x] Preserve `/healthz` response/status and all existing route/error behavior.
- [x] Add private `/readyz` and `/metrics` responses with no sensitive error
      detail and no Nginx public proxy route.
- [x] Record one bounded request event after every completed request, including
      failures, without logging raw exception text.

## 4. Tests and documentation

- [x] Extend `services/comments/tests/http.test.ts` for liveness, readiness,
      not-ready behavior, request-log shape/privacy, route taxonomy, and metric
      output.
- [x] Add focused unit coverage for collector sorting, label escaping, and
      bounded values if the implementation introduces separate helpers.
- [x] Update `services/comments/README.md` with privacy, retention/access,
      endpoint, and reset semantics.
- [x] During Phase 3.3, update the durable Trellis Plus release/observability
      contract with the accepted repository/deployment boundary and exact
      validation expectations.

## 5. Validation gates

Run the focused service gates through the project boundary:

```sh
./sam npm run install:comments
./sam npm run check:comments
./sam npm run test:comments
./sam npm run build:comments
```

Run the unchanged assembler gates because the task records release-boundary
evidence:

```sh
./sam npm run check:assembler
./sam npm run test:assembler
./sam npm run build:assembler
```

Then run the applicable full repository gate:

```sh
./verify.sh
```

The full gate must retain the existing publication epoch guard behavior. If it
reaches an already-published newer tombstone epoch, record the exact blocker
and confirm that no publication state was changed; do not lower the epoch or
weaken the guard.

### Completed validation record (2026-08-30)

- Focused comments install/check/test/build passed; comments tests: 59/59.
- Unchanged assembler check/test/build passed; assembler tests: 8/8.
- `./verify.sh` reached the existing publication guard and stopped with
  `comments tombstone epoch 0 predates the published epoch 4; refusing
  rollback.` All preceding checks, tests, and builds passed; browser suites
  were not reached and publication state remained unchanged.
- `task.py validate` and `git diff --check` passed; no comments lint script is
  declared.

## 6. Review and rollback points

- Before implementation: review the final planning summary and explicitly
  approve the task start in a later user turn.
- After HTTP wiring: inspect the diff for raw URL, query, body, header, token,
  email, IP, user-agent, origin, path, and exception leakage.
- Before commit: run the focused tests, full check, final diff review, and
  `task.py validate`; verify comments remain disabled and no generated/private
  files are staged.
- If a gate fails because of observability wiring, revert only this child's
  implementation/docs/tests and preserve all pre-existing comments/publication
  boundaries. Deployment recovery remains deferred.
