# Research: Inline article provenance, licensing and sharing

- Query: Identify the narrow source-backed seams for a centered inline `cat` action bar, source-byte/date/license footer, and canonical permalink copying.
- Scope: Mixed; repository source and tests plus authoritative Creative Commons naming references.
- Date: 2026-10-09

## Findings

### Scope and current source state

The latest owner steering supersedes the earlier compact-metadata-row candidate: render `Command | Collapse/Expand | Open | Share` centered above the body, and move the virtual Markdown path, original UTF-8 byte count, publication date and post license below the body. Main-session interpretation sets Share to copying the canonical permalink and the omitted post license to CC BY-NC 4.0. Research makes no product/source/spec/test changes. Other agents are editing the current inline-chrome candidate concurrently; line citations describe inspected source and may move.

Read `.trellis/workflow.md`, frontend index, architecture, applicable content-workspace sections, X Core, development runtime, and active PRD/design/implementation plan. Research is role-isolated: implementation/check JSONL manifests were not loaded.

### Files found

| File | Relevant responsibility |
| --- | --- |
| `apps/site/scripts/materialize-content.mjs` | Race-checked original-byte reads, fallback metadata, legacy heading normalization, atomic generated-stage promotion |
| `apps/site/src/lib/content-metadata.mjs` | Absent/empty frontmatter classification and stage-only fallback insertion |
| `apps/site/src/lib/workspace-collection-loader.mjs` and `.d.mts` | Standard Astro glob over generated Markdown; empty-collection pruning |
| `apps/site/src/lib/content-schema.mjs` | Strict post/page/Memo authored schema and defaults |
| `apps/site/src/content.config.ts` | Collection registration with the shared loader and distinct schemas |
| `apps/site/src/lib/content.ts` | Public projection and immutable virtual Markdown/canonical route identity |
| `apps/site/src/lib/render-document.ts` | Astro render plus validated X Core metadata; site-owned return object |
| `apps/site/src/lib/site-meta.mjs` | Existing explicit-canonical versus configured-origin route resolver |
| `apps/site/src/pages/index.astro` | Builds public Terminal entries and rendered documents |
| `apps/site/src/components/TerminalHome.astro` | Exact public templates; already passes rendered document to inline component |
| `apps/site/src/components/TerminalStreamDocument.astro` | Inline document body, accessible title, controls and current chrome |
| `apps/site/src/scripts/terminal-home.ts` | Template validation, clone ID scoping, Open destination fragment policy, per-instance action feedback |
| `apps/site/scripts/blog-meta.mjs` | Authored metadata normalization and explicit write allowlist |
| `tooling/format-content.sh` | Minimal frontmatter insertion only; does not normalize existing fields |
| `apps/site/tests/content-materializer.test.mjs` | Original/staged content, links, atomic promotion and scan/copy-race fixtures |
| `apps/site/tests/content-schema.test.mjs` | Strict metadata defaults/overrides/invalid values |
| `apps/site/tests/blog-meta-cli.test.mjs` | Preserved body bytes and schema-valid normalized metadata |
| `apps/site/tests/content-build-positive.test.mjs` | Isolated contained public build fixtures and output inventory |
| `apps/site/tests/content-build-negatives.test.mjs` | Invalid content build failures |
| `apps/site/tests/static-output.test.mjs` | Public index/template equality, exact static inventory, destination/privacy assertions |
| `apps/site/tests/terminal.spec.ts` | Clone identity, collapse/focus, Open/native modifier behavior, code clipboard, wide reading |

### Original Markdown bytes: exact surviving seam

`copyFiles(files, targetRoot)` opens each resolved input with `O_NOFOLLOW`, checks the scanned device/inode against the opened regular file, reads a Buffer, and verifies UTF-8 round-tripping (`materialize-content.mjs:278–291`). **`sourceBytes.length` at line 289 is the authoritative total file byte count**. It includes authored frontmatter delimiters/content, BOM when present, all original newline bytes, and the body. Do not use JavaScript string length, HTML length, or a UTF-8 encoding of body-only text.

