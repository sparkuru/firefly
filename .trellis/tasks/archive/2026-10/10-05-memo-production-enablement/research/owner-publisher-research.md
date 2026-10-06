# Research: independent owner Memo publication

- Query: What existing rendering/publication contracts can support owner-authored local Memos, a separate publisher, automatic deployment after publication, and preservation of both blog source and deployed blog bytes?
- Scope: internal; source and project contracts only. No ignored deployment inputs, credentials, temporary operational data, or remote host were accessed.
- Date: 2026-10-06

This is exploratory source research. The current task-root PRD/design settle
its former open choices: dedicated static mount (Option A), rendered Markdown,
and automatic push during explicit publish. Alternatives and earlier undecided
language below remain research history, not outstanding owner decisions.

## Findings

### Current boundaries and files found

| File | Role and evidence |
| --- | --- |
| `plugins/memos/public.mjs` | Framework-independent exact public export, canonicalization, ordering and digest; record keys are `id`, `displayName`, `body`, `createdAt` (`:4`, `:51`, `:66`, `:105`). |
| `plugins/memos/config.mjs` | Independent activation/config parser, but currently enabled public config requires HTTPS `writeOrigin` and exposes `consentVersion` (`:28`, `:81`). |
| `apps/site/src/plugins/memos/index.mjs` | Disabled-first contained public JSON loader; does not read the service/database (`:10`). |
| `apps/site/src/plugins/memos/MemoStream.astro` | Escaped plain-text static stream with public-envelope receipt attributes and opaque record IDs (`:7`); currently has reader-submission wording. |
| `apps/site/src/plugins/memos/MemoForm.astro` | Native visitor POST form with email, consent and verification lifecycle (`:5`). |
| `apps/site/src/pages/memos/[...stream].astro` | Emits only `/memos/` when enabled, imports shared document layout and both stream/form (`:9`, `:17`). |
| `apps/site/src/layouts/DocumentLayout.astro` | Shared stylesheet and site head; activation adds a Memo navigation item across documents (`:39`). |
| `apps/site/src/components/TerminalHome.astro` | Activation also changes homepage browse/group markup (`:245`, `:256`). |
| `apps/site/src/lib/content.ts` | Reserves `/memos/` only while plugin is enabled (`:202`). |
| `apps/site/src/lib/site-seo.mjs` | Sitemap derives from Astro-emitted routes, so adding a route changes the blog-side sitemap (`:18`, `:38`). |
| `tooling/assemble-publication/src/plugins/memos.ts` | Independent public input/metadata plus exact DOM and visitor-form binding (`:60`, `:116`, `:137`, `:166`). |
| `tooling/assemble-publication/src/plugins/memo-history.ts` | Reads retained deletion floor from `artifacts/publication.json`; absent/malformed established history refuses bootstrap (`:34`). |
| `tooling/assemble-publication/src/index.ts` | Entire-site/Experiment candidate construction and paired repository promotion (`:582`); no Memo-only mode. |
| `tooling/assemble-publication/tests/memos.test.ts` | Existing malformed-input, exact DOM, stale-epoch, missing-history, shadow-route, privacy and rename-failure coverage. |
| `preview.sh` | Full publication build/preview/package entry; packaging checks full inventory and web-image contents (`:72`, `:516`). |
| `package.json`, `apps/site/package.json` | Current build graph includes site/Experiments/full assembly; site generation performs Memo prebuild validation. |

### What can be reused without the visitor runtime

The public JSON contract, digest computation, contained-file loader, newest-first ordering, HTML escaping and DOM/export correspondence do not depend on SMTP, HTTP submission, moderation or SQLite. A new local owner producer can create the public envelope directly using `createPublicExport`; a service export is not structurally necessary. This is producer reuse, not permission to let arbitrary remote/client data select build commands.

The current plain-text body contract allows 1–8192 UTF-8 bytes and a single-line display name up to 80 Unicode code points. IDs use the `m_` opaque identifier grammar; UTC timestamps are canonical milliseconds. Local source UX can be separate from this projection: an owner file may carry draft metadata, while only the exact public fields are projected. Stable identity should be authored/persisted independently of body text or array position so editing does not silently create a new Memo.

Choosing Markdown would be a material rendering contract change. `MemoStream.astro` escapes body as text, and `checkStream` explicitly rejects child markup in the body. The site's Markdown processing is build-time and sanitized (`apps/site/astro.config.mjs:27`), but depends on document context, presentation registry and diagram/highlight integrations. A short-note Markdown processor can reuse established sanitization policy; it must not register Memo records as posts/pages or silently pull the whole article processor into the publisher. This research does not choose Markdown versus plain text.

