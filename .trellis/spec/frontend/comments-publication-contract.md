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

The repository-local semantic owner is `plugins/comments/public.mjs` with its
`public.d.mts` declaration. It is pure build-time code and has no filesystem,
environment, site, assembler, service, storage, SMTP, or private-configuration
dependency. `plugins/comments/config.mjs` remains the configuration namespace
owner and is used only as the route implementation behind the public facade.

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
  source?: string,
  options?: { routeCatalog?: RouteCatalogInput }
): PublicCommentsExport

loadCommentsForPosts(
  posts: readonly CanonicalDocument[],
  config: CommentsSiteConfig,
  enabledOverride?: boolean
): ReadonlyMap<string, readonly PublicComment[]>

commentsPostPathFromSiteHref(value: unknown): string | null
~~~

~~~http
POST /v1/comments/submissions
GET  /v1/comments/verify/<single-use-token>
GET  /v1/comments/control/<control-token>
POST /v1/comments/control/<control-token>/delete
GET  /v1/comments/admin/comments
GET  /v1/comments/admin/export
POST /v1/comments/admin/comments/<public-id>/(approve|reject|quarantine|spam|delete)
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
- `postPath` is an existing canonical `/posts/.../` route. ASCII segments keep
  the existing alphanumeric-starting `[A-Za-z0-9._~-]` grammar. Non-ASCII
  characters in a URL segment must use canonical uppercase UTF-8 percent
  escapes; escapes for ASCII or URL delimiters are not canonical. Decoding
  must produce NFC text with no traversal segments, delimiters, whitespace,
  control/format characters, or other unsafe segment characters.
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
the normalized envelope without the digest field. `public.mjs` is the single
owner of these semantics and returns frozen public records; it accepts the
legacy `sha256:` digest input spelling for compatibility while serializing a
bare digest. The decoder accepts only plain, dense data arrays and exact plain
object fields, so sparse or decorated input cannot execute consumer-provided
array methods.

The site, service, and publication code are adapters rather than alternate
contract owners. The site keeps file/environment resolution, disabled behavior,
and readable-href grouping. The private service selects approved rows and
keeps submission, moderation, storage, and HTTP rules, translating generic
contract failures to `ValidationError`/`ExportValidationError`. The publication
assembler keeps emitted-surface, contained-file, route-to-output,
digest-presence, privacy, and metadata checks while loading the repository
contract directly.

Build/package resolution is part of this boundary. The site adapter derives the
repository root from its known `apps/site` module location (including a
pre-rendered bundle path) and never probes `process.cwd()` or parent candidates.
The service's compiled loader resolves `plugins/comments/public.mjs` relative to
its emitted module and the service image copies that file into the matching
repository-local path. The assembler builds an emitted map by converting raw
`posts/**/index.html` hrefs through `commentsPostPathFromSiteHref()` before
checking encoded export routes; direct string concatenation does not handle
Unicode routes correctly.

#### Site and release handoff

- `config/site.toml` contains the core site settings and one
  `[plugins.comments]` activation projection with `enabled` and a safe,
  repository-relative `configPath`. Enabled comments require the separate
  plugin file's public HTTPS `writeOrigin`.
- The statically registered `comments` plugin owns
  `config/plugins/comments/config.toml`. Its `[public]` section is projected
  to `config.comments` as `writeOrigin`, `exportPath`, and `consentVersion`;
  `[runtime]` and `[runtime.smtp]` remain service-only. The site never exposes
  the runtime projection. A legacy `[comments]` namespace is accepted only
  during migration and cannot coexist with `[plugins.comments]`.
- `config/plugins/comments/secrets.env` is the owner-only secret boundary.
  It contains only secret values, while `passwordEnv` refers to a named
  value there. Literal SMTP passwords and non-secret `COMMENTS_*` settings are
  rejected. The static build never reads the secret file; the private service
  reads the plugin TOML and secret file through explicit read-only mounts, and
  explicit runtime environment values override file values.
- `FIREFLY_COMMENTS_EXPORT` is optional for the empty disabled build and
  mandatory for an enabled M5.1 build. `./sam` accepts only a readable,
  repository-relative JSON file and passes it into the container as
  `/app/<relative-path>`.
