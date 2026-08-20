# M5.1 Dynamic Comments and Identity Service — Technical Design

## Status and planning boundary

This document is the approved M5.1 design baseline. Its service, static
consumer, and publication contracts are implemented by the serial child tasks
under this parent. It does not authorize production credentials, external
provisioning, deployment, or a production traffic change.

## Design outcome

M5.1 adds a self-built, independently deployed write and moderation service
without turning firefly into a dynamic site:

```text
public post HTML
  └─ native comment form ──POST──> comment service
                                   ├─ email verification
                                   ├─ private database
                                   ├─ abuse controls
                                   └─ owner-only moderation
                                            │ approved records only
                                            ▼
                                   sanitized public export
                                            │ guarded build input
                                            ▼
                              fresh static site build / publication
                                            │
                                            ▼
                                immutable public comment HTML
```

The main site never fetches a comment read API at runtime. A comment becomes
public only after owner approval, export, a successful static build, and
atomic publication. Approval-to-publication latency is an explicit trade-off.

## Invariants

- The existing Astro site, assembled publication, and runtime image remain
  static-only.
- The write service and its database are deployed separately from the public
  static image.
- The public site has no database credentials, service read credentials, or
  private export fields.
- Historical Typecho comments, memo data, source IDs, emails, IP addresses, and
  user agents are not imported or projected in the first release.
- Only public post routes receive comments. Standalone pages and experiments
  do not.
- Canonical post routes receive the comment surface in whichever presentation
  renders the post: Semantic or Terminal. Inline Terminal `cat` output remains
  article-only and does not clone a form or comment list.
- Comment bodies are bounded plain text. Rendering escapes text and preserves
  line breaks; Markdown, HTML, images, and visitor-supplied links are not
  accepted.
- A verified email is not an account. There is no login, public email, public
  source identity, or automatic publication after verification.

## Component boundaries

| Component | Owns | Must not own |
| --- | --- | --- |
| `services/comments/` | Submission validation, email verification, private storage, rate limits, moderation state, notifications, export, retention, audit | Astro content loading, public site rendering, historical import by default |
| `apps/site/` | Strict export decoding, post-route cross-checks, static comment rendering, native form markup, build-time configuration | Database access, runtime comment reads, private email or moderation state |
| `tooling/assemble-publication/` | Existing safe-tree, release, reference, inventory, and atomic-promotion checks | Comment-service calls, moderation, schema interpretation beyond release safety |
| `content/` and the external Markdown workspace | Authored posts and front matter | Visitor comments, email, moderation records, generated private data |
| Static runtime image | Immutable site files and existing headers/cache behavior | Comment service, persistent state, dynamic proxying |

The service is a separate Node 22 TypeScript package with its own lock file and
container. It may share conceptual schema documentation with the site, but it
must not import `apps/site`, Astro, X Core, or presentation packages.
The initial storage target is one service instance with a private SQLite
database in WAL mode and a persistent volume. The storage interface should keep
an eventual PostgreSQL migration possible, but multi-instance operation is not
part of the MVP.

## Public route identity

The service and export use the canonical post `href` already produced by
`CanonicalDocument`, for example `/posts/main/example/`. This is the public
document identity, not a host filesystem path or source Markdown filename.

- The write service accepts only normalized `/posts/.../` paths.
- The site export decoder verifies every path against the current guest public
  post catalog before rendering.
- Pages, experiments, aliases that do not resolve to a canonical post, host
  paths, query strings, fragments, encoded separators, and traversal are
  rejected.
- A post route rename is an explicit migration event. The owner must provide a
  route mapping before export; the service never guesses that two routes are
  the same article.
- The public export contains the route needed to group comments, but never the
  source workspace path or private content owner.

## Identity and private data model

The public identity is a per-comment verified pseudonym, not a user account.
The service may correlate private submissions for abuse control through a
keyed fingerprint, but it does not expose or resolve that identity publicly.

### Public fields

Each exported record contains only:

- opaque random public comment ID;
- canonical post path;
- optional opaque public parent comment ID;
- display name;
- optional validated HTTPS homepage;
- plain-text body;
- server-generated UTC creation time.

Display names are trimmed, NFC-normalized, bounded to 80 Unicode code points,
and reject NUL, control characters, and line breaks. Homepages are absolute
HTTPS URLs without credentials, fragments, control characters, or unsafe
schemes. The rendered homepage link uses `rel="nofollow ugc noopener
noreferrer"` and is not treated as trusted HTML.

Comment bodies are normalized to NFC and LF line endings, bounded to 8 KiB
after UTF-8 encoding, and reject NUL and control characters other than tab and
line breaks. The site renders the value as text with a pre-wrapped style; it
never uses HTML-string APIs for the body.

### Private fields

The service may retain the following in its private store:

- encrypted email address for verification and explicitly opted-in reply
  notifications;
