# M5.1 comments pluginization — implementation plan

## Execution gate

This is a serial implementation plan for the approved design. Do not run the
implementation workflow or modify production configuration until the user
approves this plan. Before coding, preserve and re-check the unrelated
article-route changes already present in the worktree.

The task remains one bounded cross-layer change rather than a dynamic plugin
framework. Each work package below has a local acceptance check and can be
reviewed independently before the next package starts.

## Work package 0 — establish the migration baseline

1. Record the current task/worktree state and identify the exact M5.1 public
   fixtures, service tests, assembler tests, and browser assertions that must
   remain unchanged.
2. Run the smallest existing checks through `./sam` and capture the baseline;
   do not stage or rewrite the unrelated route-migration files.
3. Add a pluginization test fixture/config that can exercise disabled and
   enabled paths without requiring a real service or mail credential.

Acceptance: baseline is reproducible, the fixture has no secrets, and the
working tree's unrelated changes are still present and identifiable.

## Work package 1 — define the core/plugin contract and registry

1. Add the internal plugin manifest and TypeScript contract under the planned
   `plugins/comments/` ownership root.
2. Add a static registry/host adapter for site post extensions, build data,
   publication contributions, and private service capability metadata.
3. Make the registry evaluate enabled state before loading private export or
   service dependencies.
4. Keep core contracts data-oriented; do not put comment rows, storage types,
   route names, or email fields into generic core types.

Likely integration points are the existing site host, publication assembler,
and root runtime/build delegates. They should call one plugin entry point after
this package, not import scattered comment modules.

Acceptance: a contract test proves the plugin can be registered, disabled
without private dependencies, and enabled with a fixture; no dynamic runtime
discovery is introduced.

## Work package 2 — move the site surface behind the plugin

1. Re-home or wrap the current comment decoder, section, form, and styles under
   the plugin site entry point. Any old paths retained for compatibility become
   thin re-exports only.
2. Connect the post extension to the shared `DocumentPresentation` dispatch
   while preserving separate Semantic and Terminal style ownership.
3. Keep the extension after the document reader region and limit it to post
   entries. Explicitly test pages, indexes, experiments, 404, and inline
   Terminal `cat` output as negative cases.
4. Preserve the static-only read model, native form POST, existing write origin,
   required consent, honeypot, optional homepage/email/reply notification
   fields, one-level replies, and plain-text rendering.
5. Add the planned UI states and responsive/focus rules without introducing
   client hydration or global CSS selectors.

Acceptance: enabled fixture builds render the same public fields and action
contract in both presentations; disabled builds render no comment surface and
perform no runtime comment read.

## Work package 3 — move export and publication ownership behind the plugin

1. Move comment-specific export validation, allowlisting, grouping input, and
   publication metadata into the plugin publication entry point.
2. Keep the public artifact `comments.public.v1`, exact privacy boundary,
   digest, tombstone, rollback protection, and historical-data exclusion.
3. Change the assembler to consume a generic plugin contribution rather than
   knowing comment-specific metadata fields. Keep generic publication lifecycle
   and rollback orchestration in core.
4. Preserve absent-export behavior and the current `comments.*` configuration
   semantics, including disabled-by-default behavior.

Acceptance: publication fixtures are byte/field compatible where M5.1 requires
compatibility, privacy scans remain green, and the assembler has no direct
business-logic dependency on comment storage or private notification data.

## Work package 4 — move the private service and notification boundary

1. Re-home the current private comments service behind the plugin service
   entry point, retaining HTTP routes, SQLite schema/behavior, moderation,
   verification, control links, health behavior, and secure private-volume
   assumptions.
2. Split the existing notification abstraction into a durable private outbox
   sink and a delivery contract. Add stable event identity and a private
   delivery ledger/state so worker retries are idempotent.
3. Implement the provider-neutral SMTP transport and private delivery worker.
   It must support implicit TLS on 465 and STARTTLS on 587, validate sender and
   authentication settings, redact sensitive data, and use bounded retry with
   failure/dead-letter handling.
4. Add Zoho-compatible host/port/security configuration using placeholders
   only. Do not add real mailbox details, credentials, DNS changes, or deploy
   steps.
5. Keep the HTTP submission path limited to durable outbox persistence; SMTP
   delivery must not occur in the browser, static build, or an unprotected
   request side effect.

Acceptance: service tests prove private route behavior and outbox durability;
fake-delivery/outbox tests prove successful delivery, failures/retries,
idempotency, redaction, and both Zoho security modes. An environment without
SMTP settings remains usable with the file outbox/test sink.

## Work package 5 — host wiring, commands, and operator documentation

1. Update root delegates and package scripts to start/check/build the plugin
   service and optional mailer through the existing `./sam`/runtime conventions.
2. Update staging examples with documented placeholders, controlled sink
   instructions, privacy warnings, and the distinction between file-outbox
   verification and real SMTP delivery.
3. Update plugin and service README material to state the public/private
   boundary, default-disabled behavior, exact enablement prerequisites, and
   the later operator-owned Zoho staging check.
4. Keep the public site build independent from service credentials and private
   files.

Acceptance: a clean disabled build/check works without private service or SMTP
variables; staging documentation makes it possible to verify mail safely
without suggesting production credentials belong in the repository.

## Work package 6 — focused and full verification

Run focused checks after each work package, then the project-standard full gate:

- plugin contract/registry tests;
- comments service build, unit tests, and health/startup checks;
- publication assembler tests and privacy/rollback fixtures;
- site content validation, Astro check/build, and static-output negatives;
- focused Playwright tests for enabled/disabled comments in Semantic and
  Terminal presentations, page exclusions, native validation, focus, and
  mobile widths;
- existing shell/runtime checks through `./sam`;
- repository quality check and final diff review for unrelated route changes,
  secrets, public email fields, and accidental generated output.

When browser automation is available, use the existing Playwright profile and
viewports from the frontend specs. Human review remains required for real
device/assistive-technology behavior and any later controlled Zoho staging
send; record those as residual checks rather than weakening automated tests.

## Work package 7 — durable project knowledge and handoff

1. Update the relevant frontend/publication contract or add a narrow plugin
   contract spec only after implementation behavior is verified.
2. Record the final validation evidence, configuration names, rollback switch,
   and any deliberately deferred operator work in the task notes.
3. Run the Trellis quality check and finish-work flow; do not commit unrelated
   user changes.

## Rollback and stop conditions

- The feature rollback switch is the existing disabled-by-default configuration;
  disabling it must remove the public extension without deleting private data.
- If SMTP delivery is unhealthy, retain the private outbox and disable the
  mailer or select the file/test transport; do not bypass privacy boundaries by
  sending from the site.
- Stop and report if preserving the existing public export contract would
  require historical import, route migration, or a production credential.
- Stop before implementation if a package boundary requires an unapproved
  change to the unrelated article-route migration.