The next steps deliberately change bytes: fallback frontmatter is inserted/replaced (`materialize-content.mjs:292–298`; `content-metadata.mjs:63–69`), and legacy ATX H1 headings are demoted outside fenced blocks (`materialize-content.mjs:310–332`). A generated `.md` `stat.size`, `entry.body`, `entry.rendered.html`, or `.terminal-stream-prose.textContent` therefore cannot recover the requested original count. Existing materialization returns paths only, and the glob loader knows only generated files (`workspace-collection-loader.mjs:4–13`). Re-reading original files from Astro would bypass the checked snapshot and risk leaking host paths.

The narrow site-owned solution is to capture Buffer length while copying and atomically stage generated provenance alongside Markdown. A per-collection hidden JSON sidecar can map safe collection-relative `.md` identity to source byte length; a generated-only helper can resolve a public entry's collection/id. It must never serialize `file.sourcePath`, source root, device/inode, resolved symlink targets, or whole private-content inventory to HTML/browser data. Hidden inputs cannot author this sidecar because ordinary hidden source entries are skipped (`materialize-content.mjs:175–186`) and only Markdown files are copied. Use a fresh candidate sidecar for every materialization, including empty collections; do not merge old records. Existing `replaceStage` promotes the complete candidate or restores the previous stage (`materialize-content.mjs:335–370`). Include sidecar creation within that transaction.

Read/validate the generated sidecar in a **site-owned helper**, and add `sourceByteLength` separately to the object returned by `renderDocument(entry)` (`render-document.ts:57–72`) or resolve it in public homepage composition. `TerminalHome.astro:382–386` already forwards the rendered object. This avoids changing authored schema, Astro loader, `CanonicalDocument`, strict Terminal runtime entries, and `document.metadata.xCore` for provenance. Validate safe own-key identity and finite nonnegative safe-integer counts; fail clearly for missing original-source records rather than substitute staged/body bytes. Only expose the count for the public document being rendered.

**Generated-page caveat:** the stage synthesizes `pages/memos.md` when no owner page owns that identity (`materialize-content.mjs:445–446`). It has no original source file. The implementer must explicitly distinguish this generated provenance, or use its generated Markdown byte count with honest semantics; it must not claim an original physical-file count for it. An owner-authored `pages/memos.md` follows the ordinary original-buffer rule. Main session has been notified. Ordinary Memo source is rewritten by `stageMemoSource`, but the original-buffer seam remains available before this call; no new Memo footer is requested.

Warm-state caveat: separate provenance can change while normalized Markdown remains identical (e.g. different empty frontmatter input normalizing to the same fallback stage). Avoid long-lived unchecked provenance caches or assuming Astro's Markdown digest will refresh it. Test repeated materialization with unchanged normalized body and changed original byte count. Sidecars remain build artifacts, never copied into `dist`/runtime publication; exact output inventory should stay restrictive.

### License metadata: post-owned strict field

Current `postSchema` spreads shared metadata then adds post-only fields at `content-schema.mjs:95–100`; page and Memo schemas independently spread that shared object at lines 103–118. The owner requested a post metadata field. Add `license` **to the post object**, not `sharedMetadata`, to avoid silently assigning post licensing policy to pages and Memos. An omitted field defaults to the requested code; malformed/null/unknown values should fail strict schema validation rather than silently fall back.

A narrow field convention is a validated enum of six CC 4.0 IDs, `CC-BY-4.0`, `CC-BY-SA-4.0`, `CC-BY-ND-4.0`, `CC-BY-NC-4.0`, `CC-BY-NC-SA-4.0`, `CC-BY-NC-ND-4.0`, with default `CC-BY-NC-4.0`. A small frozen site-owned descriptor map can produce readable labels such as `CC BY-NC 4.0` and fixed official deed links. Do not accept authored arbitrary link/HTML or put a licensing registry into X Core. Code format is a proposed implementation convention, not an existing repository contract. CC0 is a separate tool and need not be added for this request. License rendering should be gated by `entry.collection === 'posts'`; pages can retain path/bytes/date without a post default. Adding page license acceptance would be an additional product decision.

Fallback frontmatter need not write an explicit license: post-schema default handles frontmatter-free/empty existing posts. Authored sources/config remain untouched by builds. `blog-meta.mjs` does need its explicit `outputKeys` list (`:24–42`) synchronized: `normalizeSchemaData` iterates only that list (`:470–477`), so a newly accepted authored override would otherwise be lost on normalization/save. Its infer step preserves existing metadata via object spread (`:409`) and revalidates post/page schema (`:480–484`); no new CLI override flag is necessary to preserve authored `license`. Outputting the post default during explicit owner-invoked metadata normalization follows its existing default serialization behavior.

