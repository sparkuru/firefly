# Research: Memo publication integration

- Query: Integrate independent memo export, rendered-route verification, privacy validation and tombstone rollback protection into the existing coordinated publication transaction.
- Scope: internal; planning only, repository evidence, no historical Typecho inputs.
- Date: 2026-10-05

The final `design.md` is authoritative for resolved choices. The investigation
below preserves options/provenance; the final main-session disposition at the
end supersedes its early recommendations where they differ.

## Findings

### Scope and context

The active parent is `.trellis/tasks/09-28-public-memo-stream`; this investigation belongs to the planning child `.trellis/tasks/10-01-memo-publication-runtime`. Only this research file was written. No implementation/check JSONL was loaded because the research role excludes those manifests. Child PRD/design/implementation plan and accepted contract/site/service specs were read directly. Builds, tests, installs, deployments, private config and historical data were not used.

Main-session scope decision received during research: allow minimal site evidence attributes (source revision, digest, epoch on stream root and opaque record IDs), and validate actual ordered displayed names/bodies/times against the decoded export. This is an explicit site-boundary addition to disclose in planning, not an assembler-only change. No UX/domain rule changes are required. Main also requires preservation of existing global credential/source-path bans; memo-specific checks must not copy comments' broad text bans.

### Files found and source anchors

| File | Role and relevant source anchors |
| --- | --- |
| `tooling/assemble-publication/src/index.ts` | Result/comments metadata at 22–38; credential/source-path scanners at 55–83; containment at 94–111; safe tree walker at 160–201; authored-document exemptions at 208–218; global/reference validation at 318–370; comments metadata/old epoch at 393–438; release validation at 440–472; coordinated promotion/rollback at 489–534; staging/manifest/promotion at 563–650. |
| `tooling/assemble-publication/src/plugins/comments.ts` | Current comments adapter: route/surface detection 15–33, lexical/real checks 35–45, repository contract import/decoder 46–50, emitted route checks 52–67, metadata projection 68–75. |
| `tooling/assemble-publication/src/cli.ts` | Discovery/build-only branch 35–40; comments loading and assembly 41–43. |
| `tooling/assemble-publication/tests/assembler.test.ts` | Synthetic fixture 10–38; explicit prohibition on importing site source 55–64; pair preservation 157–189; symlink-parent rejection 191–240; comments privacy 241–299; epoch recording/refusal 301–320. |
| `tooling/assemble-publication/tests/publication.spec.ts` | Existing assembled browser coverage for diagrams, navigation, 404 ownership and NERV motion; no memo assembled flow. |
| `tooling/assemble-publication/package.json`, `tsconfig.json` | Package-local compilation/test boundary, NodeNext TS, private validator dependency; no HTML parser or TOML parser dependency yet. |
| `plugins/memos/public.mjs`, `public.d.mts` | Exact envelope/record keys 7–9; text normalization 20–36; strict record projection 51–56; epoch/order 66–79; canonical digest 82–86; fatal UTF-8/strict decoding 89–102; serialization 111–112. |
| `plugins/memos/config.mjs`, `config.d.mts` | Defaults/public path/origin 4–35; activation/config/public projection 81–100. Pure parser only; filesystem checks belong to consumers. |
| `apps/site/src/lib/contained-file.mjs` | Safe relative segments, every-component symlink rejection, real containment, no-follow/nonblocking regular descriptor, bounded error, descriptor cleanup at 4–26. |
| `apps/site/src/lib/site-config.mjs` | Site config override rules 30–60; independent activation/public projection 256–279; enabled-only memo TOML loading/fatal UTF-8 340–350. Top-level import includes Astro and eagerly loads `SITE_CONFIG` at 353. |
| `apps/site/src/plugins/memos/index.mjs` | Disabled short-circuit 10–11; public config/default-or-raw-override path 12–18; raw-byte strict decoder 19; frozen output 20. |
| `apps/site/src/pages/memos/[...stream].astro` | Enabled-only static route/props 9–11; memo-only stream and form 17–22. |
| `apps/site/src/plugins/memos/MemoStream.astro` | Current stream/text layout 6–20; no envelope receipt, memo IDs or digest. Multiline text preservation 29. |
| `apps/site/src/plugins/memos/MemoForm.astro` | HTTPS action 6–7; legitimate email input/consent/honeypot and six form fields 12–25. |
| `apps/site/tests/memos-build.test.mjs`, `memos-fixture.mjs` | Strict prebuild negatives, enabled/empty/disabled inventories and fixture-only private sentinel exclusion; tests at 50–81 check route/action/privacy and memo isolation. |
| `services/memos/src/repository.ts` | Consistent approved-only export selects exactly four fields and revision/epoch at 147–153. Service revision changes and generated time are not assembler freshness authority. |
| `package.json`, `verify.sh` | Root delegates independent packages; m4/m51 build order assembles only after site/Experiments; `verify.sh:69` invokes `verify:m51`. Memo service/contract integration commands are absent. Site `test:content` already includes `memos.test.mjs`, but isolated memo build/browser suites remain separate. |
| `sam` | Raw memo override forwarding 329–330; no memo file pre-probe, matching disabled semantics. |
| `package-runtime.sh` | Global non-authored scan 79–91; build selection 122–126; schema/comments/inventory checks 127–151. New additive memo metadata does not itself break inventory consumers. |

