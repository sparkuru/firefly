# Extract comments into a Firefly plugin

## Goal

Turn the current M5.1 comments feature into an optional, internally packaged
Firefly plugin. The plugin must own its public comment surface, private write
and moderation service, publication export, and notification boundary without
making the Firefly core or static runtime depend on comment storage or
credentials.

The desired outcome is that comments can be enabled, disabled, replaced, or
extended through an explicit plugin contract rather than by adding more
comments-specific conditionals throughout `apps/site`, the root build, and the
publication assembler.

## Background and confirmed facts

- M5.1 is implemented and archived in the serial task records under
  `.trellis/tasks/archive/2026-08/`; its tracked default remains disabled.
- The current implementation is cross-layer rather than plugin-shaped:
  `services/comments/` owns the private service and storage,
  `apps/site/src/components/CommentSection.astro` and `CommentForm.astro`
  own the public UI, `apps/site/src/lib/comments.mjs` owns the static export
  consumer, and `tooling/assemble-publication/` plus root scripts own the
  publication handoff and rollback metadata.
- Public comments are post-only, build-time/static, plain text, one-level
  replies, owner-moderated, and emitted only from a sanitized export. The main
  site does not perform runtime comment reads.
- Semantic and Terminal post documents already have a shared dispatch path,
  while pages, indexes, experiments, 404, and inline Terminal `cat` output
  must remain comment-free.
- The current service has a `NotificationTransport` interface, but the server
  uses `FileNotificationTransport` to write a private outbox. It does not yet
  deliver SMTP/API email.
- `config/site.toml` is build-time configuration; the public default must stay
  `comments.enabled = false`. Service credentials, mail credentials, private
  databases, and outbox contents must remain outside the public publication.
- The workspace currently contains unrelated uncommitted article-route
  migration changes. This task must preserve them and avoid mixing them into
  the pluginization change.

## User outcome

The owner can treat comments as a replaceable Firefly capability: enable it
only when configured, keep its private service and operations isolated, and
change notification delivery without changing the post renderer or public
publication contract.

## Requirements

- **R1 — Explicit plugin boundary:** define a Firefly plugin contract covering
  identity, configuration, lifecycle, post-render contribution, static export
  input, publication metadata, and optional private service/operations.
- **R2 — Core/plugin ownership:** keep generic document routing, presentation
  dispatch, build orchestration, and publication lifecycle in Firefly core;
  move comments UI, validation, private storage, moderation, export schema,
  styles, service routes, and comment-specific operations behind the plugin.
- **R3 — Preserve M5.1 behavior:** pluginization must preserve post-only
  scope, Semantic/Terminal rendering, disabled-by-default behavior, no runtime
  reads, exact public-field allowlist, one-level replies, moderation, digest,
  tombstone rollback protection, and historical-data exclusion.
- **R4 — Optional activation:** an absent or disabled plugin must produce the
  same empty comment surface and remain buildable without a comments service,
  private export, or notification credentials.
- **R5 — Notification seam:** keep notification delivery provider-neutral and
  private. The plugin must retain the existing outbox boundary, implement a
  replaceable SMTP delivery adapter, and expose the Zoho-compatible TLS modes
  needed by staging and production without exposing email fields in static
  output.
- **R6 — Page boundaries:** public comments remain a post-document extension;
  any moderation/admin interface remains private to the service and is not
  emitted into the public static site.
- **R7 — Compatibility and migration:** preserve the `comments.public.v1`
  artifact and current configuration semantics where possible, document any
  deliberate manifest or import changes, and avoid a historical data import.
- **R8 — Verification:** add contract tests proving plugin disabled/enabled
  behavior, both document presentations, publication handoff, service
  isolation, and notification-provider substitution.

## Recommended scope

The approved MVP extracts the existing implementation into an internal
monorepo plugin package, introduces a provider-neutral notification seam, and
implements a real SMTP transport compatible with Zoho Mail. It does not deploy
production infrastructure or commit credentials. Staging uses controlled test
mail delivery; production mailbox provisioning and rollout remain separate.

## Out of scope

- Production deployment, DNS, credentials, mailbox provisioning, or traffic
  changes.
- Historical comment import or public historical identity/statistics.
- SSR/runtime comment reads or a public comment-count API.
- Rich text, media, reactions, nested threads, public accounts, or profiles.
- A generic third-party plugin marketplace or cross-project npm product.
- Rewriting the existing M5.1 privacy/publication contract without a separate
  owner decision.

## Acceptance criteria

- [x] A documented plugin contract identifies the core hooks and the complete
  comments-plugin ownership boundary.
- [x] The current comments UI, service, export consumer, and publication
  metadata are reachable through the plugin boundary rather than scattered
  comments-specific core conditionals.
- [x] Disabled builds remain equivalent to the current empty, comment-free
  publication and require no service/export/notification credentials.
- [x] Enabled fixture builds preserve the current public export schema,
  Semantic/Terminal post rendering, form action behavior, and privacy scanner.
- [x] Pages, indexes, experiments, 404, and inline Terminal `cat` output remain
  comment-free.
- [x] Notification delivery is replaceable behind a private transport contract;
  the SMTP adapter supports controlled fake-delivery/outbox tests plus Zoho-compatible
  465/SSL and 587/STARTTLS configuration; no SMTP/API credential or private
  notification field reaches static output.
- [x] Existing M5.1 service, site, publication, shell, runtime, and browser
  validation remains green, with new plugin-boundary tests covering migration.
- [x] No historical data, production credentials, external deployment, or the
  unrelated current article-route migration is included.

## Resolved product decisions

- The pluginization task includes a real provider-neutral SMTP transport and a
  Zoho-compatible configuration path. It must be testable against a controlled
  staging SMTP sink without using production credentials.
- The existing private file outbox remains a durable queue/fallback boundary;
  SMTP delivery must not move into the browser, static build, or request path
  without retry and failure handling.
- Zoho Mail is the intended production-compatible provider. The task does not
  provision the mailbox, DNS, credentials, or production deployment.

## Planning artifact status

- `prd.md`: requirements and product decisions converged.
- `design.md`: approved and implemented on 2026-08-20.
- `implement.md`: completed as a serial, independently verified work plan on
  2026-08-20.

## Verification record

- `python3 ./.trellis/scripts/task.py validate .trellis/tasks/08-20-comments-pluginization`
  passed for both context manifests.
- `./sam npm run check:m51`, `./sam npm run test:m51`, and
  `./sam npm run build:m51` passed sequentially. The disabled build emitted no
  comment surface and retained empty publication metadata.
- The SMTP path was tested through the provider-neutral delivery seam,
  configuration validation, private rendering, redacted retry state, stable
  event IDs, and both Zoho-compatible TLS modes. A real Zoho or controlled
  staging send remains operator-owned and intentionally was not performed.