`tooling/format-content.sh:265–285` writes only the minimum metadata for previously absent frontmatter and skips existing frontmatter. It has no schema output allowlist and does not erase authored license. No shell change is necessary when the schema owns the default. Search found no other ordinary post/page metadata writer requiring a matching license allowlist.

### Canonical Share versus native Open

`createCanonicalDocument(entry)` derives a virtual identity from validated staged id and a route independently from slug (`content.ts:91–124`). `virtualPath` is e.g. `posts/infra/file.md`, whereas `href` is the route `/posts/infra/<slug>/`; display the former through existing `formatResourcePath('/' + virtualPath)` / Terminal identity conventions rather than deriving it from the URL. Source count keys use physical Markdown identity, not optional slug.

`resolveSiteMetadata(options, config = SITE_CONFIG)` already defines canonical precedence: explicit safe `entry.data.canonical`, otherwise `absoluteSiteUrl(config.site.url, pathname)` (`site-meta.mjs:9–11,20–25`). Inline Share should reuse this resolver using `terminalEntry.href` as pathname. If site URL and override are absent, retain the canonical root-relative route and resolve it against the current browser origin when copying. Never accidentally share the homepage pathname, local file path, alias, current fragment, or cloned heading ID.

Keep Share metadata separate from `a[data-terminal-open]`. Clone creation rewrites Open to the current document-navigation destination (`terminal-home.ts:939–946`), refreshes it across environment changes (`:1289–1293`), and reapplies the policy on click (`:1418–1421`). This may append `#document-navigator`; it belongs only to Open. Share must use the stable, fragment-free canonical URL, including an explicit external override when validated metadata supplies one.

Existing code-copy behavior provides a narrow reusable browser pattern: awaited `navigator.clipboard.writeText`, caught rejection, connected/available-state guard, live announcement, temporary button feedback and timer cleanup (`terminal-home.ts:1294–1318`). Share should preserve focus, draft, selection and per-clone state; clipboard failure must announce failure honestly rather than claim success. A visible Open link remains the native fallback. Button labels can reset to `Share` after temporary feedback without reintroducing persistent explanatory chrome.

### No required X Core or presentation-runtime API change

Architecture assigns content/routes/SEO/public catalog to `apps/site` and framework-neutral transform/enhancement metadata to X Core (`architecture-contract.md:53–56`). `x-core-context.ts:42–63` intentionally projects only id/slug/layout/presentation from authored frontmatter. Original source byte count, license descriptor, and clipboard destination are site-owned chrome metadata. `renderDocument` already returns a site-owned object containing Core metadata as one member, so these can be siblings without modifying `packages/x-core`, presentation adapters, strict Core metadata decoding, Terminal runtime entry decoding, routes, or plugin payloads. Preserving these seams is both narrower and consistent with current contracts.

### Meaningful validation and fixture preparation

