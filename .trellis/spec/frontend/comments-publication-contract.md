# M5.1 Comments and Publication Contract

## Scenario: Privacy-Safe Static Comments

### 1. Scope / Trigger

Use this contract when changing `services/comments/`, the site comments
consumer, `FIREFLY_COMMENTS_EXPORT`, comment-bearing static output, or
publication rollback metadata. M5.1 is a cross-layer boundary: the service
accepts writes and owns private state, while the site and release contain only
the approved sanitized read model.

The first implementation does not import historical comments, expose a public
read API, deploy a relay, or turn the static site into SSR.

### 2. Signatures

~~~ts
normalizeSubmission(
  input: unknown,
  options?: { expectedConsentVersion?: string; routeCatalog?: RouteCatalog }
): NormalizedSubmission

createPublicExport(
  value: Omit<PublicExport, 'digest'>,
  catalog?: RouteCatalogInput
): PublicExport

decodePublicCommentsExport(
  value: unknown,
  source?: string
): PublicCommentsExport

loadCommentsForPosts(
  posts: readonly CanonicalDocument[],
  config: CommentsSiteConfig
): ReadonlyMap<string, readonly PublicComment[]>
~~~

~~~http
POST /v1/submissions
GET  /v1/verify/<single-use-token>
GET  /v1/control/<control-token>
POST /v1/control/<control-token>/delete
GET  /v1/admin/comments
GET  /v1/admin/export
POST /v1/admin/comments/<public-id>/(approve|reject|quarantine|spam|delete)
GET  /healthz
~~~

~~~ts
assemblePublication({
  repositoryRoot: string,
  discovery?: ExperimentDiscovery,
  comments?: CommentsPublicationMetadata
}): Promise<PublicationResult>
~~~

### 3. Contracts

#### Submission and private storage

- The public write payload contains `postPath`, optional top-level
  `parentId`, `displayName`, optional `homepage`, private `email`,
  `body`, optional boolean `notifyReplies`, `consentVersion`,
  `consent: "accepted"`, and an empty honeypot.
- `postPath` is an existing canonical ASCII-safe `/posts/.../` route.
- Display names are NFC-normalized, trimmed, and limited to 80 Unicode code
  points. Bodies are NFC/LF plain text limited to 8192 UTF-8 bytes; markup,
  links, images, and disallowed controls are rejected.
- Email is encrypted at rest and only used for verification and explicitly
  opted-in transactional notifications. Verification and control tokens are
  stored as hashes. Internal IDs, fingerprints, moderation state, audit data,
  IP/user-agent material, consent, and retention fields are private.
- Verification is single-use and expires after 24 hours. It transitions a
  record to pending moderation; it never makes a record public.
- Only owner approval can make a record exportable. Replies must target a
  top-level record and cannot cross post routes. Deleted or rejected parents
  prevent replies from entering the export.

#### Public export

The only public service artifact is a local JSON envelope:

~~~json
{
  "schemaVersion": 1,
  "sourceRevision": "revision",
  "generatedAt": "2026-08-20T00:00:00.000Z",
  "tombstoneEpoch": 4,
  "digest": "sha256-hex",
  "comments": [
    {
      "id": "c_opaque",
      "postPath": "/posts/main/example/",
      "parentId": null,
      "displayName": "Reader",
      "homepage": "https://example.test/",
      "body": "Plain text",
      "createdAt": "2026-08-20T00:00:00.000Z"
    }
  ]
}
~~~

The comment allowlist is exactly `id`, `postPath`, `parentId`,
`displayName`, optional `homepage`, `body`, and `createdAt`.
Records sort by post path, creation time, then opaque ID. The digest covers
the normalized envelope without the digest field.

#### Site and release handoff

- `config/site.toml` contains public build-time `comments.enabled`,
  `comments.writeOrigin`, `comments.exportPath`, and
  `comments.consentVersion`. Enabled comments require an HTTPS origin.
- `FIREFLY_COMMENTS_EXPORT` is optional for the empty disabled build and
  mandatory for an enabled M5.1 build. `./sam` accepts only a readable,
  repository-relative JSON file and passes it into the container as
  `/app/<relative-path>`.
