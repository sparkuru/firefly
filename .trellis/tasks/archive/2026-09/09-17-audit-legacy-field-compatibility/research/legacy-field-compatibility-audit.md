# Legacy-field compatibility audit

Status: read-only audit complete
Date: 2026-09-17
Scope: this repository only; no product source, test, authored-content, or
external-repository files were changed.

## Executive result

The audit found one additional live compatibility boundary that is materially
similar to the `articleTheme` concern: the old comments configuration namespace
(`[comments]` and its flat/env-shaped keys) is still parsed, translated into
the canonical `[plugins.comments]` / `[public]` / `[runtime]` model, and covered
by a positive service test. The live specification calls this an intentional
“one migration window”, so it is not an implementation defect under the
current contract. It is, however, an unbounded compatibility window: no
deadline, version gate, or expiry mechanism was found. If the repository-wide
decision is now canonical-only input, this is the next concrete compatibility
surface to retire.

The content field `source` is also explicitly retained as a legacy field, but
it has no replacement field. It is validated and carried as provenance, never
used for routing or rendered content. That is an intentional provenance
compatibility policy, not an old-to-new rename. It should only be removed if
the canonical-only policy is meant to reject all retired authored metadata,
not just renamed fields.

No other old/new authored-field pair with a live alias, translation, silent
ignore, or bespoke migration warning was found in the inspected source,
tests, CLI paths, or current Trellis contracts.

## Method and system boundary

The audit used the repository-evolution focus from `repo-audit` and inspected:

- Markdown materialization, front matter schemas, the `blog-meta` authoring
  CLI, and Astro collection registration;
- site TOML parsing and plugin projection;
- the comments plugin's public/configuration decoders and comments service
  runtime loader;
- X Core metadata, experiment manifests, Terminal identity, comment
  submissions/exports, storage migrations, and their exact-key validators;
- focused tests, `readme.md`, and the live `.trellis/spec/frontend/**`
  contracts, plus relevant archived task decisions.

The main data path is:

```text
authored Markdown
  -> materializer / blog-meta
  -> strict post/page schema
  -> generated Astro collections
  -> canonical document/publication projection

site.toml
  -> site parser + comments projection
  -> static public config and/or comments service runtime config
```

This matters because an old name can be compatible at several different
boundaries: a strict schema can reject it, a preprocessor can special-case it,
or a migration adapter can accept and translate it before the canonical schema
sees it.

## Candidate inventory

| Candidate | Evidence checked | Classification |
| --- | --- | --- |
| `articleTheme` -> `contentTheme` | `apps/site/src/lib/content-schema.mjs:57-69,89-105,120-133`; `apps/site/tests/content-schema.test.mjs`; `apps/site/tests/blog-meta-cli.test.mjs` | Baseline: the old key is not accepted or translated, but it receives a bespoke migration diagnostic before strict rejection. The separate `09-17-drop-legacy-theme-migration-diagnostic` task captures the canonical-only cleanup. |
| `[comments]` / flat comments keys -> `[plugins.comments]` + `[public]`/`[runtime]` | `apps/site/src/lib/site-config.mjs:234-280`; `plugins/comments/config.mjs:51-73,345-405,462-469`; `services/comments/src/config.ts:182-225`; `services/comments/tests/config.test.ts:46-84`; `plugins/comments/config.d.mts:41-62` | Confirmed live legacy acceptance and translation. Explicitly intentional in the current migration-window contract; the missing expiry is a policy/maintenance finding. |
| `source` legacy front matter | `apps/site/src/lib/content-schema.mjs:33-46,89-105`; `apps/site/scripts/blog-meta.mjs:24-43,471-485`; `apps/site/tests/content-schema.test.mjs:198-215`; `readme.md:213-219`; `.trellis/spec/frontend/content-workspace-contract.md:408-415` | Confirmed legacy field acceptance, but no replacement or alias exists. Intentional provenance compatibility; not the same class as a renamed field. |
| `sha256:` digest prefix -> bare digest | `plugins/comments/public.mjs:367-373`; `.trellis/spec/frontend/comments-publication-contract.md:121-129`; `plugins/comments/tests/*.test.mjs` | Intentional input-format compatibility. The output is canonicalized to a bare digest and the contract documents the behavior. Not a field migration. |
| `COMMENTS_DATABASE_PATH`, `COMMENTS_DATA_ROOT`, legacy `comments.sqlite`, two-argument backup form | `services/comments/src/storage.ts:150-169`; `services/comments/README.md:149-180,207-208`; `.trellis/spec/frontend/comments-publication-contract.md:574-583` | Intentional operational/data/CLI migration compatibility with explicit preservation and safety rules. Not an authored field rename. |
| Missing/empty front matter, whitespace slugs, body H1 headings, `<center>`, old URL aliases | `apps/site/src/lib/content-metadata.mjs`; `apps/site/scripts/materialize-content.mjs:295-330`; `readme.md:213-219,251-257,306-312`; `.trellis/spec/frontend/content-workspace-contract.md:408-415` | Intentional legacy content/path-format handling. These are format or route policies, not alternate field names. |
| `tooling/format-content.sh` shared-field registry vs. `contentTheme` | `tooling/format-content.sh:11-27,114-153`; `.trellis/spec/frontend/content-workspace-contract.md:494-498` | Adjacent contract drift, not legacy acceptance: the formatter's printed/self-checked shared-field list omits the current canonical `contentTheme`. |
| Terminal omitted `promptMarker`, command aliases, `tokenizeCommand` | `apps/site/src/lib/site-config.mjs:172-179`; `presentations/terminal/src/runtime.ts:353-393,585-600` | Defaults/API adapters/CLI aliases. No retired authored field is accepted. |
| X Core metadata, experiment manifests, comment submissions/exports, storage catalog, Terminal identity | `packages/x-core/src/metadata.ts:17-69,92-153`; `tooling/validate-experiments/src/index.ts:47-61,97-113,256-290`; `services/comments/src/validation.ts:25-36,112-147`; `presentations/terminal/src/runtime.ts:353-393` | Canonical exact-key or versioned contracts. Unknown fields fail; no old-name adapter found. |