1. **Schema:** omitted post license defaults correctly; each supported override survives; reject empty/null/numeric/arbitrary URL/wrong-version/unknown IDs; pages and Memos do not gain a post license default. Keep strict unknown-field rejection, including any authored spoofed byte field.
2. **Materialization:** a multibyte Chinese/emoji Buffer with authored frontmatter and CRLF/BOM reports original full Buffer length; absent and empty frontmatter cases prove the value differs from staged size; legacy H1 normalization does not alter the captured count; linked input uses link-owned virtual path and excludes host path. Verify failed copy/promote preserves prior Markdown **and provenance**, empty withdrawal removes old records, and repeat materialization refreshes counts without stale cache dependence.
3. **Metadata writer:** `blog-meta-cli.test.mjs` adds default/override preservation across normalized write, invalid-license refusal with source unchanged, and byte-identical original body retention. No need for a new CLI flag solely for this request.
4. **Isolated build:** extend `content-build-positive.test.mjs`'s contained public fixture (`:63–106`, environment at `:115–128`) with synthetic non-ASCII raw Markdown and an explicit license override/canonical URL; compare emitted inline footer to the fixture Buffer length. Verify default, post override, page omission, correct virtual file path even when slug differs, no host/private inventory/sidecar output, and stable body/heading metadata. Negative build should fail on invalid license metadata.
5. **Browser:** exercise actual repeated `cat` clones, unique title/body/action associations, one centered four-action nav before body and compact footer after it, per-output Collapse/Expand, visible focus return, unchanged modified native Open and navigator policy. Mock clipboard success, missing API and rejection and assert exact copied canonical URL, isolated feedback/reset, unchanged input draft and focus. Include configured origin, explicit override, and originless browser fallback through appropriate contained fixtures. Existing `terminal.spec.ts:2132–2184` and `:2263–2339` cover identity/collapse/width/open seams; refresh old `Open document` role names when the approved visible label becomes `Open` while retaining exact destination assertions.
6. **Static/publication:** extend template equality assertions at `static-output.test.mjs:809–823`, not public entry/runtime APIs. Sidecar remains absent from exact published inventory. Existing clone scoping must continue handling only body/action IDs; no source path is introduced into data attributes or generated scripts. Retain maintained mobile no-shell, native routes, paper/wide overflow and assembled-publication tests.

Focused Node checks can run through `./preview.sh render node --test ...` (with `--experimental-strip-types` where the existing typed fixtures require it) or the maintained `./sam npm --prefix apps/site run test:content`. The maintained suite has an explicit file list in `apps/site/package.json`; register any new test module there. Do not use host Node/npm. For isolated build tests the tests themselves provide `FIREFLY_CONTENT_ROOT` and contained template TOML; do not repurpose owner source/config.

Maintained integrated browser preparation uses `./preview.sh render npm run prepare:test:memos`; `prepare-memos-fixture.mjs:7–18` builds with controlled source/config, and its `full/empty/single` cases are separate from the main tracked content build. Root `verify:m51` later rebuilds the tracked `/app/content` publication before site/NERV/publication browser suites (`package.json:69`). Use the task's existing controlled Memo fixture TOML when required by the current verify profile. Final gate remains `./preview.sh verify`, followed by normal `./preview.sh package` to restore/update owner preview. Research itself did not run any build/test or alter fixture state.

### External references and related specs

- Installed source inspected: Astro **7.1.6**, YAML **2.9.0**, Playwright **1.62.0** (`apps/site/package.json`). Astro's glob implementation parses staged Markdown, keys digests on staged contents, and may reuse unchanged entries (`node_modules/astro/dist/content/loaders/glob.js:90–144`); its LoaderContext/store declarations expose generated data, not original source provenance. These observations reinforce keeping original-byte capture upstream.
- [Creative Commons license overview](https://creativecommons.org/cc-licenses/) lists the six license families. [CC BY-NC 4.0 deed](https://creativecommons.org/licenses/by-nc/4.0/) establishes the exact display label and fixed official deed URL. This research records labels/links only; no legal advice or policy reinterpretation is needed for the owner's specified default.
- `.trellis/spec/frontend/content-workspace-contract.md`: atomic generated stage, symlink-owned virtual identity, host-path exclusion, fallback metadata, public projection, exact template correspondence.
- `.trellis/spec/frontend/site-configuration-contract.md`: explicit canonical override precedes configured site origin; absent origin does not invent an SEO canonical.
- `.trellis/spec/frontend/architecture-contract.md` and `x-core-contract.md`: site chrome/provenance ownership, preserved Core metadata and adapter direction.
- `.trellis/spec/frontend/development-runtime.md` and `.trellis/spec/trellis-plus/validation-profile.md`: container-only Node/browser commands and maintained publication gate.

## Caveats / Not Found

- Original source-byte count is currently discarded after materialization. No downstream-only change can recover it accurately.
- The generated Memo aggregate has no original physical file unless owner-authored; its byte-count semantics need explicit handling.
- No existing ordinary post license field or site-owned CC descriptor registry was found. The enum spelling above is a proposed narrow convention to document when implemented.
- No Core/runtime change is required by the requested metadata; widening their strict contracts would add unnecessary scope.
- No code/spec/test edits, Git operations, owner-content/config reads, or builds were performed by this researcher. Only this report was written.