### Exact coupling that must change

Removing `MemoForm` alone will fail existing enabled builds: `validateMemoTree` requires exactly one stream and one submission surface (`tooling/assemble-publication/src/plugins/memos.ts:179`), `checkForm` validates the exact action/fields, and `checkStream` validates reader-facing heading and empty text. Enabled public configuration also requires a write endpoint. Read-only publishing therefore needs a reviewed read-only config/DOM contract and corresponding declaration, fixture, browser and assembler test changes.

Current Memo activation changes shared document navigation, homepage markup, route reservations and sitemap. Rebuilding the current site with new activation cannot preserve every existing blog file byte-for-byte. Rebuilding the entire site on each Memo edit also risks publishing unrelated local article edits/drafts that are outside the selected Memo action. Blog input preservation and deployed-byte preservation are distinct acceptance criteria.

### Two concrete independent deployment options

**Option A: dedicated static Memo artifact and separate deployed static mount.**

Build only the Memo package/output, with all of its assets beneath `/memos/` (for example `/memos/assets/...`). The owner edge serves `/memos/` from a separately versioned immutable Memo release/current pointer; its ordinary blog root/current remains unchanged. A Memo publish neither loads the blog workspace nor builds Astro site/Experiments. The server needs only static files; no verification, write, admin, worker or SMTP endpoint is involved.

This is the simplest byte-preservation model: Memo publication never copies or rewrites the blog tree. A later full blog deployment changes only the blog current pointer and cannot replace the Memo current pointer/history. The local combined preview/package path must still explicitly mount/combine the two static artifacts, or state that a blog-only image requires an external Memo mount; otherwise local/production behavior will diverge. Reserved-route ownership must be declared even if the blog's legacy Memo activation is disabled, so an article alias cannot shadow the independent mount. A one-time navigation update is a separate blog release decision; ordinary Memo publishes must not regenerate it or the root sitemap.

Tradeoff: one additional static location/release pointer at deployment, plus an explicit combined-preview/full-publication integration. Memo assets must not depend on a blog `_astro` filename that a later blog build can remove. Shared visual tokens can be reused at source/build time; emitted Memo assets remain self-contained.

**Option B: clone the active combined release and replace only the Memo-owned subtree.**

Build a separate self-contained Memo artifact. Under a deployment lock, read and pin the active release identity, copy its complete safe static tree into a fresh immutable candidate, replace only declared Memo-owned paths, validate the result, prove a complete path/content hash manifest is identical outside that ownership set, and atomically switch the existing combined current pointer. Never patch the active tree in place and never build blog/Experiments during this action.

This preserves blog bytes with one served current pointer, but adds active-release transfer/copy, ownership-aware inventory assembly, source/deployed artifact synchronization and race handling. Pinning the base release is mandatory: a concurrently completed blog deployment must not be overwritten by a Memo candidate based on an older blog. A later full blog publication must compose its new blog candidate with the latest authoritative Memo snapshot/artifact while holding the same deployment lock, rather than ship an old local Memo build or infer disablement from missing inputs. Missing established Memo state is an error; explicit removal is a separate operation. Existing `assemblePublication` has neither base-release input nor subtree replacement API, so this is a new supported mode rather than an unchanged assembler invocation.

Tradeoff: fewer edge mounts but more transactional integration. Repository paired promotion is rollback-safe for caught failures, not crash-atomic deployment; its existing rename seam does not prove live switching or concurrency safety.

### Focused minimal module plan for Option A

This is a concrete candidate layout for planning, not an implementation or a source-format decision. A small dedicated tooling package is sufficient; no generic plugin framework, separate interactive app, new service API or additional Astro installation is required solely to render an owner stream.

