# M5.1 comments pluginization — technical design

## Status

Proposed design for final plan review. It is based on the current M5.1
implementation, the frontend Trellis specs, and the task-local UI/UX research.
Implementation must not begin until this plan is explicitly approved.

## 1. Design summary

Comments become a statically registered, internal Firefly plugin. The plugin is
not a runtime marketplace and is not a third-party npm product. Firefly core
owns generic plugin registration, document routing, presentation dispatch,
build orchestration, and publication lifecycle. The comments plugin owns all
comment-specific public UI, private service behavior, export validation,
moderation, styles, notification events, and private operations.

The registry is compile-time and capability-based. A disabled or unavailable
plugin is simply not asked for a post extension, export input, or service
process. This keeps the default static site independent of a comments service,
database, outbox, and mail credentials.

## 2. Ownership boundary

### Firefly core owns

- A small `FireflyPlugin` manifest and registry contract: stable id, version,
  configuration namespace, enabled predicate, capabilities, and entry points.
- Generic site extension slots and the rule that a post may receive an
  extension after its document body/reader region.
- Generic build input and publication-contribution orchestration.
- Generic service lifecycle/health command wiring, without knowing comment
  routes, storage tables, or notification fields.
- Existing Semantic/Terminal document dispatch and page-collection routing.

### The comments plugin owns

- `CommentSection`/`CommentForm` presentation, plain-text rendering, replies,
  labels, focus treatment, responsive styles, and comment-specific copy.
- Build-time comment decoding/grouping and the `comments.public.v1` allowlist.
- Submission, verification, moderation, private admin behavior, SQLite access,
  service routes, and private operational documentation.
- Export digest/tombstone metadata and the publication handoff implementation.
- Notification event shape, private outbox handling, delivery retry state, and
  SMTP provider adaptation.

The implementation should establish `plugins/comments/` as the ownership
root. Existing package boundaries may remain as thin compatibility entry points
during the move, but those shims must not retain comment business logic. The
plugin entry point is the only path that the site host, publication assembler,
and root runtime wiring use after migration.

There is deliberately no dynamic discovery protocol in this task. A static
registry is easier to audit, keeps the public build deterministic, and avoids
turning an internal Firefly feature into a general plugin distribution system.

## 3. Plugin contract

The contract is data-oriented at the core boundary; Astro component types and
private service framework details stay inside adapters. Its shape is:

```ts
interface FireflyPlugin {
  manifest: {
    id: string;
    version: string;
    configNamespace: string;
    capabilities: Array<'site-post-extension' | 'publication' | 'service'>;
  };
  isEnabled(config: FireflyConfig): boolean;
  site?: {
    loadBuildData(input: BuildInput): Promise<unknown>;
    postExtension(context: PostExtensionContext): unknown;
  };
  publication?: {
    contribute(input: PublicationInput): Promise<PublicationContribution>;
  };
  service?: {
    start(): Promise<void>;
    health(): Promise<HealthResult>;
  };
}
```

The exact names may follow the existing TypeScript conventions, but the
following invariants are fixed:

- Core never imports a comment row, comment route, private email, token, or
  comments database type.
- `isEnabled` is evaluated before reading private exports or constructing a
  service client.
- A post extension receives canonical post identity, presentation kind, and a
  sanitized build read model; it cannot fetch comments at runtime.
- A publication contribution is versioned and validated before it is copied
  into the public publication.
- Service and notification entry points are private capabilities and are never
  reachable from the public Astro bundle.
- The manifest and configuration namespace are stable enough for a future
  plugin replacement without making the core understand comments.

The initial registry contains the comments plugin only. The registry should
make the host-side integration visible in one place instead of adding new
comments-specific conditionals to each renderer, assembler, and shell script.

## 4. Runtime and data flow

```text
private service submission
        │
        ├─ SQLite row + private notification event/outbox
        │
        └─ sanitized comments.public.v1 export
                         │
                    static build
                         │
      plugin decoder ─────┴───── plugin publication contribution
            │
       post read model
            │
  core post route / presentation dispatch
            │
  comments plugin post extension (Semantic or Terminal)
```

1. The service stores submissions privately and emits only the existing
   sanitized public export shape. Email addresses, tokens, moderation fields,
   and outbox contents stay private.
2. The build host asks the enabled plugin to validate and group the export.
   Missing/disabled input yields an empty read model rather than a build-time
   service dependency.
3. The post route passes the read model through the existing shared
   `DocumentPresentation` dispatch. The plugin contributes its section only
   for `posts` entries.
4. The assembler asks the plugin for publication metadata and keeps the
   existing digest/tombstone rollback guards.
5. No public page performs a runtime comment read. The browser submits the
   existing native form to the private write origin.

The extension is placed after the document body/reader region and outside the
Terminal reader-region boundary. It is never added to pages, indexes,
experiments, 404 output, or inline Terminal `cat` output. No standalone public
comments route is introduced.

## 5. Plugin layout and migration

The proposed ownership tree is:

```text
plugins/comments/
├── plugin.json                 # stable manifest and capabilities
├── README.md                   # private/public boundary and operations
├── site/                       # Astro-facing section, form, decoder, styles
├── service/                    # private HTTP, storage, moderation, health
├── publication/                # public export schema and metadata bridge
├── notifications/              # outbox reader, delivery, SMTP adapter
└── tests/                      # contract, fixture, and provider tests
```

Migration rules:

- Move or re-home current comment logic behind these entry points in small
  slices; leave re-export/command shims only where existing package scripts or
  operator commands need a compatibility window.
- Update the site host, assembler, and root runtime commands to call the plugin
  entry point, not the old feature-specific files directly.