- The site decodes the export during build, cross-checks every route against
  the guest canonical post catalog, and passes only post-scoped public records
  into Semantic or Terminal canonical document components.
- Pages, indexes, home, experiments, 404, and inline Terminal `cat` output do
  not receive a comment section. There is no public runtime read/count request.
- Publication evidence stores `enabled`, `schemaVersion`,
  `sourceRevision`, `generatedAt`, `digest`, and `tombstoneEpoch`.
  A candidate with a lower tombstone epoch than the currently published
  metadata is rejected before promotion.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| missing consent or wrong consent version | reject before storage |
| unknown submission/export field | reject with field context |
| stale, non-post, traversal, encoded, or unsafe route | reject before render/export |
| non-NFC, overlong, control-containing, marked-up, or linked body | reject |
| missing/malformed parent, nested reply, or cross-post parent | reject |
| verification replay, expired token, or invalid control token | reject without disclosure |
| unverified, pending, rejected, spam, quarantined, expired, or deleted record | exclude from public export |
| export without digest when publication is enabled | reject build/assembly |
| comment route absent from emitted site | reject assembly |
| private field, email-like private sentinel, unsafe comment markup, source path, or secret in comment HTML | reject publication validation |
| candidate tombstone epoch lower than published epoch | refuse rollback/promotion |
| no enabled export/configured origin | preserve the empty disabled build |

### 5. Good / Base / Bad Cases

- **Good:** a verified and owner-approved record is exported with only the
  allowlisted public fields, decoded against the current post catalog, rendered
  in the next static build, and recorded with its digest and epoch.
- **Base:** comments remain disabled, or the service is unavailable; the site
  still builds and serves the last immutable static release with no comment
  surface.
- **Bad:** mount a host-private absolute export path, put a database field in
  the JSON, fetch comments from the browser, render a page/experiment comment
  section, or select a release older than a deletion tombstone.

### 6. Tests Required

- Service: validation, consent, encryption/token boundaries, HTTP status and
  generic responses, retry/idempotency, verification replay/expiry, reply
  eligibility, moderation, deletion/tombstones, retention, SQLite migration,
  export ordering/digest, and private-field exclusion.
- Site: strict decoder, Unicode/route/body/homepage/date rejection, digest
  mismatch, stale route rejection, direct-reply grouping, empty export, and
  config defaults.
- Static site: disabled output contains no comment section; an enabled fixture
  renders top-level/direct replies and native forms only on canonical posts,
  with no private sentinels in HTML.
- Publication: no-export/with-export handoff, route/catalog validation,
  privacy scanner, metadata recording, and tombstone rollback refusal.
- Runtime shell: `bash -n`, ShellCheck, shfmt, invalid export-path rejection,
  and exact repository-relative container handoff.

### 7. Wrong vs Correct

#### Wrong

~~~js
const comments = await fetch('/v1/comments').then((response) => response.json());
element.innerHTML = comments[0].body;
~~~

#### Correct

~~~js
const comments = loadCommentsForPosts(publicPosts, SITE_CONFIG.comments);
// decodePublicCommentsExport() has already allowlisted, normalized, and
// route-bound the records before CommentSection receives them.
~~~

~~~bash
# Good: the handoff is local, explicit, and contained.
FIREFLY_COMMENTS_EXPORT=artifacts/comments/comments.public.v1.json \
  ./sam npm run build:m51
~~~

Production deployment, email relay, DNS, credentials, and historical data
remain separate owner-authorized operational work.

## 8. Comments Plugin and Private SMTP Delivery

### 1. Scope / Trigger

Use this contract when changing the internal `comments` plugin manifest, the
site post extension, the private service factory, the notification outbox, or
the SMTP delivery worker. The plugin is statically registered; it is not a
runtime marketplace and does not make the static site depend on service
credentials.

### 2. Signatures

```ts
loadPostPluginData(
  posts: readonly CanonicalDocument[],
  config: { readonly comments: CommentsSiteConfig }
): Promise<readonly PluginSiteData[]>

postPluginExtensions(
  canonical: CanonicalDocument,
  config: { readonly comments: CommentsSiteConfig },
  siteData: readonly PluginSiteData[]
): readonly unknown[]
```