| Proposed responsibility | Minimal module/file shape | Existing boundary to reuse or amend |
| --- | --- | --- |
| Owner-source reader and public producer | `tooling/publish-memos/src/source.ts`, `src/index.ts` with one package manifest/lockfile and a contained output directory | Reuse `plugins/memos/public.mjs` canonical validation/export. Selected source format determines parsing/draft metadata; no article content loader or Content Collections. |
| Read-only document/asset renderer | `tooling/publish-memos/src/render.ts` plus package-owned small static stylesheet under output `memos/assets/` | Reuse escaped stream structure/receipt identity, language and visual-token values; produce an independently complete document. No importing `DocumentLayout`, `SiteHead`, global Astro/Vite CSS URL or site config singleton. |
| Build/publication CLI | `tooling/publish-memos/src/cli.ts` | Distinguish candidate build/validation from public promotion. Candidate inventory, digest/freshness receipts and exact output ownership are validated before push. Automatic-push default and failure behavior remain undecided. |
| Owner push entry | A focused shell entry for the dedicated artifact, or one explicit push CLI subcommand | Owner-local connection inputs remain private; push only Memo candidate/history and switch only Memo current. Never invoke ignored existing all-site sync scripts without reviewing their semantics. |
| Main-blog integration | `apps/site/src/lib/site-config.mjs`, `src/components/TerminalHome.astro`, `src/layouts/DocumentLayout.astro`, `src/lib/content.ts` | A site discovery/link flag can remain, but it must not require reading Memo sources/config/export. Reserve the route for the external static mount; navigation may link to an externally served same-origin route without Astro generating it. |
| Full-publication integration | `tooling/assemble-publication/src/index.ts` and Memo adapter/history modules; package/preview callers as needed | Stop requiring in-site Memo DOM/export for the independently served mount. Avoid conflating blog-side manifest state with independent Memo live history. Combined preview/package composition must be explicit; blog-only push must leave Memo pointer/history untouched. |
| Targeted acceptance | Publisher unit/CLI tests; site config/build tests; independent mount/deployment fixture | Exercise source unavailable to blog build, blog unavailable to Memo build, exact byte preservation, cross-publisher survival, collision/freshness/failure tests. |

Current template dependencies explain why simply calling the existing Astro page separately is not minimal: `DocumentLayout` imports `SITE_CONFIG` and global CSS through Vite; `SiteHead` calls site metadata backed by the same config singleton and references root favicon (`apps/site/src/components/SiteHead.astro:2`, `:42`); global CSS imports article, diagram and paper-theme styles (`apps/site/src/styles/global.css:1`). The Memo component's inline CSS itself is small and independent. A standalone renderer can keep ordinary home/blog links as deliberate public navigation while copying or emitting every required style/icon under its own owned mount. Existing shared source visual values can be extracted narrowly if needed; do not create a design framework just for this page.

For rich Markdown, the usable existing API pattern is `createMarkdownProcessor` from the pinned `@astrojs/markdown-remark`, as exercised by `apps/site/tests/x-core-integration.test.mjs:57`; it accepts explicit sanitation plugins and produces HTML at build time. The reusable policy is the pure `markdownHtmlSchema` in `apps/site/src/lib/markdown-html-policy.mjs`. If selected, move that pure policy to a framework-independent shared helper with a site facade/re-export, so the new tooling package does not depend on Astro application internals. A Memo processor can call the Markdown API without X Core plugins. `packages/x-core/src/pipeline.ts:94` requires `posts`/`pages` collection and article/page layouts; using it unchanged would force a false document identity or modify an unrelated domain contract. Code highlighting, Mermaid and article presentation enhancements are optional requirements to settle separately, not automatic implications of choosing basic Markdown.

The existing plain-text contract and DOM validator should remain usable until a reviewed rich-body projection is defined. Markdown source alone can still be projected as literal text; that does not satisfy a request for rendered Markdown. If rendering is selected, a deterministic sanitized fragment and its evidence need a versioned public/DOM contract rather than pretending the current four-field plain-text record already carries validated HTML.

### Full blog publication and history must be explicit

The current full assembler copies fresh `apps/site/dist`, then Experiment outputs, then promotes fresh `artifacts` and `dist` (`tooling/assemble-publication/src/index.ts:615`, `:646`, `:664`). If the current Memo activation is disabled, it retains only the prior tombstone floor while removing the Memo snapshot/surface. It does not preserve a separately published Memo artifact or know the latest deployed Memo revision. Leaving full publication unchanged can erase independently published Memos or ship stale ones.

For Option A, persistent Memo state/history belongs outside blog release roots and is authoritative for the independent mount. Full blog publication must preserve that boundary and avoid claiming ownership of `/memos/`; combined previews may compose a read-only Memo artifact without moving its live pointer. For Option B, the full publisher must explicitly consume current authoritative Memo state at promotion time and preserve the independent history while rebuilding blog artifacts.