### Existing transaction to preserve

The assembler already stages fresh site and Experiment trees, validates the complete release, writes private build evidence to `artifacts/publication.json`, and promotes `artifacts/` and `dist/` together (`index.ts:587`, `612`, `621–631`). Validation failure cleans only the two UUID candidate paths (`643–648`) and leaves prior outputs. Keep memo validation before `promoteTogether`; do not rewrite site/Experiment output or copy private service inputs. Validate the copied candidate, not merely the mutable source `apps/site/dist` inspected earlier by CLI.

Existing exception rollback is valuable but is not crash atomic, and there is no deployment history/recovery journal. A memo epoch guard against the current local manifest does not protect an operator who replaces both root targets with an older pair, deletes the evidence, concurrently runs assemblers, or rolls back an external deployment pointer. Preserve these documented limits; do not imply a new runtime durability system.

### Proposed interfaces and manifest shape

Add an independent `tooling/assemble-publication/src/plugins/memos.ts`. Proposed contract (names may be adjusted coherently in design):

```ts
interface MemosPublicationMetadata {
  readonly enabled: boolean;
  readonly schemaVersion: 1;
  readonly sourceRevision: string;
  readonly generatedAt: string;
  readonly digest: string | null;
  readonly tombstoneEpoch: number;
}
interface MemosPublicationInput {
  readonly metadata: MemosPublicationMetadata;
  readonly envelope: PublicMemosExport | null;
  readonly public: MemosPublicConfig | null;
}
loadMemosPublication(options: {
  readonly repositoryRoot: string;
  readonly siteConfigPath?: string; // safe relative .toml override/default
  readonly exportPath?: string;     // raw relative .json override
}): Promise<MemosPublicationInput>;
validateMemosOutput(options: {
  readonly siteOutputRoot: string; // staged site candidate
  readonly publication: MemosPublicationInput;
}): Promise<void>;
```

Extend `assemblePublication` with a memo input and `PublicationResult` with `memos`. The assembly core owns output/epoch validation so direct callers cannot bypass it by passing a six-field metadata object. CLI loads the independent input, then invokes assembly; its `--build-experiments` branch remains independent. An omitted memo input is disabled only if candidate output has no memo plugin surface. Disabled input ignores memo export/config/service settings and contains null envelope/public projection. Read the normal site activation projection first, then short-circuit before plugin TOML/export/override resolution.