- Preserve `comments.enabled`, `comments.writeOrigin`,
  `comments.exportPath`, and `comments.consentVersion` semantics. If the
  manifest adds a plugin-enabled flag, the old `comments.enabled` value remains
  the source of truth for the initial plugin.
- Keep the public artifact name and schema `comments.public.v1` unchanged.
- Do not import historical data or rewrite existing route fixtures; the current
  unrelated article-route migration remains outside this task.

## 6. Notification and Zoho-compatible SMTP design

The HTTP service continues to write a private durable outbox. SMTP is a
delivery adapter for a private worker, not a browser dependency and not a
direct side effect of the submission request.

### Boundaries

- `NotificationSink` accepts a private, versioned notification event and
  appends it to the outbox.
- `NotificationDelivery` consumes pending events and reports accepted,
  retryable, or terminal failure.
- `SmtpNotificationTransport` implements `NotificationDelivery` through a
  provider-neutral SMTP client. The service can continue using a file sink in
  tests and environments without mail.
- A private delivery ledger or equivalent event idempotency record prevents a
  successful message from being resent on every worker restart. Events are
  acknowledged only after the SMTP server accepts them.

Each event has a stable private notification id, kind, recipient, template
data, and timestamps. Tokens and email addresses never enter the public export
or browser bundle. Logs redact recipients, tokens, message bodies, and SMTP
credentials; retry/dead-letter state stays on the private volume.

The worker uses bounded exponential retry with a private failed/dead-letter
state and graceful shutdown. A mail outage must not make an already persisted
comment appear in the public publication or leak private data. The service
still reports outbox-write failure to the caller when the durable queue cannot
be written.

### Configuration

Use provider-neutral environment variables with explicit validation:

```text
COMMENTS_SMTP_HOST
COMMENTS_SMTP_PORT
COMMENTS_SMTP_SECURE       # true for implicit TLS, false for STARTTLS
COMMENTS_SMTP_USER         # full mailbox address
COMMENTS_SMTP_PASSWORD     # app-specific password when required
COMMENTS_SMTP_FROM         # authenticated mailbox or permitted alias
COMMENTS_SMTP_FROM_NAME
```

For Zoho, the operator selects the documented host for the account type and
uses either port 465 with implicit SSL or port 587 with STARTTLS. The exact
provider facts and source are recorded in `research/zoho-smtp.md`. The task
adds placeholders and validation only; it does not add credentials, provision
a mailbox, change DNS, or perform production rollout.

The automated tests use an in-memory fake delivery transport to assert the
envelope handoff, security-mode configuration, redaction, retry, and
idempotency behavior without putting credentials in the test process. A
staging operator may later point the same adapter at a controlled SMTP sink or
Zoho mailbox; that real socket check is not a prerequisite for merging this
code task.

## 7. UI/UX decisions

The project-local UUPM research is an input, not a replacement for Firefly's
existing visual language. Existing Semantic and Terminal tokens, typography,
color contrast, and namespaced CSS remain authoritative. The generated generic
palette/font recommendations are not adopted.

The plugin UI keeps the current native HTML/no-hydration interaction model and
adds explicit states for:

- no approved comments / first-comment prompt;
- approved comments and one-level replies;
- initial form, native validation failure, and submission failure/retry;
- successful verification or awaiting moderation feedback where the existing
  service flow exposes it;
- disabled/unavailable plugin, which renders no public comment section.

Interaction rules:

- Every field has a visible label and a correctly associated control. Required
  consent and validation are represented in native semantics, not color alone.
- Keep body text at least 16px on mobile, use comfortable single-column form
  flow at narrow widths, and preserve usable touch targets around 44px.
- Preserve keyboard order, visible focus, 4.5:1 minimum text contrast, reduced
  motion, and no horizontal overflow at 375/768/1024/1440 widths.
- Keep motion subtle and state-based; do not add decorative emoji/icons or a
  new public navigation destination.
- Preserve the existing write-origin action contract and the no-JavaScript
  submission path unless an implementation finding proves a compatibility
  issue and records it separately.

Validation will cover both Semantic and Terminal post presentations because
they own separate CSS namespaces. The comments section must not add global
selectors or cross-import presentation styles.

## 8. Compatibility, security, and rollback

- Default-disabled builds remain buildable with no comments service, export,
  database, outbox, or SMTP environment.
- Enabled builds retain the public allowlist and publication digest/tombstone
  protection. An invalid or unexpected private field is rejected before
  publication.
- Private service endpoints, admin controls, database files, outbox files, and
  mail configuration are excluded from static output and repository examples.
- If plugin integration fails, the safe rollback is to disable the plugin and
  restore the thin host adapter; no public route or historical data migration
  is required.
- The implementation must isolate all changes from the unrelated article-route
  migration already present in the worktree.

## 9. Verification design

The final check combines focused plugin contracts with existing package checks:

- manifest/registry contract: disabled, enabled, missing export, and invalid
  config paths;
- site contract: Semantic/Terminal post rendering, page-boundary exclusions,
  form action/fields, one-level replies, and no runtime fetch;
- publication contract: exact `comments.public.v1` output, privacy scanner,
  digest, tombstone, and rollback behavior;
- service contract: private routes, moderation/verification, outbox durability,
  no public field leakage, and health/lifecycle wiring;
- notification contract: fake delivery success/failure, 465/587 modes, Zoho
  host configuration, redaction, retry, and idempotency;
- browser review: disabled/enabled states at the project-standard viewports,
  keyboard/focus and native validation, plus both visual presentations;
- full existing service, site, assembler, shell, and browser validation through
  the repository's `./sam` wrapper.

Residual human checks remain real-device/assistive-technology behavior and a
later operator-owned staging send with controlled credentials. They are not
silently treated as automated evidence.