- keyed email fingerprint for bounded abuse correlation;
- hashed, single-use verification and control tokens;
- internal record IDs and parent relationships;
- verification, moderation, export, deletion, and retention state;
- short-lived keyed IP/rate-limit material and a bounded user-agent hash;
- consent version, notification choice, and audit timestamps.

The service never puts these fields in the public export, HTML, client data
attributes, URL, logs, or notification recipient lists visible to other users.
Email encryption keys, token secrets, database credentials, and admin
credentials exist only in the service environment or secret store.

## Comment state machine

```text
submitted → unverified → verified/pending → approved → exported
                    │             ├──────→ rejected
                    │             └──────→ spam/quarantined
                    └──────────────→ expired

approved/exported ──→ deletion-requested ──→ deleted/tombstoned
```

- Verification is necessary but never sufficient for public visibility.
- An email verification link is single-use, stored only as a hash, and expires
  after 24 hours. Verification creates a pending moderation record and a
  private control token; it does not create a login session.
- The control link can request cancellation before approval or deletion after
  publication. The service records a durable tombstone so later exports cannot
  reintroduce the public ID.
- Rejected, spam, quarantined, expired, and deleted records remain private.
- A rejection/approval outcome may be sent to the verified email. Such mail is
  transactional only and contains no marketing.
- IP/user-agent abuse material is removed after 30 days. Unverified records
  expire after the verification window. Rejected or unapproved email is
  removed after a 30-day appeal/anti-abuse window. Approved email is retained
  only while notification consent or a pending privacy request requires it;
  otherwise it follows the same 30-day deletion window.
- Publicly approved text and display name remain in the publication until an
  owner-approved deletion/tombstone is processed through a new build.

## Reply rules

- A top-level comment has no parent.
- A reply must name a top-level comment's internal record; the service rejects
  a parent that is itself a reply.
- A reply may be submitted while its parent is pending, but it cannot be
  exported until the parent is approved and exported. If the parent is
  rejected, deleted, or tombstoned, the reply cannot become public.
- The export decoder independently rejects missing parents, nested parents,
  duplicate IDs, and child records that do not have an approved public parent.
- Public parent IDs are opaque and are emitted only when both records are
  eligible for export.

## Write and control interfaces

The following is the implemented v1 contract and remains the design reference
for compatibility and future changes.

### Public write endpoints

`POST /v1/submissions`

Accepts a native form or equivalent request with:

- `postPath`;
- optional `parentId` referring to a top-level comment;
- `displayName`;
- optional `homepage`;
- private `email`;
- `body`;
- `notifyReplies` (default `false`);
- `consentVersion`;
- a honeypot field that must remain empty.

The endpoint applies strict size/type/path validation, origin allowlisting,
request-body limits, rate limits, and abuse checks. It returns a generic
confirmation response and never confirms whether a private email or pseudonym
already exists. A successful submission sends a verification message; it does
not change public HTML.

`GET /v1/verify/<single-use-token>`

Consumes a verification token, marks the submission verified/pending, and
shows a service-owned confirmation page linking back to the canonical post.
The response must not disclose whether a different token or email exists.

`GET /v1/control/<single-use-or-bounded-token>` and
`POST /v1/control/<token>/delete`

Provide a narrowly scoped, non-account control path for cancellation or
deletion requests. The token is hashed at rest, is never rendered in the
public site, and is invalidated after use or deletion.

`GET /healthz`

Returns only bounded service health. It must not expose database paths, counts,
environment variables, or private configuration.

There is deliberately no public `GET /comments` or `GET /v1/comments` API.
The public site reads only the static build output.

### Owner-only control

Moderation and export use a private control plane. The MVP should provide a
`commentsctl` command or equivalent private admin client for queue listing,
approve, reject, spam, quarantine, delete, audit, retention, and export
operations. The control plane is bound to loopback/private ingress and uses
operator authentication that is never embedded in the static site. A future
dashboard may use the same private contract, but a public admin route is not
required for the first release.

## Public export contract

The service produces a versioned, allowlisted artifact such as
`comments.public.v1.json`:

```json
{
  "schemaVersion": 1,
  "sourceRevision": "opaque-export-revision",
  "generatedAt": "2026-08-20T00:00:00.000Z",
  "comments": [
    {
      "id": "c_opaque_random_id",
      "postPath": "/posts/main/example/",
      "parentId": null,
      "displayName": "Reader",
      "homepage": "https://example.test/",
      "body": "A first line.\nA second line.",
      "createdAt": "2026-08-20T00:00:00.000Z"
    }
  ]
}
```

`homepage` is omitted when absent. The strict decoder rejects unknown fields,
private fields, malformed dates, unsafe URLs, non-NFC text, overlong values,
non-post paths, duplicate IDs, nested replies, and invalid parent references.
Records are sorted deterministically by post path, creation time, and opaque
ID. The bundle carries a SHA-256 digest; if it crosses a trust boundary, a
detached service signature is required. The static build never downloads the
bundle from the service or accepts a URL as build input.