Do not import site configuration/source to obtain activation or reuse its loader: `site-config.mjs` pulls Astro and eagerly reads config, and `assembler.test.ts:63` explicitly rejects that dependency in the comments adapter. A small assembler-owned TOML adapter should read the same selected site TOML (`FIREFLY_SITE_CONFIG_PATH` or default), validate memo activation through the pure config module, then enabled-only read/project the plugin file. Keep selection/path grammar identical to site and use fixed generic diagnostic labels rather than raw values. If parsing TOML here, declare the parser as an assembler dependency, not an accidental site installation dependency.

Keep the top-level publication schema at `1` with additive `memos` beside unchanged `comments`, `catalog`, `inventory`. Enabled metadata projects exactly the decoder's five evidence values plus `enabled: true`. Fresh disabled metadata is the same established empty convention (`sourceRevision: 'empty'`, epoch date, null digest, schema 1) with the retained epoch described below. Never put public origin, export/config source path, runtime settings or record bodies in this metadata object. Clone/project exact fields instead of spreading caller objects (`normalizeCommentsPublicationMetadata` currently spreads at `index.ts:412`; do not copy that behavior).

### Bind decoded export to the actual candidate page

Current assembler/comments patterns only validate a fresh export and route presence; they do not establish HTML/export equality. Current memo page similarly omits IDs and all envelope evidence (`MemoStream.astro:6–20`). A stale page can retain deleted notes while a newer export supplies a larger epoch. Route presence plus the export digest alone would incorrectly permit promotion.

Use the main-session-approved minimal additions: stream root `data-memos-source-revision`, `data-memos-digest`, `data-memos-tombstone-epoch`, and per-record `data-memo-id`. Pass envelope metadata to the stream component from the existing route props. The matching digest binds schema, generation time, epoch, ordered records and revision because all are canonical hash inputs. These attributes are evidence, not an authorization signature.

Parse candidate HTML with a real HTML parser. Locate exactly one owned `.memo-stream` root, validate its exact marker values, then compare ordered list records one-for-one against the strict-decoded export: opaque ID, displayed name text, displayed body text, displayed creation-time text and `datetime`. Compare DOM-decoded text exactly, preserving LF and Unicode; do not trim/collapse body whitespace or sort either side. Enforce plain-text slots without active/nested markup; actual escaped `<script>` or email-like body text stays text. Detect added/missing/reordered/duplicate records, duplicate roots, hidden/template-only counterfeit evidence, unknown record attributes/private structural fields, or stale record text even with copied current marker values. Empty export requires no record elements and the expected empty state. Require the owned native form/action/config to agree as well; private field names cannot be globally banned because the form legitimately owns `name="email"`, `consentVersion`, `consent`, etc.

When enabled require exactly `memos/index.html` for the memo route, no unexpected memo child HTML/alias/static shadow (`memos.html`, `memos.json` or child memo route); candidate safe walker/collision rules still apply. When disabled reject memo plugin stream/form/receipt surfaces left in site output. Disabled `/memos/` authored alias reservation semantics need care: site reserves the route only while enabled, so decide explicitly whether a disabled authored alias may exist without any plugin markers. Do not silently claim all `memos/**` files are impossible under the accepted alias contract.

`parse5@7.3.0` is already pinned transitively in `apps/site/package-lock.json:6430–6440`; MIT license and `entities` dependency are recorded there. Add an exact direct assembler dependency and its lockfile rather than importing site `node_modules`. No registry/docs lookup or dependency installation was performed here. Reject parser-repaired ambiguity (e.g. duplicate evidence attributes) through parse-error handling/shape checks; parser acceptance alone is not validation. Regex-only text extraction is insufficient for entities, nested markup, duplicate attributes or malformed HTML. Proposed new dependency/license implications belong in planning and third-party notices review.

### Privacy: structural boundaries versus approved text

The memo decoder permits plain text resembling HTML, email, field words and paths (`public.mjs:20–36`); only its controls/canonical text/limits are forbidden. Export keys are exact, so private structural fields (`email`, token hashes, moderation/abuse/state/config fields, comments `postPath`/`parentId`) fail independently of record text. The service selects approved records explicitly (`repository.ts:151–152`). SHA-256 proves consistency, not provenance, owner authorization or permission to import historical Typecho records.

