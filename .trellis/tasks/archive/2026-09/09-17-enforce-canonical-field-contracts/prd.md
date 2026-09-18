# Enforce canonical field contracts

## Goal

Make retired authored/configuration names unambiguous: canonical names are the
only accepted fields at their boundary, and retired names receive ordinary
unknown-field errors rather than migration, alias, translation, or silent
ignore behavior. The change covers the four findings accepted by the owner:
`articleTheme`, legacy article `source`, the old comments namespace, and the
formatter's canonical `contentTheme` registration gap.

## Confirmed background

- `contentTheme` is the sole authored theme field. It remains optional, accepts
  only the registered IDs, and defaults to `default` when omitted.
- The current site schema special-cases `articleTheme` with a migration message
  before strict rejection (`apps/site/src/lib/content-schema.mjs:61-70,120-133`).
  The owner has confirmed that `articleTheme` should be treated as if it had
  never been used: no migration guidance or compatibility behavior is wanted.
- `source` is currently an optional, validated, normalized front matter key
  carried as legacy provenance (`apps/site/src/lib/content-schema.mjs:33-46,89-105`;
  `apps/site/scripts/blog-meta.mjs:24-43`). The owner has approved removing
  this legacy field together with the other findings. The current configured
  content workspace and repository fixtures contain no authored `source:` or
  `articleTheme:` front matter requiring a content migration.
- The old comments namespace is still parsed and translated by
  `plugins/comments/config.mjs`, `apps/site/src/lib/site-config.mjs`, and
  `services/comments/src/config.ts`. It is covered by a positive service test
  and documented as a migration-window path. The owner has approved ending
  that compatibility path.
- `tooling/format-content.sh` lists `source` but omits canonical `contentTheme`
  in its shared-field registry. It prints and validates this incomplete list;
  it does not itself parse existing front matter.
- Explicitly documented format, operational, data, and CLI compatibility is
  retained: `sha256:` digest input, `COMMENTS_*` runtime environment overrides,
  database migration/backup behavior, legacy path-format normalization, URL
  aliases, and Terminal command/API aliases.

## Requirements

### R1 — Canonical article metadata

1. Remove the `articleTheme` preprocessing and bespoke migration diagnostic.
2. Remove `source` and its validator from the shared post/page schema and from
   the `blog-meta` normalized output list.
3. Keep `contentTheme` validation, registered-ID behavior, and omitted-field
   defaulting unchanged.
4. Make both `articleTheme` alone/with `contentTheme` and `source` fail through
   ordinary strict unknown-field validation. No value precedence, conversion,
   or bespoke field-specific error is allowed.

### R2 — Canonical comments configuration

1. Accept only the canonical site activation namespace
   `[plugins.comments]` and plugin file namespaces `[public]` and `[runtime]`.
2. Remove the legacy comments key allowlist, parser, public legacy type, and
   legacy dispatch from the shared comments config module.
3. Make both the site loader and service loader reject a top-level `[comments]`
   namespace instead of ignoring it or reading it through a fallback path.
4. Preserve canonical activation/config parsing, private/public projection,
   named-secret loading, and explicit service-boundary `COMMENTS_*` overrides.
5. A config containing both old and canonical namespaces must fail because the
   old top-level namespace is unknown, not because two enable flags are
   specially reconciled.

### R3 — Formatter registry alignment

1. Make `tooling/format-content.sh`'s shared-field registry match the current
   canonical shared metadata: include `contentTheme` and remove `source`.
2. Keep its existing read-only default, minimal front matter generation, and
   separate full-schema validation boundary.

### R4 — Contract and regression alignment

1. Update live README/spec/type documentation to describe canonical-only
   article and comments input. Historical archived task records remain
   historical evidence and are not rewritten.
2. Update focused tests to cover ordinary unknown-field failures, canonical
   comments success, legacy comments rejection at both site/service boundaries,
   source rejection, and the formatter's canonical field registry.
3. Search the repository after implementation so no production compatibility
   branch, legacy public type, stale current-contract wording, or old positive
   test remains outside historical archives.

## Acceptance Criteria

- [ ] `contentTheme` omitted/registered/invalid behavior is unchanged.
- [ ] `articleTheme` is absent from production schema handling and both
      legacy-only and mixed-name inputs fail with the ordinary strict unknown
      field diagnostic; no migration wording remains in the runtime error.
- [ ] `source` is absent from the production content schema, metadata organizer
      output, formatter registry, and current positive fixtures; authored
      `source` input fails as an ordinary unknown field.
- [ ] Canonical comments config still loads and projects public/runtime values,
      while old `[comments]` input fails at the site parser and service loader.
      No legacy parser, legacy type, or legacy config dispatch remains in
      production code.
- [ ] Canonical and legacy comments inputs cannot be silently merged, ignored,
      or translated; explicit `COMMENTS_*` service environment overrides and
      database-path compatibility remain functional.
- [ ] `tooling/format-content.sh --print-schema` lists `contentTheme` and no
      longer lists `source`; `bash -n`, ShellCheck, and shfmt remain clean.
- [ ] Live README/spec/type guidance matches the canonical-only behavior;
      historical archive records are left unchanged.
- [ ] Focused site, comments contract, comments service, and formatter checks
      pass; applicable project check/build gates pass or any unrelated failure
      is explicitly recorded.
- [ ] No files outside this repository are edited, and unrelated pre-existing
      worktree changes are preserved.

## Scope boundaries

In scope: `apps/site` content schemas/metadata CLI/config projection, the
comments plugin and comments service configuration boundary, the standalone
formatter registry, related tests, current user-facing docs, and live
`.trellis/spec/frontend/**` contracts.

Out of scope: editing `/home/wkyuu/cargo/repo/04-flyMe2theStar`, migrating
external or archived content, removing intentional digest/database/path-format
compatibility, broad schema redesign, dependency upgrades, browser API fixes,
or unrelated document-navigator changes.

## Risk and decision notes

- This is an intentional breaking contract cleanup. Existing callers that
  import `parseCommentsNamespace` or feed `[comments]` must move to canonical
  APIs; no compatibility shim is to be added.
- Removing `source` is safe for the currently configured content inventory
  verified during the read-only audit, but future legacy articles using it will
  fail the schema gate until their front matter is cleaned manually.
- The existing uncommitted document-navigator/theme worktree changes belong to
  the user and must not be reverted or folded into this task's explanation.

## Planning status

Requirement decisions are resolved by the owner's “全部一起改” approval.
Complex-task `design.md` and `implement.md` are required before activation.
This task supersedes the still-planning
`09-17-drop-legacy-theme-migration-diagnostic` task by incorporating its
`articleTheme` cleanup into the combined canonical-contract change; that older
task record remains unchanged as historical planning evidence until the
combined task is approved and started.
