# Research: Plugin activation and public surface inventory

- Query: Identify all existing plugins, effective activation parsing, UI/static/API exposure, lost activation data, and minimum integration points for one public-access switch.
- Scope: internal; tracked contracts, implementation, examples, and synthetic tests only. No private credentials, owner content, remote access, or code changes.
- Date: 2026-10-06

## Findings

### Complete plugin inventory and boundaries

There are exactly two tracked `plugin.json` manifests: `plugins/comments/plugin.json` and `plugins/memos/plugin.json`. Site config rejects every namespace besides `comments` and `memos` (`apps/site/src/lib/site-config.mjs:241`). There is no filesystem discovery/runtime loading of arbitrary plugin manifests.

| Plugin | Manifest capabilities and integration | Current effective switch |
| --- | --- | --- |
| comments | `site-post-extension`, `publication`, `service`; config parser, site post-extension registry, assembler comments adapter, private HTTP service, two Astro UI components (`plugins/comments/plugin.json:1`) | Controls export loading and embedded post UI; does not gate running private service or Nginx route |
| memos | `site-navigation`, `independent-publication`; config parser, site navigation descriptor, independent publisher/CLI (`plugins/memos/plugin.json:1`) | Controls blog navigation/sitemap only; does not gate independent publisher or static mount |

`SITE_PLUGIN_REGISTRY` statically registers only comments (`apps/site/src/lib/site-plugins.ts:78`). Memos deliberately sits outside post extensions as `MEMOS_SITE_PLUGIN` (`:19`). This registry is explicitly site-only: its strict allowed host members are manifest ID, `isEnabled`, `loadBuildData`, and `postExtension` (`apps/site/src/lib/site-plugin-registry.mjs:7`); it is not a deployment/runtime registry. X Core, presentations, and experiments NERV/MAJO are other architectural owners, not `[plugins.*]` entries; applying this requirement to them would expand scope.

### Activation parsing, defaults, and overrides

- Comments activation accepts only `enabled` and `configPath`, defaults disabled, requires a real boolean, and validates a safe repository-relative `.toml` path (`plugins/comments/config.mjs:301`). The internal general `parseBoolean` accepts environment strings, but **activation does not**.
- Memos has the same activation shape/default/boolean requirement, with its own safe TOML path validator (`plugins/memos/config.mjs:7`). Its optional pure config permits only fixed public route `/memos/` (`:17`). Blog loading never reads this physical config/source/export.
- `parseSiteConfig` validates core site fields, exact plugin names, parses both plugin activations, and deeply freezes `plugins` plus comments public projection (`apps/site/src/lib/site-config.mjs:235-275`). Missing `plugins` or missing `enabled` means false, not “leave prior deployment unchanged.”
- Public build's explicit `FIREFLY_SITE_CONFIG_PATH` selects a contained regular nonsymlink repository-relative TOML; selection then uses cwd/repository candidates (`apps/site/src/lib/site-config.mjs:13-59`). A projected `<root>/config/site.toml` derives its plugin config root from `<root>` (`:277`). Any new activation producer must use the same selected input, not blindly reopen owner `config/site.toml`.
- Comments site loading uses config public projection only, requires its physical file if enabled, and validates an existing file even when disabled (`:284-316`). Enabled comments require HTTPS `public.writeOrigin` (`plugins/comments/config.mjs:244-251`); this can be a different host, so same-origin-only deployment gating would be incomplete for externally configured origins.
- `FIREFLY_COMMENTS_EXPORT` overrides comments `public.exportPath` but does not override activation (`apps/site/src/lib/comments.mjs:29-37`). `loadCommentsForPosts` gets an explicit boolean from `SITE_CONFIG` and returns before export read when false (`:55-59`; `apps/site/src/lib/site-plugins.ts:89-97`). Its legacy fallback defaults true only when callers omit the explicit override and `config.enabled`; retain explicit calls in new integrations.
- Private comments runtime has separate `COMMENTS_CONFIG_PATH` and site-config fallback (`services/comments/src/config.ts:174-242`). Explicit plugin-file configuration wins and synthesizes default-disabled activation, yet `createCommentsServiceRuntime` never checks that activation (`services/comments/src/plugin.ts:27-59`). Thus gating service startup directly on its current activation object would disable the existing explicit-config deployment even when site comments are enabled. Compose sets explicit `COMMENTS_CONFIG_PATH` and has no site activation mount (`compose.yml:45-55`).
- Independent Memo `publish.sh` / publisher source do not read site activation. Their configuration/source/history remain separate, an intentional contract worth preserving even if a combined push orchestrator gates publication/access.