Do not copy `COMMENT_EMAIL_PATTERN` or `PROHIBITED_COMMENT_TEXT` into memo stream validation: a permitted approved body mentioning email or `emailCiphertext` must not fail merely for those words, and encoded literal markup is not active markup. Verify exact allowed DOM slots/text against the approved export, then inspect actual elements/attributes and non-record surfaces for private structured artifacts. Use synthetic private-config/credential sentinels to prove exclusion in tests without loading operator secrets or historic records.

Existing global credential bans remain (`index.ts:55–59`, applied even to authored documents at 332–335), and global path bans remain for non-authored output (`60–68`, `337–343`). `/memos/index.html` is not one of the authored-document exceptions (`208–218`), so approved text with a matching global local-path/credential signature still fails today. Main explicitly chose to preserve that existing policy. Record this as a limitation rather than expanding exemptions or claiming every contract-valid body can publish. `package-runtime.sh:79–91` has additional fixture/private-path sentinels and excludes only authored post/page/home files; ensure new tests include its behavior. All reference/inventory/collision checks still run. Global scans do not establish approval or historical provenance.

### Prior manifest validation and disabled epoch retention

Existing comments epoch reader accepts almost any JSON root without `comments` as epoch zero, reads with ordinary `readFile`, and validates only the epoch when present (`index.ts:415–438`). It can follow a symlinked manifest/parent; do not reuse it for memos without strengthening the new memo boundary. Present malformed/unsupported evidence must fail closed, not silently become a legacy epoch-zero release.

Read prior `artifacts/publication.json` through contained regular-file/no-symlink checks before any candidate creation or target movement. Validate plain schema-1 root with expected baseline catalog/inventory shapes, then if `memos` is present require an exact six-field metadata object with boolean enabled, schema 1, canonical revision/date/digest and nonnegative safe epoch (reject negative zero). Enabled digest is nonnull; disabled digest is null and empty revision/date have their defined convention. A missing field, null/string metadata, malformed JSON, symlink/FIFO/directory, wrong root schema, unknown memo field, fractional/negative/unsafe epoch or value-bearing credential/path content is a blocking evidence error; bounded diagnostics must not echo raw metadata.

For valid legacy releases lacking `memos`, epoch defaults to zero, without changing their existing comments field. A genuinely absent manifest is fresh/legacy initialization only when no contradictory memo publication evidence exists; old memo output with no metadata cannot be assigned a reliable zero epoch. Define explicit bootstrap/manual recovery behavior for lost/corrupt evidence instead of automatic reset. Existing schema-1 releases with comments and no memos remain compatible; enabled legacy memo HTML lacking newly required receipt/IDs must rebuild before publication.

Recommended six-field semantics: `memos.tombstoneEpoch` is the highest accepted memo publication epoch, including while disabled. Enabled candidate epoch must be >= prior retained value; disabled publication uses null digest and empty revision/date but carries forward the prior epoch, without consulting exports or service state. Thus `enabled epoch 3 -> disabled epoch 3 -> enabled epoch 2` fails, and first disabled remains epoch 0. A high disabled epoch in a valid prior manifest also remains a floor. Do not take `max(old, candidate)` for an enabled stale export; reject it. Keep comments and memos independent and do not silently change comments' existing disabled/epoch behavior.

Alternate design is a separate top-level high-water field; that adds a second epoch owner and manifest surface without demonstrated need. Choose/record one semantics before implementation. Neither design authenticates a locally altered valid manifest; owner-controlled evidence and operator rollback discipline are necessary.

### Default export under replaced artifacts

The default is `artifacts/memos/memos.public.v1.json` (`plugins/memos/config.mjs:32`), but fresh artifact assembly creates only site/Experiments/publication evidence and replaces the entire prior `artifacts/` (`index.ts:587–627`, `628–631`). An enabled export placed there would disappear after successful promotion unless explicitly retained. Failure must leave both prior targets and the input unchanged.

