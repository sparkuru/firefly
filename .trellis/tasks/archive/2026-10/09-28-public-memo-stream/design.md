# Public Memo Plugin — Technical Design

## Scope and Boundaries

The feature is a first-party plugin with a public static stream and a separate
private runtime. It follows the comments service's deployment and publication
shape, but owns an independent domain contract, database, Docker image, API,
configuration, and public export.

## Child Boundaries and Dependency Order

The implementation is planned as four independently reviewable slices:

1. `10-01-memo-contract` owns `plugins/memos/` and the public configuration
   vocabulary. It establishes the exact export decoder, normalization rules,
   digest input, ordering, and tombstone semantics without importing service
   or site code.
2. `10-01-memo-service` depends on that contract and owns `services/memos/`,
   its private SQLite state, HTTP/API/CLI behavior, Docker image, and backup
   procedures. It must not modify comments tables or site rendering.
3. `10-01-memo-site` depends on the contract and owns the Firefly adapter,
   `/memos/` route, form, presentation, and navigation. It may be developed
   against the HTTP routes defined below before the service is deployed, but it
   must never import service internals or read the database.
4. `10-01-memo-publication-runtime` depends on all preceding slices and owns
   publication metadata, Nginx/Compose integration, runtime templates,
   operator documentation, and the cross-layer smoke checks.

The parent task remains the integration owner. A child is not considered
complete merely because its files exist; its own acceptance criteria and the
parent's privacy/static-boundary checks must pass.

```text
Visitor browser
  -> Firefly static /memos/ form
  -> same-origin Nginx /v1/memos/* proxy
  -> independent services/memos Docker service
       -> memo SQLite + verification mail + private moderation API
       -> approved, versioned public JSON export
  -> Firefly build validates export and renders /memos/
  -> static publication assembler validates route, digest, privacy, and rollback metadata
```

### Ownership

| Area | Owns | Must not own |
| --- | --- | --- |
| `plugins/memos/` | Pure memo wire contract, manifest, config facade, contract tests | Site components, database, HTTP server, secrets |
| `services/memos/` | Submission and verification APIs, SQLite, abuse controls, moderation API, export, admin CLI, Docker/runtime operations | Firefly site rendering or static release writes |
| `apps/site/src/plugins/memos/` | Build-time export adapter, visitor form and memo presentation | Memo state transitions, SQL, service credentials |
| `apps/site/src/pages/memos/[...stream].astro` | Conditional static stream index route | SSR or runtime reads from the memo service |
| `tooling/assemble-publication/` | Emitted route, digest, privacy and tombstone checks | Memo business rules or writes to the service database |

Keep memos out of Astro Content Collections, canonical post/page routes, X Core,
comments, and Experiment manifests. The memo page is a plugin-owned site route,
not a new canonical Markdown document type. The existing `SitePluginRegistry`
only models post extensions; add an explicit memo stream adapter rather than
forcing a global route into that post-only hook.

## Request and Publication Flow

1. The static form collects display name, private email, plain-text body, and
   publication consent. It posts to `/v1/memos/submissions`; it carries no
   admin credential and requires no visitor account.
2. The memo service validates size, normalization, consent, duplicate/rate
   limits, and abuse controls. It stores the private record in its own SQLite
   database, encrypts email, hashes verification/admin tokens, and sends a
   single-use email verification link.
3. Email verification moves the record to `pending`; it does not publish it.
   The owner lists and approves/rejects/deletes records through the private
   Bearer-token API, with a small CLI that calls that API. The CLI reads the
   token from an owner-only environment/secret file; it must not print or pass
   it as a command-line argument.
4. The owner requests a public export from the service. The export includes only
   approved public fields and a schema version, source revision, generated time,
   digest, and monotonically increasing tombstone epoch.
5. The build receives that file through `FIREFLY_MEMOS_EXPORT`. A pure contract
   module under `plugins/memos/` validates its exact keys, values, digest,
   ordering, and public-field allowlist. The site adapter renders the accepted
   records newest-first into static `/memos/` HTML.
6. The publication adapter verifies that an enabled export exists, the emitted
   memo route is present, the digest is valid, no private sentinel/field reached
   the output, and the tombstone epoch does not roll back a prior publication.

The static site never reads SQLite or calls a public memo-list endpoint. A
service outage leaves the last published stream readable; new submissions do
not appear until the owner exports them and the next static build is published.

## Contracts

### Plugin and configuration

- Add `plugins/memos/plugin.json`, `plugins/memos/public.mjs`, and matching
  declarations/tests. Keep the public module dependency-free and safe for the
  site build, service, and assembler to import.
- Add a statically registered `[plugins.memos]` activation projection with
  `enabled` and repository-relative `configPath`. The memo-owned TOML separates
  the site's public `writeOrigin`/`exportPath` projection from runtime origins,
  route/abuse settings, private data paths, and SMTP settings.
- Keep tokens, email keys, and SMTP passwords in an owner-only
  `config/plugins/memos/secrets.env` input mounted read-only into the service.
  The public build never reads that file. The plugin is disabled by default;
  disabled builds need neither the service nor an export.

