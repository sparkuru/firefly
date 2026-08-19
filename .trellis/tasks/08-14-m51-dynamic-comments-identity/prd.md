# M5.1 dynamic comments and identity service

## Goal

Plan, but do not implement, the first dynamic comment and public-identity
capability for f1refly. The plan must preserve the existing immutable static
site and keep any future historical-data handling behind an explicit owner
decision.

## Confirmed Facts

- The current Astro site, its assembled release, and runtime image are
  static-only. They do not query a database or expose a comment route.
- M5.1 is planned to own a separately deployed write API/database, consent,
  abuse controls, moderation, public read-model export, and static rebuild
  handoff. It must not convert the main site to SSR or direct database reads.
- Owner direction for this task is planning only: no service, database, API,
  public comment projection, or deployment implementation may be written.
- Owner decision: defer M5.1 after this initial requirement capture. A later
  self-built solution may resume from this task, but comments are not part of
  the current release path.
- Local image-like strings in authored Markdown are ordinary public body text,
  not M5.1 assets, blockers, or a planning concern.
- Owner decision: the first M5.1 release supports new comments only. All 189
  historical comments remain private and are not automatically projected,
  anonymized, or published. Any future historic-comment publication requires a
  separate owner decision and per-record review/consent policy.
- Owner decision: new commenters use a classic, account-free verified-pseudonym
  model. A submission has a public display name and optional credential-free
  HTTPS homepage; a private email address is used only for one-time verification
  and opted-in notifications. There is no public email, login account, or
  source-identity lookup.
- Owner decision: every new comment is held in an owner-only moderation queue.
  It enters the public static read model only after explicit approval; verified
  status alone never causes immediate public display.
- Owner decision: the first release supports one reply level. A reply targets a
  top-level comment; replies to replies are not accepted. Replies use the same
  verified-pseudonym and pre-moderation flow as top-level comments.
- Owner decision: private email is data-minimized. It is used only for
  verification, an approval/rejection outcome, and explicitly opted-in reply
  notifications; notifications default off. Cancellation and deletion requests
  are supported, and email for an unapproved/deleted comment is removed after a
  bounded appeal window defined by the implementation plan.

## Requirements

- R1: Define a privacy-first identity model, including the exact public fields,
  consent policy, alias rules, and irreversible-data boundaries.
- R2: Define the comment lifecycle: submission, validation, abuse controls,
  moderation, visibility, deletion/export, and reply behavior.
- R2a: Use verified pseudonyms without user accounts. Define email verification,
  display-name/URL validation, private retention, notification consent, and
  deletion/export behavior.
- R2b: Support one-level replies while rejecting nested reply chains and keeping
  parent/child relationships private until moderation approves a public export.
- R3: Define the compatibility boundary between a dynamic comment service and
  the immutable static site, including read-model export/rebuild and rollback.
- R4: Keep historical comments private and out of the first release. A later
  historic-comment feature must be separately approved and may never publish
  source IDs, email, IP, user-agent, or raw source identity by default.
- R5: Produce planning artifacts and evidence sufficient for a later,
  separately authorized implementation task; preserve the no-implementation
  boundary in this task.

## Initial Scope Boundaries

In scope: product decisions, threat/privacy model, service/data-flow design,
API and schema proposals, data import/export approach, moderation/abuse policy,
acceptance criteria, research, and an implementation/validation plan.

Out of scope: source-code changes, database creation or migration, external
service provisioning, credentials, deployment, public comment UI, public
historical-comment materialization, or SSR conversion.

Also out of scope for the current mainline: completing M5.1 planning, approving
an implementation plan, or starting this task.

## Resolved Decisions

- The first release does not display historical comments. It accepts and
  displays only newly submitted comments after the planned moderation policy
  permits them.
- New-comment identity is a verified pseudonym: public display name and optional
  HTTPS homepage; private email for verification/opted-in notifications only;
  no public email or account system.
- All new comments are pre-moderated. Pending/rejected/spam/quarantined records
  remain private; only owner-approved records are exported to the public static
  read model.
- Each public comment may have approved direct replies. Reply-to-reply attempts
  are rejected rather than flattened or reparented implicitly.
- Private email is never public or used for marketing. Reply notices are
  opt-in; users can withdraw consent or request deletion, with a bounded private
  appeal/anti-abuse retention period defined before implementation.

## Deferral Record

M5.1 is deferred for a future self-built comment service. The selected product
direction, if resumed, is: no historical-comment projection; account-free
verified pseudonyms; pre-moderation; one reply level; data-minimized private
email with opt-in notifications. The static-versus-dynamic public read-model
decision remains intentionally open for the later planning session.
