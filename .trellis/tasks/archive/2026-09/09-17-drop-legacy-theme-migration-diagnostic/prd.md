# Treat retired `articleTheme` as an ordinary unknown field

## Goal

Make the repository contract unambiguous: `contentTheme` is the only authored
theme field, and `articleTheme` has no special meaning. Existing or future
content that still contains `articleTheme` must follow the same strict
unknown-field behavior as any other unsupported frontmatter key.

## Confirmed behavior

- An authored `contentTheme` is validated against the repository's registered
  theme IDs.
- Omitting `contentTheme` uses the repository default theme.
- Authoring `articleTheme`, either alone or alongside `contentTheme`, fails as
  an ordinary unknown-field/schema error.
- The repository must not read, migrate, alias, silently ignore, or emit a
  bespoke migration diagnostic for `articleTheme`.
- Strictness remains unchanged for all other unsupported frontmatter fields.

## Requirements

1. Remove the bespoke `articleTheme` migration-diagnostic path from the site
   content schema.
2. Preserve the canonical `contentTheme` validation and omitted-field default
   behavior.
3. Update focused schema and metadata-validation tests to assert the ordinary
   unknown-field contract, including both legacy-only and both-name inputs.
4. Update live repository specifications and user-facing contract guidance so
   they no longer describe `articleTheme` as a recognized migration case.
5. Do not modify or migrate content outside this repository. The external
   article owner remains responsible for deleting the obsolete key.
6. Do not change browser/server execution behavior as part of this task; the
   Astro browser-API hint is out of scope unless a separate runtime defect is
   demonstrated after the schema change.

## Acceptance Criteria

- [ ] `articleTheme` is absent from production schema handling and no custom
      migration message is emitted for it.
- [ ] A post/page with omitted `contentTheme` still resolves to the default
      theme.
- [ ] A post/page containing only `articleTheme` fails with the repository's
      normal strict unknown-field diagnostic.
- [ ] A post/page containing both `articleTheme` and `contentTheme` also fails
      with the normal strict unknown-field diagnostic; no alias or precedence
      exists.
- [ ] The metadata validation CLI reports the same ordinary schema failure and
      does not rewrite the source file.
- [ ] Live specs and contract guidance consistently state the behavior above.
- [ ] Relevant check, test, and build commands pass, with unrelated existing
      failures distinguished from regressions.

## Scope boundaries

- In scope: the site schema, its focused tests/fixtures, and current repository
  contract documentation.
- Out of scope: global relaxation of strict schemas, automatic content
  migration, edits to `/home/wkyuu/cargo/repo/04-flyMe2theStar`, and unrelated
  browser API/server-rendering changes.

## Planning note

This is a small contract cleanup, so a PRD-only task is sufficient; separate
`design.md` and `implement.md` files are not required.

## Notes

- Created via `task.py create` with `--no-start`.
