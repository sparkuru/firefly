# Design: enforce canonical field contracts

## Objective and invariant

The repository has one input vocabulary per boundary. A retired name must not
become meaningful by preprocessing, by being removed before strict validation,
or by dispatching to a legacy parser. Canonical defaults and explicitly
approved runtime/format compatibility remain unchanged.

The target invariant is:

```text
authored Markdown  -> strict post/page schema
canonical site TOML -> strict site projection
canonical comments TOML -> strict plugin config
```

At each arrow, unsupported keys fail at the first owner of that contract.

## Boundary map

| Boundary | Current owner | Target change |
| --- | --- | --- |
| Article front matter | `apps/site/src/lib/content-schema.mjs` | Keep only `contentTheme`; remove `articleTheme` preprocessor and `source`; rely on strict unknown-key rejection. |
| Metadata organizer | `apps/site/scripts/blog-meta.mjs` | Stop carrying `source`; schema validation remains before normalized output selection. |
| Front-matter presence formatter | `tooling/format-content.sh` | Register `contentTheme`, remove retired `source`; keep minimal generation and read-only default. |
| Site TOML | `apps/site/src/lib/site-config.mjs` | Project only `[plugins.comments]`; leave top-level `comments` visible to the strict site schema so it cannot be silently discarded. |
| Shared comments config | `plugins/comments/config.mjs` / `config.d.mts` | Remove legacy key sets, parser, dispatch, and public legacy union; canonical parser remains the only config decoder. |
| Comments service | `services/comments/src/config.ts` | Reject old site/explicit config namespaces before resolution; retain canonical file/env precedence and secret loading. |
| Current contracts/tests | live frontend specs, README, focused tests | State canonical-only behavior and assert both success and rejection paths. Historical archives remain unchanged. |

## Article metadata design

`sharedMetadata` remains the single shared field declaration. Its theme field
is still:

```js
contentTheme: contentTheme.optional().default(DEFAULT_CONTENT_THEME_ID)
```

The `source` validator and `source` property are removed. The
`rejectLegacyArticleTheme` preprocessor and `z.preprocess` wrappers are removed;
post/page schemas remain strict `z.object(...).strict()` schemas with the
existing chronology refinement. Consequently:

- omitted `contentTheme` still becomes `default`;
- registered `contentTheme` IDs still pass unchanged;
- `articleTheme`, `source`, and arbitrary unknown keys produce the same strict
  unknown-key issue shape;
- no code can inspect either retired key to choose a value or customize its
  error.

`blog-meta` continues to call the selected schema before `normalizeSchemaData`.
Removing `source` from `outputKeys` prevents it from being carried by the
authoring output, while strict validation prevents an existing source field
from being silently dropped. The standalone formatter's field list is aligned
with `sharedMetadata`; it only generates the required minimal front matter and
does not invent a theme value.

## Comments configuration design

### Canonical shared decoder

`plugins/comments/config.mjs` retains these canonical entrypoints:

- `parseCommentsActivation(value, source)` for `[plugins.comments]`;
- `parseCommentsConfig(value, source, options)` for `[public]`/`[runtime]`;
- `resolveCommentsConfigPath(...)`;
- `resolveCommentsRuntimeOptions(value, env, source)`, which always calls
  `parseCommentsConfig`.

The following are deleted rather than renamed into a compatibility facade:

- `LEGACY_KEYS`;
- `getLegacyValue`;
- `parseLegacyCommentsNamespace`;
- `parseCommentsNamespace`;
- `LegacyCommentsNamespace` and all declaration unions that expose it.

`mapRuntimeToEnvironment` remains. `COMMENTS_*` variables at the service
runtime boundary are current explicit environment overrides, not TOML aliases;
they continue to win over values projected from canonical `[runtime]` config.
The explicit `COMMENTS_DATABASE_PATH` operational override remains for the
same reason.

### Site parser

