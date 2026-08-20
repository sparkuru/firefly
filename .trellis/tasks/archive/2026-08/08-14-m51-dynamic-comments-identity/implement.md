# M5.1 Dynamic Comments and Identity Service — Implementation Plan

## Activation gate

The owner approved the planning/design baseline on 2026-08-20 and activated
this parent for implementation. The serial child tasks below are the active
execution record. Production credentials, external provisioning, deployment,
and traffic changes remain out of scope.

## Recorded implementation evidence

The three child deliverables are implemented on the current branch:

- `services/comments/` is an isolated Node 22 TypeScript service with
  SQLite/WAL storage, migrations, encrypted private email, hashed tokens,
  consent-gated submissions, verification, moderation, one-level replies,
  retention, tombstones, export, HTTP, container, and backup/restore scripts.
- `apps/site/` decodes only the sanitized export at build time, binds
  records to canonical public post routes, renders native Semantic/Terminal
  comment sections, and leaves pages, indexes, experiments, 404, and inline
  Terminal output unchanged.
- `sam`, the site build, and publication assembler enforce a contained
  repository-relative export handoff, digest/route checks, privacy scanning,
  publication metadata, and tombstone-aware rollback.
- Focused service checks/tests/build, site checks/content tests/builds,
  assembler checks/tests/build, the default M4 publication build, and the
  enabled M5.1 fixture publication build passed through `./sam`.
- Shell syntax, ShellCheck, shfmt, and `git diff --check` pass. The
  tracked site configuration remains disabled until external service
  provisioning and an owner-approved sanitized export are available.

## Execution split

The parent task owns the contracts and integration acceptance. The following
serial deliverables are active as independently verifiable child tasks:

1. **Comment service core** — private storage, verified pseudonyms, lifecycle,
   abuse controls, moderation control plane, notifications, retention, and
   export generation.
2. **Static comment consumer** — strict export decoder, post-route binding,
   Semantic/Terminal canonical-page rendering, native submission form, and
   no-JavaScript behavior.
3. **Publication and operations** — guarded export handoff, wrapper/build
   integration, privacy-aware release/rollback, service container, backups,
   restore drills, and staging verification.

Child 2 depended on the versioned export contract from child 1. Child 3
depended on both; the main site remains buildable with an empty export.

## Ordered checklist

### 0. Reconfirm contracts before coding

- [ ] Review the approved PRD and `design.md` against the implementation
      branch; stop if the static export, post-only scope, plain-text body,
      verified-pseudonym, pre-moderation, or one-level-reply decisions changed.
- [ ] Create the child tasks only after implementation approval; give each one
      testable acceptance criteria and explicit dependency ordering.
- [ ] Record the selected service hostname, operator access path, email relay,
      persistence volume, backup destination, and retention schedule as private
      deployment inputs. Do not write operational secrets or identifiers to Git.
- [ ] Freeze the public export schema version and the consent text/version
      before accepting real submissions.

### 1. Establish service package and private storage

- [ ] Add an isolated `services/comments/` Node 22 TypeScript package with its
      own lockfile, checks, tests, build, and container definition.
- [ ] Implement a storage adapter with the single-instance SQLite/WAL MVP
      target and an explicit migration directory. Keep the repository boundary
      replaceable for a future PostgreSQL adapter.
- [ ] Store internal IDs, opaque public IDs, canonical post paths, private
      parent IDs, encrypted email, keyed email fingerprint, normalized fields,
      lifecycle state, consent, notification choice, audit timestamps, and
      retention deadlines.
- [ ] Hash verification/control tokens before storage. Ensure secrets and
      encryption keys are injected only at runtime.
- [ ] Add migration, backup, restore, and schema-version tests before any
      endpoint is exposed.

### 2. Implement submission, verification, and lifecycle rules

- [ ] Implement strict request decoding for canonical post paths, display name,
      HTTPS homepage, email, plain-text body, reply parent, consent version,
      notification choice, and honeypot fields.
- [ ] Enforce the documented Unicode, control-character, UTF-8 size, URL,
      request-body, and line-ending rules at the service boundary.
- [ ] Implement one-time 24-hour email verification and a bounded private
      control token without creating user accounts or sessions.
