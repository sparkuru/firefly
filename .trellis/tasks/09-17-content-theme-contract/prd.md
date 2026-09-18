# Authored content theme contract migration

## Goal

Implement R4 as a direct breaking metadata migration from `articleTheme` to
`contentTheme`, while keeping the registered `default`/`paper` values and making
the authored value the document body styling authority.

## Dependency and scope

The direct rename is approved independently. Integrate after child A because the
document content-root/rendering boundary overlaps; do not edit external authored
workspaces. This child owns R4/AC6–AC7 and R5/AC8 is still a shared gate.

In scope: post/page schema, repository Markdown frontmatter fixtures, `blog-meta`
validation/docs, theme module/types/resolver/constants, renderer props,
`data-content-theme`, content-scoped CSS, tests and active documentation.

Out of scope: aliases, old-schema converters, compatibility exports, automatic
external migration, theme artwork, public picker/runtime switching, URL/stored
reader overrides, theme-lock metadata, X Core/theme payloads and structural
`[data-article-content]` renaming.

## Requirements

- Accept only optional `contentTheme`; omission normalizes to `default`, and exact
  registered `default` or `paper` values are accepted. Any `articleTheme` input,
  alone or alongside `contentTheme`, is rejected with migration guidance.
- Reject unknown, empty, padded, URL/path-like and wrong-type theme values before
  rendering. Keep strict unknown-key validation and bounded document/field errors.
- Synchronize schema, repository fixtures, metadata tooling, content theme module,
  component props, CSS selectors, docs and tests. Keep `[data-article-content]`
  as the structural hook and emit exactly one `data-content-theme` on the content
  root.
- Resolve the authored theme at build time in all composition cells and with/without
  JS. Navigator selection, entry/exit, URL, application controls and preferences
  must not mutate or override it. No picker or theme runtime asset is added.
- Keep theme data out of X Core context/metadata, route identity, comments and
  plugin payloads. External content is not silently rewritten; it must migrate
  explicitly before an external build.

## Acceptance Criteria

- [ ] New, omitted, old-only, both-name, unknown and wrong-type input cases match
      the approved migration matrix.
- [ ] Repository fixtures, `blog-meta`, schema, resolver/types, renderer props,
      DOM attribute, CSS and docs agree on `contentTheme` with no accepted alias.
- [ ] Omitted/default and explicit paper styling render in all four composition
      cells and remain unchanged through navigator entry/exit and no-JS reading.
- [ ] Exactly one `data-content-theme` exists on the content root; the structural
      `[data-article-content]` hook remains, and no theme data enters X Core/plugin
      payloads or route identity.
- [ ] No public picker, reader override, theme-switching runtime or external
      workspace mutation is introduced; old-field diagnostics are actionable.
- [ ] Active legacy fragment behavior remains absent.

## Risks and rollback

Schema/content must move as one revision: an old application with new content or
new application with old content is not assumed compatible. If rollback is needed,
restore the paired application/schema and authored-content revisions; never add an
alias as a rollback shim.