Existing anti-rollback compares only `tombstoneEpoch` (`tooling/assemble-publication/src/index.ts:597`). It prevents resurrecting content from before an established deletion, but does not order opaque `sourceRevision` strings or reject a stale same-epoch addition/edit. A new owner publisher must define freshness independently: either serialize all deployments using one authoritative snapshot, or retain a monotonic publication sequence and compare current deployment state before promotion. Do not claim the old floor alone solves concurrent publication or stale edits. Deleting a source file without retained deletion bookkeeping also cannot supply a safe epoch after restoring an older owner workspace.

A local owner state/history file can retain stable IDs, publication sequence and deletion floor without retaining visitor identities or encrypted mail. Established missing/malformed history must remain fail-closed. The exact history schema and source-of-truth location require design; there is no such owner-publisher state in the inspected tracked code.

### Affected areas and achievable acceptance tests

Core changes span the new owner-source/producer package, read-only Memo renderer/config, publication/history integration and a supported deployment entry. Existing visitor service code can remain unused or be retired in a separately stated scope; this research does not recommend deleting service history or operational keys/data. The owner source format, automatic-push default, push failure semantics and deletion workflow remain product decisions for the main session/owner.

Meaningful tests for either option:

1. A Memo-only action succeeds with the blog content workspace unavailable and without invoking site/Experiment build commands; modifying unrelated local article source does not publish it.
2. Snapshot every deployed non-Memo path and byte before/after Memo create/edit/delete; the manifest remains identical. Check comments/Experiments and existing article routes, not only one homepage response.
3. Add an owner Memo, publish it, then perform an ordinary full blog publication; latest Memo content and retained deletion history remain intact. Repeat with an older local Memo snapshot and verify rejection/preservation.
4. Race/failure seams prove blog and Memo publishers cannot lose each other's completed updates; failed build/validation/transfer/promotion preserves both previous public surfaces. Push retry must deploy the already accepted candidate rather than accidentally rebuild unrelated source.
5. Read-only Memo HTML contains no form, email/token fields, submission endpoint or write runtime dependency; native reading works with JavaScript disabled on desktop/mobile. All linked Memo assets resolve after an unrelated blog rebuild.
6. Public projection remains exact-field and digest-bound; malformed/unsafe source, duplicate IDs, traversal/symlinks, missing history and stale deletion/freshness state fail before promotion. Draft handling is exercised after source UX is chosen.
7. Delete then restore an older source/state snapshot in isolation; publication refuses resurrection against the retained floor. Backup/restore and explicit disablement must not reset established history.
8. Publisher source/output/mount cannot collide with `/posts/`, `/pages/`, `/lab/`, shared assets or reserved article aliases. Cleanup targets only declared Memo staging resources.

## External references

No external technical dependency or provider-specific feature was selected. Versions observed in tracked manifests: Astro `7.1.6`, TypeScript `6.0.3`, Playwright `1.62.0`, `smol-toml` `1.8.0`. Research relied on repository source and contracts; external browse was not needed for source facts.

## Related specs

- `.trellis/spec/frontend/architecture-contract.md`: site/Experiment/assembler/deployment responsibility boundaries.
- `.trellis/spec/frontend/memo-site-contract.md`: current visitor form, plain-text DOM and disabled-first loading; requires amendment for owner read-only model.
- `.trellis/spec/frontend/memo-publication-runtime-contract.md`: exact export binding and retained deletion floor; current service/proxy/worker sections do not authorize new owner publishing behavior.
- `.trellis/spec/frontend/memo-service-contract.md`: current private visitor lifecycle, outside the proposed static owner publisher.
- `.trellis/spec/frontend/publication-contract.md`: safe-tree validation, artifact inventory and paired promotion versus deployment switching.
- `.trellis/spec/guides/project-record-privacy.md`: deployment identities and raw operational inputs stay outside research/planning records.

## Caveats / Not Found

- Historical planning artifacts were read for scope only and are being replaced by the main session; their old mail/visitor acceptance must not be carried into the new plan.
- No tracked owner Memo publisher, Memo-only assembler/deployment mode, or independent static mount integration was found in inspected source. Owner-local deployment scripts were intentionally not inspected.
- No remote environment was checked. Feasibility of a second mount versus combined-release copying must be established by the main session from authorized operational evidence; no operational feasibility is claimed here.
- Research performed no build/test, Git operation, source/spec change or remote action. Tests above are proposed acceptance criteria, not completed evidence.