- [ ] Implement the full state machine: unverified, pending, approved,
      rejected, spam/quarantined, expired, deletion-requested, and deleted/
      tombstoned.
- [ ] Make all public-affecting operations idempotent by internal record/public
      ID and action version; duplicate form submissions must not create
      duplicate public comments when the same request is retried.
- [ ] Enforce one reply level at both submission and moderation boundaries.
- [ ] Keep verification separate from approval; verified records never enter
      the public export automatically.

### 3. Add abuse controls, notifications, and owner moderation

- [ ] Add body/request caps, honeypot handling, origin allowlisting, per-IP and
      per-email-fingerprint rate limits, per-post limits, and quarantine.
- [ ] Keep raw IP/user-agent data out of ordinary logs and delete abuse
      material after the documented 30-day window.
- [ ] Send only transactional verification and approval/rejection/reply notices;
      default reply notifications to off and implement unsubscribe/control
      links.
- [ ] Add the private `commentsctl` or equivalent control interface for queue
      listing, approve, reject, spam, quarantine, delete, retention, audit, and
      export operations.
- [ ] Ensure owner-only operations are unreachable from the public static site
      and do not rely on public-site cookies or browser local storage.
- [ ] Add tests for duplicate submissions, replayed tokens, rejected parents,
      deleted parents, notification opt-out, and retention cleanup.

### 4. Generate and verify the public export

- [ ] Implement `comments.public.v1.json` generation with an explicit
      allowlist of public fields only.
- [ ] Exclude email, internal IDs, token material, consent, moderation state,
      IP, user agent, source identity, historical handoff fields, and private
      audit fields by construction and by negative tests.
- [ ] Normalize and deterministically sort records; include schema version,
      source revision, generation timestamp, digest, and tombstone epoch.
- [ ] Export only approved comments whose post path is current and whose
      parent is an approved top-level comment.
- [ ] Add route-catalog, duplicate-ID, nested-reply, unsafe-text, unsafe-URL,
      unknown-field, and tombstone tests.
- [ ] Make export delivery a contained artifact handoff. Do not give the public
      service direct repository write or production-release credentials.

### 5. Integrate the static site

- [ ] Add a build-only site comments reader and strict schema decoder, with an
      empty-export path that preserves the current no-comment build.
- [ ] Add the public comments configuration contract, including enabled state,
      write origin, and consent version. Validate HTTPS origin and reject
      credentials, fragments, unsafe schemes, and unknown fields.
- [ ] Cross-check exported post paths against `getCanonicalContent().posts`;
      reject pages, experiments, drafts, private entries, aliases without a
      canonical post, and stale routes.
- [ ] Add a site-local `CommentSection` that renders escaped plain text,
      safe homepage links, deterministic timestamps, direct replies, and a
      native form. Keep it outside the Terminal reader region.
- [ ] Render the same validated post-scoped data in both
      `SemanticDocument.astro` and `TerminalDocument.astro`.
- [ ] Keep `TerminalStreamDocument.astro`, the home templates, directory
      indexes, page routes, `/lab/`, and `404` free of comments and forms.
- [ ] Ensure the static page remains useful with JavaScript disabled and that
      the form submits only to the configured write origin; no public read or
      count request may be introduced.
- [ ] Add unit, static-output, and browser fixtures containing private sentinel
      data and assert that it never reaches HTML, scripts, JSON, or release
      metadata.

### 6. Extend the guarded build and publication path

- [ ] Add a contained comments-export handoff to the existing `./sam` flow.
      Repository-relative export paths must be explicit and must not broaden
      mounts or permit host/private paths.
- [ ] Add the comments export to the site build dependency order without making
      the assembler call the service or fetch network data.
- [ ] Record export revision and tombstone epoch in the publication evidence;
      make release validation fail on mismatched candidate/export input.
- [ ] Extend static-output and publication scans for emails, IPs, user agents,
      service secrets, internal IDs, private handoff markers, and unsafe
      comment HTML.
- [ ] Add privacy-aware rollback selection: releases older than a deletion
      tombstone cannot be promoted as rollback targets.
- [ ] Keep the existing atomic candidate promotion, exact inventory, non-root
      read-only runtime, security-header, cache, route, and teardown gates.