```ts
deliverNotificationOutbox(
  outboxPath: string,
  statePath: string,
  transport: NotificationDeliveryTransport
): Promise<NotificationDeliverySummary>

parseSmtpConfig(env?: NodeJS.ProcessEnv): SmtpConfig | null
```

### 3. Contracts

- The plugin id is `comments`, version `0.1.0`, and configuration namespace is
  `comments`. The site registry invokes its site hook only when
  `comments.enabled === true` and only for `posts` documents.
- `CommentSection.astro` and `CommentForm.astro` remain server-rendered
  native HTML. They receive only the sanitized public read model and the
  existing write-origin configuration.
- The service always writes a private NDJSON outbox before a notification can
  be delivered. Queued messages have a stable `n_<32 lowercase hex>` id.
- SMTP configuration uses `COMMENTS_SMTP_HOST`, `COMMENTS_SMTP_PORT`,
  `COMMENTS_SMTP_SECURE`, `COMMENTS_SMTP_USER`, `COMMENTS_SMTP_PASSWORD`,
  `COMMENTS_SMTP_FROM`, `COMMENTS_SMTP_FROM_NAME`, and
  `COMMENTS_PUBLIC_ORIGIN`. The full mailbox username and an app-specific
  password are used when the provider requires them.
- Zoho-compatible staging/production modes are port `465` with implicit TLS
  (`COMMENTS_SMTP_SECURE=true`) or port `587` with STARTTLS
  (`COMMENTS_SMTP_SECURE=false`). The operator selects the documented Zoho
  host for the account type; no mailbox or secret is committed.
- Delivery state is private, records attempts and a bounded next-attempt time,
  and marks an event delivered only after SMTP accepts the message. The HTTP
  submission path never opens an SMTP connection.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| comments disabled | do not load export, service data, or plugin post extension |
| page/index/experiment/404/inline Terminal output | no comments extension |
| partial SMTP configuration | fail with `SmtpConfigurationError` before connection |
| unsafe host, sender, recipient, origin, port, or boolean mode | reject configuration without logging secrets |
| missing outbox | return an empty delivery summary |
| malformed outbox/state record | fail closed with private file context |
| SMTP failure | record private attempt/error name and bounded retry time |
| delivered notification id seen again | skip without resending |
| SMTP password, token, recipient, or body in public artifact/log | fail review and remove the leak |

### 5. Good / Base / Bad Cases

- **Good:** the disabled build remains comment-free; an enabled post gets a
  sanitized plugin extension; the service appends an outbox event; a private
  worker delivers it through the selected TLS mode and records its id.
- **Base:** SMTP is not configured; comments can still persist and queue to the
  private file sink, while no public output or browser request changes.
- **Bad:** send from Astro/request code, read private email in a static
  component, retry an already delivered event indefinitely, or put SMTP
  credentials in `site.toml`, a fixture, or publication output.

### 6. Tests Required

- X Core plugin registry: disabled loading, enabled post extension, publication
  contribution validation, and page exclusion.
- Site: default-disabled static output, enabled fixture rendering for Semantic
  and Terminal posts, no runtime read, and page-boundary negatives.
- Service: private factory/HTTP behavior, stable outbox ids, fake delivery
  success/failure, idempotency, redacted state, retry timing, and SMTP 465/587
  configuration/rendering.
- Publication: plugin handoff, exact `comments.public.v1`, privacy scanner,
  digest, and tombstone rollback protection.
- Full checks remain sequential when tests mutate `.generated-content`; running
  content negative builds concurrently with Astro production builds is invalid
  evidence because both use the same staging directory.

### 7. Wrong vs Correct

#### Wrong

```ts
await smtp.send(privateEmail, token); // inside POST /v1/submissions
```

#### Correct

```ts
await fileNotificationTransport.send({ kind, to, publicId, postPath, token });
await deliverNotificationOutbox(outboxPath, statePath, smtpTransport);
```
