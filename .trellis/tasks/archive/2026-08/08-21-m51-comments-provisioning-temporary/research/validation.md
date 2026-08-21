# M5.1 Local Validation Evidence

## Implementation

- The comments runtime now defaults to loopback and `/var/lib/firefly-comments/core.db`.
- The opt-in Compose `comments` profile has no host-published comments port and
  mounts the public TOML and owner-only secret input read-only.
- The shared Nginx image mirrors same-origin `/v1/*`; deployment-specific
  host/SNI selection remains in the neutral operator edge example.
- SQLite migrations, plugin storage catalog validation, legacy copy, backup,
  restore, checksums, integrity checks, and private outbox/state artifacts are
  covered by service tests.
- The tracked site configuration remains comments-disabled. No remote target,
  mailbox identity, password, or production identifier was recorded.

## Commands and results

| Command | Result |
| --- | --- |
| `./sam node --version` | `v22.23.1` |
| `./sam npm --prefix services/comments run check` | pass |
| `./sam npm --prefix services/comments run test` | 33/33 pass |
| `./sam npm --prefix services/comments run build` | pass |
| `./sam npm run check:m51` | pass |
| `./sam npm run test:m51` | all package suites pass; comments 33/33 |
| `./sam npm run build:m51` | pass; static comments-disabled output |
| `docker compose config --quiet` | pass; no services started |
| `./package-runtime.sh` | pass; route/header/404/non-root/read-only/teardown probes |
| `bash -n ...` | pass for repository and comments ops scripts |
| `shellcheck ...` | pass |
| `shfmt -d ...` | pass |
| `git diff --check` | pass |

## Unperformed operator gates

DNS/TLS, remote installation or SSH, host-specific edge deployment, real SMTP
delivery, production backup/restore, and public browser submission/verification
remain owner-authorized operational checks. No external service was started
and no credential was read or tested.

The static build emitted existing unresolved authored-content-link warnings and
CSS optimizer warnings; the prescribed checks still passed.