### 7. Validate the service and integrated publication

- [ ] Run service schema/state/storage/API/retention tests in the service
      container.
- [ ] Run focused site content and static-output tests with an empty export and
      a valid export fixture.
- [ ] Run focused Semantic and Terminal browser tests at desktop and mobile
      viewports with JavaScript disabled and enabled where applicable.
- [ ] Prove no runtime `GET` request is made for comments or counts; only the
      native write form may target the service origin.
- [ ] Run the full existing package checks/builds, assembled-publication
      browser suite, runtime packaging probes, and exact inventory comparison.
- [ ] Exercise export deletion/tombstone, privacy-safe rollback, database
      restore, and stale-route rejection before staging.
- [ ] Record unavailable external checks—email delivery, private deployment,
      real devices, and assistive technology—as residuals rather than passes.

### 8. Staging and owner review

- [ ] Deploy the service separately with non-production/test data and a
      non-public or guarded admin path.
- [ ] Submit a test top-level comment, verify it, reject one, approve one,
      approve a direct reply, reject a nested reply, export, rebuild, and
      verify the static output.
- [ ] Test deletion and confirm that the next export removes the record and
      that an older unsafe release cannot be selected.
- [ ] Verify backups and restore without exposing the database or email data.
- [ ] Perform owner review of comment copy, form labels, notification wording,
      Semantic/Terminal placement, and moderation ergonomics.
- [ ] Only after owner review passes, prepare a separate production rollout
      decision. Production traffic and service deployment are not implied by
      this implementation task.

## Validation command profile

All repository commands use the existing `./sam` wrapper and package-local
lockfiles. The exact service commands become available after the service
package exists:

```bash
./sam npm --prefix services/comments ci
./sam npm --prefix services/comments run check
./sam npm --prefix services/comments run test
./sam npm --prefix services/comments run build
```

Existing main-site and publication gates remain required:

```bash
./sam npm --prefix apps/site run test:content
./sam npm --prefix apps/site run test:x-core
./sam npm --prefix apps/site run check
./sam npm --prefix apps/site run build
SAM_IMAGE=mcr.microsoft.com/playwright:v1.62.0-noble SAM_IPC=host \
  ./sam npm --prefix apps/site run test:e2e
./sam npm run check:m4
./sam npm run test:m4
./sam npm run build:m4
./package-runtime.sh
```

The M5.1 implementation must add focused tests for the service and comments
consumer before relying on the full M4 regression commands. A successful
package build alone is not acceptance evidence.

## Risk and rollback points

| Point | Risk | Safe rollback |
| --- | --- | --- |
| Service schema | Private data or token migration drift | Stop service, restore the last private backup, and run migration verification before retrying |
| Verification/API | Spam, replay, or duplicate public state | Disable public write ingress; pending records remain private; no static export changes |
| Export | Private-field or stale-route leakage | Reject the artifact and retain the last approved export/release |
| Site consumer | Layout, reader, or JS regression | Build with an empty export or revert the consumer change; existing pages remain static |
| Publication | Candidate differs from verified export | Preserve current `dist/` and `artifacts/`; do not promote the candidate |
| Deletion | Old release re-exposes revoked data | Tombstone-aware rollback refuses unsafe releases; rebuild a safe candidate |
| Service deployment | Runtime outage | Static site remains readable; disable the form or show service-unavailable copy while the last static comments remain published |

## Acceptance mapping

- **R1:** design defines public/private fields, consent, pseudonym rules,
  encryption/token boundaries, retention, and non-reversible export limits.
- **R2:** state machine, validation, rate limits, moderation, deletion,
  notifications, export, and rollback behavior are observable and testable.
- **R2a:** one-time email verification and data-minimized, account-free
  pseudonyms are specified without public email or login accounts.
- **R2b:** parent constraints and export eligibility enforce one reply level.
- **R3:** independent write service, local export input, static rendering,
  guarded publication, and privacy-safe rollback preserve the current site
  boundary.
- **R4:** no historical import or public source-identity projection exists in
  the scope, schema, export, fixtures, or rollout.
- **R5:** this document, `design.md`, the PRD, real context manifests, and the
  validation profile are sufficient to authorize a later implementation task
  without authorizing implementation now.