### Exact public surfaces

#### Memos

| Surface | Current behavior | Evidence |
| --- | --- | --- |
| `/memos` | Always 301 to `/memos/`, even without selected artifact | `nginx.conf:93`; assembler static server `tooling/assemble-publication/src/serve-release.ts:17` |
| `/memos/`, `/memos/index.html` | Static independent public HTML when artifact mounted | `nginx.conf:96-105`; static server `:18-26` |
| `/memos/memos.public.v2.json` | Full public wire export, readable by direct URL | Candidate layout `.trellis/spec/frontend/memo-publication-runtime-contract.md`, “Public candidate and private acceptance history” |
| `/memos/assets/style.css`, `/memos/assets/media/**` | Standalone public style and referenced images/assets | `tooling/publish-memos/src/render.mjs:36-56,83-92` |
| `/memos/#<id>` | Stable entry fragment in same index document, not separately generated per-note pages | `tooling/publish-memos/src/render.mjs:83-92` |
| `/memos/receipt.json` and source/config | Must remain 404; receipt is outside public root | `apps/site/tests/memos.spec.ts:24`; publisher runtime contract |
| `/v1/memos/**` | Retired; no handler/upstream; existing unknown-v1 rejection remains | `tooling/publish-memos/ops/nginx-static.conf.example:15`; `nginx.conf:83-90` |

Reading uses GET/HEAD only; Nginx `limit_except GET` permits HEAD and denies other methods with 403 (`nginx.conf:99`). Node static server currently checks methods first and returns 405 before any future activation gate (`serve-release.ts:13`). To satisfy “disabled returns 404”, test ordering for POST/OPTIONS/etc, not only GET/HEAD; otherwise the different status leaks the route even when disabled.

Memo navigation appears in ordinary `DocumentLayout`, mobile directory rows and desktop recovery section (`apps/site/src/layouts/DocumentLayout.astro:39`; `apps/site/src/components/TerminalHome.astro:245-258`). Sitemap adds `/memos/` only when enabled (`apps/site/src/lib/site-seo.mjs:47`). There is no Memo content collection, post extension, Terminal filesystem entry, search corpus, RSS body, or experiment catalog entry.

#### Comments

Public read data is embedded in canonical post HTML, never queried at runtime. `apps/site/src/pages/posts/[...path].astro:15-21` loads per-post extensions, `DocumentPresentation.astro:27-30,52` forwards comment data/activation, and `SemanticDocument.astro:97` / `TerminalDocument.astro:114` render only enabled sections. `CommentSection.astro:14,33-99` renders approved author/body/time/replies and forms targeting the configured write origin. Canonical article pages must remain readable when comments are disabled; omit comments from their HTML rather than returning 404 for whole posts or fragment IDs.

Private export JSON is consumed during build from a repository-contained path, not automatically copied into blog public output: the assembler copies site output and experiments only (`tooling/assemble-publication/src/index.ts:603-638`). Public comments JSON in a hypothetical arbitrary source asset is not a declared export route. No public read/count API exists; HTTP GET `/v1/comments` is already 404.

The current comments HTTP routes are (`services/comments/src/http.ts:91-174`):