Recommended lifecycle for planning review: read/decode once before replacement; serialize the decoded public envelope into a fresh candidate's `memos/memos.public.v1.json` with `serializePublicExport`. This retains only the validated public snapshot and supports rebuild/review without re-fetching a live service. Never recursively copy prior `artifacts/memos`, sibling files or arbitrary source directories. Retain at the fixed canonical artifact path even when input override was elsewhere; do not write back to/alter that override. Metadata digest describes semantic canonical envelope, not arbitrary source formatting/file-byte SHA. The public snapshot belongs in `artifacts/` only, not browser `dist/` or runtime image inventory, and should be included in artifact privacy checks. Disabled promotion can omit this snapshot while retaining the epoch floor. Alternative: intentionally consume-and-delete input and require a fresh owner export each build; document that operational tradeoff if selected. Snapshot retention is a surfaced lifecycle decision, not an implicit copy.

### Shared containment helper tradeoff

The site helper already supplies the required static file boundary (`contained-file.mjs:4–26`). Direct import from `apps/site/src/lib` reverses the accepted assembler boundary; copy-paste creates two security implementations. Prefer extracting the existing helper to a small project-owned build-input module, retaining the site's existing facade path and adding typed declarations so site and assembler share it. This is a minimal cross-boundary filesystem utility, not a new memo contract dependency on filesystem or a broad framework. Choose its explicit owner/path during planning (e.g. `tooling/shared/contained-file.mjs` plus declaration); update only memo site config/export facade imports and assembler use. Keep `plugins/memos/public.mjs`/`config.mjs` pure.

If shared extraction is rejected, use assembler-local implementation with the same focused matrix and document intentional duplication; do not silently weaken to comments' lexical/lstat/readFile pattern. Current helper rejects stable symlinks/components and final descriptor races/special nodes, but a concurrent attacker swapping an intermediate parent between lstat/realpath and open is not eliminated by final `O_NOFOLLOW`. Do not claim complete hostile-filesystem race safety; a stronger descriptor-relative traversal would be a separate scoped decision.

### Required focused validation

1. Disabled: no plugin TOML/export/override/environment getter/service read; missing/bad unused inputs succeed; stale plugin-owned memo markers fail; preserve ordinary comments-only/static fixture behavior. Include disabled authored alias policy once decided.
2. Enabled: valid populated and empty exports, default path and raw override, fatal UTF-8, missing/extra/private fields, wrong digest/order/date/epoch, duplicate IDs; diagnostics omit fixture secrets and input payloads. Path matrix covers absolute/traversal/backslash/suffix, symlink leaf/parent (including contained targets), escaping realpaths, FIFO/directory/special nodes.
3. Candidate binding: missing route, extra/shadow memo routes, wrong/missing revision/digest/epoch/IDs, actual stale text with current copied markers, missing/extra/reordered/duplicate records, escaped literal HTML/email/field words, Unicode/LF/entities, active/nested markup, template/hidden counterfeit stream, duplicate roots/attributes. Verify actual native form/action/consent matches public settings; do not ban its legitimate email field.
4. Prior evidence: no prior release; valid legacy comments-only schema-1; malformed root/JSON/memo fields, unsupported schema, non-regular/symlinked manifest/parent, negative zero/unsafe epoch, high disabled epoch, contradictory memo output with missing evidence. All blockers preserve both prior trees byte-for-byte.
5. Epoch sequence: first enabled, equal epoch allowed, higher accepted, lower rejected; enabled -> multiple disabled -> stale reenable rejected; valid reenable accepted. Prove memo floor changes do not compare to/alter comments epoch.
6. Input lifecycle: default artifact input survives success only as canonical validated snapshot; invalid source leaves prior snapshot unchanged; override stays unchanged; no raw sibling/private files copied; snapshot not in `dist`/browser/runtime inventory; disabled retains epoch but needs no snapshot.
7. Transaction: every export/output/prior-evidence failure keeps prior `artifacts` and `dist`, candidate cleanup is exact, no partial writes. Use existing rollback guarantees and add bounded injected first/second promotion-failure coverage if missing; existing tests mainly exercise validation failure, not both rename-failure branches. Do not claim crash/concurrency guarantees.
8. Cross-layer: real built synthetic enabled/empty/disabled site to assembler, deletion export versus stale HTML refusal, aggregate comments+memo fixture, exact private sentinel exclusions in staged artifacts/HTML, document/search/Lab isolation. Memo frontend mocked response tests alone are not service/proxy/publication evidence.

