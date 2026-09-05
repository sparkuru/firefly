# Public Comments Enablement — Technical Design

## 1. Scope and invariant

This task converts the already implemented M5.1 comments capability from
private-provisioned/disabled to a controlled public production release. The
site remains a static Astro publication. A visitor submits to the private
comments service through the existing same-origin edge route; the service
verifies and moderates the record; an owner-reviewed `comments.public.v1`
export is consumed by a later static build. The browser never reads the
database or a public comments API.

The repository defaults remain safe: the tracked `config/site.toml.example`
stays disabled, private config and secrets stay ignored/owner-only, and the
enabled production input is handled only in the owner-controlled channel.

## 2. Enablement data flow

```text
private service/database
        │ owner export after moderation
        ▼
sanitized comments.public.v1 JSON + digest/tombstone epoch
        │ contained FIREFLY_COMMENTS_EXPORT
        ▼
enabled static site build ──► assembled immutable release
        │                              │
        │                              ▼
        └── native forms ──► existing edge /v1/comments/* ──► private service
```

The route catalog is a release prerequisite. The exact release's article
documents are the source of truth; directory indexes are excluded, and
readable Unicode site hrefs are converted to canonical uppercase UTF-8
percent-encoded service routes. A mismatch fails closed before activation.

## 3. Configuration strategy

1. Preserve the tracked disabled template and the current safe defaults.
2. Create or update an owner-local enablement input using the canonical
   `[plugins.comments]` namespace with `enabled = true` and the existing safe
   repository-relative plugin config path. Do not combine it with the legacy
   `[comments]` namespace.
3. Keep the plugin TOML's public write origin, consent version, runtime route
   catalog, private paths, and non-secret SMTP projection aligned with the
   same production origin. Secrets remain in the protected runtime mount.
4. Pass the site input and sanitized export explicitly through
   `FIREFLY_SITE_CONFIG_PATH` and `FIREFLY_COMMENTS_EXPORT`. Both inputs must
   resolve inside a contained repository or release workspace; neither may be
   an absolute host-private path or a symlink.
5. Never commit an enabled private config, export, data file, mailbox value,
   password, token, runtime identity, or deployment path.

For local browser coverage, use a repository-contained ignored fixture with a
synthetic origin and sanitized comments. For the production candidate, use
the owner-reviewed export from the private service and retain only redacted
metadata in the task record.

## 4. Gate ordering and ownership

The main session owns the transition between gates. Each gate produces a
pass/fail/unavailable/deferred result before the next mutating gate is allowed:

1. Read-only baseline and rollback snapshot confirmation.
2. Release-bound route catalog validation and candidate configuration review.
3. Fresh private runtime readiness, edge isolation, and SMTP checks.
4. Local enabled publication, privacy, static-output, and browser validation.
5. Owner-controlled production config/release promotion using the existing
   release path; no DNS/TLS or crash-recovery redesign.
6. Controlled public smoke and post-release observation.

The private runtime and edge remain operator-owned. The task may use the
existing deployment path only for this bounded enablement transaction after
the planning and implementation review gates are approved. Any missing target,
credential boundary, or owner-only action is recorded as unavailable rather
than guessed.

## 5. SMTP and test-state isolation

SMTP authentication and message delivery are separate checks. First perform a
non-sending TLS/AUTH probe. Then perform at most one controlled submission or
delivery smoke using the previously approved owner-mailbox boundary and an
isolated temporary state. Do not mount, drain, replay, or mutate the real
production outbox for a test.

A public smoke record must remain non-public: verify the submission flow,
verification response, and service-side state transition, then quarantine or
delete the test record before any export used for the production release. The
local fixture separately proves approved public rendering, direct replies,
Unicode route binding, and absence of private fields.

## 6. Publication and rollback

The enabled candidate must contain only the public allowlist and must carry a
valid digest and tombstone epoch. The assembler remains the authority for
contained files, route-to-output checks, privacy scanning, publication
metadata, and anti-rollback refusal.

Before promotion, retain the prior immutable static release and the prior
runtime configuration/data rollback references. Promote the static release
atomically through the existing path. If the public smoke or post-release
probe fails, switch back to the prior static release and disable the owner
activation input through the same operator boundary. Never lower the comments
tombstone epoch, overwrite active data with a test fixture, or remove the only
known rollback copy.

## 7. Expected implementation surface

The expected source behavior already exists; this task should prefer
configuration, release, and redacted evidence changes over new product code.
If a gate exposes a source defect, stop the rollout, update the plan/contract
before expanding scope, and keep the production activation disabled until the
defect is independently checked.

## 8. Execution correction

The first full enabled publication candidate exposed a privacy-scanner false
positive: the canonical public route `/posts/app/.../` contains the reserved
path token `/app/`, and the unbounded comment-surface sentinel rejected it.
The corrective change is limited to applying the existing source-path boundary
rule to comment-surface scanning and adding a regression test for that public
route shape. It does not weaken email-like, private-field, secret, or unsafe
markup detection.

Primary task artifacts are the active PRD, this design, the implementation
checklist, and a redacted gate handoff/evidence record. Durable specification
changes are made only if execution reveals a new reusable contract.