The export revision and tombstone epoch are recorded in the publication
metadata. A deleted public comment must not reappear merely because an older
immutable release is selected for rollback.

## Static-site integration

The implementation adds a build-only comments reader beside the existing
content helpers, with an explicit input such as
`FIREFLY_COMMENTS_EXPORT=/app/artifacts/comments/comments.public.v1.json`.
The current no-comment build remains valid with an empty export; an M5.1
release build must pass an explicit export and validated public write origin.

The site-side flow is:

1. Load and strictly decode the export once for the build.
2. Load the guest canonical content.
3. Cross-check all export `postPath` values against public posts.
4. Pass only the matching public records into the canonical post document
   components.
5. Render approved records and a native submission form as a site-local
   `CommentSection` component.

`DocumentPresentation.astro` remains the presentation dispatcher. Both
`SemanticDocument.astro` and `TerminalDocument.astro` receive the same
validated post-scoped comment data. The comment section is outside the
`data-terminal-reader-region` so the existing read-only Vim reader does not
consume or clone the form. `TerminalStreamDocument.astro` remains unchanged:
inline `cat` output is an article preview, not a canonical comment surface.

The form uses a public configuration value such as an HTTPS
`comments.writeOrigin` and posts to the service. No client JavaScript is
needed to display comments or submit the basic form. The service owns
verification and confirmation pages. The static site may show a build-time
comment count, but it must never fetch a live count.

## Abuse, security, and privacy controls

- Normalize and validate all fields before persistence; reject unknown fields.
- Cap request bodies and all user-controlled text; do not support uploads,
  HTML, Markdown, image URLs, or arbitrary links.
- Use a hidden honeypot, minimum submission timing where practical, per-IP and
  per-email-fingerprint token buckets, per-post limits, and a quarantine path.
- Require email verification, but treat verification as a queue gate rather
  than a moderation decision.
- Allow only configured site origins and canonical post-path syntax. Do not
  enable wildcard CORS. The native form does not need a readable cross-origin
  response.
- Redact emails, tokens, IPs, user agents, request bodies, and admin secrets
  from application logs. Use a keyed fingerprint for bounded rate limiting.
- Escape every public field at render time; use strict HTTPS URL validation and
  safe link attributes for homepages.
- Keep the private database and backups outside the publication tree. Encrypt
  email-bearing backups, test restore, and never mount them into the static
  build.
- Keep admin operations audited without storing raw private input in ordinary
  logs.
- Add export and emitted-HTML scans for email-like values, IP addresses,
  user-agent sentinels, service secrets, host paths, private IDs, and historical
  handoff markers.

## Build, publication, and rollback

The guarded M5.1 release sequence extends the existing static sequence rather
than bypassing it:

1. Export approved records from the private service into a contained build
   artifact.
2. Verify the export schema, digest/signature, route catalog, tombstones, and
   consent/version metadata.
3. Build the site with the export as a local read-only input.
4. Run the existing site checks, static-output checks, focused/full browser
   checks, and assembled-publication checks.
5. Run the existing fresh publication assembly and runtime inventory/header/
   route probes.
6. Promote the candidate atomically only after all gates pass.

The static release records the export revision and tombstone epoch. A rollback
selector refuses a release that predates a deletion tombstone or otherwise
reintroduces a revoked public ID. If no prior release is privacy-safe, rebuild
the prior content state with the current tombstone-filtered export before
promoting it. Service data and static publication are therefore independently
rollbackable without granting the service production release credentials.

## Alternatives rejected

- **Runtime comment reads from Waline/Twikoo/Artalk-like service:** simpler
  freshness, but violates the no-runtime-read boundary and adds public API,
  cache, client failure, and service-availability coupling.
- **GitHub Issues/Discussions through Gitalk/Giscus/Utterances:** low
  infrastructure cost, but requires GitHub identity and public third-party
  storage, which conflicts with account-free verified pseudonyms and private
  email.
- **Comments stored directly in Markdown:** gives static output but mixes
  untrusted reader data with authored content, creates source-control write
  privileges, and makes moderation/privacy retention difficult.
- **Staticman-compatible repository writes with service-owned repository
  credentials:** preserves static output but gives the public write service
  broader repository authority than necessary. M5.1 uses an export handoff and
  guarded build instead.

## Future decisions deliberately excluded

- Historical 189-comment import or anonymization.
- Public statistics such as historical `commentsNum`, views, or stars.
- Markdown/rich-text comments, image uploads, reactions, mentions, or nested
  threads.
- Public user accounts, login, profile pages, or source-identity lookup.
- Multi-instance service operation, managed database migration, or automatic
  production deployment triggered directly by the public write service.