## Findings

### F-01 — The comments migration window has no observable expiry

Severity: Medium, conditional on the canonical-only policy decision.

Confirmed facts:

1. The site parser deliberately extracts `comments` and `plugins` before the
   strict core site schema. `commentsSiteProjection()` rejects a namespace
   conflict, but when only `rawValue.comments` is present it calls
   `parseCommentsNamespace()` and projects the result into the canonical
   runtime/public shape (`apps/site/src/lib/site-config.mjs:234-280`).
2. The plugin decoder has a dedicated `LEGACY_KEYS` set and
   `parseLegacyCommentsNamespace()`. It maps old top-level keys, nested old
   keys, and TOML keys shaped like `COMMENTS_*` into canonical runtime fields
   (`plugins/comments/config.mjs:51-73,345-405`).
3. The comments service accepts the old namespace both from a site config and
   from an explicitly selected config file (`services/comments/src/config.ts:182-225`).
4. `services/comments/tests/config.test.ts:46-84` writes a real `[comments]`
   config and asserts the translated SMTP/outbox values. This proves the
   compatibility path is executable, not just stale documentation.
5. The public type declarations expose `LegacyCommentsNamespace` and a union
   return type (`plugins/comments/config.d.mts:41-62`). The README and live
   site-configuration contract both describe the behavior as lasting for “one
   migration window” (`plugins/comments/README.md:71-74`; `.trellis/spec/frontend/site-configuration-contract.md:119-125`).

Inference and impact:

- The compatibility is intentional under the current documented contract, so
  it should not be misreported as an accidental parser bug.
- No concrete deadline, release/version condition, feature flag, or test that
  expires the window was found. In practice, the old namespace remains a
  second accepted vocabulary indefinitely. That keeps old field names alive,
  preserves a legacy public type, and makes future schema changes maintain two
  configuration paths.

Smallest follow-up options:

- If the migration window is still required: record an owner and a concrete
  removal release/date in the live comments contract, keep one explicit
  compatibility test, and add a review/expiry check so the window cannot
  silently become permanent.
- If the approved repository policy is canonical-only: in a separate change,
  remove the legacy parser/branches and legacy public type, make `[comments]`
  and its old keys reach the normal unknown-field errors, update the comments
  README/spec and positive tests, and retain only explicitly separate runtime
  environment overrides if those remain part of the service boundary.

Validation for either follow-up should cover canonical site/plugin config,
legacy-only config, both namespaces together, explicit service config, and
the `COMMENTS_*` environment precedence matrix. The current focused comments
service suite passed while exercising the existing legacy path.

### F-02 — `source` remains an accepted legacy authored field, by policy

Severity: Low, conditional on whether “canonical-only” applies to all retired
metadata or only renamed fields.

Confirmed facts:

- `source` is a recognized optional front matter key in the shared post/page
  schema and is included in the `blog-meta` normalized output key list
  (`apps/site/src/lib/content-schema.mjs:89-105`; `apps/site/scripts/blog-meta.mjs:24-43`).
- The value has a dedicated safe relative Markdown-reference validator and a
  positive schema test (`apps/site/src/lib/content-schema.mjs:33-46`;
  `apps/site/tests/content-schema.test.mjs:198-215`).
- The documentation calls it “legacy optional source” and says to omit it for
  new content, while specifying that it never controls routing or public
  output (`readme.md:213-219`; `.trellis/spec/frontend/content-workspace-contract.md:408-415`).

Classification:

This is deliberate provenance retention, not compatibility with a replacement
field. It is therefore a non-defect under the current content contract. It is
nevertheless the closest content-level exception to the requested rule: an
old authored key is recognized instead of being an ordinary unknown key.

