# Build independent memo service

## Goal

Provide the private runtime that accepts visitor memos, verifies mailbox
ownership, stores and moderates records, and emits only the approved v1 public
projection consumed by Firefly.

## Dependencies and Boundaries

- Depends on `10-01-memo-contract` for config and export decoding/serialization.
- The dependency is implemented and reviewed in `c9885e6`; its task is archived
  under `.trellis/tasks/archive/2026-10/10-01-memo-contract/`.
- Owns `services/memos/` and its private runtime/operations files.
- Owns coordinated service-config additions to `plugins/memos/config.mjs`, its
  declarations/tests, and `config/plugins/memos/` examples. Preserve the
  accepted public export wire format and existing public config projection.
- Does not add tables, routes, credentials, or business logic to
  `services/comments/`; it does not render the Firefly site or write a static
  release.
- `10-01-memo-publication-runtime` consumes the service's health and export
  behavior after this child passes its focused checks.

## Requirements

- Add an independently buildable Node/TypeScript service with private SQLite
  persistence, migrations, owner-only data root, Dockerfile, and no
  host-published service port in the intended Compose topology.
- Accept `POST /v1/memos/submissions` from unauthenticated visitors with a
  display name, private email, plain-text body, explicit consent/version, and
  abuse-control inputs. Validate size, normalization, honeypot/duplicate/rate
  limits, and fail closed before persistence on invalid input.
- Send a single-use mailbox verification link and expose
  `GET /v1/memos/verify/<token>`. Verification proves mailbox access and moves
  a record to pending moderation; it never publishes the record.
- Keep private email encrypted and verification tokens hashed in submission
  records. Pending mail containing the recipient and raw verification token
  must also be encrypted at rest; admin authentication retains only a hash for
  comparison. Keep moderation/abuse/audit state out of public artifacts.
- Expose authenticated private owner operations to list, approve, reject,
  delete, and export submissions. Use a service-side Bearer credential; never
  put it in browser assets or require it as a CLI argument.
- Export only approved records through the v1 contract, including source
  revision, generated time, digest, and monotonic tombstone epoch. Every
  transition removing a previously approved record advances the epoch
  atomically; repeated identical moderation requests must not advance it again.
- Provide health/readiness behavior, persistent data handling, owner backup and
  restore procedures, and a thin admin CLI that calls the private API.

## Operating Policy

- Verification expires after 24 hours. Limit accepted submissions to 12 per
  IP and 12 per mailbox within a rolling hour; persist counters across restart.
- An exact duplicate of a still-unexpired unverified submission returns the
  same generic acceptance response without a new record or mail. After expiry,
  the visitor may submit again subject to rate limits.
- Private email and abuse metadata are purged after 30 days; earlier deletion
  scrubs private data and text immediately. Prior encrypted backups remain
  subject to separate operator retention and require their matching key.
- Approve only verified pending records. Approval is idempotent; rejected
  records cannot be reopened. Reject/delete cancel verification and queued
  mail, and deletion is terminal.
- Mail delivery retries until token expiry. A crash can cause the same email
  to be delivered again, but its token remains single-use. Local validation
  uses a fake mail transport, not a real mailbox or SMTP credential.

## Out of Scope

- Firefly site components, static route generation, Nginx, and publication
  promotion.
- Browser moderation UI, Firefly accounts, public replies, and public runtime
  memo reads.
- Importing historical Typecho memo data or comments data.
- Production host provisioning, DNS/TLS changes, or real credentials.
- Visitor editing, self-service deletion, moderation notification emails,
  rejected-record reopening, metrics infrastructure, or a key-rotation UI.

## Acceptance Criteria

- [x] Invalid, oversized, unconsented or rate-limited submissions fail before
  record/mail persistence. Exact unexpired duplicates create no additional
  record/mail and reveal no identity through their generic response.
- [x] A valid visitor submission remains private until single-use email
  verification and explicit owner approval both succeed.
- [x] Verification replay/expiry and missing/invalid admin credentials fail
  closed without revealing record details.
- [x] List, approve, reject, delete, and export operations are covered by
  service tests and the CLI does not leak its credential.
- [x] The export contains only the memo contract's approved public fields and
  survives service restart/container recreation with persistent private data.
- [x] Docker health/readiness and backup/restore checks pass without requiring
  a production host or real SMTP credential.
- [x] Submission/mail enqueue and moderation/epoch updates are atomic under
  injected failures; exports read a consistent revision/epoch/approved snapshot.
- [x] Restart preserves rates and pending encrypted mail. Delivery, expiry,
  rejection/deletion and retention cleanup clear the appropriate private
  fields without restoring hidden records or reducing the epoch.

## Evidence

The existing comments lifecycle and defaults were inspected in
`services/comments/src/service.ts:102`, `:462`, and `types.ts:11`.
Detailed evidence and deliberate departures are recorded in
`.trellis/tasks/09-28-public-memo-stream/research/memo-service-findings.md`.

Implementation and independent full-scope review passed on 2026-10-03:
service tests 29/29, memo contract tests 12/12, type-check/build, strict
declaration consumption, shell checks and disposable Docker recreation checks.
See `implement.md` for the final validation commands and review fixes. Real
SMTP deliverability and the downstream site/publication/runtime integration
were not claimed by these local checks.
