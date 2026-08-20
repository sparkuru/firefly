# M5.1 Comment Service Core — Implementation Plan

1. Create the isolated package and strict TypeScript/test/build scripts.
2. Add shared public/private types, normalization, route and request
   validation, token/encryption helpers, and consent/version checks.
3. Add SQLite/WAL storage and migrations behind a repository interface.
4. Implement submission, verification, owner moderation, deletion/tombstones,
   retention, notification transport, and the health/public write endpoints.
5. Implement strict deterministic export generation and negative tests.
6. Run the package check, tests, and build through `./sam`; report unavailable
   container checks exactly if Docker access is not available.

Rollback is deleting the unreferenced service package before site integration;
no existing static output or publication state may be changed by this child.

## Implementation evidence

Implemented under `services/comments/`: Node 22 TypeScript with local
lockfile, strict validation, migrations, SQLite/WAL repository, encrypted
private email, hashed verification/control tokens, consent, rate limits,
verification, moderation, one-level replies, retention, tombstones, private
outbox transport, HTTP/admin boundaries, deterministic digest export, and
non-root container/backup/restore contracts.

Validation through `./sam`: `npm --prefix services/comments run check`,
`test` (15/15), `build`, and `ci` all passed. Tests include
missing consent, private-field exclusion, replay/idempotency, parent
rejection/deletion, retention, SQLite migration, and offline backup/restore.