Use approved wrappers for later execution: `./sam npm --prefix tooling/assemble-publication run check|test|build`; `./sam node --test plugins/memos/tests/*.test.mjs`; site `test:memos` / `prepare:test:memos` / `test:e2e:memos`, with tracked content and pinned browser profile. Root scripts should add independent service install/check/test/build and contract tests, keep validator-first / site-before-assembly order, and include memo focused build/browser checks in the maintained verification gate. Static builds do not start the memo service. Root `verify:m51` currently does not run isolated memo build/browser suites; avoid claiming existing gate covers them fully.

### Exact applicable spec/context files

Required implementation/check context candidates (main curates them; not loaded as JSONL here):

- `.trellis/spec/frontend/index.md`
- `.trellis/spec/frontend/architecture-contract.md`
- `.trellis/spec/frontend/directory-structure.md`
- `.trellis/spec/frontend/publication-contract.md`
- `.trellis/spec/frontend/comments-publication-contract.md` (unchanged comments adapter/release compatibility)
- `.trellis/spec/frontend/memo-contract.md`
- `.trellis/spec/frontend/memo-site-contract.md`
- `.trellis/spec/frontend/memo-service-contract.md`
- `.trellis/spec/frontend/development-runtime.md`
- `.trellis/spec/trellis-plus/index.md`
- `.trellis/spec/trellis-plus/validation-profile.md`
- `.trellis/spec/trellis-plus/comments-observability-release-boundary.md` (external versus repository release guarantees)
- `.trellis/spec/guides/project-record-privacy.md`
- `.trellis/spec/guides/code-reuse-thinking-guide.md`
- `.trellis/spec/guides/cross-layer-thinking-guide.md`
- This research file, plus child `prd.md`, `design.md`, `implement.md` through normal native artifact injection.

Do not curate source files as JSONL spec entries, activate the child or import private historical/config inputs. The current design's generic ban on email-like values/private words/unsafe markup in emitted HTML needs revision to the structural/text distinction above.

### External references and versions

No external references were consulted; all findings derive from repository sources/specs. Local package evidence: assembler TypeScript `6.0.3`, Node types `24.3.0`, Playwright `1.62.0`; existing site lock has `parse5 7.3.0` (MIT) and `smol-toml 1.8.0` (BSD-3-Clause). These are observed repository pins, not claims about latest upstream versions. Exact parser API/licensing should be verified from the pinned package before implementation; use primary official docs if browsing becomes necessary.

## Caveats / Not Found

- No existing memo publication adapter, retained epoch implementation, stream receipt/IDs or assembled memo browser coverage found.
- Scope decisions to disclose: minimal site evidence attributes, shared contained-file extraction, exact parser/TOML dependencies, validated public snapshot retention, disabled route/alias policy, and lost-manifest bootstrap behavior. Main authorized the evidence attributes and unchanged global privacy policy during this investigation; other recommendations require explicit resolution in design.
- Digest, static DOM equality and privacy signatures cannot prove historical provenance/owner approval; approved new-submission service workflow remains the only authorized source.
- Verification was source inspection only. No tests/builds/deployments ran, and this file is not evidence that any proposed behavior is implemented.

## Resolved planning status and consistency pass (2026-10-05)