- `CanonicalDocument.href` remains the site's readable NFC Unicode route.
  `commentsPostPathFromSiteHref()` is the single conversion owner at the
  comments boundary: it preserves safe ASCII routes, emits canonical uppercase
  UTF-8 percent escapes for non-ASCII segments, reuses the comments route
  validator, and returns `null` for encoded, non-NFC, traversal, delimiter,
  whitespace, control/format, or otherwise unsafe site hrefs. An enabled build
  fails closed when a public post cannot be represented.
- The site decodes the export during build, cross-checks every route against
  the guest canonical post catalog through that converter, groups accepted
  records under the original raw `CanonicalDocument.href`, and passes only
  post-scoped public records plus the encoded submission `postPath` into
  Semantic or Terminal canonical document components.
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
| stale, non-post, malformed/noncanonical encoded, traversal, or unsafe route | reject before render/export |
| non-NFC, overlong, control-containing, marked-up, or linked body | reject |
| missing/malformed parent, nested reply, or cross-post parent | reject |
| verification replay, expired token, or invalid control token | reject without disclosure |
| unverified, pending, rejected, spam, quarantined, expired, or deleted record | exclude from public export |
| export without digest when publication is enabled | reject build/assembly |
| comment route absent from emitted site | reject assembly |
| private field, email-like private sentinel, unsafe comment markup, source path, or secret in comment HTML | reject publication validation |
| candidate tombstone epoch lower than published epoch | refuse rollback/promotion |
| no enabled export/configured origin | preserve the empty disabled build |

The publication privacy scanner applies source-path sentinels at a path-token
boundary. A canonical public route segment such as `app`, `home`, or `tmp`
must not be rejected merely because its `/posts/<category>/.../` URL contains
the same character sequence; private fields, email-like values, secrets, and
unsafe markup remain blocking findings.

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
- Site: strict decoder, raw-Unicode-to-encoded-route conversion, ASCII identity,
  unsafe site-href rejection, Unicode/route/body/homepage/date rejection,
  digest mismatch, stale route rejection, direct-reply grouping under the raw
  href, empty export, and config defaults.
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
  config: {
    readonly plugins: { readonly comments: CommentsActivationConfig }
    readonly comments: CommentsSiteConfig
  }
): Promise<readonly PluginSiteData[]>