- `POST /v1/comments/submissions`: submission with verification email.
- `GET /v1/comments/verify/<token>`: verification page/state transition.
- `GET /v1/comments/control/<token>`: token-authenticated public control summary.
- `POST /v1/comments/control/<token>/delete`: token-authenticated withdrawal request.
- `OPTIONS` for any request path is processed before route matching, returns 204 with allowed origin (or 403). A disabled gate must precede this branch if all public methods must return 404.
- `GET /v1/comments/admin/comments`, `GET /v1/comments/admin/export`, `POST /v1/comments/admin/comments/<id>/(approve|reject|quarantine|spam|delete)` require bearer admin auth and are private operator operations. Current Nginx proxies the entire prefix, including these authenticated paths.
- Private process `GET /healthz`, `/readyz`, `/metrics` are separate operator surfaces, not routed to comments by existing web Nginx. Keeping private operations available while hiding public access is a scope decision, not equivalent to stopping/deleting the service.

Comments has no exclusive public stylesheet/script subtree: its presentation CSS/forms are part of blog rendering. Shared hashed `_astro` and article CSS may retain harmless comment class definitions even when no UI/data is emitted; disabling shared files would break unrelated reading. Existing static tests detect comments sections and privacy fields, not CSS class presence alone (`apps/site/tests/static-output.test.mjs:331-367`).

### Where the flags are lost

1. Blog build has frozen activation, but emits no canonical deployable activation artifact. SEO's `astro:build:done` hook already writes build-derived robots/sitemap (`apps/site/src/lib/site-seo.mjs:37-54`; registered in `apps/site/astro.config.mjs:34`) and is a concrete neighboring seam for a separate site-owned projection.
2. Assembler receives comments *publication evidence* from rendered HTML plus explicit export (`tooling/assemble-publication/src/plugins/comments.ts:15-75`), not the activation input. Its normal CLI passes that evidence only (`tooling/assemble-publication/src/cli.ts:41-43`). Blog `memos.enabled` is deliberately constant false legacy evidence, never current access state (`plugins/memos.ts:21-35`; assembler `index.ts:587-589`). Do not use either legacy evidence block as the universal runtime switch.
3. Assembler `PublicationResult` / persisted `artifacts/publication.json` carry catalog, inventory, comments evidence, and legacy memos only (`index.ts:26-34,640-659`). Its `dist/` inventory has no access-control config. Runtime packaging cannot see activation without a new explicit projection.
4. Node assembled-release static server trusts `FIREFLY_MEMOS_PUBLIC_ROOT` alone and serves it regardless of site flag (`serve-release.ts:9,17-26`). Browser fixture server independently has the same ungated behavior (`apps/site/scripts/serve-memos-fixture.mjs:6-23`).
5. Nginx has fixed Memo alias and comments proxy (`nginx.conf:69-105`), with no `enabled` config or include. Standard runtime copies blog dist only; optional combined runtime copies Memo public bytes independently (`Dockerfile:40-50`). Compose profile only governs whether comments process starts, not access to routes.
6. `preview.sh package` chooses combined Memo runtime solely from `FIREFLY_MEMOS_CANDIDATE`, copies public bytes, and probes 301/200 independently of activation (`preview.sh:545-592,647-659`). A retained candidate must be allowed to exist while access is disabled; candidate presence must not reactivate access.

### Minimum generic data-flow seams (research options, not final design)

A small site-owned exact-field activation projection can contain a schema version and explicit booleans for every registered plugin, generated from the **same parsed selected config** used to render the blog. It must separate effective activation from publication content/history evidence and contain no config paths, origins, owner identity, source, or secrets. The publisher should stay independent of Astro/config input; only combined orchestration consumes activation.

Concrete seams to assess together:

| Boundary | Existing seam | Minimum needed responsibility |
| --- | --- | --- |
| Site builder | New neighboring Astro build-done integration, `astro.config.mjs:34` | Persist validated activation with build output; retain existing no-Memo-read property and strict config selection |
| Assembler | `assemblePublication`, `index.ts:603,639-646` | Consume/validate builder projection, bind to exact release, expose unambiguous effective plugin states; reject stale/mismatched data before promotion |
| Generic contract | Site-owned module or framework-independent tooling contract | Exact keys/booleans/schema/default policy shared by builder, assembler, operator consumer and tests; avoid extending X Core or the post-extension registry into deployment |
| Static server | `serve-release.ts:12-26` | Load snapshot from selected release and gate full plugin-owned namespaces before redirects/method branches; never read live owner TOML while serving a built release |
| Nginx runtime | `nginx.conf:69-105`, runtime `Dockerfile:29,42-50` | Package an immutable generated gate/include with release/runtime; cover exact no-slash path and full prefix; access false takes precedence over existing mounted files/upstream |
| Combined preview/package | `preview.sh:545-592,647-659` | Check selected activation and probe both enabled and disabled outcomes, without discarding Memo artifact/history |
| Operator push/edge | Privately managed deployment tooling | Reconcile edge host routes from validated build activation, not legacy metadata or independent candidate existence; ensure blogs with embedded old comments are actually replaced |

Do not derive Nginx configuration by text-grepping TOML. Defaults, overrides, unknown keys, and snapshot consistency belong to the strict parsed projection. A separate `artifacts` file outside `dist` requires explicit packaging; a public `dist` config becomes an inventory member. Either placement must be reviewed for clear ownership and guarded selection; no final filename chosen here.

### Critical history compatibility

- Turning comments off after positive published tombstone history currently cannot succeed: disabled adapter returns `tombstoneEpoch: 0` (`tooling/assemble-publication/src/plugins/comments.ts:6-13,28-32`), and assembler rejects any candidate below the prior epoch (`index.ts:590-593`). Disabled access must preserve the retained comments floor/evidence instead of treating off as fresh history. Existing regression proves positive-floor rollback rejection (`tests/assembler.test.ts:305-324`), so weakening this check is incorrect.
- Adding a top-level activation field to `artifacts/publication.json` requires updating the strict prior-history allowlist (`plugins/memo-history.ts:26`), or the next assembly rejects its own previous manifest. Historical manifests without activation must remain readable for deletion-floor recovery; choosing missing-activation behavior for live serving/pushing is separate and should fail closed or fail explicitly rather than infer enabled from retained files.
- Legacy `memos` metadata remains constant false plus retained floor. Its exact decoder enforces six fields and legacy schema 1 (`plugins/memos.ts:24-35`); it is not the owner Memo schema-2 export/receipt and must not be repurposed to mean new public access.
- Disable/reenable must not delete Memo releases/current/receipt/established marker, comment DB/outbox/audit history, or authoring sources. Removing a mount/proxy or adding a gate can preserve all data; stopping processes has additional health/admin/notifications semantics not specified by the user's public-access request.

### Existing tests and meaningful additions

Existing relevant tests:

- `apps/site/tests/site-config.test.mjs`: disabled defaults (63), public-only comments config projection (110), strict unknown/legacy/invalid activations (152,353), contained config override behavior.
- `apps/site/tests/site-plugin-registry.test.mjs:27,43,66`: disabled skips build-data access/extensions, enabled post-only extension, site-only host capability boundary.
- `apps/site/tests/comments.test.mjs:89-121`, `static-output.test.mjs:331-367`, Unicode fixture/static/browser tests: approved grouping, no disabled sections, exact public form payloads/privacy.
- `apps/site/tests/memos.test.mjs:10-38`, `memos-build.test.mjs:15-49`: missing Memo config/export not read, navigation/sitemap toggles, always reserved namespace, static file containment/receipt exclusion/method handling.
- `tooling/assemble-publication/tests/assembler.test.ts:159,245,305`: deterministic fresh inventory, previous-release preservation on failure, comment privacy scan, positive-floor rollback guard.
- `tooling/assemble-publication/tests/memos.test.ts:17-50`: no physical Memo inputs, preserved historical floor, malformed/unsafe history rejection, no blog-owned Memo tree.
- `apps/site/tests/preview-command.test.mjs:129,138,149,349`: export-aware gate choice, dev rejects combined input, tracked fixture verification, early build failure prevents package side effects.
- `services/comments/tests/http.test.ts:17-169`: submission/verify/control/admin methods, CORS, unknown-v1/public-read rejection and private health/metrics. No disabled access option currently exists.
- `preview.sh package` probes full runtime inventory and Memo GET/HEAD/static privacy/write denial (`647-659`); `tooling/publish-memos/ops/*.test.mjs` proves independent publication orchestration/history and must stay unchanged in meaning.

