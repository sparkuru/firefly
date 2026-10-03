# Memo service implementation plan

## Ordered checklist

1. Load `trellis-before-dev` guidance for the service, plugin contract, Docker,
   and operational layers.
2. Consume the accepted `memo-contract` package surface; do not copy its
   normalization or digest rules into service-only helpers.
3. Extend the shared runtime config/types/tests/examples for SMTP and the
   encryption-key reference, then add strict service secret/file loading and
   purpose-separated crypto helpers. Reject unsupported nonnull outboxPath.
4. Add atomic migrations and SQLite repository operations for submission plus
   encrypted outbox/rates, verification, moderation plus epoch/revision/audit,
   retention cleanup, and consistent exports. Inject failures to prove rollback.
5. Add public validation/HTTP responses, authenticated paginated admin routes,
   and the thin CLI. Prove generic responses, redirect/auth safety, byte limits,
   immutable approved-only export, and every lifecycle transition.
6. Add encrypted outbox claims/leases and injectable SMTP delivery. Test success,
   retry, crash/restart, expiry/cancellation and unavailable/wrong keys with no
   real delivery. Provide local maintenance and one-shot mail drain commands.
7. Add backup/restore operations, nonroot Docker image, private data root and
   health/readiness endpoints. Prove restore into an absent destination and
   persistence across disposable container recreation without published ports.
8. Run focused service and contract gates, independent full-scope review, then
   update durable specs and record remaining publication/runtime dependencies.

## Validation matrix

- Normal flow: submit -> verify -> pending -> approve -> export; private fields
  never appear in public DTO/JSON, CLI diagnostics, HTTP responses or logs.
- Invalid input: body/Unicode limits, malformed/repeated form fields, consent,
  honeypot, unknown keys, origin, unsupported type, rates and duplicate no-op.
- State/atomicity: replay/expiry, forbidden approval, terminal delete, repeated
  actions, approved removals, epoch overflow, transaction fault injection and
  consistent concurrent export metadata.
- Mail/retention: encrypted-at-rest recipient/token, authentication-tag/purpose
  failures, worker lease conflict, bounded retries, startup cleanup, restart
  rates and token expiry without accidental publication.
- Operations: fresh/failed migration, safe path and secret modes, checksum and
  integrity failures, restore no-overwrite, required keys, imported contract
  helper availability in built image and persistent state after recreation.
- Tests use injected clocks/transports and disposable private directories;
  no sleep-based expiry tests or production data/credentials.

## Validation commands

- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos ci`
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run check`
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run test`
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam npm --prefix services/memos run build`
- `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node --test plugins/memos/tests/*.test.mjs`
- Focused Docker image build/health/recreation checks at the host Docker
  boundary using disposable fixtures and no production credentials. Do not
  invoke Docker through `./sam`, which is the Node/development command wrapper.

## Dependencies and rollback

- The contract dependency is implemented and reviewed in `c9885e6`.
- The service database and email/token crypto are private-state boundaries;
  migrations and backup/restore are rollback points.
- Do not alter comments migrations or reuse comments tables. Coordinated memo
  config extensions belong to this child and require contract regression
  tests; do not rewrite the completed contract task or change its public v1
  export shape.

## Review gate and downstream handoff

- The owner approved current project progress and requested implementation on
  2026-10-03. The existing `prd.md`, `design.md`, `implement.md`, research and
  both context manifests were reviewed without changing service scope; both
  manifests passed validation before this child was activated.
- Review includes the precedent-based TTL, rate, retention, duplicate and
  rejection defaults; these must not be silently changed during implementation.
- The site child consumes the exact submission fields/status behavior in this
  design. The publication/runtime child must add trusted proxy address handling,
  mail-worker scheduling, same-origin routing, Compose and prior-epoch checks.
- Local fake-mail tests do not certify real SMTP delivery, DNS/TLS, or a
  production recovery procedure.

## Implementation and final verification — 2026-10-03

- Implemented `services/memos/` with its own package/lockfile, transactional
  SQLite migration/lifecycle, encrypted email/outbox, persistent rates/dedupe,
  retention, exact export, HTTP, admin CLI, SMTP, operations, snapshot recovery,
  nonroot image and repeatable `ops/check-image.sh`.
- Extended only the memo runtime config/declarations/tests and neutral config
  and secret examples. Owner-local config/secrets are ignored. Comments, site
  rendering, root runtime wiring and publication tooling were not changed.
- Independent full-scope review fixed secret-file restore key-ID loading,
  unvalidated/unbounded CLI success responses, incomplete database schema
  verification and SMTP sender-validation drift. Added complete 18-edge
  moderation tests and TLS certificate rejection tests; no findings remain.
- Final service check/build and 29/29 tests passed through `./sam` with the
  tracked content root. Pure memo contract regressions passed 12/12.
- Strict declaration consumption passed without `skipLibCheck`:
  `FIREFLY_CONTENT_ROOT="$PWD/content" ./sam node services/memos/node_modules/typescript/bin/tsc --strict --noEmit --module NodeNext --moduleResolution NodeNext --target ES2022 --lib ES2022 --typeRoots services/memos/node_modules/@types --types node plugins/memos/tests/declarations.mts`.
  The Node-only probe avoids the pinned Node/TypeScript DOM `URLPattern`
  declaration collision without suppressing declaration checks.
- `bash -n`, `shellcheck`, and `shfmt -d` passed for
  `services/memos/ops/check-image.sh`. Tracked and new-source whitespace checks
  passed.
- Final host-Docker `services/memos/ops/check-image.sh` passed image build,
  health/readiness, nonroot/private modes, no published ports and recreation
  persistence for approved memos, rates and pending encrypted mail. Network was
  disabled; exact fixture containers/volumes were removed.
- Test TLS material is explicitly synthetic/public. No real credentials,
  historical records, real SMTP delivery or production probes were used.
- The owner confirmed the Phase 3.4 commit plan on 2026-10-04. Work commit
  `bcbca34` contains the reviewed source/config/spec changes. Site and
  publication/runtime remain separate tasks.

## Owner-approved work commit

`feat: add independent memo service`

Include only the reviewed source/config/spec changes:

- `services/memos/` source, tests, migration, image, operations, package files
  and README; ignored dependencies/build output are excluded.
- `plugins/memos/config.mjs`, `plugins/memos/config.d.mts`,
  `plugins/memos/tests/config.test.mjs`,
  `plugins/memos/tests/declarations.mts`.
- `config/plugins/memos/config.toml.example`,
  `config/plugins/memos/secrets.env.example`, `.gitignore`.
- `.trellis/spec/frontend/memo-service-contract.md`,
  `.trellis/spec/frontend/memo-contract.md`,
  `.trellis/spec/frontend/architecture-contract.md`,
  `.trellis/spec/frontend/directory-structure.md`,
  `.trellis/spec/frontend/index.md`.

The pre-existing task directories are excluded from the work commit. The
service task's reviewed planning/acceptance records are managed by its
subsequent archive commit; parent progress remains in its own task record.
The owner confirmed this plan on 2026-10-04 and work commit `bcbca34` was
created. Archive only this service task and record the session. Leave unrelated
site/publication planning files untouched; do not push or start another product
task automatically.