postPluginExtensions(
  canonical: CanonicalDocument,
  config: {
    readonly plugins: { readonly comments: CommentsActivationConfig }
    readonly comments: CommentsSiteConfig
  },
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

parseCommentsNamespace(
  value: unknown,
  source?: string
): CommentsConfig | LegacyCommentsNamespace

parseCommentsActivation(value: unknown, source?: string): CommentsActivationConfig
parseCommentsConfig(value: unknown, source?: string, options?: { enabled?: boolean }): CommentsConfig
resolveCommentsConfigPath(configPath?: string, repositoryRoot?: string): string

loadCommentsRuntimeConfig(env?: NodeJS.ProcessEnv): {
  readonly configPath: string | null
  readonly siteConfigPath: string | null
  readonly activation: CommentsActivationConfig
  readonly public: CommentsPublicConfig
  readonly runtime: CommentsRuntimeOptions
  readonly outboxPath: string | null
  readonly outboxStatePath: string | null
  readonly environment: NodeJS.ProcessEnv
}
```

### 3. Contracts

- The plugin id is `comments`, version `0.1.0`, and configuration namespace is
  `plugins.comments`. The site registry invokes its site hook only when
  `config.plugins.comments.enabled === true` and only for `posts` documents.
- `CommentSection.astro` and `CommentForm.astro` remain server-rendered
  native HTML. They receive only the sanitized public read model and the
  existing write-origin configuration.
- The service always writes a private NDJSON outbox before a notification can
  be delivered. Queued messages have a stable `n_<32 lowercase hex>` id.
- The shared public contract is the single source of truth for the public
  projection. `config.mjs` remains the single source of truth for the private
  runtime namespace. Runtime outbox paths may be
  absolute or relative, but must be non-empty, slash-separated paths with no
  backslashes, traversal segments, empty interior segments, controls, or
  whitespace. A single leading slash is allowed for the mounted private
  volume.
- SMTP configuration uses the validated plugin `[runtime.smtp]` projection or its
  `COMMENTS_SMTP_HOST`, `COMMENTS_SMTP_PORT`,
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
- `loadCommentsRuntimeConfig()` reads an explicit plugin `COMMENTS_CONFIG_PATH`
  first; otherwise it follows `config/site.toml`'s activation path and the
  repository/package/container candidates. Explicit `COMMENTS_*` environment
  values override non-secret file values; `passwordEnv` resolves only the
  named separately injected secret into `COMMENTS_SMTP_PASSWORD`.
- `parseSmtpConfig()` validates raw environment strings before trimming values
  used in SMTP headers or connections. Host labels, mailbox fields, origins,
  booleans, ports, and durations are bounded; a missing required field raises
  `SmtpConfigurationError` without logging the value.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| comments disabled | do not load export, service data, or plugin post extension |
| both `[comments]` and `[plugins.comments]` are present | reject before projection; there is one activation source |
| missing/absolute/traversal/symlink-escaping plugin `configPath` | reject before site or service startup |
| literal password or non-secret `COMMENTS_*` key in `secrets.env` | reject without exposing the value |
| page/index/experiment/404/inline Terminal output | no comments extension |
| partial SMTP configuration | fail with `SmtpConfigurationError` before connection |
| unsafe host, sender, recipient, origin, port, or boolean mode | reject configuration without logging secrets |
| runtime outbox path contains traversal, backslash, whitespace, control, or empty interior segment | reject the comments namespace before service startup |
| file and legacy/named environment values configure the same field | reject the namespace; explicit environment overrides apply only at the service boundary |
| SMTP environment value has leading/trailing whitespace or controls | reject the raw value before normalization |
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
  component, retry an already delivered event indefinitely, put SMTP
  credentials in `site.toml` or plugin TOML, or put non-secret settings in
  `secrets.env`.

### 6. Tests Required

- X Core plugin registry: disabled loading, enabled post extension, publication
  contribution validation, and page exclusion.
- Site: default-disabled static output, enabled fixture rendering for Semantic
  and Terminal posts, no runtime read, and page-boundary negatives.
- Service: private factory/HTTP behavior, stable outbox ids, fake delivery
  success/failure, idempotency, redacted state, retry timing, and SMTP 465/587
  configuration/rendering; shared namespace loading, named-secret resolution,
  environment precedence, compiled plugin-path resolution, separate site/plugin
  path resolution, public-only site projection, non-secret secret-file
  rejection, and traversal/empty-segment rejection for runtime paths.
- Publication: plugin handoff, exact `comments.public.v1`, privacy scanner,
  digest, and tombstone rollback protection.
- Shared contract: exact allowlist, frozen output and empty export, Unicode
  route conversion, normalization, parent relationships, deterministic order,
  digest compatibility, and private-field rejection under
  `plugins/comments/tests/`.
- Full checks remain sequential when tests mutate `.generated-content`; running
  content negative builds concurrently with Astro production builds is invalid
  evidence because both use the same staging directory.

### 7. Wrong vs Correct

#### Wrong

```ts
await smtp.send(privateEmail, token); // inside POST /v1/comments/submissions
```

#### Correct

```ts
await fileNotificationTransport.send({ kind, to, publicId, postPath, token });
await deliverNotificationOutbox(outboxPath, statePath, smtpTransport);
```

```ts
// Correct: validate the raw value, then derive the normalized connection value.
const host = requiredEnv(env, 'COMMENTS_SMTP_HOST', false);
if (host.split('.').some((label) => !hostnameLabelPattern.test(label))) {
  throw new SmtpConfigurationError('unsafe SMTP host');
}
```

## 9. Same-Device Provisioning and Storage

### 1. Scope / Trigger

Use this contract when changing the private comments container, the
same-device `/v1/comments/` proxy, the runtime secret file, SQLite migrations, plugin
storage, backup/restore commands, or legacy database migration. These paths
are operationally adjacent to the static publication but must remain separate
from its source, output, and rollback transaction.

### 2. Signatures

```ts
parseCommentsSecrets(
  source: string,
  sourceName?: string
): Readonly<Record<string, string>>

loadCommentsSecrets(
  env?: NodeJS.ProcessEnv
): NodeJS.ProcessEnv

loadCommentsRuntimeConfig(
  env?: NodeJS.ProcessEnv
): {
  readonly configPath: string | null
  readonly siteConfigPath: string | null
  readonly activation: CommentsActivationConfig
  readonly public: CommentsPublicConfig
  readonly runtime: CommentsRuntimeOptions
  readonly outboxPath: string | null
  readonly outboxStatePath: string | null
  readonly environment: NodeJS.ProcessEnv
}

resolveCoreDatabasePath(
  env?: Readonly<Record<string, string | undefined>>
): string

normalizeStorageCatalogEntry(value: unknown): StorageCatalogEntry
resolvePluginStoragePath(dataRoot: string, entry: StorageCatalogEntry): string
```

```text
services/comments/ops/backup.sh <database|data-root> <backup> [--outbox <path>] [--state <path>]
services/comments/ops/restore.sh <backup-file|backup-directory> <database|data-root>
services/comments/ops/migrate-legacy.sh <legacy-comments.sqlite> <core.db>
services/comments/scripts/validate-route-catalog.mjs --release <release-root> --config <plugin-config> [--output <catalog>]
services/comments/scripts/reconcile-route-catalog.mjs --release <release-root> --config <plugin-config> --output <private-candidate>
```

```http
<host-selected-server>/v1/comments/*  -> matching private comments upstream
<host-selected-server>/v1/*          -> bounded 404 for unknown resources
```

### 3. Contracts

- `config/site.toml` is public, build-time configuration. The ignored
  `config/plugins/comments/config.toml` is the repository's non-secret
  build/runtime-test input; the tracked
  `config/plugins/comments/config.toml.example` is its template. Production
  copies reviewed runtime values to the plugin-owned
  `<deploy-root>/plugins/comments/config.toml`. The ignored
  `config/plugins/comments/secrets.env` contains only secret values and the
  tracked `secrets.env.example` contains names and safe placeholders only. The
  dotenv loader accepts `KEY=VALUE`, comments,
  and blank lines; it never performs shell or variable expansion, rejects
  malformed/duplicate/control-containing values and known non-secret keys,
  rejects symlinks and group/other permissions, and gives explicit process
  environment values precedence without logging values.
- The comments image and static image exclude
  `config/plugins/comments/secrets.env`, SQLite files, outbox files, and
  runtime state. The comments profile mounts the plugin TOML and secret file
  read-only, stores data under the owner-only
  `<deploy-root>/plugins/comments/data/` directory, and publishes no host
  port. Its listener defaults to loopback. The plugin runtime is separate from
  `current`, `releases`, and `blog`.
- Production owns the runtime files at
  `<deploy-root>/plugins/comments/{compose.yml,config.toml,secrets.env,data/}`.
  The repository-relative `config/plugins/comments/` files remain local
  build inputs and templates; `config/site.toml` is build input only and is
  embedded in the static release rather than copied as a production source.
- A route catalog derived from an active static publication must validate
  every candidate through the same canonical UTF-8-aware `normalizePostPath`
  contract used by submissions. Invalid candidates must be reported and
  excluded from the runtime catalog; the filtered catalog must not be
  presented as complete coverage. Public enablement is blocked until
  incompatible routes are fixed or the operator explicitly accepts the
  missing coverage.
- `validate-route-catalog.mjs` is the release-bound preflight for that
  comparison. It walks only regular files and directories, rejects symlinks
  and special entries, classifies emitted `posts/**/index.html` documents by
  their article metadata marker, derives canonical uppercase UTF-8 percent-
  encoded routes, validates both sides through the shared route predicate, and
  fails on invalid, duplicate, missing, or stale routes. Its normal output is
  status and counts only; an optional `{ schemaVersion: 1, routes: [...] }`
  catalog is written with sorted canonical routes only after a complete valid
  inventory has been established and never contains secret data. Symlinked or
  special existing path components in the supplied config and catalog-output
  parents are rejected as well.
- `reconcile-route-catalog.mjs` uses the same release inventory and writes a
  private, owner-only TOML candidate. Its only semantic change is the sorted
  `runtime.postRoutes` array; it preserves the input file, validates the
  generated TOML against the same route set, writes atomically, and emits only
  redacted status/count fields. It must never target the input config, an
  output path inside the immutable release, a symlink/special path, or a
  secret/data/outbox file. The candidate must pass `validate-route-catalog.mjs`
  before an operator replaces the active config.
- The production Compose template requires `COMMENTS_RUNTIME_USER` as the
  operator-supplied UID:GID matching the owner-only secret and private-data
  mounts. The image retains its portable non-root `USER node` default; the
  explicit runtime identity must not be committed to the repository template
  or image metadata. Before a production restart, the effective container
  identity must be compared with the existing secret/data owner metadata; a
  stale `node` default is a deployment drift, not a reason to weaken the
  owner-only boundary. The approved repair is to align the production
  runtime UID:GID and retain a rollback copy, without changing secret/data
  content or modes.
- The container-local Nginx image mirrors only `^~ /v1/comments/` to the
  loopback service and returns a bounded 404 for unknown `/v1/` resources. A
  production edge must select the host/SNI `server` block first, then route
  only `/v1/comments/` to that host's upstream. Production and development
  use distinct service ports, data roots, secrets, and allowed origins. A
  missing private service fails closed and never changes the static site into
  SSR.
- The first runtime dialect is SQLite. `core.db` defaults to
  `/var/lib/firefly-comments/core.db`; `COMMENTS_DATABASE_PATH` remains an
  explicit compatibility override. Plugin data is catalogued by plugin id,
  dialect, relative path, schema version, and lifecycle state below the
  private plugin root. `mariadb` and `mysql` are contract values only and must
  fail closed until a later driver task wires them.
- Migration files are the single ordered source and are recorded in
  `schema_migrations`. A legacy `comments.sqlite` is integrity-checked and
  copied into a new destination before current migrations run; the source is
  not renamed, deleted, or overwritten.
- A complete backup set contains independently checksummed/integrity-checked
  core and plugin databases plus optional private outbox/state artifacts and
  retention metadata. Restore validates the manifest before copying to an
  absent destination, never overwrites an active path, and switches data only
  after an operator smoke test. Static release rollback and data restore are
  separate decisions.
- An empty-store reset is an exceptional data-loss operation and requires an
  explicit owner decision. Before touching the active data root, resolve the
  runtime and data directories through privileged realpath checks; the
  canonical data directory must be exactly the runtime directory's `data`
  child and neither canonical root may be `/`. Match containers by the exact
  Compose service and working-directory labels, reject any running or
  mismatched-identity duplicate, and use the data-directory owner as the
  identity source only when the service is demonstrably absent/stopped. Move
  the old database and SQLite sidecars into a `0700` owner-only recovery
  directory, preserve outbox/state hashes, and create the empty store only
  after that move. Validate health/readiness/metrics, route count, secret
  access, loopback/no-public-port, identity/mount contracts, empty migrations,
  and outbox preservation before declaring success. Any failed post-mutation
  check must remove only exact service containers, restore the old database by
  hash, and leave the service stopped; a tombstone epoch reset to zero is
  acceptable only when no static/public release has been promoted.
- Comments remain disabled in tracked configuration until private health,
  same-origin proxy, allowed-origin, TLS/DNS, SMTP, backup/restore, and public
  submission/verification gates are accepted by the operator.

### 4. Validation & Error Matrix

| Condition | Required result |
| --- | --- |
| missing, symlinked, broad-permission, malformed, duplicate, or control-containing secrets file | fail before service startup without exposing a value |
| literal SMTP password in any TOML, image, static output, logs, or task records | reject the configuration/release and remove the leak |
| plugin path is absolute, traverses, contains controls/whitespace, or escapes through a symlink | reject catalog/backup/restore before touching active data |
| static publication contains a route that fails the comments path contract | report and exclude it from a disabled staging catalog; block public enablement until resolved or explicitly accepted |
| candidate output equals the active config or is inside the immutable release | reject before writing; preserve the input and release |
| malformed/unsafe release or configured route inventory | reject candidate generation; leave the active config untouched |
| effective production comments UID:GID cannot read owner-only secret/data mounts | block restart/apply; align the runtime identity with the existing owners and preserve modes/content; never broaden permissions |
| MariaDB/MySQL is selected without a driver | fail with an unsupported-dialect error |
| legacy source is absent, non-regular, corrupt, or destination exists | refuse migration and preserve the source |
| backup destination or restore destination exists | refuse overwrite |
| backup checksum/integrity/manifest validation fails | remove only the unreferenced candidate and preserve active data |
| runtime/data realpath is unresolved, canonical data is not the runtime `data` child, or a canonical root is `/` | refuse the reset before touching containers or active data |
| multiple exact-service containers include a running instance, a mismatched working directory, or different runtime identities | refuse the reset; do not choose a container by ordering |
| active database cannot pass a read-only recovery probe and no verified backup or explicit owner reset decision exists | preserve the active data and block service reset |
| an approved empty-store reset fails after data movement | restore the old database by checksum, remove only exact service containers, and leave the comments service stopped |
| comments service has no private listener | `/v1/comments/*` fails closed; unknown `/v1/*` resources remain bounded 404s and static routes remain static |
| comments disabled or no export is configured | emit no public comment surface |

### 5. Good / Base / Bad Cases

- **Good:** an owner-only runtime file feeds the private service through a
  read-only mount; host-specific Nginx selects the matching upstream; a
  SQLite backup set is restored to a new path and smoke-tested before switch;
  the static site remains disabled until the operator accepts all gates.
- **Good reset:** the owner explicitly accepts data loss, the old database is
  retained in a `0700` recovery directory, the outbox is hash-stable, the
  empty store passes all private gates, and no static/public release is
  promoted while the new tombstone epoch starts at zero.
- **Base:** no secret file, SMTP transport, or comments profile is active; the
  static publication still builds and serves the empty comments state.
- **Bad:** publish the comments port, mount a secret into the static image,
  share one database between production and development by default, restore
  over the active root, route every host through one global `/v1/comments/`
  block, reset an unreadable database without explicit owner approval, choose
  the first of several stale containers, or make a stale runtime readable by
  changing a `0600` secret to a broader mode.

### 6. Tests Required

- Secret loader: permissions, regular-file/symlink checks, malformed and
  duplicate entries, environment precedence, named-password indirection, and
  no-value diagnostics.
- Storage: fresh `core.db`, ordered migrations, comment round-trip, catalog
  path containment, unsupported dialect failure, legacy copy preservation, and
  SQLite integrity.
- Operations: single-database and complete-set backup/restore, checksums,
  duplicate manifest entries, symlink escapes, no-overwrite behavior, private
  artifact handling, and rollback preservation.
- Provisioning: comments-disabled default, no host-published comments port,
  loopback listener, host-specific upstream example, original `Host` forwarding,
  private/read-only mounts, healthcheck shape, and route-catalog acceptance of
  canonical UTF-8 percent-encoded paths plus rejection/reporting of malformed
  or otherwise incompatible publication paths.
- Route catalog: shared inventory between validation and reconciliation,
  `<head>`-only metadata, canonical Unicode encoding, symlink/special-file and
  realpath containment, redacted summaries, preservation of the input and
  non-route TOML values, atomic candidate creation, and rejection of unsafe or
  partial output paths. Provisioning must also assert effective runtime
  UID:GID compatibility with owner-only secret/data modes before restart and
  preserve a rollback copy for any approved identity repair.
- Full M5.1 checks/build, Compose config validation, runtime image probes,
  shell syntax/ShellCheck/shfmt, and publication static-output checks run
  sequentially through their declared boundaries.
- Reset/rollback probes: realpath/data-child containment, exact Compose label
  selection, stopped-duplicate handling, numeric identity alignment,
  owner-only recovery-directory permissions, old-database hash restoration,
  empty-store migration/epoch assertions, loopback listener classification,
  and unchanged outbox/state hashes. Assertions must also cover the
  post-failure service-stopped state and the no-public-release condition for
  an epoch reset.

### 7. Wrong vs Correct

#### Wrong

```sh
services:
  comments:
    ports:
      - "8787:8787"
# publishes the private listener as a public origin
```

#### Correct

```sh
docker compose --profile comments up --build -d
# comments has no host port; the web proxy owns same-origin /v1/comments/*
```

```text
# Wrong: stale image default plus a permission broadening to make restart pass.
user: "node"
secrets.env mode: 0644

# Correct: align the production runtime with the existing owner and retain
# the owner-only secret/data modes and a rollback copy.
user: "<owner-uid>:<owner-gid>"
secrets.env mode: 0600
```

```text
production Host/SNI -> production server block -> production comments DB
development Host/SNI -> development server block -> development comments DB
```

```sh
# Wrong: follow a runtime symlink or choose the first stale container.
rm -f <runtime>/data/core.db
docker ps --all --filter label=com.docker.compose.service=comments | head -n 1

# Correct: resolve and bound the data child, retain the old database, then
# validate every exact service instance and roll back by checksum on failure.
realpath <runtime>/data  # must equal: realpath(<runtime>)/data
```

```sh
# Correct: generate and validate a private candidate before an explicit,
# separately backed-up owner-config replacement.
node services/comments/scripts/reconcile-route-catalog.mjs \
  --release <release-root> --config <plugin-config> --output <private-candidate>
node services/comments/scripts/validate-route-catalog.mjs \
  --release <release-root> --config <private-candidate>
```