Required additions should establish actual cross-layer behavior, not mirror implementation:

1. Four boolean combinations for comments/memos; unknown plugin, missing/malformed activation, bool strings, extra keys, selected alternate config, and mismatch against built artifact all exercise strict projection.
2. Retained valid Memo artifact + disabled activation: `/memos`, `/memos/`, `/memos/index.html`, public wire JSON, stylesheet, representative percent-encoded media all 404 for GET/HEAD and relevant other methods. Enabled restores exact approved public bytes; receipt/source/private routes remain 404.
3. Disabled comments on both presentations emits no approved comment sentinel, author/body/form/action; canonical post and unrelated blog/experiment routes remain 200. Comments public namespace exact/no-slash and all descendants return 404, including OPTIONS and malformed-token paths, while disabled upstream can be running.
4. Positive comments tombstone epoch followed by off then on: build succeeds, retained floor never drops, original DB/export/history is unmodified, stale content remains refused. Memo receipt/current digest and source hashes remain unchanged through access toggles.
5. Package/static-server/edge fixtures consume the same activation snapshot. Selected Memo artifact does not override false; active service does not override false; independently changed source TOML after build does not silently change release behavior.
6. Failed activation validation, build, upload, generated Nginx syntax test/reload, or release promotion reports failure and preserves previous valid artifacts/routing/history. Dry-run has no edge or pointer writes. Actual remote execution remains main-session scope, distinct from synthetic test evidence.

### Related specs and external references

Read `.trellis/workflow.md` and these contracts before forming the inventory:

- `.trellis/spec/frontend/index.md`, `architecture-contract.md`, `site-configuration-contract.md`: ownership, strict activation and config selection.
- `.trellis/spec/frontend/comments-publication-contract.md`: public projection, service vs site ownership, tombstone rollback floor.
- `.trellis/spec/frontend/memo-site-contract.md`, `memo-publication-runtime-contract.md`: intentional independent source/build/history, permanent namespace, current navigation-only activation and static mounting.
- `.trellis/spec/frontend/publication-contract.md`: fresh assembly, inventory, promotion rollback and runtime packaging boundary.
- `.trellis/spec/trellis-plus/comments-observability-release-boundary.md`: private health/readiness/metrics and host exposure boundary.

No external lookup was necessary or performed: findings are repository source evidence, not proposed Nginx API guidance. Current locked tooling: site Astro 7.1.6 / `smol-toml` 1.8.0, assembler TypeScript 6.0.3 / `smol-toml` 1.8.0, runtime `nginx:1.28-alpine` (`apps/site/package.json`, assembler package.json, `Dockerfile:25`). Any new Nginx-generation syntax must be proven by runtime `nginx -t` in implementation.

## Caveats / Not Found

- No remote host configuration or owner-private push code was inspected in this investigation. The main session's deployment researcher must reconcile actual edge includes/listeners, alternate comments write origin, recursive update ownership, and rollback protocol.
- User said all plugins share the public-access switch; preserving private owner admin/control/health while disabled is not fully specified. Control links are visitor-facing despite token authorization; admin operations are private. Do not invent a shutdown/deletion policy.
- General static servers cannot infer activation from files by themselves. If runtime gates live outside the release, toggles must bind and validate release/gate selection; stale cached client bytes cannot be recalled by server 404s.
- Disabled should remain unavailable even with a retained artifact or live upstream. Off/on testing must involve retained nonempty fixtures; absence-only tests conceal the original bug.
