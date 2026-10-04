# Public memo plugin

## Goal

Restore a standalone “闲言碎语 / memo” stream where visitors can submit short
messages, distinct from posts, pages, article comments, and Lab Experiments.

## Delivery Decomposition

This parent task owns the source requirements, cross-deliverable acceptance,
and final integration review. Implementation is split into independently
verifiable child tasks:

| Child task | Deliverable | Dependency |
| --- | --- | --- |
| `10-01-memo-contract` | First-party manifest/config and versioned public export contract | none |
| `10-01-memo-service` | Private submission, verification, moderation, export, and Docker service | contract |
| `10-01-memo-site` | Firefly build adapter, `/memos/` route, form, and navigation | contract; consumes the HTTP contract from the parent design |
| `10-01-memo-publication-runtime` | Publication checks, Nginx/Compose wiring, operations, and cross-layer validation | contract, service, and site |

The contract child must land before the service and site children can be
started. The publication/runtime child is last because it validates the
assembled output and runtime wiring from the other three deliverables. Child
task dependencies are repeated in each child artifact; parent/child nesting is
not itself a dependency mechanism.

## Confirmed Context and Decisions

- Firefly publishes static HTML. Its authored Markdown workspace, canonical
  document model, and X Core presentation contexts currently cover only posts
  and pages. `/lab/` is assembled from independently built Experiments.
- The comments feature uses a live service for submissions, email verification,
  private SQLite state, moderation, and export. Firefly consumes a validated
  public JSON projection during the site build; it does not query a public
  runtime read API.
- The comments capability is a first-party statically registered plugin with
  its own manifest/configuration, site adapter, publication adapter, UI, and
  service. It is not automatic plugin discovery.
- The owner wants memo implemented as a first-party plugin. Firefly should
  provide the site adapter; memo submission and business logic belong in an
  independently deployable Docker service.
- Visitors may submit memos without a Firefly account. Follow the comments
  lifecycle: email verification, owner approval, a sanitized public export, and
  inclusion in a later static build.
- Owner review will use a private API/CLI, not a web moderation console.
- Firefly has no site-wide login. Email verification proves mailbox access; the
  private moderation API uses a service-owned credential.
- Historical Typecho memo data was explicitly excluded from the first public
  release. The new feature does not authorize importing that private history.

## Requirements

- Publish memos newest-first on a dedicated `/memos/` route. Memo
  records are standalone; they do not target a post or participate in comment
  reply threads.
- Give the memo capability its own plugin manifest, configuration namespace,
  public data contract, site adapter, publication adapter, and service. Do not
  reuse the comments record schema.
- Provide a visitor submission form in Firefly for a display name, private
  verification email, plain-text memo body, and explicit publication consent.
  It sends directly to the configured memo service. Do not require a Firefly
  account or expose private service credentials in static HTML or JavaScript.
- Keep validation, rate/abuse controls, private persistence, email verification,
  owner moderation, and export generation inside the memo service. Expose
  private owner operations for listing, approving, rejecting, deleting, and
  exporting records through authenticated API/CLI commands; do not build an
  owner-facing web console.
- Run the memo service as a separate Docker image with persistent private state.
  Do not put memo business logic or a database in the Firefly site container.
- Publish only owner-approved records through a versioned, exact-field public
  export. Firefly validates the export at build time and renders only the
  approved public projection.
- Keep the public site static and ensure the memo stream remains readable
  without JavaScript. New approved submissions appear after export and the
  next site build/publication.
- Keep unpublished records, email addresses, verification/admin tokens,
  moderation state, abuse metadata, local paths, and historical Typecho data
  out of public artifacts.

## Out of Scope

- Bulk import, anonymization, or automatic publication of historical Typecho
  memo data.
- Firefly accounts, visitor profiles, public memo replies, or post-scoped memo
  comments.
- A browser-based owner moderation console.
- A public runtime read API or SSR conversion of the Firefly site.
- Production host provisioning, credentials, DNS/TLS changes, or deployment.

## Acceptance Criteria

- [x] A dedicated plugin integration publishes `/memos/` independently of
  `/posts/`, `/pages/`, and `/lab/`.
- [x] A visitor can submit a standalone memo without a Firefly login; the
  service validates it, verifies email ownership, and keeps it private pending
  owner approval.
- [x] The owner can list, approve, reject, delete, and export submissions
  through the private API/CLI using a service-side credential.
- [x] Only approved public fields appear in the versioned export and static
  output; private fields and historical Typecho memo data are absent.
- [x] Firefly consumes the export at build time and never connects to the memo
  database or runs memo business logic.
- [x] The memo runtime is built and operated as an independent Docker service
  with persistent private data.
- [x] The static `/memos/` stream remains readable with JavaScript disabled.
- [x] The plugin can be disabled without requiring the memo service or export
  for a normal Firefly build.

The parent is complete only when all child acceptance criteria pass together,
the disabled build remains static-only, and the final publication review shows
no memo database read, runtime public read API, private field, or historical
Typecho record crossing into public artifacts.

Combined acceptance passed on 2026-10-05. The final child's
`research/validation-findings.md` maps all eight criteria to the three accepted
dependency children and actual strict HTTPS/TLS/static publication/runtime
evidence. The owner confirmed the concrete Phase 3.4 plan; work commit
`08be5df` and final-child archive `4b4a01a` are complete. The separately approved
parent archive and journal close this initiative. See
[combined acceptance](../10-01-memo-publication-runtime/research/validation-findings.md);
no deployment is included.
