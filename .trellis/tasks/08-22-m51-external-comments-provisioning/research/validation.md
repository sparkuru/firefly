# M5.1 Validation Evidence

Validation date: 2026-08-24 (Asia/Singapore)

This record contains repository-local results and sanitized production
evidence. It intentionally omits deployment identities, hostnames, private
paths, mailbox values, credentials, raw remote output, release identifiers,
and exact backup identifiers.

## Route migration

- `services/comments` recognizes the approved `/v1/comments/*` submission,
  verification, reader-control, deletion, moderation, and export routes.
- `apps/site` form output and notification messages use the new route family.
- The container-local and operator-owned Nginx examples proxy only
  `/v1/comments/`; `/v1` and unknown `/v1/*` paths fail closed.
- The focused HTTP tests assert that the old unscoped routes return 404. A
  repository search found those old paths only in those intentional negative
  assertions; no stale source or current-contract reference remains.

## Repository and container checks

The following commands passed through the project `./sam` boundary unless
noted otherwise:

| Command | Result |
| --- | --- |
| `./sam node --version` | passed; Node `v22.23.1` |
| `docker compose config --quiet` | passed |
| `./sam npm --prefix services/comments run check` | passed |
| `./sam npm --prefix services/comments run test` | passed; 33/33 |
| `./sam npm --prefix apps/site run test:content` | passed; 36/36 |
| `./sam npm --prefix apps/site run check` | passed; 58 files, 0 errors/warnings/hints |
| `./sam npm --prefix apps/site run build` | passed; static output tests 16/16, 121 pages |
| `./sam npm run check:m51` | passed |
| `./sam npm run test:m51` | passed; all component suites passed |
| `./sam npm run build:m51` | passed; publication assembled with comments disabled |
| `docker build -f services/comments/Dockerfile .` | passed |
| `bash -n sam package-runtime.sh services/comments/ops/backup.sh services/comments/ops/migrate-legacy.sh services/comments/ops/restore.sh` | passed |
| `shellcheck sam package-runtime.sh services/comments/ops/*.sh` | passed |
| `shfmt -d sam package-runtime.sh services/comments/ops/*.sh` | passed |
| `./package-runtime.sh` | passed; publication, route, header, 404, non-root, and read-only probes |

Follow-up after the canonical route compatibility fix:

- `./sam npm --prefix services/comments run test` passed; 38/38, using a
  temporary empty content-root input because the local workspace does not
  currently contain its optional content root.
- `./sam npm --prefix services/comments run check` passed.
- The rebuilt production-shaped comments image was loaded and the private
  runtime health endpoint remained healthy after replacement.

## Browser and privacy checks

- `SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host ./sam npm --prefix apps/site run test:e2e -- tests/site.spec.ts` passed; 20/20.
- `git diff --check` passed.
- The independent Trellis quality gate found that fail-closed `/v1` locations
  could shadow inherited security headers; the Nginx locations now preserve
  the required CSP, referrer, content-type, and frame headers, with regression
  assertions. The gate also expanded route coverage for delete, export, and
  moderation endpoints plus their old-path 404 behavior.
- The repository secret file was checked by metadata only and remains a
  regular owner-readable file with mode `600`; secret values were not printed,
  copied, or recorded. An owner-authorized runtime probe was allowed to read
  the injected value inside the isolated delivery process.
- No SMTP credential, private mailbox, DNS record, certificate private key, or
  raw remote output was recorded. Exact operational identities and paths remain
  outside this record; production changes are represented only by the
  sanitized results below.
- No enabled tracked comments projection was created. Public submission and
  verification browser smoke remains deferred until an owner-approved staging
  input exists.

## Production preflight, backup, and deployment

- The owner-confirmed production SSH host passed a key-only connectivity probe
  after its ED25519 fingerprint was explicitly confirmed. Raw host output and
  operational identity remain outside this record.
- The read-only baseline found Debian 13, Docker with Compose support, an
  active systemd-managed Nginx edge, an existing immutable static release
  symlink with a prior release available, and no comments listener on the
  planned private port. The host had sufficient free disk for a staged runtime
  and backup.
- An owner-authorized, non-overwriting backup of the active static release,
  current-release pointer, and blog edge configuration was created on the VPS.
  SHA-256 verification and archive listing both passed. TLS private keys were
  not copied. The backup identifier and exact remote paths are intentionally
  omitted.
- The first backup finalization attempt failed before publication because a
  root-only directory prevented an unprivileged glob expansion. The existing
  candidate was not deleted; a root-shell retry corrected permissions,
  repeated both verifications, and sealed the final backup successfully.
- A private comments runtime was staged with the tracked disabled site
  configuration, owner-only secrets, read-only container root, dropped Linux
  capabilities, and no published host port. The service is healthy and binds
  only to the loopback interface.
- The five missing comments runtime keys were generated in the owner-only
  secret boundary without changing or copying the existing SMTP value. The
  deployed service was then replaced with the follow-up image containing the
  canonical encoded-route notification fix and remained healthy.
- The existing HTTPS edge was updated to proxy only `/v1/comments/*`. The
  generic `/v1` root and unknown `/v1/*` paths fail closed with JSON 404s,
  `no-store`, and the required security headers. Nginx syntax validation,
  reload, and public smoke checks passed; the old unscoped admin route returns
  404 while the authenticated new admin route returns success.
- The active static publication produced one post path outside the existing
  ASCII-safe comments route contract. The runtime route catalog accepted 98
  compatible paths and deliberately excluded that one path; comments remain
  disabled, so no public behavior was enabled for the incompatible route.
- A quiesced SQLite data backup was created with the service backup tool,
  restored into a previously absent candidate location, and checked with the
  database integrity probe. The active data directory was not modified, the
  restore candidate was removed, and the service remained healthy afterward.
- Public TLS and origin probes passed: the configured origin returned preflight
  204, an unapproved origin returned 403, and an unconfigured Host/SNI attempt
  was rejected during TLS negotiation rather than reaching the comments
  upstream.

## Non-blocking warnings and unavailable gates

- The static build retains the existing authored-content-link warnings (12)
  and CSS optimizer warnings for `::highlight` (2); neither is introduced by
  this route migration and all required commands completed successfully.
- An owner-authorized runtime-injected SMTP probe reached the provider's TLS
  endpoint but received SMTP status `535` during authentication; delivery is
  therefore not verified. The secret value was not printed or persisted in
  project records. Re-test remains pending after the owner confirms the
  account-specific SMTP host, outgoing-mail permission, and application
  password for the sender account.
- Public comments submission and verification browser smoke remains deferred
  because comments are intentionally still disabled pending the owner's
  enablement decision and an approved test input.
- A separate external port-refusal scan was not run; the equivalent runtime
  shape check confirmed no host-published port and exactly one loopback
  listener.
