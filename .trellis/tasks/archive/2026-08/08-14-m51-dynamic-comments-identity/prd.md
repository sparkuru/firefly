# M5.1 Dynamic Comments and Identity Service

## Goal

Define and implement the first dynamic comment and public-identity capability
for firefly. The implementation adds a self-built write and moderation
boundary while preserving the existing immutable static site, its publication
pipeline, and its rollback model.

The planning/design baseline was approved on 2026-08-20, and implementation is
now active through the three serial child tasks recorded below. Production
deployment remains separately gated.

## Background and confirmed facts

- The current Astro site, assembled release, and runtime image are static-only.
  They do not query a database or expose a comment route.
- M5 established the configured Markdown workspace, guest-only public
  projection, canonical post routes, and a private handoff for historical
  content. It did not render historical comments or identity fields.
- The original private handoff contains 189 approved historical comments and
  separate memo data. These records remain private and are not a first-release
  input.
- The repository has separate Semantic and Terminal document components, but
  no existing comment surface or comment API.
- M5.1 was initially deferred. On 2026-08-20 the owner re-authorized it as the
  next product task, approved the planning/design baseline, and activated
  implementation. This does not authorize production deployment, external
  provisioning, real credentials, or a production traffic change.
- Authored Markdown image-like strings are ordinary public body text and are
  unrelated to the M5.1 service boundary.

## User outcome

Readers can submit a new comment on a public post using a verified pseudonym.
The owner can verify, moderate, approve, reject, delete, and export comments.
Approved comments appear on the next immutable static publication; unapproved
or deleted records never enter the public read model.

## Requirements

- **R1 — Privacy-first identity:** define exact public fields, consent, alias
  rules, email use, private retention, and irreversible-data boundaries.
- **R2 — Comment lifecycle:** define submission, validation, abuse controls,
  verification, moderation, visibility, notification, deletion, export, and
  rollback behavior.
- **R2a — Verified pseudonyms:** support account-free display names with an
  optional HTTPS homepage; use private email only for one-time verification,
  approval/rejection outcomes, and explicitly opted-in reply notifications.
- **R2b — One-level replies:** support direct replies to top-level comments;
  reject reply-to-reply submissions and never expose private parent records.
- **R3 — Static compatibility:** define the independent service boundary,
  versioned sanitized export, build handoff, post-route binding, static
  rendering, publication, and privacy-safe rollback.
- **R4 — Historical privacy:** exclude all historical comments and memo data
  from the first release. Any future historical feature requires a separate
  owner decision, per-record review, and a new privacy contract; source IDs,
  email, IP, user-agent, and raw source identity are not public by default.
- **R5 — Implementation traceability:** keep the converged PRD, technical
  design, ordered implementation/validation plan, child evidence, and curated
  Trellis context aligned with the implemented boundary.

## Resolved product decisions

- **Independent service, static public read model:** the service accepts,
  verifies, validates, rate-limits, moderates, and exports approved records.
  The static site consumes only the sanitized export during a fresh build. The
  main site never fetches a comment read API at runtime. Approval-to-publication
  build latency is accepted.
- **Route scope:** every public post receives comments in whichever
  presentation renders that post, Semantic or Terminal. Standalone pages,
  directory indexes, inline Terminal `cat` output, and experiments do not.
- **Comment body:** first-release bodies are bounded plain text with preserved
  line breaks and escaped output. Markdown, HTML, images, and visitor-supplied
  links are not supported.
- **Public identity:** each submission has a public display name and optional
  credential-free HTTPS homepage. Email is private; there are no public email
  fields, login accounts, or source-identity lookups.
- **Verification and moderation:** email verification is required before a
  record enters the owner-only pending queue. Verification never publishes a
  comment; every public record requires explicit owner approval.
- **Replies:** a reply targets a top-level comment only. Replies use the same
  verified-pseudonym and pre-moderation flow. Nested reply chains are rejected.
- **Notifications and privacy:** notifications default off, are opt-in only,
  and are transactional rather than marketing. Cancellation and deletion
  requests are supported. Private email and abuse material have bounded
  retention defined in the technical design and implementation plan.
- **Historical data:** the 189 historical comments and memo data stay private;
  no import, anonymization, projection, or automatic migration is included.
- **Authorization boundary:** service/site/publication implementation is
  authorized in this task through the serial child tasks. Production
  credentials, external provisioning, deployment, and traffic changes require a
  separate owner decision.

## In scope for planning

- Service and data-flow architecture.
- Privacy, consent, threat, and abuse model.
- Identity, comment, reply, moderation, notification, and retention rules.
- API and private control-plane proposals.
- Versioned public export and static-site compatibility contract.
- Post-route binding and Semantic/Terminal integration boundary.
- Data import/export boundary, explicitly excluding historical import.
- Acceptance criteria, implementation sequence, validation commands, rollout,
  rollback, backup, and restore requirements.

## Out of scope for this implementation task

- Production service provisioning, credentials, DNS/email setup, or deployment.
- Historical data import, migration, or public historical-comment materialization.
- Public historical-comment materialization or historical statistics.
- SSR conversion, direct database reads, runtime comment reads, or a public
  comment-count API.
- Markdown/rich-text comments, image uploads, reactions, mentions, nested
  threads, public profiles, or user accounts.

## Acceptance criteria for the planning artifacts

- **A1:** `design.md` contains an architecture diagram and explicit boundaries
  for the independent service, site build, export artifact, assembler, and
  static runtime.
- **A2:** The public/private field split, pseudonym validation, email/token
  handling, consent, retention, deletion, and non-leakage rules are explicit.
- **A3:** The lifecycle and reply state transitions are observable, including
  verification-not-public, pre-moderation, one-level replies, tombstones, and
  deterministic export eligibility.
- **A4:** The versioned export schema contains only approved public fields and
  defines route, parent, ordering, digest/signature, stale-route, and
  tombstone checks.
- **A5:** The static integration covers post canonical routes in both
  presentations, excludes pages/experiments/inline `cat`, requires no runtime
  read, and preserves no-JavaScript reading.
- **A6:** The publication plan preserves existing build, static-output,
  assembled-release, runtime, atomic-promotion, and rollback gates, including a
  privacy-safe rule for deleted comments.
- **A7:** `implement.md`, `implement.jsonl`, and `check.jsonl` provide the
  ordered execution plan, validation matrix, rollback points, and real
  project-spec context entries; child evidence records completed checks.
- **A8:** No blocking open product questions remain in this record; production
  rollout remains separately gated by owner review.

## Planning artifacts

- [Technical design](./design.md): architecture, contracts, data model,
  privacy/security controls, static integration, operations, and alternatives.
- [Implementation plan](./implement.md): future serial deliverables,
  validation commands, risk/rollback points, and acceptance mapping.
- `implement.jsonl` and `check.jsonl`: curated frontend specifications for a
  later sub-agent implementation/check context.