Smallest follow-up only if the policy is broadened: remove `source` from the
schema and organizer output, remove its positive fixtures and documentation,
and let strict collection/CLI validation reject it. That should be a separate
contract decision because existing legacy articles use it as provenance and it
has no canonical successor.

### A-01 — The standalone formatter does not register the canonical theme field

Severity: Low, adjacent to this audit rather than a legacy-compatibility
finding.

Confirmed facts:

- `apps/site/src/lib/content-schema.mjs:89-105` declares `contentTheme` as a
  shared post/page field alongside the fields listed by the formatter.
- `tooling/format-content.sh:11-27` lists every shared metadata key except
  `contentTheme`. `validate_schema_registry()` only checks the keys present in
  that list (`tooling/format-content.sh:114-141`), and `--print-schema` prints
  the same incomplete list (`tooling/format-content.sh:143-153`).
- The active content contract says the metadata organizer retains the
  validated `contentTheme` value (`.trellis/spec/frontend/content-workspace-contract.md:494-498`),
  while the standalone formatter is a separate front-matter-presence tool.
- The formatter does not contain `articleTheme`, so this is not evidence that
  it accepts the retired field. It is a missing canonical registration after
  the theme rename.

Impact and smallest follow-up:

This can make the formatter's schema report and self-check drift from the real
content schema, and it would not detect removal of `contentTheme` from the
schema. Add `contentTheme` to `SHARED_FIELDS` and add a narrow shell test or
static assertion that `--print-schema` includes it. Do that in a separate
formatter-contract change; no product files were modified in this audit.

## Non-findings and why

- `contentTheme` itself is canonical, defaults only when omitted, and accepts
  only registered IDs. The content objects are strict, and
  `blog-meta` validates before selecting normalized output keys; an arbitrary
  unknown key is not silently stripped. The only special case is the known
  `articleTheme` diagnostic described above.
- Canonical site sections (`site`, `terminal`, `seo`, `documentNavigation`) and
  the outer site object use strict schemas (`apps/site/src/lib/site-config.mjs:164-214`).
  The comments namespace is the deliberate projection exception, already
  covered by F-01.
- `tooling/format-content.sh` is a low-severity adjacent drift rather than a
  compatibility alias: its `SHARED_FIELDS` list omits canonical `contentTheme`,
  but it also contains no `articleTheme` path and does not parse existing
  front matter. It should not be used as evidence of old-field acceptance.
- X Core metadata, experiment manifests, terminal identity, comment submission
  records, public export records, and storage metadata use exact-key checks or
  explicit schema versions. Their negative tests reject unknown fields; no
  old/new field mapping was found.
- The `sha256:` prefix, database path/data migration, backup argument form,
  missing-front-matter repair, whitespace normalization, body-heading repair,
  and URL aliases all have explicit format/operational/content-route reasons.
  Treating each as a migrated field would conflate intentional boundary
  compatibility with the retired-name problem.
- Old comments HTTP routes are explicitly rejected with 404 in service tests;
  they are not still accepted under an alias.

## Design-document status

The live frontend specs already document most compatibility decisions, but
they do not provide one cross-repository inventory or a rule for expiring a
“migration window”. Historical comments tasks show that the old namespace and
environment overrides were deliberate migration decisions, not accidental
leftovers. The missing durable decision is whether those windows have now
expired and, if not, who owns their removal.

The current `articleTheme` bespoke diagnostic remains inconsistent with the
canonical-only theme decision recorded by the parent document-navigator/theme
tasks. It is intentionally left untouched here because its removal belongs to
the separate `09-17-drop-legacy-theme-migration-diagnostic` task.

## Recommended order

1. Complete the already-created `articleTheme` diagnostic cleanup so the old
   name receives ordinary strict unknown-field handling.
2. Decide whether the comments migration window is still active. If not,
   retire `[comments]` and its legacy field family in one focused contract
   change; if yes, add a named expiry/owner.
3. Decide whether `source` is a supported provenance exception or a retired
   authored field. Do not remove it merely because it is labeled legacy: it has
   no replacement and existing content uses it.
4. Keep the intentional digest, operational, route-format, and API
   compatibility rules in their current explicit contract sections rather than
   adding generic legacy aliases.

## Validation performed

All commands were run through the repository's approved `./sam` wrapper:

- `./sam npm run test:content:site` — 89 tests passed;
- `./sam npm run test:comments-contract` — 7 tests passed;
- `./sam npm run test:comments` — 59 tests passed;
- `bash -n tooling/format-content.sh` — passed;
- `shellcheck tooling/format-content.sh` — passed;
- `shfmt -d tooling/format-content.sh` — passed;
- `./tooling/format-content.sh --print-schema` — passed, and exposed the
  missing `contentTheme` registration described in A-01;
- `git diff --check` — clean for the pre-existing worktree changes and this
  task's research note.