The main session resolved the earlier alternatives in the current child design: shared reader at `tooling/shared/contained-file.mjs` with declaration/site re-export facade (no site/Astro singleton import); direct assembler pins `smol-toml 1.8.0` and `parse5 7.3.0`; six-field memo metadata retaining its epoch while disabled; canonical public-only snapshot in artifacts, absent from dist/image; disabled marker-free authored `/memos/` alias permitted; absent existing history blocks publication, with fresh input-only bootstrap permitted when no prior dist/publication trees exist. Minimal service proxy/worker plumbing and site evidence attributes are included. Memo proxy must suppress raw verification URI access/error logs. Root Compose has portable nonroot default plus identity override; standalone requires explicit identity. These supersede the unresolved alternatives in the original investigation, without claiming implementation.

The primary also checked the official [parse5 parse API](https://parse5.js.org/functions/parse5.parse.html): `parse(html, options?)` returns an HTML document. This external primary reference was supplied by the main session after this researcher's repository-only investigation; this researcher did not independently browse it. Exact pinned APIs/license are still to be verified before implementation.

Focused read-only pass covered the latest child `prd.md`, `design.md`, `implement.md` and both research files. Findings sent to main with the following anchors (line numbers at review time):

- **Override preservation conflict:** `design.md:99–104` retains a fixed canonical snapshot while claiming override inputs remain unchanged. An otherwise valid relative override inside `artifacts/` or `dist/` is deleted by target replacement. Restrict such overrides explicitly (with the preserved canonical artifact input exception), or document consumption instead of promising preservation. An outside-target override remains untouched.
- **Combined fresh bootstrap gap:** `design.md:85–88` permits only the recognized initial public export input. A first combined comments/memo publication can contain both approved public inputs in artifacts, with no prior publication trees. Explicitly define both recognized strict public inputs as eligible bootstrap evidence or state the required alternate staging path; never copy arbitrary siblings.
- **Legacy history ambiguity:** `design.md:82–83` assigns zero to any valid schema-1 manifest lacking memos, but `prd.md:95` promises compatibility for memo-free legacy releases. The previous assembler can already have promoted memo HTML without memo metadata. Require absence of prior plugin-owned memo surface before accepting zero legacy state; authored aliases alone must not be mistaken for plugin evidence. Otherwise fail with recovery guidance rather than silently reset an unknown epoch.
- **Transaction wording:** `design.md:14` says atomic artifact/release promotion; the accepted publication contract guarantees coordinated caught-failure rollback and explicitly excludes crash atomicity. Use coordinated repository promotion wording.

Worker implementation must override the service image's HTTP healthcheck for the independent worker container: current `services/memos/Dockerfile:21` probes HTTP on local 8788, while `design.md:156–157` correctly requires worker tick/process health. This is an implementation detail to make explicit, not a change to the selected topology. The current plan broadly covers image command support and worker health; no product execution occurred in this consistency pass.

## Final main-session disposition

All four consistency findings are resolved in the final design/plan:

- Overrides outside promotion targets stay untouched; inputs inside a target
  are consumed on successful replacement and preserved on failure. Only the
  decoded canonical memo snapshot is retained, in artifacts rather than dist.
- First-publication bootstrap permits explicitly selected, decoded public
  comments and memo inputs in either target, with no unrecognized files or
  prior publication/site/experiment/root HTML trees.
- Legacy manifests lacking memo metadata receive a zero floor only if prior
  output is free of the plugin-owned memo surface; an ordinary marker-free
  authored alias remains allowed. Lost existing history blocks publication.
- Publication uses coordinated caught-failure rollback, without crash-atomic
  or concurrent-publisher claims. The worker gets its own tick healthcheck.

The whole lifecycle browser fixture uses an actual owned HTTPS edge and private
local TLS mail sink/fixture CA, rather than intercepting accepted responses or
disabling service TLS validation. No unresolved product decision remains beyond
the required final owner review of these planning artifacts. This statement is
planning convergence, not implementation or test evidence.
