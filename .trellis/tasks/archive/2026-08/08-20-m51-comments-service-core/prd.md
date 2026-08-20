# M5.1 Comment Service Core

## Scope

Implement the independent, private comment write/moderation service described
by the parent M5.1 task. The service owns submission validation, account-free
email verification, one-level replies, moderation state, retention, and the
sanitized `comments.public.v1.json` export. It must not modify `apps/site/`,
publication tooling, `sam`, production configuration, or historical data.

## Acceptance criteria

- A Node 22 TypeScript package exists under `services/comments/` with its own
  manifest, lockfile, strict check, test, and build scripts.
- The private store keeps encrypted email and hashed tokens out of the export;
  the public export contains only the versioned allowlisted fields.
- Submission validation enforces canonical post routes, normalized bounded
  display names/body, optional credential-free HTTPS homepage, consent,
  honeypot, and one-level reply rules.
- Verification is single-use and time-bounded; verification never approves or
  exports a comment. Owner actions explicitly approve, reject, quarantine,
  delete, and export.
- Parent deletion/rejection prevents a reply from becoming public, and nested
  reply submissions are rejected.
- Export ordering is deterministic and rejects stale routes, duplicate IDs,
  unsafe fields, unknown fields, and invalid parent relationships.
- Tests cover validation, replay/idempotency, state transitions, private-field
  exclusion, replies, tombstones, retention, and export determinism.

## Out of scope

No historical import, public read API, account/login system, rich text,
production email/DNS/credentials, multi-instance deployment, or site changes.