### Public export

Use a versioned `memos.public.v1.json` envelope with exact fields:

```json
{
  "schemaVersion": 1,
  "sourceRevision": "revision",
  "generatedAt": "2026-09-30T00:00:00.000Z",
  "tombstoneEpoch": 0,
  "digest": "sha256-hex",
  "memos": [
    {
      "id": "m_opaque",
      "displayName": "Reader",
      "body": "Plain text",
      "createdAt": "2026-09-30T00:00:00.000Z"
    }
  ]
}
```

The public record allowlist is exactly `id`, `displayName`, `body`, and
`createdAt`. Do not export email, verification/control/admin tokens, consent,
moderation state, audit data, fingerprints, IP/user-agent data, or local paths.
Keep public bodies plain text and render them as text nodes. Sort newest-first
by canonical timestamp, then stable opaque ID. Include a digest and tombstone
epoch so the assembler can reject corrupted exports and publication rollback
that would resurrect a deleted memo.

### HTTP and service runtime

- Public routes: `POST /v1/memos/submissions` and
  `GET /v1/memos/verify/<single-use-token>`.
- Private routes: `GET /v1/memos/admin/submissions`,
  `POST /v1/memos/admin/submissions/<id>/(approve|reject|delete)`, and
  `GET /v1/memos/admin/export`. Require a service-side
  `Authorization: Bearer <MEMOS_ADMIN_TOKEN>` on every admin route.
- Use same-origin Nginx proxying for `/v1/memos/` to a loopback listener in the
  memo container. Do not publish the service port directly. The root Compose
  file gets an opt-in `memos` profile; `plugins/memos/compose.yml` provides the
  operator deployment template.
- Put the service in its own `services/memos/` package, image, SQLite database,
  persistent data root, health endpoint, backup/restore scripts, and config.
  Do not add memo tables or routes to `services/comments/`.
- The admin CLI is a thin HTTP client. Authorization, moderation transitions,
  validation, and export selection stay in the service.

### Firefly adapter and presentation

- The adapter loads only a repository-contained export file and validates it
  with `plugins/memos/public.mjs`. When enabled, a missing/malformed export
  fails the build. When disabled, the adapter does not access private runtime
  configuration or require the export.
- Render the standalone list and native submission form in the plugin-owned
  Astro component. The route and form remain usable without JavaScript. Show
  server responses for verification/pending moderation with a readable return
  path to `/memos/`.
- Enabled forms use an explicit HTTPS `writeOrigin` matching the site's public
  origin for the planned proxy topology. Disabled builds skip memo config and
  export reads; the conditional static route emits no memo page. The site child
  records the implemented service form fields and strict file/byte checks.
- Add `/memos/` to the main navigation and Terminal home recovery links so the
  plugin is discoverable without enabling the Terminal shell. Do not add memo
  records to the posts/pages virtual filesystem or post search index.
- Reuse existing static CSS/layout primitives where appropriate; memo styles
  and UI markup stay under `apps/site/src/plugins/memos/`.

### Compatibility and privacy

- Do not import historical Typecho memo records. The earlier migration contract
  keeps them private; any later curated import requires separate owner approval
  and a per-record privacy review.
- Keep `apps/site` static. No browser-side memo list fetch, SSR endpoint, or
  admin page is in scope.
- Keep comments code and schema unchanged. Similar lifecycle does not imply
  shared database or `postPath`/`parentId` fields.
- Preserve static comments behavior, disabled plugin defaults, and existing
  publication rollback behavior while adding independent memo metadata.

## Failure and Rollback Behavior

- Invalid submission: reject before persistence with a bounded public error.
- Verification replay/expiry: reject without revealing record details.
- Unverified, pending, rejected, deleted, or quarantined record: absent from
  public export.
- Missing or invalid enabled export: fail the site build/publication candidate;
  keep the prior `artifacts/` and `dist/` pair.
- Export refers to unexpected fields or includes private data: reject before
  rendering or assembly.
- Stale tombstone epoch: refuse publication promotion so deleted records do
  not reappear through an older export.
- Service unavailable: static pages remain readable; submissions fail closed.

## Validation Plan

- Contract: adversarial exact-field, date, UTF-8, size, consent, body text,
  digest, order, duplicate-ID, and tombstone cases.
- Service: submit, verification expiry/replay, rate limits, moderation
  transitions, admin authentication, export allowlist, SQLite persistence,
  backup/restore, and Docker health/readiness behavior.
- Site: disabled build, enabled export load, invalid/missing export rejection,
  submission form fields/action, output allowlist/privacy, newest-first timeline,
  and JavaScript-disabled rendering.
- Publication/runtime: route inventory, memo digest/metadata, tombstone rollback
  refusal, no private fields in artifacts, `/v1/memos/` proxy behavior, service
  isolation, and absence of the service port from host-published ports.
- Run package checks/tests/builds through `./sam` and rendered/site commands
  through `./render.sh`, then the repository verification gate. Do not run
  production provisioning or credential operations in this task.