`commentsSiteProjection` validates only `rawValue.plugins.comments` and the
canonical plugin config. `parseSiteConfig` removes only `plugins` from the
value passed to the strict core site schema. It no longer removes `comments`
under a legacy-named binding. Therefore a top-level `[comments]` value remains
in `siteValue` and is rejected as an ordinary unknown top-level key.

The loader no longer skips plugin-file resolution merely because a `comments`
property exists. The canonical plugin path is resolved as usual, then the
strict site schema rejects the old top-level key. This keeps the error path
fail-closed without translating the old namespace.

### Service loader

`sourceFromSiteConfig` explicitly guards against `siteValue.comments` before
returning a runtime source, using the service's normal unsupported-key error.
This guard is necessary because the service does not load the complete site
schema and must not otherwise ignore an old namespace while selecting the
default canonical plugin config.

`sourceFromExplicitConfig` no longer recognizes a nested `value.comments`
shape. It passes the selected file value to `parseCommentsConfig`, so a
top-level old namespace fails the canonical exact-key check. Canonical
`[public]`/`[runtime]` files and explicit service environment overrides are
unchanged.

## Error and compatibility matrix

| Input | Target result |
| --- | --- |
| no `contentTheme` | accept and default to `default` |
| `contentTheme: default` or `paper` | accept the exact registered ID |
| `articleTheme`, alone or with `contentTheme` | ordinary strict unknown-field rejection; no migration wording |
| `source` front matter | ordinary strict unknown-field rejection |
| arbitrary article front-matter key | ordinary strict unknown-field rejection |
| canonical `[plugins.comments]` plus canonical plugin file | accept and project public/runtime values |
| top-level `[comments]` | ordinary unknown/unsupported-key rejection at site and service boundaries |
| both `[comments]` and `[plugins.comments]` | old namespace is unknown; no special conflict reconciliation |
| canonical runtime file plus explicit `COMMENTS_*` env | explicit runtime environment value keeps existing precedence |
| `sha256:` digest, legacy DB copy, path-format fallback, route aliases | preserve existing explicitly documented behavior |

## Test design

Tests should prove both the negative boundary and the preserved canonical path:

- content schema: default/registered theme behavior, `articleTheme` ordinary
  unknown diagnostics for legacy-only and mixed inputs, `source` rejection, and
  arbitrary unknown rejection;
- metadata CLI: legacy theme and source inputs fail without rewriting source,
  and the error no longer contains migration guidance;
- site config: canonical plugin projection passes; old `comments` and mixed
  namespace inputs fail with an unknown-key diagnostic;
- comments service: canonical explicit/site config still maps SMTP/outbox and
  secret values; old `[comments]` and `[comments.smtp]` forms fail; env
  precedence remains covered;
- formatter: `--print-schema` includes `contentTheme` and excludes `source`;
- repository search: production references to the removed parser, type,
  allowlist, old source field, and migration message are absent outside
  historical task archives.

## Documentation design

Update current user-facing and executable contracts:

- `readme.md`: remove legacy `source` acceptance language;
- `plugins/comments/README.md`: describe only canonical configuration;
- `.trellis/spec/frontend/content-workspace-contract.md`: document strict
  rejection for `articleTheme`/`source` and the current canonical field list;
- `.trellis/spec/frontend/site-configuration-contract.md`: document that
  `[comments]` is unsupported and `articleTheme` has no migration diagnostic;
- `.trellis/spec/frontend/comments-publication-contract.md`: remove the legacy
  parser/type/signatures and old namespace matrix row while preserving digest,
  env, and storage compatibility wording.

Archived task records retain historical vocabulary intentionally; they are not
runtime contracts and should not be rewritten as part of this change.

## Rollback and risk

This is a deliberate breaking change. The implementation should be applied as
small, separable edits so a failure can be isolated by file group. Rollback is
selective restoration of the changed hunks from this task only; no worktree-wide
reset or checkout is permitted because the branch contains unrelated
document-navigator/theme changes.

The main risk is an untracked external article or operator config still using a
retired key. The configured content inventory was scanned before planning and
currently contains neither `articleTheme:` nor `source:` front matter. Future
legacy content is expected to fail closed and must be cleaned by its owner.
